import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runPipeline, recompute } from '../src/pipeline/index.js';
import { AnalyzeResponse } from '../src/schemas/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pdfDir = path.resolve(__dirname, '../../data/raw/pdf');

test('backtest seluruh PDF referensi (SMGR, AKRA, AADI — company & BEI)', async (t) => {
  let files = [];
  try {
    const entries = await fs.readdir(pdfDir);
    files = entries.filter((f) => f.endsWith('.pdf')).sort();
  } catch {
    t.skip('Folder data/raw/pdf tidak tersedia di lingkungan ini');
    return;
  }

  assert.ok(files.length >= 5, `Diharapkan minimal 5 PDF referensi, ditemukan ${files.length}`);

  for (const file of files) {
    await t.test(`backtest ${file}`, async () => {
      const fullPath = path.join(pdfDir, file);
      const initial = await runPipeline({ file: { path: fullPath, filename: file } });
      const res = await recompute({ ...initial, price: 1500 });

      const parsed = AnalyzeResponse.safeParse(res);
      assert.equal(
        parsed.success,
        true,
        `Respons ${file} harus lolos AnalyzeResponse: ${JSON.stringify(parsed.error?.issues)}`,
      );

      assert.equal(
        res.validation.needs_review,
        false,
        `${file} harus lolos semua 4 cek validasi tanpa needs_review: ${JSON.stringify(res.validation.checks)}`,
      );

      for (const chk of res.validation.checks) {
        assert.equal(chk.pass, true, `${file} cek ${chk.name} harus pass=true`);
      }

      // Pastikan metrik profitabilitas utama terhitung (ROE, ROA, Net Margin)
      assert.ok(res.metrics.roe?.value !== null && Number.isFinite(res.metrics.roe?.value), `${file} ROE harus terhitung`);
      assert.ok(res.metrics.roa?.value !== null && Number.isFinite(res.metrics.roa?.value), `${file} ROA harus terhitung`);
      assert.ok(
        res.metrics.net_margin?.value !== null && Number.isFinite(res.metrics.net_margin?.value),
        `${file} net_margin harus terhitung`,
      );
      assert.ok(
        res.metrics.liability_to_asset?.value !== null &&
          res.metrics.liability_to_asset.value > 0 &&
          res.metrics.liability_to_asset.value < 1,
        `${file} liability_to_asset harus di antara 0 dan 1 (aktual: ${res.metrics.liability_to_asset?.value})`,
      );
      assert.ok(
        ['low', 'mid', 'high'].includes(res.tiering.tier),
        `${file} Tier harus terklasifikasi (aktual: ${res.tiering.tier})`,
      );
    });
  }
});
