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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mockAnalyze = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../frontend/src/mock/analyze.json'), 'utf8')
);

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
