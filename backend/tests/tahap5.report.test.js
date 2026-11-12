// Tahap 5 · FR-OUT-01 (laporan akhir md/json) dan harga offline
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import app from '../src/app.js';
import { buildReportMarkdown, buildReportJson, reportFilename } from '../src/report/markdown.js';
import { templateSummary } from '../src/narrator/template.js';
import { buildInput } from '../src/narrator/input.js';
import { fetchPrice } from '../src/pipeline/market.js';
import { recompute } from '../src/pipeline/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mockAnalyze = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../frontend/src/mock/analyze.json'), 'utf8')
);
const narrative = templateSummary(buildInput(mockAnalyze));

async function withServer(fn) {
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  try {
    await fn(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('FR-OUT-01: Markdown memuat semua bagian dan angka display apa adanya', () => {
  const md = buildReportMarkdown(mockAnalyze, narrative, { generatedAt: new Date('2026-11-13T01:30:00+07:00') });
  for (const h of [
    '# Laporan Analisis SMGR · Q1 2026',
    '## 1. Ringkasan eksekutif',
    '## 2. Rasio kesehatan keuangan',
    '## 3. Tier performa',
    '## 4. Valuasi',
    '## 5. Cek validasi',
    '## 6. Angka hasil ekstraksi (juta IDR)',
    '## 7. Keterbatasan',
  ]) {
    assert.ok(md.includes(h), `bagian hilang: ${h}`);
  }
  assert.ok(md.includes(mockAnalyze.metrics.roe.display));
  assert.ok(md.includes(mockAnalyze.valuation.per.display));
  assert.ok(md.includes('Ringkasan otomatis (tanpa AI)'));
  assert.ok(md.includes('bukan rekomendasi investasi'));
  assert.ok(md.includes('Harga acuan Rp3.000'));
});

test('FR-OUT-01: Markdown tetap valid tanpa narasi dan tanpa harga', () => {
  const md = buildReportMarkdown({ ...mockAnalyze, market: null }, null);
  assert.ok(md.includes('Ringkasan belum tersedia'));
  assert.ok(md.includes('Harga saham belum tersedia'));
});

test('FR-OUT-01: tanda | di label tidak merusak tabel Markdown', () => {
  const r = structuredClone(mockAnalyze);
  r.fields.cash.label = 'Kas | setara kas';
  const md = buildReportMarkdown(r, null);
  assert.ok(md.includes('Kas \\| setara kas'));
});

test('FR-OUT-01: JSON memuat hasil analisis, narasi, dan waktu pembuatan', () => {
  const j = buildReportJson(mockAnalyze, narrative);
  assert.equal(j.app, 'TelusurFin');
  assert.equal(j.entity.ticker, 'SMGR');
  assert.equal(j.narrative.source, 'template');
  assert.ok(!Number.isNaN(Date.parse(j.generated_at)));
  assert.equal(reportFilename(mockAnalyze, 'json'), 'TelusurFin_SMGR_2026Q1.json');
});

test('FR-OUT-01: POST /api/report mengirim berkas md dan json', async () => {
  await withServer(async (base) => {
    const md = await fetch(`${base}/api/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ result: mockAnalyze, narrative, format: 'md' }),
    });
    assert.equal(md.status, 200);
    assert.match(md.headers.get('content-type'), /text\/markdown/);
    assert.match(md.headers.get('content-disposition'), /TelusurFin_SMGR_2026Q1\.md/);
    assert.ok((await md.text()).startsWith('# Laporan Analisis SMGR'));

    const js = await fetch(`${base}/api/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ result: mockAnalyze, format: 'json' }),
    });
    assert.equal(js.status, 200);
    assert.equal((await js.json()).narrative, null);
  });
});

test('FR-OUT-01: POST /api/report menolak body tanpa hasil analisis dan format asing', async () => {
  await withServer(async (base) => {
    const bad = await fetch(`${base}/api/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'x' }),
    });
    assert.equal(bad.status, 400);
    const fmt = await fetch(`${base}/api/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ result: mockAnalyze, format: 'docx' }),
    });
    assert.equal(fmt.status, 400);
  });
});

test('Harga offline: PRICE_PROVIDER=off menolak ambil harga online, harga manual tetap jalan', async () => {
  assert.equal(process.env.PRICE_PROVIDER, 'off', 'npm test harus berjalan dengan tests/setup.js');
  await assert.rejects(fetchPrice('SMGR'), /PRICE_PROVIDER=off/);

  const noPrice = await recompute({ entity: mockAnalyze.entity, fields: mockAnalyze.fields, ticker: 'SMGR' });
  assert.equal(noPrice.market, null);
  assert.equal(noPrice.valuation.per.unavailable_reason, 'harga belum tersedia');

  const manual = await recompute({ entity: mockAnalyze.entity, fields: mockAnalyze.fields, ticker: 'SMGR', price: 3000 });
  assert.equal(manual.market.source, 'manual');
  assert.equal(manual.market.price, 3000);
});

test('Tahap 5: ringkasan templat laporan USD menyebut alasan mata uang', () => {
  const r = structuredClone(mockAnalyze);
  r.entity.currency = 'USD';
  for (const k of ['per', 'pbv', 'fair_value']) {
    r.valuation[k] = { ...r.valuation[k], value: null, display: '—', unavailable_reason: 'laporan dalam USD; valuasi dengan harga Rupiah belum didukung' };
  }
  const t = templateSummary(buildInput(r)).text;
  assert.match(t, /Valuasi: belum dihitung karena laporan dalam USD/);
});
