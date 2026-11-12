import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import app from '../src/app.js';
import { AnalyzeResponse, NarrativeResponse } from '../src/schemas/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const smgrPdfPath = path.resolve(__dirname, '../../data/raw/pdf/SMGR_2026Q1_company.pdf');

async function withServer(fn) {
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  try {
    await fn(baseUrl);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('e2e API: unggah berkas bukan PDF mengembalikan 400 "Berkas harus PDF"', async () => {
  await withServer(async (baseUrl) => {
    const fd = new FormData();
    fd.append('file', new Blob(['bukan pdf'], { type: 'text/plain' }), 'catatan.txt');
    fd.append('ticker', 'SMGR');

    const res = await fetch(`${baseUrl}/api/analyze`, { method: 'POST', body: fd });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error, 'Berkas harus PDF');
  });
});

test('REV-02: recompute dengan market yahoo-finance2 mempertahankan source dan fetched_at', async () => {
  await withServer(async (baseUrl) => {
    const mockAnalyze = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '../../frontend/src/mock/analyze.json'), 'utf8')
    );
    const prevMarket = {
      price: 3150,
      currency: 'IDR',
      fetched_at: '2026-11-12T04:55:00.000Z',
      source: 'yahoo-finance2',
    };

    const res = await fetch(`${baseUrl}/api/recompute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entity: mockAnalyze.entity,
        fields: mockAnalyze.fields,
        ticker: 'SMGR',
        market: prevMarket,
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(body.market, prevMarket);
  });
});

test(
  'e2e API: alur lengkap analyze SMGR -> buka PDF -> koreksi total_equity -> batalkan -> harga manual -> narasi',
  { skip: !fs.existsSync(smgrPdfPath) },
  async () => {
    await withServer(async (baseUrl) => {
      // 1. Unggah SMGR PDF
      const pdfBytes = fs.readFileSync(smgrPdfPath);
      const fd = new FormData();
      fd.append('file', new Blob([pdfBytes], { type: 'application/pdf' }), 'SMGR_2026Q1_company.pdf');
      fd.append('ticker', 'SMGR');

      const analyzeRes = await fetch(`${baseUrl}/api/analyze`, { method: 'POST', body: fd });
      assert.equal(analyzeRes.status, 200);
      const analyzed = await analyzeRes.json();
      assert.equal(AnalyzeResponse.safeParse(analyzed).success, true);
      assert.equal(analyzed.validation.needs_review, false);
      assert.equal(analyzed.tiering.tier, 'mid');

      // 2. Cek tautan halaman sumber PDF (/files/<file_id>.pdf)
      assert.ok(analyzed.entity.file_url, 'file_url harus terisi');
      const pdfRes = await fetch(`${baseUrl}${analyzed.entity.file_url}`);
      assert.equal(pdfRes.status, 200);
      assert.match(pdfRes.headers.get('content-type') || '', /application\/pdf/i);

      // 3. Ubah total_equity -> Hitung ulang -> validasi gagal (needs_review: true) & DER berubah
      const editedFields = structuredClone(analyzed.fields);
      editedFields.total_equity = {
        ...editedFields.total_equity,
        value: editedFields.total_equity.value + 5_000_000,
        corrected: true,
      };
      const recompEditedRes = await fetch(`${baseUrl}/api/recompute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity: analyzed.entity,
          fields: editedFields,
          ticker: 'SMGR',
        }),
      });
      assert.equal(recompEditedRes.status, 200);
      const recompEdited = await recompEditedRes.json();
      assert.equal(recompEdited.validation.needs_review, true);
      assert.notEqual(recompEdited.metrics.der.display, analyzed.metrics.der.display);

      // 4. Batalkan perubahan -> kembali normal (needs_review: false)
      const recompResetRes = await fetch(`${baseUrl}/api/recompute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity: analyzed.entity,
          fields: analyzed.fields,
          ticker: 'SMGR',
        }),
      });
      const recompReset = await recompResetRes.json();
      assert.equal(recompReset.validation.needs_review, false);
      assert.equal(recompReset.metrics.der.display, '0,58x');

      // 5. Isi harga manual Rp3.000 -> PER, PBV, dan premium muncul; narasi ikut berubah
      const recompPriceRes = await fetch(`${baseUrl}/api/recompute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity: analyzed.entity,
          fields: analyzed.fields,
          ticker: 'SMGR',
          price: 3000,
        }),
      });
      const withPrice = await recompPriceRes.json();
      assert.equal(withPrice.market.price, 3000);
      assert.equal(withPrice.market.source, 'manual');
      assert.equal(withPrice.valuation.per.display, '63,03x');
      assert.equal(withPrice.valuation.pbv.display, '0,47x');
      assert.equal(withPrice.valuation.premium_discount.display, '+14,1%');

      const prevUseOllama = process.env.USE_OLLAMA;
      process.env.USE_OLLAMA = 'false';
      const narRes = await fetch(`${baseUrl}/api/narrative`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(withPrice),
      });
      if (prevUseOllama === undefined) delete process.env.USE_OLLAMA;
      else process.env.USE_OLLAMA = prevUseOllama;
      assert.equal(narRes.status, 200);
      const nar = await narRes.json();
      assert.equal(NarrativeResponse.safeParse(nar).success, true);
      assert.ok(
        // Narasi v5 (kualitatif): harga manual Rp3.000 > nilai wajar Graham Rp2.628
        nar.text.includes('Penilaian valuasi: harga di atas nilai wajar Graham.'),
        `Narasi valuasi tidak sesuai: ${nar.text}`
      );
    });
  }
);
