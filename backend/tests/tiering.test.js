import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeMetrics } from '../src/pipeline/metrics.js';
import { assignTier, loadTierModel, clearTierModelCache } from '../src/pipeline/tiering.js';
import { TierModel } from '../src/schemas/index.js';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const load = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));

test('tiering: inferensi tier pada metrik SMGR dengan fixture model menghasilkan tier dan model_version', () => {
  const { fields, entity } = load('smgr_fields_company.json');
  const model = TierModel.parse(load('tier_model.json'));
  const metrics = computeMetrics(fields, entity);
  const res = assignTier(metrics, model);

  assert.ok(['low', 'mid', 'high'].includes(res.tier));
  assert.equal(res.model_version, 'tier_kmeans_fixture');
  assert.ok(Number.isFinite(res.distance_to_centroid));
});

test('tiering: inferensi tier pada metrik SMGR dengan model produksi (backend/models/tier_kmeans.json)', () => {
  clearTierModelCache();
  const prodModel = loadTierModel();
  assert.ok(prodModel, 'backend/models/tier_kmeans.json harus ada');
  TierModel.parse(prodModel);

  const { fields, entity } = load('smgr_fields_company.json');
  const metrics = computeMetrics(fields, entity);
  const res = assignTier(metrics, prodModel);
  assert.equal(res.tier, 'mid');
  assert.equal(res.cluster, 0);
  assert.equal(res.model_version, 'tier_kmeans_v1');
  assert.ok(Math.abs(res.distance_to_centroid - 0.6181) < 0.01);
});
