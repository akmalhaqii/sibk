// Tahap 4: A (liabilitas + syirkah), C (mata uang laporan)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeMetrics, effectiveLiabilities } from '../src/pipeline/metrics.js';
import { validate } from '../src/pipeline/validator.js';
import { computeValuation, unitFactor } from '../src/pipeline/valuation.js';
import { detectMetadata } from '../src/pipeline/parser.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const load = (f) => JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', f), 'utf8'));
const f = (value) => ({ value, prior: null });

test('4-A: syirkah terpisah ditambahkan ke liabilitas efektif (SMGR PDF perusahaan)', () => {
  const { fields } = load('smgr_fields_company.json');
  assert.equal(effectiveLiabilities(fields), 26067683 + 1600000);
});

test('4-A: syirkah yang sudah termasuk tidak dihitung dua kali', () => {
  const fields = { total_assets: f(100), total_liabilities: f(40), temporary_syirkah: f(5), total_equity: f(60) };
  assert.equal(effectiveLiabilities(fields), 40);
  const bal = validate(fields).checks.find((c) => c.name === 'balance_identity');
  assert.equal(bal.pass, true);
});

test('4-A: PDF perusahaan dan PDF BEI SMGR memberi DER dan L/A yang sama', () => {
  const a = computeMetrics(load('smgr_fields_company.json').fields, { period_type: 'Q1' });
  const b = computeMetrics(load('smgr_fields_bei.json').fields, { period_type: 'Q1' });
  assert.equal(a.der.display, b.der.display);
  assert.equal(a.liability_to_asset.display, b.liability_to_asset.display);
  assert.equal(a.der.display, '0,58x');
});

test('4-C: deteksi USD dari halaman info dan ringkasan BEI', () => {
  const pages = [{ items: [{ str: 'Satuan RIBUAN Mata Uang USD' }] }];
  pages._generalText = 'Mata uang pelaporan Dollar Amerika / USD Pembulatan Ribuan / In Thousand';
  const meta = detectMetadata(pages);
  assert.equal(meta.currency, 'USD');
  assert.equal(meta.unit, 'ribu USD');
});

test('4-C: deteksi USD dari kepala laporan perusahaan', () => {
  const pages = [{ items: [{ str: '(Expressed in thousands of US Dollars, unless otherwise stated)' }] }];
  const meta = detectMetadata(pages);
  assert.equal(meta.currency, 'USD');
  assert.equal(meta.unit, 'ribu USD');
});

test('4-C: laporan Rupiah tetap IDR', () => {
  const pages = [{ items: [{ str: '(Dinyatakan dalam jutaan Rupiah, kecuali dinyatakan lain)' }] }];
  const meta = detectMetadata(pages);
  assert.equal(meta.currency, 'IDR');
  assert.equal(meta.unit, 'juta IDR');
});

test('4-C: faktor satuan dari skala, bukan dari mata uang', () => {
  assert.equal(unitFactor('juta IDR'), 1e6);
  assert.equal(unitFactor('ribu USD'), 1e3);
  assert.equal(unitFactor('IDR'), 1);
});

test('4-C: valuasi laporan USD ditandai tidak tersedia, bukan dihitung dengan harga Rupiah', () => {
  const { fields } = load('smgr_fields_company.json');
  const v = computeValuation({
    fields,
    entity: { period_type: 'Q1', unit: 'ribu USD', currency: 'USD' },
    market: { price: 1500, currency: 'IDR' },
  });
  for (const k of ['eps', 'bvps', 'market_cap', 'per', 'pbv', 'ps', 'fair_value', 'premium_discount']) {
    assert.equal(v[k].value, null, k);
    assert.match(v[k].unavailable_reason, /USD/);
  }
});
