// REV-06: narasi Qwen diperbaiki per kalimat; angka harus tertempel ke metrik dan status yang benar.
// Teks uji meniru keluaran nyata qwen3:1.7b pada eval 13 Nov 2026 (data/processed/qwen_eval_*).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildInput, buildFactSheet } from '../src/narrator/input.js';
import { templateSummary } from '../src/narrator/template.js';
import { buildCatalog, checkSentenceBinding } from '../src/narrator/binding.js';
import { repairNarrative } from '../src/narrator/repair.js';
import { generateNarrative, buildPrompt } from '../src/narrator/service.js';
import { checkNarrative } from '../src/narrator/validator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mock = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../frontend/src/mock/analyze.json'), 'utf8'));
const input = buildInput(mock);
const catalog = buildCatalog(input);
const tplText = templateSummary(input).text;
const silent = () => {};
// Tes REV-06 menguji gaya narasi berangka (prompt v4)
const llm = (response) => ({ style: 'facts', useLlm: true, pingFn: async () => 'ok', chatFn: async () => ({ response, model: 'qwen3:1.7b' }), log: silent });

test('REV-06: angka yang ditempel ke metrik lain ditolak', () => {
  const r = checkSentenceBinding('Arus kas tahunan meningkat sebesar 8,3% dengan status waspada.', catalog);
  assert.equal(r.ok, false);
  const r2 = checkSentenceBinding('Pendapatan dan laba tumbuh masing-masing 8,3% dan 88,7%.', catalog);
  assert.equal(r2.ok, false);
});

test('REV-06: status yang dikarang atau tertukar ditolak', () => {
  assert.equal(checkSentenceBinding('Arus kas operasi terhadap aset sebesar 3,1% dengan status sehat.', catalog).ok, false);
  assert.equal(checkSentenceBinding('Current ratio 1,14x berstatus sehat.', catalog).ok, false);
  assert.equal(checkSentenceBinding('ROE berstatus waspada sebesar 0,7%.', catalog).ok, false);
});

test('REV-06: pasangan metrik-angka-status yang benar lolos, termasuk seluruh kalimat templat', () => {
  const ok = checkSentenceBinding(
    'ROE sebesar 0,7% dengan status lemah, ROA sebesar 0,4% juga dengan status lemah, dan margin laba bersih sebesar 0,8% dengan status lemah.',
    catalog
  );
  assert.equal(ok.ok, true);
  assert.equal(ok.bound, 3);
  for (const s of tplText.split(/(?<=[.!?])\s+/)) {
    assert.equal(checkSentenceBinding(s, catalog).ok, true, s);
  }
});

const qwenLike = [
  'Profitabilitas:',
  'ROE sebesar 0,7% dengan status lemah, ROA sebesar 0,4% juga dengan status lemah, dan margin laba bersih sebesar 0,8% dengan status lemah. Kinerja laba cenderung stabil.',
  '',
  'Likuiditas dan solvabilitas: Rasio current ratio sebesar 1,14x dengan status waspada. Rasio liabilitas terhadap aset sebesar 34,5% dengan status sehat.',
  '',
  'Pertumbuhan dan arus kas: Arus kas tahunan meningkat sebesar 8,3% dengan status waspada. Peningkatan arus kas terhadap aset sebesar 3,1% dengan status sehat.',
  '',
  'Valuasi: Pada harga saham Rp3.000, PER 63,03x dan PBV 0,47x.',
  '',
  'Keterbatasan: Data hanya berupa laporan kuartalan dan ketersediaan data juga terbatas.',
].join('\n');

test('REV-06: repairNarrative membuang kalimat salah, mengisi topik kosong dari templat, dan Tier/Keterbatasan dari kode', () => {
  const rep = repairNarrative(qwenLike, input, tplText);
  assert.equal(rep.ok, true);
  assert.deepEqual(rep.llmTopics, ['Profitabilitas', 'Likuiditas dan solvabilitas', 'Valuasi']);
  assert.deepEqual(rep.filledTopics, ['Pertumbuhan dan arus kas']);
  const reasons = rep.dropped.map((d) => d.reason).join(' | ');
  assert.match(reasons, /kata tren/);
  assert.match(reasons, /8,3% bukan milik/);
  assert.match(reasons, /status sehat tidak sesuai/);
  assert.match(reasons, /topik ini ditulis kode/);
  assert.doesNotMatch(rep.text, /cenderung stabil|Arus kas tahunan|ketersediaan data juga terbatas/);
  assert.match(rep.text, /Tier performa: model klaster tier_kmeans_v1/);
  assert.match(rep.text, /Keterbatasan: ROE, ROA, dan valuasi berbasis laba disetahunkan/);
  assert.equal(checkNarrative(rep.text, input).ok, true);
});

test('REV-06: generateNarrative memakai hasil perbaikan dengan label "dilengkapi otomatis" dan mencatat kalimat yang dibuang', async () => {
  const res = await generateNarrative(mock, llm(qwenLike));
  assert.equal(res.source, 'llm');
  assert.equal(res.label, 'Ringkasan AI · Qwen3 lokal (dilengkapi otomatis)');
  assert.ok(res.repairs.dropped_sentences >= 4);
  assert.deepEqual(res.repairs.filled_topics, ['Pertumbuhan dan arus kas']);
});

test('REV-06: bila hanya satu topik yang lolos, pakai templat', async () => {
  const onlyOne = 'Profitabilitas: ROE sebesar 0,7% dengan status lemah dan ROA sebesar 0,4% dengan status lemah serta margin laba bersih 0,8%.\n\nLikuiditas dan solvabilitas: Kondisi ini cenderung stabil.';
  const res = await generateNarrative(mock, llm(onlyOne));
  assert.equal(res.source, 'template');
  assert.ok(res.repairs);
});

test('REV-06: Qwen gagal atau timeout -> templat dengan llm_error, tanpa percobaan kedua', async () => {
  let calls = 0;
  const res = await generateNarrative(mock, {
    style: 'facts',
    useLlm: true,
    pingFn: async () => 'ok',
    chatFn: async () => { calls++; throw new Error('The operation was aborted due to timeout'); },
    log: silent,
  });
  assert.equal(calls, 1);
  assert.equal(res.source, 'template');
  assert.match(res.llm_error, /timeout/);
});

test('REV-06: tanpa PER/PBV, paragraf Valuasi ditulis kode (alasan tepat, mis. USD)', () => {
  const r = structuredClone(mock);
  for (const k of ['per', 'pbv', 'ps', 'fair_value', 'premium_discount']) {
    r.valuation[k] = { ...r.valuation[k], value: null, display: '—', unavailable_reason: 'laporan dalam USD; valuasi dengan harga Rupiah belum didukung' };
  }
  const inp = buildInput(r);
  const rep = repairNarrative(qwenLike, inp, templateSummary(inp).text);
  assert.match(rep.text, /Valuasi: belum dihitung karena laporan dalam USD/);
  assert.ok(rep.dropped.some((d) => d.reason === 'valuasi tanpa PER/PBV ditulis kode'));
});

test('REV-06: prompt v4 memakai lembar fakta dengan nama metrik yang dikenali pemeriksa', () => {
  const facts = buildFactSheet(input);
  for (const name of ['ROE: 0,7%', 'current ratio: 1,14x', 'pertumbuhan pendapatan: 8,3%', 'konversi kas: 8,95x', 'arus kas operasi terhadap aset: 3,1% (tanpa status']) {
    assert.ok(facts.includes(name), name);
  }
  const prompt = buildPrompt(input, 'narrative_v4');
  assert.ok(prompt.includes('FAKTA:'));
  assert.ok(prompt.includes(facts));
  assert.doesNotMatch(prompt, /stabil|konsisten|membaik/);
});

test('REV-06b: paragraf tanpa awalan "Topik:" ditentukan topiknya dari isi (keluaran nyata Qwen)', () => {
  const unprefixed = [
    'Profitabilitas emiten SMGR pada Q1 2026-03-31 tercatat dengan ROE 0,7% (status lemah) dan ROA 0,4% (status lemah), menunjukkan kinerja yang tidak memuaskan.',
    'Ratios likuiditas emiten, seperti current ratio 1,14x (status waspada) dan DER 0,55x (status waspada), menunjukkan kinerja likuiditas yang stabil, tetapi tidak optimal.',
    'Pertumbuhan pendapatan emiten mencapai 8,3% (status waspada) dibanding periode yang sama tahun lalu, sementara pertumbuhan laba mencapai 88,7% (status sehat).',
    'Harga saham emiten tercatat Rp3.000, dengan PER 63,03x dan PBV 0,47x.',
  ].join('\n\n');
  const rep = repairNarrative(unprefixed, input, tplText);
  assert.equal(rep.ok, true);
  assert.deepEqual(rep.llmTopics, ['Profitabilitas', 'Pertumbuhan dan arus kas', 'Valuasi']);
  assert.deepEqual(rep.filledTopics, ['Likuiditas dan solvabilitas']);
  assert.match(rep.text, /^Profitabilitas: Emiten SMGR pada Q1/);
  assert.doesNotMatch(rep.text, /Profitabilitas: Profitabilitas/);
});

test('REV-06b: "mengalami pertumbuhan -10,3%" terikat ke kelompok pertumbuhan, bukan ke metrik lain', () => {
  assert.equal(checkSentenceBinding('Pendapatan emiten mengalami pertumbuhan 8,3% dengan status waspada.', catalog).ok, true);
  assert.equal(checkSentenceBinding('Pendapatan emiten mengalami pertumbuhan 0,7%.', catalog).ok, false);
});
