// C2: baca daftar analisis tersimpan di data/cache/analyze_*.json (tanpa mengembalikan snapshot penuh)
import fs from 'node:fs/promises';
import path from 'node:path';
import env from '../config/env.js';

function getCacheDir() {
  return process.env.CACHE_DIR
    ? path.resolve(env.backendRoot, process.env.CACHE_DIR)
    : env.cacheDir;
}

export async function listAnalyses({ all = false } = {}) {
  const dir = getCacheDir();
  let entries = [];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return [];
  }

  const rows = [];
  for (const name of entries) {
    if (!name.startsWith('analyze_') || !name.endsWith('.json')) continue;
    const fp = path.join(dir, name);
    try {
      const [raw, stat] = await Promise.all([fs.readFile(fp, 'utf8'), fs.stat(fp)]);
      const data = JSON.parse(raw);
      const entity = data?.entity;
      if (!entity?.ticker || entity.ticker === 'UNKNOWN') continue;
      const inferredFileId = name.replace(/^analyze_[^_]+_/, '').replace(/\.json$/, '');
      rows.push({
        ticker: entity.ticker,
        period_type: entity.period_type ?? null,
        period_end: entity.period_end ?? null,
        source: entity.source ?? null,
        file_id: entity.file_id ?? inferredFileId ?? null,
        tier: data?.tiering?.tier ?? null,
        analyzed_at: stat.mtime.toISOString(),
      });
    } catch {
      // Berkas cache rusak dilewati
    }
  }

  rows.sort((a, b) => Date.parse(b.analyzed_at) - Date.parse(a.analyzed_at));
  if (all) return rows;

  const seen = new Set();
  const deduped = [];
  for (const r of rows) {
    const key = `${r.ticker}::${r.period_end ?? ''}::${r.source ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(r);
  }
  return deduped;
}

export async function getAnalysisByFileId(fileId) {
  if (!fileId || typeof fileId !== 'string') return null;
  const dir = getCacheDir();
  let entries = [];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return null;
  }
  for (const name of entries) {
    if (!name.startsWith('analyze_') || !name.endsWith('.json')) continue;
    const fp = path.join(dir, name);
    try {
      const data = JSON.parse(await fs.readFile(fp, 'utf8'));
      const inferred = name.replace(/^analyze_[^_]+_/, '').replace(/\.json$/, '');
      if (data?.entity?.file_id === fileId || inferred === fileId) {
        return data;
      }
    } catch {
      // Lewati file cache rusak
    }
  }
  return null;
}
