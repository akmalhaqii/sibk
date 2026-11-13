// Perbaikan 13 Nov: "Berapa jumlah labanya?" dijawab "Data laba belum tersedia" padahal laba ada di laporan.
// Penyebab: lembar DATA chat hanya memuat rasio. Sekarang angka laporan (pos) ikut dikirim dan diperiksa.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildChatMessages } from '../src/chat/context.js';
import { checkChatSentence, extendCatalog } from '../src/chat/check.js';
import { collectFacts, formatAmount, factsInQuestion } from '../src/chat/facts.js';
import { ruleAnswer } from '../src/chat/rules.js';
import { createSession } from '../src/chat/sessions.js';
import { answerQuestion } from '../src/chat/service.js';
import { buildInput } from '../src/narrator/input.js';
import { buildCatalog } from '../src/narrator/binding.js';
import { checkQualitativeSentence } from '../src/narrator/qualitative.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mock = JSON.parse(await fs.readFile(path.resolve(__dirname, '../../frontend/src/mock/analyze.json'), 'utf8'));
const fresh = () => {
  const c = structuredClone(mock);
  c.entity = { ...c.entity, file_id: `facts_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` };
  return c;
};
const stream = (text) => async function* () { yield text; };

test('fakta: satuan PDF dikonversi ke Rupiah juta/miliar/triliun', () => {
  assert.equal(formatAmount(66616, 'juta IDR'), 'Rp66,62 miliar');
  assert.equal(formatAmount(760252368, 'ribu IDR'), 'Rp760,25 miliar');
  assert.equal(formatAmount(8288486, 'juta IDR'), 'Rp8,29 triliun');
  assert.equal(formatAmount(-1500, 'juta IDR'), '-Rp1,50 miliar');
  assert.equal(formatAmount(null, 'juta IDR'), null);
});

test('fakta: DATA chat memuat angka laporan beserta halaman', () => {
  const [system] = buildChatMessages({ session: { snapshot: mock, messages: [] }, question: 'Berapa jumlah labanya?' });
  assert.match(system.content, /Angka laporan \(periode ini, dari PDF\):.*laba bersih periode berjalan Rp66,62 miliar \(hal\. 7\)/);
  assert.match(system.content, /pendapatan Rp8,29 triliun \(hal\. 7\)/);
  assert.doesNotMatch(system.content, /\(manual\)/);
});

test('fakta: pemeriksa menerima angka pos yang benar dan menolak yang salah', () => {
  const input = buildInput(mock);
  const cat = extendCatalog(buildCatalog(input), mock);
  assert.equal(checkChatSentence('Laba bersih periode berjalan SMGR Rp66,62 miliar, tercantum di halaman 7.', input, cat).ok, true);
  assert.equal(checkChatSentence('Jumlah laba SMGR sebesar Rp66 miliar.', input, cat).ok, false);
  assert.equal(checkChatSentence('Total aset SMGR Rp66,62 miliar.', input, cat).ok, false);
  // Frasa pertumbuhan di DATA tidak tertukar dengan pos "laba pemilik entitas induk"
  const g = input.growth_cash?.earnings_growth?.display;
  if (g && g !== '—') {
    assert.equal(checkChatSentence(`Pertumbuhan laba pemilik entitas induk ${g}.`, input, cat).ok, true);
  }
});

test('fakta: alias pos laporan tidak mengubah pemeriksa ringkasan eksekutif', () => {
  const input = buildInput(mock);
  // Tanpa katalog chat, "laba bersih Rp66,62 miliar" tetap ditolak seperti sebelum chatbot
  assert.ok(checkQualitativeSentence('Laba bersih Rp66,62 miliar menunjukkan kinerja yang lemah.', input, { allowNumbers: true }));
});

test('fakta: pertanyaan jumlah dikenali dan jawaban aturan menyebut angka + halaman', () => {
  assert.deepEqual(factsInQuestion('berapa jumlah labanya'), ['net_income']);
  assert.deepEqual(factsInQuestion('Laba pemilik entitas induknya berapa?'), ['net_income_parent']);
  const a = ruleAnswer('Berapa jumlah labanya?', mock);
  assert.match(a.answer, /^Laba bersih periode berjalan SMGR Q1 2026 Rp66,62 miliar, tercantum di halaman 7\./);
  assert.deepEqual(a.refs[0], { type: 'field', key: 'net_income', pages: [7] });
  assert.equal(collectFacts(mock).find((f) => f.key === 'net_income').page, 7);
});

test('fakta: Qwen bilang "data laba belum tersedia" -> kalimat dibuang, diganti jawaban dari laporan', async () => {
  const { session } = await createSession({ result: fresh() });
  const { message } = await answerQuestion({
    session,
    question: 'berapa jumlah labanya',
    chatStreamFn: stream('Data laba belum tersedia di laporan ini.'),
    pingFn: async () => 'ok',
    log: () => {},
  });
  assert.equal(message.source, 'rule');
  assert.match(message.content, /Rp66,62 miliar, tercantum di halaman 7/);
  assert.equal(message.dropped_sentences, 1);
});

test('fakta: jawaban Qwen yang benar lolos dengan rujukan halaman pos', async () => {
  const { session } = await createSession({ result: fresh() });
  const { message } = await answerQuestion({
    session,
    question: 'Berapa laba bersihnya?',
    chatStreamFn: stream('Laba bersih periode berjalan SMGR Rp66,62 miliar, tercantum di halaman 7.'),
    pingFn: async () => 'ok',
    log: () => {},
  });
  assert.equal(message.source, 'llm');
  assert.equal(message.prompt_version, 'chat_v2');
  assert.ok(message.refs.some((r) => r.type === 'field' && r.key === 'net_income' && r.pages.includes(7)));
});
