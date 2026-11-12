// Narasi v5: satu paragraf kualitatif tanpa angka; penilaian tiap aspek harus sesuai status di data.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildInput } from '../src/narrator/input.js';
import { buildStatusSheet, checkQualitativeSentence, qualitativeSummary } from '../src/narrator/qualitative.js';
import { generateNarrative, buildPrompt } from '../src/narrator/service.js';
import { checkPlainText } from '../src/narrator/plaintext.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mock = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../frontend/src/mock/analyze.json'), 'utf8'));
// mock SMGR: profitabilitas & margin lemah, pertumbuhan waspada/sehat, arus kas sehat,
// likuiditas waspada, permodalan waspada/sehat, tier mid, harga di atas nilai wajar Graham
const input = buildInput(mock);
const silent = () => {};
const qwen = (response) => ({ style: 'qualitative', numbers: false, useLlm: true, pingFn: async () => 'ok', chatFn: async () => ({ response, model: 'qwen3:1.7b' }), log: silent });

const good =
  'SMGR menunjukkan kinerja keuangan yang cukup baik dengan beberapa hal yang perlu dicermati. ' +
  'Arus kas operasi tergolong solid, sementara profitabilitas dan margin laba bersih masih lemah. ' +
  'Kondisi likuiditas dan struktur permodalan menunjukkan kewaspadaan. ' +
  'Berdasarkan model klaster tier_kmeans_v1, SMGR tergolong dalam tier mid dibandingkan emiten non-keuangan BEI pada Q1 2025. ' +
  'Dari sisi valuasi, harga saham berada di atas nilai wajar Graham, dan terdapat keterbatasan karena rasio kuartalan disetahunkan serta saham treasuri belum dikurangkan.';

test('v5: paragraf kualitatif yang sesuai status dipakai apa adanya', async () => {
  const res = await generateNarrative(mock, qwen(good));
  assert.equal(res.source, 'llm');
  assert.equal(res.label, 'Ringkasan AI · Qwen3 lokal');
  assert.equal(res.repairs.dropped_sentences, 0);
  assert.equal(res.text, good);
  assert.equal(checkPlainText(res.text).ok, true);
});

test('v5: penilaian yang bertentangan dengan status dibuang', () => {
  assert.match(checkQualitativeSentence('Profitabilitas SMGR tergolong kuat.', input), /positive tidak sesuai untuk profitabilitas/);
  assert.match(checkQualitativeSentence('Likuiditas SMGR sangat sehat.', input), /tidak sesuai untuk likuiditas/);
  assert.match(checkQualitativeSentence('SMGR menunjukkan kinerja keuangan yang relatif kuat.', input), /tidak sesuai untuk overall/);
  assert.equal(checkQualitativeSentence('Arus kas operasi SMGR solid.', input), null);
});

test('v5: angka, saran investasi, dan kata tren dibuang', () => {
  assert.equal(checkQualitativeSentence('ROE SMGR hanya 0,7%.', input), 'memuat angka');
  assert.match(checkQualitativeSentence('Saham ini layak dibeli.', input), /kata terlarang/);
  assert.match(checkQualitativeSentence('Pendapatan cenderung meningkat.', input), /kata tren/);
  // Q1 2025 dan nama model bukan angka metrik
  assert.equal(checkQualitativeSentence('SMGR berada pada tier mid menurut tier_kmeans_v1 terhadap emiten BEI Q1 2025.', input), null);
});

test('v5: tier, valuasi, dan keterbatasan yang tidak disebut Qwen dilengkapi kode', async () => {
  const partial = 'Arus kas operasi SMGR tergolong solid. Profitabilitas dan margin masih lemah. Likuiditas perlu diperhatikan.';
  const res = await generateNarrative(mock, qwen(partial));
  assert.equal(res.source, 'llm');
  assert.equal(res.label, 'Ringkasan AI · Qwen3 lokal (dilengkapi otomatis)');
  assert.deepEqual(res.repairs.added, ['tier', 'valuasi', 'keterbatasan']);
  assert.match(res.text, /tergolong dalam tier mid/);
  assert.match(res.text, /Penilaian valuasi: harga di atas nilai wajar Graham\./);
});

test('v5: bila Qwen hampir seluruhnya salah, pakai ringkasan kualitatif dari kode', async () => {
  const wrong = 'Profitabilitas SMGR sangat kuat dengan ROE 0,7%. Likuiditas SMGR sehat. Saham ini layak dibeli.';
  const res = await generateNarrative(mock, qwen(wrong));
  assert.equal(res.source, 'template');
  assert.equal(res.text, qualitativeSummary(input));
  assert.ok(res.repairs.dropped_sentences >= 3);
});

test('v5: ringkasan otomatis dari kode lolos pemeriksa yang sama dan tanpa angka metrik', () => {
  const t = qualitativeSummary(input);
  for (const s of t.split(/(?<=[.!?])\s+/)) assert.equal(checkQualitativeSentence(s, input), null, s);
  assert.match(t, /^SMGR menunjukkan kinerja keuangan yang cukup baik/);
});

test('v5: prompt memakai lembar STATUS tanpa angka metrik', () => {
  const sheet = buildStatusSheet(input);
  assert.match(sheet, /Profitabilitas \(ROE, ROA\): lemah/);
  assert.match(sheet, /Arus kas operasi: sehat/);
  assert.doesNotMatch(sheet.replace(/tier_kmeans_v\d+|Q1 2025|periode Q1/g, ''), /\d/);
  const prompt = buildPrompt(input, 'narrative_v5');
  assert.ok(prompt.includes(sheet));
  assert.doesNotMatch(prompt, /stabil|konsisten|membaik/);
});
