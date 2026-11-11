// FR-TIER: muat model JSON (centroid + scaler + winsor), standarkan, cari centroid terdekat -> low/mid/high
// Model dibaca dari backend/models/tier_kmeans.json (disalin oleh ai-model/training/export_model.py).
// Backend tidak pernah membaca folder ai-model secara langsung.
import fs from 'node:fs';
import env from '../config/env.js';
import { TierModel } from '../schemas/index.js';

let cached = null;

export function loadTierModel(modelPath = env.tierModelPath) {
  if (cached && cached.path === modelPath) return cached.model;
  if (!fs.existsSync(modelPath)) return null; // model belum diekspor -> tier tidak tersedia
  const model = TierModel.parse(JSON.parse(fs.readFileSync(modelPath, 'utf8')));
  cached = { path: modelPath, model };
  return model;
}

export function assignTier(metrics, model = loadTierModel()) {
  const empty = { tier: null, cluster: null, distance_to_centroid: null, features: model?.features ?? [], model_version: model?.model_version ?? null };
  if (!model) return empty;
  // TODO: winsorize -> standarisasi (scaler) -> jarak Euclid ke tiap centroid -> tier_by_cluster[argmin]
  return empty;
}
