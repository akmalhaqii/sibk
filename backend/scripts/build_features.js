// Alur data latih tier (Python -> berkas -> Node -> berkas -> Python):
//
//   ai-model/training/prepare_dataset.py -> data/processed/raw_bei.csv
//     -> [skrip ini] computeMetrics() yang sama dengan pipeline (FR-TRN-01)
//     -> data/processed/features.csv
//     -> ai-model/training/train_cluster.py
import path from 'node:path';
import env from '../src/config/env.js';
import { computeMetrics } from '../src/pipeline/metrics.js';

const input = path.join(env.dataDir, 'processed/raw_bei.csv');
const output = path.join(env.dataDir, 'processed/features.csv');

console.log(`TODO: ${input} -> ${output}`);
