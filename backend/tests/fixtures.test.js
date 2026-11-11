// Tes yang hanya bergantung pada tests/fixtures (tanpa folder data/).
// R-01 & R-02: juga menguji kontrak nyata dari recompute() dan generateNarrative().
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AnalyzeResponse, Extracted, NarrativeResponse, TierModel } from '../src/schemas/index.js';
import { assignTier } from '../src/pipeline/tiering.js';
import { recompute } from '../src/pipeline/index.js';
import { evaluateStatus } from '../src/pipeline/metrics.js';
import { generateNarrative } from '../src/narrator/service.js';
import thresholds from '../config/thresholds.json' with { type: 'json' };

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const load = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));

const v = (fields, k) => fields[k]?.value ?? 0;

for (const f of ['smgr_fields_company.json', 'smgr_fields_bei.json']) {
  test(`${f} lolos skema Extracted`, () => {
    const r = Extracted.safeParse(load(f));
    assert.ok(r.success, r.success ? '' : JSON.stringify(r.error.issues));
  });

  test(`${f}: aset = liabilitas + syirkah temporer + ekuitas`, () => {
    const { fields } = load(f);
    assert.equal(v(fields, 'total_assets'), v(fields, 'total_liabilities') + v(fields, 'temporary_syirkah') + v(fields, 'total_equity'));
  });
}

test('tier_model.json lolos skema TierModel', () => {
  TierModel.parse(load('tier_model.json'));
});

test('assignTier meneruskan model_version (FR-TIER-02)', () => {
  const model = TierModel.parse(load('tier_model.json'));
  const out = assignTier({}, model);
  assert.equal(out.model_version, 'tier_kmeans_fixture');
});

test('R-01: generateNarrative() lolos skema NarrativeResponse', async () => {
  const fixture = load('smgr_fields_company.json');
  const analysis = await recompute({ ...fixture, price: 3800 });
  const nar = await generateNarrative(analysis);
  const r = NarrativeResponse.safeParse(nar);
  assert.ok(r.success, r.success ? '' : JSON.stringify(r.error.issues));
});

test('R-01 & R-02: recompute() lolos AnalyzeResponse dan mengabaikan validation lama', async () => {
  const fixture = load('smgr_fields_company.json');
  const staleValidation = { checks: [], needs_review: true };
  const out = await recompute({ ...fixture, validation: staleValidation, price: 3800 });
  const r = AnalyzeResponse.safeParse(out);
  assert.ok(r.success, r.success ? '' : JSON.stringify(r.error.issues));
  assert.notEqual(out.validation, staleValidation);
});

test('R-04: evaluateStatus menghormati direction higher_better vs lower_better', () => {
  assert.equal(evaluateStatus(0.2, thresholds.roe), 'sehat');
  assert.equal(evaluateStatus(0.02, thresholds.roe), 'lemah');
  assert.equal(evaluateStatus(0.3, thresholds.der), 'sehat');
  assert.equal(evaluateStatus(2.5, thresholds.der), 'lemah');
});
