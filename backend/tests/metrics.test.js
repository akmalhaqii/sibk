import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeMetrics } from '../src/pipeline/metrics.js';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const load = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));

const approx = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;

test('metrics: 9 rasio dan status SMGR Q1 2026 sesuai acuan (presisi 1e-6)', () => {
  const { fields, entity } = load('smgr_fields_company.json');
  const m = computeMetrics(fields, entity);

  const expected = {
    current_ratio:      { value: 1.1433338863, status: 'waspada', display: '1,14x' },
    der:                { value: 0.5454397788, status: 'waspada', display: '0,55x' },
    liability_to_asset: { value: 0.3454515852, status: 'sehat',   display: '34,5%' },
    roe:                { value: 0.0073868035, status: 'lemah',   display: '0,7%' },
    roa:                { value: 0.0035054491, status: 'lemah',   display: '0,4%' },
    net_margin:         { value: 0.0080371735, status: 'lemah',   display: '0,8%' },
    revenue_growth:     { value: 0.0827900431, status: 'waspada', display: '8,3%' },
    earnings_growth:    { value: 0.8868482856, status: 'sehat',   display: '88,7%' },
    cash_conversion:    { value: 8.9535547016, status: 'sehat',   display: '8,95x' },
  };

  for (const [k, exp] of Object.entries(expected)) {
    assert.ok(approx(m[k].value, exp.value), `${k}: ${m[k].value} != ${exp.value}`);
    assert.equal(m[k].status, exp.status, `${k} status`);
    assert.equal(m[k].display, exp.display, `${k} display`);
  }

  assert.equal(m.operating_margin.value, null);
  assert.equal(m.operating_margin.status, null);
  assert.ok(m.ocf_to_assets.value > 0);
});
