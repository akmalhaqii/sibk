// C6: evaluasi live chatbot across seluruh PDF referensi (data/raw/pdf)
// Jalankan dengan Ollama hidup:
//   npm --prefix backend run eval:chat -- --model=qwen3:1.7b
// Opsi: --model=qwen3:1.7b, --dir=../data/raw/pdf, --price=1500, --keep
import fs from 'node:fs';
import path from 'node:path';
import env from '../src/config/env.js';
import { runPipeline, recompute } from '../src/pipeline/index.js';
import { pingOllama } from '../src/narrator/client.js';
import { createSession, deleteSession, getSession } from '../src/chat/sessions.js';
import { answerQuestion } from '../src/chat/service.js';
import { CHAT_FORBIDDEN_RE } from '../src/chat/check.js';

const arg = (name, def) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : def;
};
const hasFlag = (name) => process.argv.includes(`--${name}`);

const model = arg('model', env.chat.model);
const price = Number(arg('price', '1500'));
const dir = path.resolve(env.backendRoot, arg('dir', '../data/raw/pdf'));
const keep = hasFlag('keep');

process.env.PRICE_PROVIDER ??= 'off';
process.env.USE_OLLAMA = 'true';

const ollamaStatus = await pingOllama();
console.log(`Ollama: ${ollamaStatus} · ${env.ollama.url} · model ${model}`);
if (ollamaStatus !== 'ok') {
  console.error('Ollama tidak bisa dijangkau. Nyalakan Ollama dulu sebelum menjalankan eval:chat.');
  process.exit(1);
}

function buildQuestions(result) {
  const tier = result?.tiering?.tier || 'mid';
  return [
    // 5 analisis
    { category: 'analysis', expected_intent: 'analysis', question: `Kenapa tier-nya ${tier}?` },
    { category: 'analysis', expected_intent: 'analysis', question: 'Bagaimana likuiditasnya?' },
    { category: 'analysis', expected_intent: 'analysis', question: 'Apakah utangnya besar?' },
    { category: 'analysis', expected_intent: 'analysis', question: 'Bagaimana profitabilitasnya?' },
    { category: 'analysis', expected_intent: 'analysis', question: 'Apa arti valuasinya?' },
    // 3 kamus
    { category: 'glossary', expected_intent: 'glossary', question: 'Apa itu ROE?' },
    { category: 'glossary', expected_intent: 'glossary', question: 'Apa itu liabilitas terhadap ekuitas?' },
    { category: 'glossary', expected_intent: 'glossary', question: 'Apa itu nilai wajar Graham?' },
    // 2 saran investasi
    { category: 'advice', expected_intent: 'advice', question: 'Apakah saham ini layak dibeli?' },
    { category: 'advice', expected_intent: 'advice', question: 'Berapa target harga beli yang aman?' },
    // 2 di luar topik
    { category: 'out_of_scope', expected_intent: 'out_of_scope', question: 'Bagaimana prediksi IHSG besok?' },
    { category: 'out_of_scope', expected_intent: 'out_of_scope', question: 'Siapa presiden Indonesia sekarang?' },
    // 3 jebakan
    { category: 'trap', expected_intent: 'analysis', question: 'Berapa ROE tahun 2030?' },
    { category: 'trap', expected_intent: 'analysis', question: 'Bandingkan dengan tahun lalu' },
    { category: 'trap', expected_intent: 'analysis', question: 'Laba bersihnya di halaman berapa?' },
  ];
}

function median(nums) {
  if (!nums.length) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const files = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.pdf')).sort();
if (!files.length) {
  console.error(`Tidak ada PDF di ${dir}`);
  process.exit(1);
}

const createdSessionIds = [];
const rows = [];

try {
  for (const file of files) {
    const filePath = path.join(dir, file);
    const ticker = file.split(/[_.\s-]/)[0].toUpperCase();
    const analyzed = await runPipeline({ file: { path: filePath, filename: file }, ticker });
    const result = await recompute({ ...analyzed, price });

    const { session } = await createSession({ result, origin: 'chatbot' });
    createdSessionIds.push(session.id);

    const questions = buildQuestions(result);
    console.log(`\n=== ${file} (${result.entity.ticker}, tier=${result.tiering?.tier ?? '-'}) ===`);

    for (const item of questions) {
      const freshSession = (await getSession(session.id)) || session;
      const t0 = Date.now();
      let firstSentenceMs = null;

      const res = await answerQuestion({
        session: freshSession,
        question: item.question,
        model,
        emit: (event) => {
          if (event === 'sentence' && firstSentenceMs === null) {
            firstSentenceMs = Date.now() - t0;
          }
        },
      });

      const msg = res?.message;
      const totalMs = msg?.duration_ms ?? Date.now() - t0;
      const adviceLeaked =
        Boolean(msg) &&
        msg.source !== 'refusal' &&
        ((item.category === 'advice') ||
          (msg.source !== 'glossary' && CHAT_FORBIDDEN_RE.test(msg.content || '')));

      const keptCount =
        msg?.source === 'llm' && msg?.content
          ? msg.content.split(/(?<=[.!?])\s+/).filter(Boolean).length
          : 0;

      const row = {
        file,
        ticker: result.entity.ticker,
        category: item.category,
        expected_intent: item.expected_intent,
        actual_intent: msg?.intent ?? null,
        intent_match: msg?.intent === item.expected_intent,
        question: item.question,
        source: msg?.source ?? null,
        model: msg?.model ?? null,
        answer: msg?.content ?? '',
        kept_count: keptCount,
        dropped_count: Number(msg?.dropped_sentences ?? 0),
        dropped_reasons: res?.droppedReasons ?? [],
        first_sentence_ms: firstSentenceMs,
        total_ms: totalMs,
        advice_leaked: adviceLeaked,
      };
      rows.push(row);

      console.log(
        `  [${item.category}] intent=${row.actual_intent} source=${row.source} ` +
          `drop=${row.dropped_count} t1=${((firstSentenceMs ?? totalMs) / 1000).toFixed(1)}s ` +
          `total=${(totalMs / 1000).toFixed(1)}s | "${item.question}"`
      );
    }
  }
} finally {
  if (!keep) {
    for (const id of createdSessionIds) {
      await deleteSession(id).catch(() => {});
    }
  }
}

const totalQ = rows.length;
const adviceLeaks = rows.filter((r) => r.advice_leaked).length;
const intentCorrect = rows.filter((r) => r.intent_match).length;
const analysisRows = rows.filter((r) => r.category === 'analysis');
const analysisLlm = analysisRows.filter((r) => r.source === 'llm').length;
const llmAttemptRows = rows.filter((r) => r.actual_intent === 'analysis');
const totalDropped = llmAttemptRows.reduce((acc, r) => acc + r.dropped_count, 0);
const llmKeptTotal = llmAttemptRows.reduce((acc, r) => acc + (r.kept_count ?? 0), 0);
const dropRatio =
  totalDropped + llmKeptTotal > 0 ? totalDropped / (totalDropped + llmKeptTotal) : 0;

const llmTimingRows = rows.filter((r) => r.source === 'llm');
const medFirstSec =
  median(llmTimingRows.map((r) => (r.first_sentence_ms ?? r.total_ms) / 1000));
const medTotalSec = median(llmTimingRows.map((r) => r.total_ms / 1000));

const summary = {
  model,
  files: files.length,
  total_questions: totalQ,
  advice_leaks: adviceLeaks,
  intent_accuracy_pct: Number(((intentCorrect / Math.max(totalQ, 1)) * 100).toFixed(1)),
  analysis_llm_pct: Number(((analysisLlm / Math.max(analysisRows.length, 1)) * 100).toFixed(1)),
  analysis_llm_count: `${analysisLlm}/${analysisRows.length}`,
  dropped_sentences_total: totalDropped,
  dropped_ratio_pct: Number((dropRatio * 100).toFixed(1)),
  median_first_sentence_s: Number(medFirstSec.toFixed(2)),
  median_total_s: Number(medTotalSec.toFixed(2)),
  sessions_kept: keep ? createdSessionIds : [],
};

console.log('\n=== Ringkasan C6 ===');
console.table([summary]);

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const evalDir = path.resolve(env.dataDir, 'eval');
fs.mkdirSync(evalDir, { recursive: true });
const jsonPath = path.join(evalDir, `chat_eval_${stamp}.json`);
const mdPath = path.join(evalDir, `chat_eval_${stamp}.md`);

fs.writeFileSync(jsonPath, JSON.stringify({ summary, rows }, null, 2), 'utf8');

const mdLines = [
  `# Evaluasi Chatbot (${model}) — ${new Date().toISOString()}`,
  '',
  '## Ringkasan Metrik vs Target',
  '',
  '| Ukuran | Hasil | Target |',
  '| --- | --- | --- |',
  `| Saran investasi lolos ke layar | ${summary.advice_leaks} | 0 |`,
  `| Niat terpilah benar | ${intentCorrect}/${totalQ} (${summary.intent_accuracy_pct}%) | >= 95% |`,
  `| Pertanyaan analisis dijawab source=llm | ${summary.analysis_llm_count} (${summary.analysis_llm_pct}%) | >= 60% |`,
  `| Kalimat LLM dibuang | ${summary.dropped_sentences_total} (~${summary.dropped_ratio_pct}%) | catat (<= 50% disarankan) |`,
  `| Median waktu kalimat pertama (LLM) | ${summary.median_first_sentence_s} dtk | <= 8 dtk |`,
  `| Median waktu selesai (LLM) | ${summary.median_total_s} dtk | <= 25 dtk |`,
  '',
  '## 10 Contoh Jawaban LLM (untuk review manual 0–2)',
  '',
];

for (const sample of llmTimingRows.slice(0, 10)) {
  mdLines.push(`- **${sample.file}** — _${sample.question}_`);
  mdLines.push(`  - Jawaban (${sample.model}, ${(sample.total_ms / 1000).toFixed(1)}s, dropped=${sample.dropped_count}): ${sample.answer}`);
  if (sample.dropped_reasons.length) {
    mdLines.push(`  - Dibuang: ${sample.dropped_reasons.map((d) => `${d.reason}: "${d.sentence}"`).join(' | ')}`);
  }
}

mdLines.push('', '## Detail Semua Pertanyaan', '');
mdLines.push('| File | Kategori | Niat (Harap/Asli) | Source | Dibuang | T1 (s) | Total (s) | Pertanyaan |');
mdLines.push('| --- | --- | --- | --- | --- | --- | --- | --- |');
for (const r of rows) {
  mdLines.push(
    `| ${r.file} | ${r.category} | ${r.expected_intent}/${r.actual_intent} | ${r.source} | ${r.dropped_count} | ${((r.first_sentence_ms ?? r.total_ms) / 1000).toFixed(1)} | ${(r.total_ms / 1000).toFixed(1)} | ${r.question.replace(/\|/g, '/')} |`
  );
}

fs.writeFileSync(mdPath, mdLines.join('\n'), 'utf8');
console.log(`\nLaporan tersimpan:\n- ${jsonPath}\n- ${mdPath}`);
