import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NarrativeResponse } from '../src/schemas/index.js';
import { buildInput } from '../src/narrator/input.js';
import { templateSummary } from '../src/narrator/template.js';
import { checkNarrative } from '../src/narrator/validator.js';
import { generateNarrative } from '../src/narrator/service.js';
import { toPlainText, checkPlainText } from '../src/narrator/plaintext.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mockAnalyze = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../frontend/src/mock/analyze.json'), 'utf8')
);

const akraBulletRaw = [
  '**Laporan Keuangan AKRA (Q1 2026)**',
  '- **Kinerja Keuangan**: Kuartal pertama tahun 2026 menunjukkan pertumbuhan pendapatan sebesar 26,2%.',
  '- **Kinerja Keuangan Relatif**: Tier emiten AKRA diklasifikasikan sebagai "high".',
  '- **Keterbatasan**: Kinerja keuangan disajikan berdasarkan laporan kuartalan.',
].join('\n');

const akraInlineRaw =
  '**Laporan Keuangan AKRA (Q1 2026)** - **Kinerja Keuangan**: Kuartal pertama tahun 2026 menunjukkan pertumbuhan pendapatan sebesar 26,2%. - **Kinerja Keuangan Relatif**: Tier emiten AKRA diklasifikasikan sebagai "high". - **Keterbatasan**: Kinerja keuangan disajikan berdasarkan laporan kuartalan.';

test('narrator: templateSummary menghasilkan teks tidak kosong dan lolos skema NarrativeResponse', () => {
  const input = buildInput(mockAnalyze);
  const res = templateSummary(input);

  assert.equal(res.source, 'template');
  assert.equal(res.label, 'Ringkasan otomatis (tanpa AI)');
  assert.ok(res.text.length > 100, 'teks narasi tidak boleh kosong');
  assert.ok(res.text.includes('Profitabilitas: ROE 0,7% (lemah)'));
  assert.ok(res.text.includes('current ratio 1,14x (waspada)'));
  assert.ok(res.text.includes('tier mid'));

  const parsed = NarrativeResponse.safeParse(res);
  assert.equal(parsed.success, true, JSON.stringify(parsed.error?.issues));
});

test('narrator: teks narasi tidak mengandung kata terlarang dan lolos checkNarrative', () => {
  const input = buildInput(mockAnalyze);
  const res = templateSummary(input);

  assert.equal(/\b(beli|jual|tahan|rekomendasi)\b/i.test(res.text), false);
  const check = checkNarrative(res.text, input);
  assert.equal(check.ok, true, `Unmatched tokens: ${JSON.stringify(check.unmatched)}`);

  // Pastikan validator menolak angka halusinasi dan kata terlarang
  const badNumber = checkNarrative('ROE mencapai 99,9% tahun ini.', input);
  assert.equal(badNumber.ok, false);
  const badWord = checkNarrative('Saran beli untuk saham SMGR.', input);
  assert.equal(badWord.ok, false);
});

test('narrator: generateNarrative otomatis fallback ke templat jika Ollama mati atau gagal validasi', async () => {
  const resDown = await generateNarrative(mockAnalyze, {
    useLlm: true,
    pingFn: async () => 'down',
  });
  assert.equal(resDown.source, 'template');
  assert.equal(NarrativeResponse.safeParse(resDown).success, true);

  const resBadLlm = await generateNarrative(mockAnalyze, {
    useLlm: true,
    pingFn: async () => 'ok',
    chatFn: async () => ({ response: 'Rekomendasi beli dengan ROE 55,5%.', model: 'qwen3:4b' }),
  });
  assert.equal(resBadLlm.source, 'template');
});

test('REV-03: toPlainText membersihkan contoh AKRA berbutir dan sebaris secara identik', () => {
  const cleanedBullet = toPlainText(akraBulletRaw);
  const cleanedInline = toPlainText(akraInlineRaw);

  assert.equal(/[*#]/.test(cleanedBullet), false, 'tidak boleh ada simbol * atau #');
  assert.equal(/^\s*-\s/m.test(cleanedBullet), false, 'tidak boleh ada baris berawalan - ');
  const paras = cleanedBullet.split('\n\n');
  assert.equal(paras.length, 3, 'harus menghasilkan 3 paragraf');
  assert.ok(paras[0].startsWith('Kinerja Keuangan:'), `paragraf pertama harus diawali Kinerja Keuangan:, aktual: ${paras[0]}`);
  assert.equal(cleanedInline, cleanedBullet, 'versi sebaris harus menghasilkan teks yang sama');
  assert.equal(checkPlainText(cleanedBullet).ok, true);
});

test('REV-03: toPlainText menghapus ## Ringkasan, penomoran 1., dan <think>, serta menjaga angka minus −0,5x', () => {
  const raw = [
    '<think>sedang berpikir...</think>',
    '## Ringkasan',
    '1. **Profitabilitas**: ROE tercatat 0,7% dan perubahan −0,5x pada periode ini.',
    '2. **Keterbatasan**: Data disetahunkan dari laporan kuartalan.',
  ].join('\n');

  const cleaned = toPlainText(raw);
  assert.equal(cleaned.includes('sedang berpikir'), false);
  assert.equal(cleaned.includes('Ringkasan'), false);
  assert.equal(/^\d+\./m.test(cleaned), false);
  assert.ok(cleaned.includes('−0,5x'), 'angka minus U+2212 harus utuh');
  assert.equal(checkPlainText(cleaned).ok, true);
});

test('REV-03: toPlainText pada templateSummary tidak mengubah teks yang sudah bersih', () => {
  const input = buildInput(mockAnalyze);
  const tplText = templateSummary(input).text;
  assert.equal(toPlainText(tplText), tplText);
});

test('REV-03: checkPlainText menolak teks mentah AKRA dengan markdown_symbol dan list_marker', () => {
  const res = checkPlainText(akraBulletRaw);
  assert.equal(res.ok, false);
  assert.ok(res.problems.includes('markdown_symbol'));
  assert.ok(res.problems.includes('list_marker'));
});

test('REV-03: generateNarrative dengan chatFn Markdown berangka valid menghasilkan source llm dan lolos checkPlainText', async () => {
  const res = await generateNarrative(mockAnalyze, {
    style: 'facts',
    useLlm: true,
    pingFn: async () => 'ok',
    chatFn: async () => ({
      response: [
        '**Ringkasan SMGR Q1 2026**',
        '- **Profitabilitas**: ROE tercatat 0,7% (lemah), ROA 0,4% (lemah), dan margin laba bersih 0,8% (lemah).',
        '- **Likuiditas dan solvabilitas**: current ratio 1,14x (waspada) dan DER 0,55x (waspada).',
        '- **Tier performa**: SMGR berada pada tier mid berdasarkan model tier_kmeans_v1.',
        '- **Keterbatasan**: Rasio disetahunkan dari Q1.',
      ].join('\n'),
      model: 'qwen3:1.7b',
    }),
  });

  assert.equal(res.source, 'llm');
  assert.equal(res.prompt_version, 'narrative_v6');
  assert.equal(checkPlainText(res.text).ok, true);
});

test('REV-03: generateNarrative dengan chatFn lebih dari 6 paragraf jatuh ke fallback templat', async () => {
  const sevenParas = Array.from({ length: 7 }, (_, i) => `Paragraf ${i + 1}: current ratio 1,14x (waspada).`).join('\n\n');
  const res = await generateNarrative(mockAnalyze, {
    useLlm: true,
    pingFn: async () => 'ok',
    chatFn: async () => ({ response: sevenParas, model: 'qwen3:1.7b' }),
  });

  assert.equal(res.source, 'template');
});

test('REV-04: checkNarrative menolak klaim status tanpa metrik dan kata tren, serta meloloskan kalimat valid', () => {
  const input = buildInput(mockAnalyze);

  const badStatus = checkNarrative('Kinerja keuangan emiten ini bersifat sehat.', input);
  assert.equal(badStatus.ok, false);
  assert.equal(badStatus.reason, 'status_without_metric');

  const goodStatus = checkNarrative('Current ratio 1,14x berstatus waspada.', input);
  assert.equal(goodStatus.ok, true);

  const badTrend = checkNarrative('Pertumbuhan pendapatan 8,3% menunjukkan kinerja yang stabil.', input);
  assert.equal(badTrend.ok, false);
  assert.equal(badTrend.reason, 'trend_word');

  const tpl = templateSummary(input);
  assert.equal(checkNarrative(tpl.text, input).ok, true);
});
