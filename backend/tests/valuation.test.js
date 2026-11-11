import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeValuation } from '../src/pipeline/valuation.js';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const load = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));

test('valuation: SMGR dengan harga tetap Rp3.000 menghasilkan EPS, BVPS, PER, PBV, P/S yang benar', () => {
  const { fields, entity } = load('smgr_fields_company.json');
  const v = computeValuation({ fields, entity, market: { price: 3000 } });

  assert.equal(v.shares_outstanding.value, 6751540090);
  assert.equal(v.shares_outstanding.unavailable_reason, 'belum dikurangi saham treasuri');

  // Cek kewajaran EPS disetahunkan (~47.6) vs eps_basic laporan (12 * 4 = 48)
  assert.ok(Math.abs(v.eps.value - 47.5992138) < 1e-4);
  assert.ok(Math.abs(v.eps.value - fields.eps_basic.value * 4) < 1.0);

  assert.ok(Math.abs(v.bvps.value - 6449.975917) < 1e-3);
  assert.ok(Math.abs(v.per.value - 63.02625) < 0.02);
  assert.ok(Math.abs(v.pbv.value - 0.465118) < 0.01);
  assert.ok(Math.abs(v.ps.value - 0.610903) < 0.01);
  assert.equal(v.per.display, '63,03x');
  assert.equal(v.pbv.display, '0,47x');
  assert.equal(v.ps.display, '0,61x');
});

test('valuation: tanpa harga -> market_cap/per/pbv/ps null dengan unavailable_reason', () => {
  const { fields, entity } = load('smgr_fields_company.json');
  const v = computeValuation({ fields, entity, market: null });
  assert.equal(v.per.value, null);
  assert.equal(v.per.unavailable_reason, 'harga belum tersedia');
  assert.ok(v.eps.value > 0);
});
