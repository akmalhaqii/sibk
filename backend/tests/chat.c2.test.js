// C2: tes sesi chat, tulis atomik, antrean tulis, saklar CHAT_ENABLED, dan GET /api/analyses
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import app from '../src/app.js';
import { appendMessage } from '../src/chat/sessions.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mockAnalyze = JSON.parse(
  await fs.readFile(path.resolve(__dirname, '../../frontend/src/mock/analyze.json'), 'utf8')
);

async function withServer(fn) {
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  try {
    await fn(baseUrl);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

function cloneMock(overrides = {}) {
  const c = structuredClone(mockAnalyze);
  c.entity = { ...c.entity, ...overrides };
  return c;
}

test('C2: buat sesi dua kali dengan file_id sama mengembalikan sesi yang sama (201 lalu 200)', async () => {
  await withServer(async (baseUrl) => {
    const fileId = `SMGR_reuse_${Date.now()}`;
    const result = cloneMock({ file_id: fileId });

    const r1 = await fetch(`${baseUrl}/api/chat/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ result }),
    });
    assert.equal(r1.status, 201);
    const s1 = await r1.json();
    assert.match(s1.id, /^cs_\d+_[a-z0-9]{4}$/);
    assert.equal(s1.mode, 'analysis');
    assert.equal(s1.title, 'SMGR Q1 2026');
    assert.equal(s1.analysis.file_id, fileId);
    assert.equal(s1.pending, false);

    const r2 = await fetch(`${baseUrl}/api/chat/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ result }),
    });
    assert.equal(r2.status, 200);
    const s2 = await r2.json();
    assert.equal(s2.id, s1.id);

    const listRes = await fetch(`${baseUrl}/api/chat/sessions`);
    assert.equal(listRes.status, 200);
    const list = await listRes.json();
    const item = list.find((x) => x.id === s1.id);
    assert.ok(item);
    assert.equal(item.snapshot, undefined);
    assert.equal(item.messages, undefined);
    assert.equal(item.message_count, 0);
  });
});

test('C2: mode free ditolak 400, glossary_only berhasil, dan id invalid mengembalikan 404', async () => {
  await withServer(async (baseUrl) => {
    const rFree = await fetch(`${baseUrl}/api/chat/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'free' }),
    });
    assert.equal(rFree.status, 400);

    const rGloss = await fetch(`${baseUrl}/api/chat/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'glossary_only' }),
    });
    assert.equal(rGloss.status, 201);
    const sGloss = await rGloss.json();
    assert.equal(sGloss.mode, 'glossary_only');
    assert.equal(sGloss.analysis, null);
    assert.equal(sGloss.snapshot, null);

    // Path traversal & invalid session id -> 404
    for (const badId of ['../../etc', 'cs_bad', '..%2F..%2Fetc']) {
      const rBad = await fetch(`${baseUrl}/api/chat/sessions/${badId}`);
      assert.equal(rBad.status, 404, badId);
    }

    const rDel = await fetch(`${baseUrl}/api/chat/sessions/${sGloss.id}`, { method: 'DELETE' });
    assert.equal(rDel.status, 204);
    const rAfterDel = await fetch(`${baseUrl}/api/chat/sessions/${sGloss.id}`);
    assert.equal(rAfterDel.status, 404);
  });
});

test('C2: PATCH snapshot valid menambah pesan sistem, file_id beda ditolak 409, dan antrean tulis aman', async () => {
  await withServer(async (baseUrl) => {
    const fileId = `SMGR_patch_${Date.now()}`;
    const result = cloneMock({ file_id: fileId });

    const createRes = await fetch(`${baseUrl}/api/chat/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ result }),
    });
    const created = await createRes.json();

    // file_id berbeda -> 409
    const badPatch = await fetch(`${baseUrl}/api/chat/sessions/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ result: cloneMock({ file_id: 'other_file' }) }),
    });
    assert.equal(badPatch.status, 409);

    // Snapshot sah + title bersamaan (uji antrean per sesi)
    const edited = cloneMock({ file_id: fileId });
    edited.metrics.roe.display = '1,2%';
    const [p1, p2] = await Promise.all([
      fetch(`${baseUrl}/api/chat/sessions/${created.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result: edited }),
      }),
      fetch(`${baseUrl}/api/chat/sessions/${created.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Judul Baru SMGR' }),
      }),
    ]);
    assert.equal(p1.status, 200);
    assert.equal(p2.status, 200);

    const finalRes = await fetch(`${baseUrl}/api/chat/sessions/${created.id}`);
    const finalSession = await finalRes.json();
    assert.equal(finalSession.title, 'Judul Baru SMGR');
    assert.equal(finalSession.snapshot.metrics.roe.display, '1,2%');
    assert.ok(finalSession.messages.some((m) => m.role === 'system' && m.content === 'Angka diperbarui.'));

    // Cek pesan pertama mengubah judul otomatis
    const gCreate = await fetch(`${baseUrl}/api/chat/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'glossary_only' }),
    });
    const gSession = await gCreate.json();
    await appendMessage(gSession.id, { role: 'user', content: 'Apa itu DER di laporan keuangan?' });
    const gAfter = await (await fetch(`${baseUrl}/api/chat/sessions/${gSession.id}`)).json();
    assert.equal(gAfter.title, 'Kamus · Apa itu DER di laporan keuangan?');
  });
});

test('C2: sesi pending > 2 menit sembuh otomatis dengan pesan sistem saat dibaca', async () => {
  await withServer(async (baseUrl) => {
    const fileId = `SMGR_stale_${Date.now()}`;
    const createRes = await fetch(`${baseUrl}/api/chat/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ result: cloneMock({ file_id: fileId }) }),
    });
    const created = await createRes.json();

    const dir = process.env.CHAT_SESSION_DIR;
    const fp = path.join(dir, `${created.id}.json`);
    const raw = JSON.parse(await fs.readFile(fp, 'utf8'));
    raw.pending = true;
    raw.updated_at = new Date(Date.now() - 3 * 60 * 1000).toISOString();
    await fs.writeFile(fp, JSON.stringify(raw, null, 2), 'utf8');

    const getRes = await fetch(`${baseUrl}/api/chat/sessions/${created.id}`);
    assert.equal(getRes.status, 200);
    const healed = await getRes.json();
    assert.equal(healed.pending, false);
    assert.ok(
      healed.messages.some((m) => m.role === 'system' && m.content.includes('terputus')),
      'harus menambah pesan sistem saat sesi pending kedaluwarsa'
    );
  });
});

test('C2: CHAT_ENABLED=false mengembalikan 404 chat_disabled untuk semua /api/chat/*', async () => {
  const prev = process.env.CHAT_ENABLED;
  process.env.CHAT_ENABLED = 'false';
  try {
    await withServer(async (baseUrl) => {
      const r1 = await fetch(`${baseUrl}/api/chat/sessions`);
      assert.equal(r1.status, 404);
      assert.equal((await r1.json()).error, 'chat_disabled');

      const r2 = await fetch(`${baseUrl}/api/chat/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'glossary_only' }),
      });
      assert.equal(r2.status, 404);
      assert.equal((await r2.json()).error, 'chat_disabled');

      const h = await (await fetch(`${baseUrl}/api/health`)).json();
      assert.equal(h.features.chat, false);
      assert.equal(h.features.chat_page, false);
    });
  } finally {
    if (prev === undefined) delete process.env.CHAT_ENABLED;
    else process.env.CHAT_ENABLED = prev;
  }
});

test('C2: GET /api/analyses melewati file cache rusak & UNKNOWN serta melakukan deduplikasi', async () => {
  const tmpCache = await fs.mkdtemp(path.join(os.tmpdir(), 'telusurfin-cache-'));
  const prevCacheDir = process.env.CACHE_DIR;
  process.env.CACHE_DIR = tmpCache;
  try {
    const s1 = cloneMock({ file_id: 'smgr_old', period_end: '2026-03-31', source: 'company_pdf' });
    const s2 = cloneMock({ file_id: 'smgr_new', period_end: '2026-03-31', source: 'company_pdf' });
    const s3 = cloneMock({ ticker: 'AKRA', file_id: 'akra_1', period_end: '2026-03-31', source: 'bei_pdf' });
    const unk = cloneMock({ ticker: 'UNKNOWN', file_id: 'unk_1' });

    await fs.writeFile(path.join(tmpCache, 'analyze_SMGR_smgr_old.json'), JSON.stringify(s1));
    await new Promise((r) => setTimeout(r, 25));
    await fs.writeFile(path.join(tmpCache, 'analyze_SMGR_smgr_new.json'), JSON.stringify(s2));
    await fs.writeFile(path.join(tmpCache, 'analyze_AKRA_akra_1.json'), JSON.stringify(s3));
    await fs.writeFile(path.join(tmpCache, 'analyze_UNKNOWN_unk_1.json'), JSON.stringify(unk));
    await fs.writeFile(path.join(tmpCache, 'analyze_BROKEN_1.json'), '{not-valid-json');

    await withServer(async (baseUrl) => {
      const dedupRes = await fetch(`${baseUrl}/api/analyses`);
      assert.equal(dedupRes.status, 200);
      const dedup = await dedupRes.json();
      assert.equal(dedup.length, 2);
      const smgr = dedup.find((x) => x.ticker === 'SMGR');
      assert.equal(smgr.file_id, 'smgr_new');

      const allRes = await fetch(`${baseUrl}/api/analyses?all=1`);
      assert.equal(allRes.status, 200);
      const all = await allRes.json();
      assert.equal(all.length, 3);
    });
  } finally {
    if (prevCacheDir === undefined) delete process.env.CACHE_DIR;
    else process.env.CACHE_DIR = prevCacheDir;
    await fs.rm(tmpCache, { recursive: true, force: true });
  }
});
