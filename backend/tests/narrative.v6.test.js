// Narasi v6: paragraf kualitatif yang boleh memuat angka, asalkan setiap angka sama persis dengan data
// dan tertempel ke metrik & status yang benar. Contoh gaya dari pengguna (AKRA, 13 Nov 2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildInput } from '../src/narrator/input.js';
import { buildStatusSheet, checkQualitativeSentence, qualitativeSummary } from '../src/narrator/qualitative.js';
import { generateNarrative, buildPrompt } from '../src/narrator/service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mock = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../frontend/src/mock/analyze.json'), 'utf8'));
const input = buildInput(mock); // SMGR mock: tier mid, harga Rp3.000 di atas nilai wajar Graham
const silent = () => {};
const qwen = (response) => ({ style: 'qualitative', numbers: true, useLlm: true, pingFn: async () => 'ok', chatFn: async () => ({ response, model: 'qwen3:1.7b' }), log: silent });
const opt = { allowNumbers: true };

const good =
  'SMGR menunjukkan kinerja keuangan yang cukup baik dengan beberapa hal yang perlu dicermati, didukung pertumbuhan laba pemilik entitas induk 88,7% dan arus kas operasi sebesar 8,95 kali laba bersih. ' +
  'Namun, ROE 0,7%, ROA 0,4%, dan margin laba bersih 0,8% masih lemah, sementara current ratio 1,14x dan DER 0,55x menunjukkan perlunya kewaspadaan pada likuiditas dan struktur permodalan. ' +
  'Berdasarkan model klaster `tier_kmeans_v1`, SMGR berada pada kategori mid dibandingkan emiten non-keuangan BEI periode Q1 2025. ' +
  'Pada harga saham Rp3.000, PER tercatat 63,03x dan harga berada di atas nilai wajar Graham Rp2.628, dengan catatan bahwa ROE, ROA, dan valuasi berbasis laba disetahunkan dari laporan kuartalan serta jumlah saham belum dikurangi saham treasuri.';

test('v6: paragraf berangka yang benar dipakai apa adanya (tanda ` dibuang)', async () => {
  const res = await generateNarrative(mock, qwen(good));
  assert.equal(res.source, 'llm');
  assert.equal(res.repairs.dropped_sentences, 0, JSON.stringify(res.repairs.dropped));
  assert.equal(res.text, good.replace(/`/g, ''));
});

test('v6: angka yang berbeda dari data atau tertempel ke metrik lain dibuang', () => {
  assert.match(checkQualitativeSentence('ROE SMGR sebesar 0,8% masih lemah.', input, opt), /bukan milik roe/);
  assert.match(checkQualitativeSentence('Arus kas operasi tumbuh 8,3%.', input, opt), /bukan milik|tanpa nama metrik|tidak ada di data/);
  assert.match(checkQualitativeSentence('Current ratio 1,14x tergolong sehat.', input, opt), /status sehat tidak sesuai/);
  assert.equal(checkQualitativeSentence('Arus kas operasi sebesar 8,95 kali laba bersih tergolong sehat.', input, opt), null);
});

test('v6: klaim valuasi harus sesuai data', () => {
  assert.match(checkQualitativeSentence('Valuasi belum dapat ditentukan karena harga saham belum tersedia.', input, opt), /harga belum tersedia padahal ada/);
  assert.match(checkQualitativeSentence('Harga saham berada di bawah nilai wajar Graham.', input, opt), /di atas nilai wajar/);
  assert.match(checkQualitativeSentence('SMGR berada pada kategori high.', input, opt), /tier high tidak sesuai/);
});

test('v6: kalimat salah dibuang, sisanya dipakai dan dilengkapi kode', async () => {
  const mixed =
    'SMGR menunjukkan kinerja keuangan yang cukup baik dengan beberapa hal yang perlu dicermati, didukung arus kas operasi sebesar 8,95 kali laba bersih. ' +
    'ROE 0,9% tergolong kuat. ' +
    'Current ratio 1,14x dan DER 0,55x menunjukkan perlunya kewaspadaan pada likuiditas dan struktur permodalan.';
  const res = await generateNarrative(mock, qwen(mixed));
  assert.equal(res.source, 'llm');
  assert.equal(res.repairs.dropped_sentences, 1);
  assert.deepEqual(res.repairs.added, ['tier', 'valuasi', 'keterbatasan']);
  assert.doesNotMatch(res.text, /0,9%/);
});

test('v6: ringkasan otomatis berangka lolos pemeriksa yang sama', () => {
  const t = qualitativeSummary(input, { withNumbers: true });
  for (const s of t.split(/(?<=[.!?])\s+/)) assert.equal(checkQualitativeSentence(s, input, opt), null, s);
  assert.match(t, /ROE 0,7%/);
});

test('v6: prompt memuat DATA berangka beserta statusnya', () => {
  const sheet = buildStatusSheet(input, { withNumbers: true });
  assert.match(sheet, /Profitabilitas: ROE 0,7% \(lemah\), ROA 0,4% \(lemah\)/);
  assert.match(sheet, /arus kas operasi terhadap laba bersih 8,95x \(sehat\)/);
  const prompt = buildPrompt(input, 'narrative_v6');
  assert.ok(prompt.includes(sheet));
});
