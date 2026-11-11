import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeMetrics } from '../src/pipeline/metrics.js';
import { assignTier } from '../src/pipeline/tiering.js';
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
