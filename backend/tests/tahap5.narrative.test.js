// Tahap 5 · REV-05: narasi LLM tidak boleh lolos dengan isian kosong atau data yang bukan hasil analisis
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import app from '../src/app.js';
import { buildInput } from '../src/narrator/input.js';
import { templateSummary } from '../src/narrator/template.js';
import { checkCoverage, countAvailableNumbers } from '../src/narrator/validator.js';
import { generateNarrative } from '../src/narrator/service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mockAnalyze = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../frontend/src/mock/analyze.json'), 'utf8')
);

// Bentuk keluaran Qwen yang ditemukan saat uji: menyalin contoh prompt v2 apa adanya
const placeholderEcho = [
  'Profitabilitas: ROE … dengan status …, ROA …, dan margin laba bersih ….',
  'Likuiditas dan solvabilitas: current ratio … dan rasio liabilitas terhadap aset ….',
  'Keterbatasan: …',
].join('\n\n');

const goodLlm = [
  'Profitabilitas: ROE 0,7% (lemah), ROA 0,4% (lemah), dan margin laba bersih 0,8% (lemah).',
  'Likuiditas dan solvabilitas: current ratio 1,14x (waspada) dan DER 0,55x (waspada).',
  'Tier performa: SMGR berada pada tier mid, relatif terhadap emiten non-keuangan BEI periode Q1 2025.',
  'Keterbatasan: ROE dan ROA disetahunkan dari laporan kuartalan.',
].join('\n\n');

const llmOpts = (response) => ({
  style: 'facts', // REV-05 menguji gaya narasi berangka (prompt v4)
  useLlm: true,
  pingFn: async () => 'ok',
  chatFn: async () => ({ response, model: 'qwen3:1.7b' }),
});

test('REV-05: checkCoverage menolak salinan contoh bertitik-titik', () => {
  const input = buildInput(mockAnalyze);
  const res = checkCoverage(placeholderEcho, input);
  assert.equal(res.ok, false);
  assert.ok(res.problems.includes('placeholder'));
  assert.ok(res.problems.includes('too_few_numbers'));
});

test('REV-05: checkCoverage menolak teks tanpa paragraf Profitabilitas atau Keterbatasan', () => {
  const input = buildInput(mockAnalyze);
  const res = checkCoverage('Likuiditas dan solvabilitas: current ratio 1,14x, DER 0,55x, dan ROE 0,7%.', input);
  assert.equal(res.ok, false);
  assert.ok(res.problems.includes('missing_topic:Profitabilitas'));
  assert.ok(res.problems.includes('missing_topic:Keterbatasan'));
});

test('REV-05: checkCoverage meloloskan narasi lengkap dan teks templat', () => {
  const input = buildInput(mockAnalyze);
  assert.equal(checkCoverage(goodLlm, input).ok, true);
  assert.equal(checkCoverage(templateSummary(input).text, input).ok, true);
});

test('REV-05: generateNarrative dengan balasan bertitik-titik jatuh ke templat', async () => {
  const res = await generateNarrative(mockAnalyze, llmOpts(placeholderEcho));
  assert.equal(res.source, 'template');
});

test('REV-05: generateNarrative dengan balasan lengkap tetap memakai LLM', async () => {
  const res = await generateNarrative(mockAnalyze, llmOpts(goodLlm));
  assert.equal(res.source, 'llm');
});

test('REV-05: data metrik kosong tidak memanggil LLM sama sekali', async () => {
  let called = false;
  const empty = { entity: { ticker: 'XXXX' }, metrics: {} };
  assert.equal(countAvailableNumbers(buildInput(empty)), 0);
  const res = await generateNarrative(empty, {
    useLlm: true,
    pingFn: async () => 'ok',
    chatFn: async () => { called = true; return { response: goodLlm, model: 'x' }; },
  });
  assert.equal(called, false);
  assert.equal(res.source, 'template');
});

test('REV-05: POST /api/narrative dengan body error ditolak 400', async () => {
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  try {
    const { port } = server.address();
    const res = await fetch(`http://127.0.0.1:${port}/api/narrative`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'harga tidak tersedia' }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /hasil analisis/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
