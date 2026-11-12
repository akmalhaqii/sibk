// Qwen3 -> perbaiki per kalimat (REV-06) -> cek akhir -> fallback templat
// REV-06: satu panggilan saja (bukan dua), karena kalimat bermasalah dibuang alih-alih menolak seluruh narasi.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import env from '../config/env.js';
import { buildInput, buildFactSheet } from './input.js';
import { chat, pingOllama } from './client.js';
import { checkNarrative, checkCoverage, countAvailableNumbers } from './validator.js';
import { templateSummary } from './template.js';
import { checkPlainText } from './plaintext.js';
import { repairNarrative } from './repair.js';
import { buildStatusSheet, repairQualitative, qualitativeSummary } from './qualitative.js';
import { toPlainText } from './plaintext.js';

const promptsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'prompts');

export function buildPrompt(input, version = env.promptVersion) {
  const tpl = fs.readFileSync(path.join(promptsDir, `${version}.txt`), 'utf8');
  return tpl
    .replace('{{data}}', JSON.stringify(input, null, 2))
    .replace('{{facts}}', buildFactSheet(input))
    .replace('{{status}}', buildStatusSheet(input, { withNumbers: allowsNumbers(version) }));
}

const MAX_LOGGED_DROPS = 12;

// v5 = satu paragraf kualitatif tanpa angka; v2–v4 = narasi per topik berangka
export const isQualitative = (version = env.promptVersion) => /^narrative_v([5-9]|\d{2,})/.test(version);
// v6 = paragraf kualitatif yang boleh memuat angka (angka wajib tertempel ke metrik & status yang benar)
export const allowsNumbers = (version = env.promptVersion) => /^narrative_v([6-9]|\d{2,})/.test(version);

function qualitativeFallback(input, withNumbers) {
  return {
    source: 'template',
    label: 'Ringkasan otomatis (tanpa AI)',
    text: qualitativeSummary(input, { withNumbers }),
    checks_passed: true,
    prompt_version: env.promptVersion,
  };
}

export async function generateNarrative(
  result,
  {
    useLlm = process.env.USE_OLLAMA !== 'false',
    chatFn = chat,
    pingFn = pingOllama,
    log = console.warn,
    style = isQualitative() ? 'qualitative' : 'facts',
    numbers = allowsNumbers(),
  } = {}
) {
  const input = buildInput(result);
  const qualitative = style === 'qualitative';
  const fallback = qualitative ? qualitativeFallback(input, numbers) : templateSummary(input);
  const tag = input?.ticker || 'UNKNOWN';

  if (!useLlm) return fallback;

  // REV-05: data terlalu sedikit -> jangan panggil LLM (model akan mengarang atau menyalin contoh)
  if (countAvailableNumbers(input) < 3) {
    log(`[narrator] data metrik tidak cukup untuk LLM (${tag}); pakai templat`);
    return fallback;
  }

  if ((await pingFn()) !== 'ok') return fallback;

  let response;
  let model;
  const t0 = Date.now();
  try {
    ({ response, model } = await chatFn(buildPrompt(input)));
  } catch (err) {
    log(`[narrator] panggilan Qwen gagal (${tag}) setelah ${((Date.now() - t0) / 1000).toFixed(1)} dtk: ${err.message}`);
    return { ...fallback, llm_error: err.message };
  }

  if (qualitative) {
    const q = repairQualitative(response, input, toPlainText, { allowNumbers: numbers });
    const qRepairs = { dropped_sentences: q.dropped.length, llm_sentences: q.llmSentences, aspects: q.aspects, added: q.added, dropped: q.dropped.slice(0, MAX_LOGGED_DROPS) };
    if (q.dropped.length) log(`[narrator] ${tag}: ${q.dropped.length} kalimat dibuang`, q.dropped.slice(0, MAX_LOGGED_DROPS));
    const fmt = checkPlainText(q.text);
    if (q.ok && fmt.ok) {
      return {
        source: 'llm',
        label: q.added.length ? 'Ringkasan AI · Qwen3 lokal (dilengkapi otomatis)' : 'Ringkasan AI · Qwen3 lokal',
        text: q.text,
        checks_passed: true,
        model,
        prompt_version: env.promptVersion,
        repairs: qRepairs,
      };
    }
    log(`[narrator] ${tag}: narasi Qwen tidak dipakai`, { repair: q.reason ?? null, formatProblems: fmt.problems });
    return { ...fallback, repairs: qRepairs };
  }

  const rep = repairNarrative(response, input, fallback.text);
  const format = checkPlainText(rep.text);
  const check = checkNarrative(rep.text, input);
  const coverage = checkCoverage(rep.text, input);
  const repairs = {
    dropped_sentences: rep.dropped.length,
    llm_topics: rep.llmTopics,
    filled_topics: rep.filledTopics,
    dropped: rep.dropped.slice(0, MAX_LOGGED_DROPS),
  };

  if (rep.dropped.length) {
    log(`[narrator] ${tag}: ${rep.dropped.length} kalimat dibuang`, rep.dropped.slice(0, MAX_LOGGED_DROPS));
  }

  if (rep.ok && format.ok && check.ok && coverage.ok) {
    return {
      source: 'llm',
      label: rep.filledTopics.length ? 'Ringkasan AI · Qwen3 lokal (dilengkapi otomatis)' : 'Ringkasan AI · Qwen3 lokal',
      text: rep.text,
      checks_passed: true,
      model,
      prompt_version: env.promptVersion,
      repairs,
    };
  }

  log(`[narrator] ${tag}: narasi Qwen tidak dipakai`, {
    repair: rep.reason ?? null,
    formatProblems: format.problems,
    checkReason: check.reason ?? (check.ok ? null : 'unmatched'),
    unmatched: check.unmatched,
    coverage: coverage.problems,
  });
  return { ...fallback, repairs };
}
