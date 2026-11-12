// C3: pemecah kalimat, pemeriksa kalimat chat, streaming SSE, timeout, ECONNREFUSED, kunci sibuk, putus koneksi klien
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import app from '../src/app.js';
import { createSentenceSplitter } from '../src/chat/splitter.js';
import { checkChatSentence, extendCatalog } from '../src/chat/check.js';
import { createSession, getSession } from '../src/chat/sessions.js';
import { answerQuestion } from '../src/chat/service.js';
import { buildInput } from '../src/narrator/input.js';
import { buildCatalog } from '../src/narrator/binding.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mockAnalyze = JSON.parse(
  await fs.readFile(path.resolve(__dirname, '../../frontend/src/mock/analyze.json'), 'utf8')
);

function cloneMock(overrides = {}) {
  const c = structuredClone(mockAnalyze);
  c.entity = { ...c.entity, file_id: `c3_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, ...overrides };
  return c;
}

function makeStream(chunks, delayMs = 0) {
  return async function* (_messages, { signal } = {}) {
    for (const c of chunks) {
      if (signal?.aborted) {
        const err = new Error('The operation was aborted');
        err.name = 'AbortError';
        throw err;
      }
      if (delayMs > 0) {
        await new Promise((resolve, reject) => {
          const timer = setTimeout(resolve, delayMs);
          signal?.addEventListener(
            'abort',
            () => {
              clearTimeout(timer);
              const err = new Error('The operation was aborted');
              err.name = 'AbortError';
              reject(err);
            },
            { once: true }
          );
        });
      }
      yield c;
    }
  };
}

function collectEvents() {
  const events = [];
  return {
    events,
    emit: (event, data) => events.push({ event, data }),
  };
}

test('C3: splitter memecah dua kalimat dan tidak memecah angka maupun hal.', () => {
  const sp1 = createSentenceSplitter();
  const s1 = sp1.push('Harga Rp1.300 dan EPS Rp66,6. Current ratio 1,29x.');
  const t1 = sp1.flush();
  assert.deepEqual([...s1, ...t1.sentences], ['Harga Rp1.300 dan EPS Rp66,6.', 'Current ratio 1,29x.']);
  assert.equal(t1.truncated, false);

  const sp2 = createSentenceSplitter();
  const s2 = sp2.push('Lihat hal. 7 untuk laba.');
  const t2 = sp2.flush();
  assert.deepEqual([...s2, ...t2.sentences], ['Lihat hal. 7 untuk laba.']);
});

test('C3: checkChatSentence mengizinkan hal. valid, ambang, dan konstanta 22,5 Graham serta menolak saran', () => {
  const input = buildInput(mockAnalyze);
  const catalog = extendCatalog(buildCatalog(input), mockAnalyze);

  assert.equal(checkChatSentence('Lihat hal. 7 untuk laba bersih.', input, catalog).ok, true);
  assert.equal(checkChatSentence('Lihat hal. 99 untuk laba bersih.', input, catalog).ok, false);
  assert.equal(checkChatSentence('Ambang sehat ROE adalah 15%.', input, catalog).ok, true);
  assert.equal(checkChatSentence('Nilai wajar Graham memakai konstanta 22,5.', input, catalog).ok, true);
  assert.equal(checkChatSentence('Sebaiknya beli saham ini sekarang.', input, catalog).ok, false);
});

test('C3: aliran tiruan 3 kalimat benar menghasilkan 3 sentence dan source llm', async () => {
  const { session } = await createSession({ result: cloneMock() });
  const { events, emit } = collectEvents();
  const res = await answerQuestion({
    session,
    question: 'Bagaimana profitabilitas SMGR?',
    emit,
    pingFn: async () => 'ok',
    chatStreamFn: makeStream([
      'ROE SMGR 0,7% (lemah). ',
      'ROA tercatat 0,4% (lemah). ',
      'Margin laba bersih 0,8% (lemah).',
    ]),
    log: () => {},
  });

  const sents = events.filter((e) => e.event === 'sentence').map((e) => e.data.text);
  assert.equal(sents.length, 3);
  assert.equal(res.message.source, 'llm');
  assert.equal(res.message.dropped_sentences, 0);
  assert.ok(res.message.refs.some((r) => r.key === 'roe'));
});

test('C3: aliran tiruan dengan angka karangan membuang kalimat salah (dropped: 1)', async () => {
  const { session } = await createSession({ result: cloneMock() });
  const { events, emit } = collectEvents();
  const res = await answerQuestion({
    session,
    question: 'Bagaimana profitabilitas SMGR?',
    emit,
    pingFn: async () => 'ok',
    chatStreamFn: makeStream([
      'ROE SMGR mencapai 99,9% (sehat). ',
      'Current ratio SMGR 1,14x (waspada).',
    ]),
    log: () => {},
  });

  const sents = events.filter((e) => e.event === 'sentence').map((e) => e.data.text);
  const dropped = events.filter((e) => e.event === 'dropped');
  assert.deepEqual(sents, ['Current ratio SMGR 1,14x (waspada).']);
  assert.equal(dropped.at(-1).data.count, 1);
  assert.equal(res.message.source, 'llm');
  assert.equal(res.message.dropped_sentences, 1);
});

test('C3: saran investasi dari LLM dibuang dan jatuh kembali ke ruleAnswer bila 0 kalimat lolos', async () => {
  const { session } = await createSession({ result: cloneMock() });
  const { events, emit } = collectEvents();
  const res = await answerQuestion({
    session,
    question: 'Bagaimana likuiditas SMGR?',
    emit,
    pingFn: async () => 'ok',
    chatStreamFn: makeStream(['Sebaiknya beli saham ini karena murah untuk dibeli.']),
    log: () => {},
  });

  assert.equal(res.message.source, 'rule');
  assert.equal(res.message.dropped_sentences, 1);
  assert.match(res.message.content, /Current ratio SMGR 1,14x/);
  assert.ok(events.some((e) => e.event === 'done'));
});

test('C3: Markdown dibersihkan menjadi teks biasa, sisa tanpa titik dibuang, dan maksimal 4 kalimat', async () => {
  const { session: sMd } = await createSession({ result: cloneMock() });
  const rMd = await answerQuestion({
    session: sMd,
    question: 'Bagaimana kondisi ROE SMGR sekarang?',
    emit: () => {},
    pingFn: async () => 'ok',
    chatStreamFn: makeStream(['**ROE** 0,7% (lemah) perlu dicermati. Sisa kalimat terpotong tanpa titik']),
    log: () => {},
  });
  assert.equal(rMd.message.source, 'llm');
  assert.equal(rMd.message.content, 'ROE 0,7% (lemah) perlu dicermati.');
  assert.equal(rMd.message.dropped_sentences, 1);

  const { session: sSix } = await createSession({ result: cloneMock() });
  const { events: eSix, emit: emitSix } = collectEvents();
  const rSix = await answerQuestion({
    session: sSix,
    question: 'Jelaskan semua rasio SMGR.',
    emit: emitSix,
    pingFn: async () => 'ok',
    chatStreamFn: makeStream([
      'ROE SMGR 0,7% (lemah). ',
      'ROA SMGR 0,4% (lemah). ',
      'Margin laba bersih 0,8% (lemah). ',
      'Current ratio SMGR 1,14x (waspada). ',
      'Liabilitas terhadap ekuitas SMGR 0,55x (waspada). ',
      'Liabilitas terhadap aset SMGR 34,5% (sehat).',
    ]),
    log: () => {},
  });
  assert.equal(eSix.filter((e) => e.event === 'sentence').length, 4);
  assert.equal(rSix.message.dropped_sentences, 0);
});

test('C3: aliran lambat melampaui batas waktu tetap menyimpan catatan terpotong, ECONNREFUSED pakai rule', async () => {
  const { session: sTimeout } = await createSession({ result: cloneMock() });
  const resTo = await answerQuestion({
    session: sTimeout,
    question: 'Bagaimana likuiditas SMGR?',
    emit: () => {},
    pingFn: async () => 'ok',
    timeoutMs: 40,
    chatStreamFn: makeStream(['Current ratio SMGR 1,14x (waspada). ', 'Liabilitas terhadap ekuitas 0,55x (waspada).'], 60),
    log: () => {},
  });
  assert.match(resTo.message.content, /terpotong/);
  assert.equal((await getSession(sTimeout.id)).pending, false);

  const { session: sErr } = await createSession({ result: cloneMock() });
  const resErr = await answerQuestion({
    session: sErr,
    question: 'Bagaimana likuiditas SMGR?',
    emit: () => {},
    pingFn: async () => 'ok',
    chatStreamFn: async function* () {
      const err = new Error('connect ECONNREFUSED');
      err.code = 'ECONNREFUSED';
      throw err;
    },
    log: () => {},
  });
  assert.equal(resErr.message.source, 'rule');
  assert.match(resErr.message.content, /Current ratio SMGR 1,14x/);
});

test('C3: dua permintaan analisis bersamaan -> permintaan kedua menerima event busy', async () => {
  const { session: s1 } = await createSession({ result: cloneMock() });
  const { session: s2 } = await createSession({ result: cloneMock() });
  const { events: e2, emit: emit2 } = collectEvents();

  let releaseHold;
  const holdPromise = new Promise((r) => {
    releaseHold = r;
  });

  const p1 = answerQuestion({
    session: s1,
    question: 'Bagaimana kondisi ROE SMGR sekarang?',
    emit: () => {},
    pingFn: async () => 'ok',
    chatStreamFn: async function* () {
      await holdPromise;
      yield 'ROE SMGR 0,7% (lemah).';
    },
    log: () => {},
  });

  // Beri kesempatan p1 memegang kunci
  await new Promise((r) => setTimeout(r, 15));
  const r2 = await answerQuestion({
    session: s2,
    question: 'Bagaimana kondisi ROA SMGR sekarang?',
    emit: emit2,
    pingFn: async () => 'ok',
    chatStreamFn: makeStream(['ROA SMGR 0,4% (lemah).']),
    log: () => {},
  });

  assert.equal(r2.busy, true);
  assert.ok(e2.some((e) => e.event === 'busy'));
  releaseHold();
  await p1;
});

test('C3: Apa itu DER dan sesi glossary_only + pertanyaan analisis tidak memanggil chatStream', async () => {
  let called = 0;
  const spyStream = makeStream(['ROE SMGR 0,7% (lemah).']);
  const countedStream = async function* (m, o) {
    called++;
    yield* spyStream(m, o);
  };

  const { session: sA } = await createSession({ result: cloneMock() });
  const rGloss = await answerQuestion({
    session: sA,
    question: 'Apa itu DER?',
    emit: () => {},
    chatStreamFn: countedStream,
  });
  assert.equal(rGloss.message.source, 'glossary');
  assert.equal(called, 0);

  const { session: sG } = await createSession({ mode: 'glossary_only' });
  const rOnly = await answerQuestion({
    session: sG,
    question: 'Bagaimana kinerja SMGR sekarang?',
    emit: () => {},
    chatStreamFn: countedStream,
  });
  assert.match(rOnly.message.content, /^Sesi ini tanpa emiten/);
  assert.equal(called, 0);
});

test('C3: klien memutus koneksi SSE di tengah aliran -> jawaban Qwen tetap selesai & tersimpan (pending: false)', async () => {
  // Server tiruan Ollama /api/tags + /api/chat NDJSON
  const mockOllama = http.createServer(async (req, res) => {
    if (req.url === '/api/tags') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ models: [{ name: 'qwen3:1.7b' }] }));
      return;
    }
    if (req.url === '/api/chat') {
      res.writeHead(200, { 'Content-Type': 'application/x-ndjson' });
      res.write(JSON.stringify({ message: { content: 'ROE SMGR 0,7% (lemah). ' }, done: false }) + '\n');
      await new Promise((r) => setTimeout(r, 80));
      res.write(JSON.stringify({ message: { content: 'ROA SMGR 0,4% (lemah).' }, done: true }) + '\n');
      res.end();
      return;
    }
    res.writeHead(404);
    res.end();
  });

  await new Promise((r) => mockOllama.listen(0, '127.0.0.1', r));
  const prevOllamaUrl = process.env.OLLAMA_URL;
  process.env.OLLAMA_URL = `http://127.0.0.1:${mockOllama.address().port}`;

  const server = await new Promise((r) => {
    const s = app.listen(0, '127.0.0.1', () => r(s));
  });

  try {
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const createRes = await fetch(`${baseUrl}/api/chat/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ result: cloneMock() }),
    });
    const session = await createRes.json();

    const ac = new AbortController();
    const sseRes = await fetch(`${baseUrl}/api/chat/sessions/${session.id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Bagaimana profitabilitas SMGR?' }),
      signal: ac.signal,
    });
    const reader = sseRes.body.getReader();
    await reader.read(); // terima potongan pertama (meta / sentence 1)
    ac.abort(); // putus koneksi klien!

    // Tunggu aliran backend selesai menulis ke sesi
    await new Promise((r) => setTimeout(r, 180));
    const saved = await getSession(session.id);
    assert.equal(saved.pending, false);
    const assistant = saved.messages.find((m) => m.role === 'assistant');
    assert.ok(assistant);
    assert.equal(assistant.source, 'llm');
    assert.match(assistant.content, /ROE SMGR 0,7% \(lemah\)\./);
    assert.match(assistant.content, /ROA SMGR 0,4% \(lemah\)\./);
  } finally {
    if (prevOllamaUrl === undefined) delete process.env.OLLAMA_URL;
    else process.env.OLLAMA_URL = prevOllamaUrl;
    await new Promise((r) => server.close(r));
    await new Promise((r) => mockOllama.close(r));
  }
});
