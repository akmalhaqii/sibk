// C1: pemilah pertanyaan + jawaban tanpa LLM (kamus, aturan, penolakan tetap)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyQuestion } from '../src/chat/router.js';
import { findTerms, thresholdText, loadGlossary } from '../src/chat/glossary.js';
import { answerWithoutLlm, ruleAnswer, glossaryAnswer } from '../src/chat/rules.js';
import app from '../src/app.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mock = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../frontend/src/mock/analyze.json'), 'utf8'));
const intent = (q) => classifyQuestion(q, { ticker: 'SMGR' }).intent;

test('C1: saran investasi selalu ditolak', () => {
  for (const q of ['Saham SMGR layak dibeli?', 'Berapa target harga SMGR?', 'Sebaiknya saya jual sekarang?', 'Kalau saya masuk di harga 3000 cuan nggak?']) {
    assert.equal(intent(q), 'advice', q);
  }
  const a = answerWithoutLlm({ question: 'layak dibeli?', result: mock, intent: 'advice' });
  assert.equal(a.source, 'refusal');
  assert.match(a.answer, /tidak memberi saran beli, jual, atau tahan/);
});

test('C1: pertanyaan definisi dijawab dari kamus, tanpa LLM', () => {
  for (const q of ['Apa itu DER?', 'apa yang dimaksud nilai wajar Graham', 'Jelaskan konversi kas', 'Kenapa nilai wajarnya beda dengan Google?', 'ROE?']) {
    assert.equal(intent(q), 'glossary', q);
  }
  const { terms } = classifyQuestion('Apa itu liabilitas terhadap ekuitas?', { ticker: 'SMGR' });
  const a = answerWithoutLlm({ question: 'Apa itu liabilitas terhadap ekuitas?', result: mock, intent: 'glossary', terms });
  assert.equal(a.source, 'glossary');
  assert.match(a.answer, /Rumus: \(total liabilitas \+ dana syirkah temporer\) ÷ total ekuitas/);
  assert.match(a.answer, /Ambang TelusurFin: sehat ≤ 0,5x, waspada 0,5x–2,0x, lemah > 2,0x\./);
  assert.match(a.answer, /Untuk SMGR Q1 2026: liabilitas terhadap ekuitas SMGR 0,55x \(waspada\)/);
  assert.equal(a.refs[0].key, 'der');
  assert.ok(a.refs[0].pages.length > 0);
});

test('C1: istilah terpanjang menang ("liabilitas terhadap aset" bukan "liabilitas")', () => {
  assert.deepEqual(findTerms('apa itu liabilitas terhadap aset').map((e) => e.term), ['Liabilitas terhadap aset']);
  assert.deepEqual(findTerms('Kenapa nilai wajar Graham beda?').map((e) => e.term), ['Nilai wajar Graham']);
});

test('C1: ambang status dibaca dari thresholds.json', () => {
  assert.equal(thresholdText('roe'), 'Ambang TelusurFin: sehat ≥ 15%, waspada 5%–15%, lemah < 5%.');
  assert.equal(thresholdText('ocf_to_assets'), null);
});

test('C1: pertanyaan di luar topik dan sapaan', () => {
  assert.equal(intent('Siapa presiden Indonesia?'), 'out_of_scope');
  assert.equal(intent('Resep nasi goreng dong'), 'out_of_scope');
  assert.equal(intent('Halo'), 'greeting');
  assert.equal(intent('terima kasih!'), 'greeting');
  const a = answerWithoutLlm({ question: 'Siapa presiden?', result: mock, intent: 'out_of_scope' });
  assert.match(a.answer, /hanya bisa menjawab pertanyaan tentang hasil analisis SMGR Q1 2026/);
});

test('C1: pertanyaan analisis diteruskan ke Qwen (null dari jalur tanpa LLM)', () => {
  for (const q of ['Kenapa tier SMGR mid?', 'Bagaimana likuiditasnya?', 'Profitabilitas SMGR bagaimana?']) {
    assert.equal(intent(q), 'analysis', q);
    assert.equal(answerWithoutLlm({ question: q, result: mock, intent: 'analysis' }), null);
  }
});

test('C1: jawaban aturan memakai angka display dan rujukan halaman', () => {
  const a = ruleAnswer('Bagaimana likuiditas dan utang SMGR?', mock);
  assert.equal(a.source, 'rule');
  assert.match(a.answer, /Current ratio SMGR 1,14x \(waspada\)\./);
  assert.match(a.answer, /Liabilitas terhadap ekuitas SMGR 0,55x \(waspada\)\./);
  assert.deepEqual(a.refs.map((r) => r.key), ['current_ratio', 'der', 'liability_to_asset']);
  const t = ruleAnswer('Kenapa tier-nya mid?', mock);
  assert.match(t.answer, /tier mid, relatif terhadap emiten non-keuangan BEI periode Q1 2025/);
  const v = ruleAnswer('Valuasinya bagaimana?', mock);
  assert.match(v.answer, /PER 63,03x\./);
  const g = ruleAnswer('Ceritakan kondisinya', mock);
  assert.match(g.answer, /^SMGR menunjukkan kinerja keuangan/);
});

test('C1: kamus tanpa emiten tetap menjawab definisi', () => {
  const [e] = findTerms('apa itu ROE');
  const a = glossaryAnswer([e], null);
  assert.match(a.answer, /^ROE: /);
  assert.doesNotMatch(a.answer, /Untuk /);
});

test('C1: semua entri kamus valid dan /api/health melaporkan saklar fitur', async () => {
  assert.ok(loadGlossary().length >= 20);
  const server = await new Promise((r) => { const s = app.listen(0, '127.0.0.1', () => r(s)); });
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/api/health`);
    const body = await res.json();
    assert.equal(body.features.chat, true);
    assert.equal(typeof body.features.chat_free_mode, 'boolean');
  } finally {
    await new Promise((r) => server.close(r));
  }
});
