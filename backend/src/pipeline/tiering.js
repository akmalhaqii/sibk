// FR-TIER: muat model JSON (centroid + scaler + winsor), standarkan, cari centroid terdekat -> low/mid/high
// Model dibaca dari backend/models/tier_kmeans.json (disalin oleh ai-model/training/export_model.py).
import fs from 'node:fs';
import env from '../config/env.js';
import { TierModel } from '../schemas/index.js';

let cached = null;

export function loadTierModel(modelPath = env.tierModelPath) {
  if (cached && cached.path === modelPath) return cached.model;
  if (!fs.existsSync(modelPath)) return null;
  const model = TierModel.parse(JSON.parse(fs.readFileSync(modelPath, 'utf8')));
  cached = { path: modelPath, model };
  return model;
}

export function clearTierModelCache() {
  cached = null;
}

export function assignTier(metrics = {}, model = loadTierModel()) {
  const empty = {
    tier: null,
    cluster: null,
    distance_to_centroid: null,
    features: model?.features ?? [],
    model_version: model?.model_version ?? null,
  };
  if (!model) return { ...empty, reason: 'model belum tersedia' };

  const x = model.features.map((f, i) => {
    const v = metrics?.[f]?.value;
    if (v == null || !Number.isFinite(v)) return null;
    const clipped = Math.min(Math.max(v, model.winsor.lower[i]), model.winsor.upper[i]);
    const scale = model.scaler.scale[i] || 1;
    return (clipped - model.scaler.mean[i]) / scale;
  });

  if (x.some((v) => v == null)) {
    return { ...empty, reason: 'fitur tidak lengkap' };
  }

  const d = model.centroids.map((c) => Math.hypot(...c.map((ci, i) => x[i] - ci)));
  const cluster = d.indexOf(Math.min(...d));

  return {
    tier: model.tier_by_cluster.at(cluster),
    cluster,
    distance_to_centroid: Number(d.at(cluster).toFixed(4)),
    features: model.features,
    model_version: model.model_version,
  };
}
