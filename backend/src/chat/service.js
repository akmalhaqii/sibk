// C3: orkestrasi tanya jawab chat — pemilah niat C1, streaming per kalimat, pemeriksa per kalimat, cadangan ruleAnswer
import env from '../config/env.js';
import { buildInput } from '../narrator/input.js';
import { buildCatalog, findAliases } from '../narrator/binding.js';
import { chatStream, pingOllama } from '../narrator/client.js';
import { classifyQuestion } from './router.js';
import { answerWithoutLlm, LABELS, ruleAnswer } from './rules.js';
import { appendMessage } from './sessions.js';
import { createSentenceSplitter } from './splitter.js';
import { checkChatSentence, extendCatalog } from './check.js';
import { buildChatMessages } from './context.js';
import { acquireChatLock } from './lock.js';
import { collectFacts, factsInQuestion } from './facts.js';

const CHAT_PROMPT_VERSION = 'chat_v2';

function pagesOf(result, key) {
  const inputs = result?.metrics?.[key]?.inputs ?? result?.valuation?.[key]?.inputs ?? [];
  const pages = inputs.map((k) => result?.fields?.[k]?.page).filter((p) => Number.isFinite(p));
  return [...new Set(pages)].sort((a, b) => a - b);
}

export function extractRefs(text, snapshot, extraAliases = null) {
  if (!text || !snapshot) return [];
  const seen = new Set();
  const refs = [];
  for (const h of findAliases(text, extraAliases)) {
    if (h.key.startsWith('@fact_')) {
      const k = h.key.slice(6);
      const page = snapshot.fields?.[k]?.page;
      if (!seen.has(k) && snapshot.fields?.[k]) {
        seen.add(k);
        refs.push({ type: 'field', key: k, pages: Number.isFinite(page) ? [page] : [] });
      }
      continue;
    }
    const keys =
      h.key === '@growth'
        ? ['revenue_growth', 'earnings_growth']
        : h.key === '@cash'
          ? ['cash_conversion']
          : [h.key];
    for (const k of keys) {
      if (seen.has(k) || !snapshot.metrics?.[k]) continue;
      seen.add(k);
      refs.push({ type: 'metric', key: k, pages: pagesOf(snapshot, k) });
    }
  }
  return refs;
}

export async function answerQuestion({
  session,
  question,
  emit = () => {},
  chatStreamFn = chatStream,
  pingFn = pingOllama,
  timeoutMs = 60000,
  model = env.chat.model,
  log = console.warn,
}) {
  const t0 = Date.now();
  const cleanQ = String(question ?? '').trim().slice(0, 500);
  const snapshot = session.snapshot ?? null;
  const ticker = session.mode === 'analysis' ? (snapshot?.entity?.ticker ?? session.analysis?.ticker ?? null) : null;
  const { intent, terms } = classifyQuestion(cleanQ, { ticker });

  let fixedReply = null;
  if (session.mode === 'glossary_only') {
    if (intent === 'analysis') {
      fixedReply = {
        intent,
        source: 'refusal',
        label: LABELS.refusal,
        answer: 'Sesi ini tanpa emiten. Untuk pertanyaan tentang laporan, buka sesi dari halaman analisis.',
        refs: [],
      };
    } else {
      fixedReply = answerWithoutLlm({ question: cleanQ, result: null, intent, terms });
    }
  } else {
    fixedReply = answerWithoutLlm({ question: cleanQ, result: snapshot, intent, terms });
  }

  // Jawaban tanpa LLM (sapaan, penolakan, kamus, sesi tanpa emiten): tidak memakai kunci Qwen
  if (fixedReply) {
    const { message: userMsg } = await appendMessage(
      session.id,
      { role: 'user', content: cleanQ },
      { pending: true }
    );
    emit('meta', { message_id: userMsg.id, intent, source_hint: fixedReply.source });
    emit('sentence', { text: fixedReply.answer });
    const { message: assistantMsg } = await appendMessage(
      session.id,
      {
        role: 'assistant',
        content: fixedReply.answer,
        source: fixedReply.source,
        label: fixedReply.label,
        refs: fixedReply.refs ?? [],
        dropped_sentences: 0,
        model: null,
        prompt_version: null,
        intent: fixedReply.intent ?? intent,
        duration_ms: Date.now() - t0,
      },
      { pending: false }
    );
    emit('done', { message: assistantMsg });
    return { message: assistantMsg, droppedReasons: [] };
  }

  // Niat analysis: satu antrean Qwen pada satu waktu
  const release = acquireChatLock();
  if (!release) {
    emit('busy', {});
    return { busy: true };
  }

  try {
    const chatMessages = buildChatMessages({ session, question: cleanQ });
    const { message: userMsg } = await appendMessage(
      session.id,
      { role: 'user', content: cleanQ },
      { pending: true }
    );
    emit('meta', { message_id: userMsg.id, intent, source_hint: 'llm' });

    const ping = await pingFn();
    if (ping !== 'ok') {
      const rule = ruleAnswer(cleanQ, snapshot);
      const ansText = `${rule.answer} Qwen tidak aktif, jawaban disusun otomatis.`;
      emit('sentence', { text: ansText });
      const { message: assistantMsg } = await appendMessage(
        session.id,
        {
          role: 'assistant',
          content: ansText,
          source: 'rule',
          label: LABELS.rule,
          refs: rule.refs ?? [],
          dropped_sentences: 0,
          model: null,
          prompt_version: null,
          intent,
          duration_ms: Date.now() - t0,
        },
        { pending: false }
      );
      emit('done', { message: assistantMsg });
      return { message: assistantMsg, droppedReasons: [] };
    }

    const input = buildInput(snapshot);
    const catalog = extendCatalog(buildCatalog(input), snapshot);
    const splitter = createSentenceSplitter();
    const timeoutSignal = AbortSignal.timeout(timeoutMs);

    const kept = [];
    const droppedReasons = [];
    let timedOut = false;
    let streamError = null;

    // "Data laba tidak tersedia" padahal pos yang ditanyakan ada di laporan -> kalimat dibuang (lalu jawaban aturan)
    const availableFacts = new Set(collectFacts(snapshot).map((f) => f.key));
    const askedAvailable = factsInQuestion(cleanQ).some((k) => availableFacts.has(k));
    const considerSentence = (rawSent) => {
      if (kept.length >= 4) return;
      const verdict =
        askedAvailable && /\b(tidak|belum)\s+(tersedia|ada|tercantum|disebutkan)\b/i.test(rawSent)
          ? { ok: false, reason: 'menyebut data tidak tersedia padahal ada di laporan' }
          : checkChatSentence(rawSent, input, catalog);
      if (verdict.ok) {
        kept.push(rawSent);
        emit('sentence', { text: rawSent });
      } else {
        droppedReasons.push({ sentence: rawSent, reason: verdict.reason });
        emit('dropped', { count: droppedReasons.length });
      }
    };

    try {
      for await (const chunk of chatStreamFn(chatMessages, { model, signal: timeoutSignal })) {
        if (timeoutSignal.aborted) {
          timedOut = true;
          break;
        }
        const ready = splitter.push(chunk);
        for (const sent of ready) {
          considerSentence(sent);
          if (kept.length >= 4) break;
        }
        if (kept.length >= 4) break;
      }
    } catch (err) {
      if (timeoutSignal.aborted || err?.name === 'TimeoutError' || err?.name === 'AbortError') {
        timedOut = true;
      } else {
        streamError = err;
        log(`[chat] aliran Qwen gagal (${ticker || 'UNKNOWN'}): ${err.message}`);
      }
    }

    let finalText = '';
    let finalSource = 'llm';
    let finalLabel = 'Jawaban AI · Qwen3 lokal';
    let finalModel = model;
    let finalPromptVersion = CHAT_PROMPT_VERSION;
    let finalRefs = [];

    if (timedOut) {
      if (kept.length > 0) {
        const note = 'Jawaban terpotong karena Qwen terlalu lama.';
        if (kept.length < 4) {
          kept.push(note);
          emit('sentence', { text: note });
        } else {
          kept[kept.length - 1] = `${kept[kept.length - 1]} ${note}`;
        }
        finalText = kept.join(' ');
        finalRefs = extractRefs(finalText, snapshot, catalog['@extraAliases']);
      } else {
        const rule = ruleAnswer(cleanQ, snapshot);
        finalText = `${rule.answer} Jawaban terpotong karena Qwen terlalu lama.`;
        finalSource = 'rule';
        finalLabel = LABELS.rule;
        finalModel = null;
        finalPromptVersion = null;
        finalRefs = rule.refs ?? [];
        emit('sentence', { text: finalText });
      }
    } else if (streamError) {
      const rule = ruleAnswer(cleanQ, snapshot);
      finalText = `${rule.answer} Qwen tidak aktif, jawaban disusun otomatis.`;
      finalSource = 'rule';
      finalLabel = LABELS.rule;
      finalModel = null;
      finalPromptVersion = null;
      finalRefs = rule.refs ?? [];
      emit('sentence', { text: finalText });
    } else {
      if (kept.length < 4) {
        const tail = splitter.flush();
        for (const sent of tail.sentences) {
          considerSentence(sent);
          if (kept.length >= 4) break;
        }
        if (kept.length < 4 && tail.truncated && tail.truncatedText) {
          droppedReasons.push({ sentence: tail.truncatedText, reason: 'kalimat terpotong' });
          emit('dropped', { count: droppedReasons.length });
        }
      }

      if (kept.length === 0) {
        const rule = ruleAnswer(cleanQ, snapshot);
        finalText = rule.answer;
        finalSource = 'rule';
        finalLabel = LABELS.rule;
        finalModel = null;
        finalPromptVersion = null;
        finalRefs = rule.refs ?? [];
        emit('sentence', { text: finalText });
      } else {
        finalText = kept.join(' ');
        finalRefs = extractRefs(finalText, snapshot, catalog['@extraAliases']);
      }
    }

    if (droppedReasons.length) {
      log(`[chat] ${ticker || 'UNKNOWN'}: ${droppedReasons.length} kalimat dibuang`, droppedReasons);
    }

    const { message: assistantMsg } = await appendMessage(
      session.id,
      {
        role: 'assistant',
        content: finalText,
        source: finalSource,
        label: finalLabel,
        refs: finalRefs,
        dropped_sentences: droppedReasons.length,
        model: finalModel,
        prompt_version: finalPromptVersion,
        intent,
        duration_ms: Date.now() - t0,
      },
      { pending: false }
    );
    emit('done', { message: assistantMsg });
    return { message: assistantMsg, droppedReasons };
  } finally {
    release();
  }
}
