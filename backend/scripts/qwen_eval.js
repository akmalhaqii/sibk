// Tahap 5: uji narasi Qwen pada PDF referensi (data/raw/pdf) dan catat sumber narasi serta alasan penolakan.
// Jalankan dengan Ollama hidup:  npm run eval:qwen
// Opsi: --price=1500 (harga manual), --dir=../data/raw/pdf, --runs=1
// Hasil: tabel di konsol + data/processed/qwen_eval_<waktu>.json
import fs from 'node:fs';
import path from 'node:path';
import env from '../src/config/env.js';
import { runPipeline, recompute } from '../src/pipeline/index.js';
import { generateNarrative } from '../src/narrator/service.js';
import { pingOllama } from '../src/narrator/client.js';

const arg = (name, def) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : def;
};
const price = Number(arg('price', '1500'));
const runs = Number(arg('runs', '1'));
const dir = path.resolve(env.backendRoot, arg('dir', '../data/raw/pdf'));

process.env.PRICE_PROVIDER ??= 'off';
process.env.USE_OLLAMA = 'true';

const status = await pingOllama();
console.log(`Ollama: ${status} · ${env.ollama.url} · model ${env.ollama.model} (cadangan ${env.ollama.fallbackModel}) · prompt ${env.promptVersion}`);
if (status !== 'ok') {
  console.error('Ollama tidak bisa dijangkau. Nyalakan Ollama dulu (ikon di tray atau `ollama serve`).');
  process.exit(1);
}

const files = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.pdf')).sort();
const rows = [];
for (const file of files) {
  const filePath = path.join(dir, file);
  const ticker = file.split(/[_.\s-]/)[0].toUpperCase(); // mis. SMGR_2026Q1_bei.pdf -> SMGR
  const analyzed = await runPipeline({ file: { path: filePath, filename: file }, ticker });
  const result = await recompute({ ...analyzed, price });
  for (let i = 0; i < runs; i++) {
    const logs = [];
    const t0 = Date.now();
    const n = await generateNarrative(result, {
      log: (...a) => logs.push(a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ')),
    });
    const seconds = (Date.now() - t0) / 1000;
    rows.push({
      file,
      run: i + 1,
      source: n.source,
      label: n.label,
      model: n.model ?? null,
      seconds: Number(seconds.toFixed(1)),
      llm_error: n.llm_error ?? null,
      llm_topics: n.repairs?.llm_topics ?? [],
      filled_topics: n.repairs?.filled_topics ?? [],
      dropped: n.repairs?.dropped ?? [],
      logs,
      text: n.text,
    });
    const note = n.llm_error
      ? `error: ${n.llm_error}`
      : `${n.repairs?.llm_topics?.length ?? 0} topik Qwen, ${n.repairs?.dropped_sentences ?? 0} kalimat dibuang`;
    console.log(`${file} #${i + 1}: ${n.source} · ${seconds.toFixed(1)} dtk · ${note}`);
  }
}

const llm = rows.filter((r) => r.source === 'llm').length;
console.log('\nRingkasan');
console.table(rows.map(({ file, run, source, seconds, llm_topics, filled_topics, dropped, llm_error }) => ({
  file, run, source, seconds,
  topik_qwen: llm_topics.length,
  topik_templat: filled_topics.length,
  kalimat_dibuang: dropped.length,
  error: llm_error ? 'ya' : '',
})));

// Alasan pembuangan kalimat yang paling sering (bahan perbaikan prompt dan bahan sidang)
const reasonCount = {};
for (const r of rows) for (const d of r.dropped) {
  const key = d.reason.replace(/\d[\d.,]*\s?[%x]?/g, 'N').replace(/"[^"]*"/g, '"…"');
  reasonCount[key] = (reasonCount[key] ?? 0) + 1;
}
if (Object.keys(reasonCount).length) {
  console.log('\nAlasan kalimat dibuang:');
  for (const [k, v] of Object.entries(reasonCount).sort((a, b) => b[1] - a[1])) console.log(`  ${v}× ${k}`);
}
const avg = rows.reduce((a, r) => a + r.seconds, 0) / Math.max(rows.length, 1);
console.log(`Rata-rata waktu: ${avg.toFixed(1)} dtk.`);
console.log(`Narasi LLM: ${llm}/${rows.length}. Templat: ${rows.length - llm}/${rows.length}.`);
if (rows.length - llm > Math.floor((3 / 5) * rows.length)) {
  console.log('Lebih dari 3 dari 5 jatuh ke templat: periksa alasan penolakan dan perbaiki prompt sebelum melonggarkan aturan.');
}

const outDir = path.resolve(env.dataDir, 'processed');
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, `qwen_eval_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
fs.writeFileSync(
  outPath,
  JSON.stringify({ ollama: env.ollama, prompt_version: env.promptVersion, price, rows }, null, 2)
);
console.log(`Detail (teks dan alasan penolakan): ${outPath}`);
