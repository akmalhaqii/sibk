// Alur data latih tier (Python -> berkas -> Node -> berkas -> Python):
//
//   ai-model/training/prepare_dataset.py -> data/processed/raw_bei.csv
//     -> [skrip ini] computeMetrics() yang sama dengan pipeline (FR-TRN-01)
//     -> data/processed/features.csv
//     -> ai-model/training/train_cluster.py
import fs from 'node:fs';
import path from 'node:path';
import env from '../src/config/env.js';
import { computeMetrics } from '../src/pipeline/metrics.js';

const KEYS = [
  'total_assets',
  'current_assets',
  'total_liabilities',
  'current_liabilities',
  'total_equity',
  'equity_parent',
  'revenue',
  'net_income',
  'net_income_parent',
  'operating_cash_flow',
];

const FEATURES = [
  'roa',
  'roe',
  'liability_to_asset',
  'net_margin',
  'current_ratio',
  'revenue_growth',
  'ocf_to_assets',
];

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function escapeCsvCell(val) {
  if (val == null) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

const num = (v) => {
  if (v === undefined || v === null || String(v).trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const inputPath = path.join(env.dataDir, 'processed/raw_bei.csv');
const outputPath = path.join(env.dataDir, 'processed/features.csv');

const rawText = fs.readFileSync(inputPath, 'utf8').replace(/\r\n/g, '\n').trim();
const lines = rawText.split('\n');
const headers = parseCsvLine(lines[0]);

const outHeader = ['ticker', 'name', 'sector', 'period_end', ...FEATURES];
const outLines = [outHeader.join(',')];

let completeCount = 0;
let incompleteCount = 0;

for (let i = 1; i < lines.length; i++) {
  if (!lines[i].trim()) continue;
  const cols = parseCsvLine(lines[i]);
  const row = Object.fromEntries(headers.map((h, idx) => [h, cols[idx]]));

  const fields = Object.fromEntries(
    KEYS.map((k) => [
      k,
      {
        value: num(row[k]),
        prior: num(row[`${k}_prior`]),
      },
    ])
  );

  const metrics = computeMetrics(fields, { period_type: 'Q1' });
  const featVals = FEATURES.map((f) => metrics[f]?.value);

  if (featVals.every((v) => v != null && Number.isFinite(v))) completeCount++;
  else incompleteCount++;

  if (row.ticker === 'AALI') {
    console.log(
      `[cek AALI] ROA=${(metrics.roa.value * 100).toFixed(2)}% (display=${metrics.roa.display}), ROE=${metrics.roe.display}, CR=${metrics.current_ratio.display}`
    );
  }

  const lineOut = [
    escapeCsvCell(row.ticker),
    escapeCsvCell(row.name),
    escapeCsvCell(row.sector),
    escapeCsvCell(row.period_end),
    ...featVals.map((v) => (v == null ? '' : v)),
  ];
  outLines.push(lineOut.join(','));
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, outLines.join('\n') + '\n', 'utf8');
console.log(
  `[build_features] ${lines.length - 1} baris -> ${outputPath} (fitur lengkap=${completeCount}, fitur parsial=${incompleteCount})`
);
