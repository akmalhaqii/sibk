// C1: kamus istilah (config/glossary.json) + ambang status dari config/thresholds.json
import fs from 'node:fs';
import path from 'node:path';
import env from '../config/env.js';
import { fmtPct, fmtMultiple } from '../format.js';

let cache = null;
export function loadGlossary() {
  if (!cache) {
    const p = path.join(env.backendRoot, 'config', 'glossary.json');
    cache = JSON.parse(fs.readFileSync(p, 'utf8')).entries;
  }
  return cache;
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

// Cari istilah kamus yang disebut di teks; alias terpanjang menang
export function findTerms(text) {
  const lower = String(text).toLowerCase();
  const hits = [];
  for (const entry of loadGlossary()) {
    const names = [entry.term, ...entry.aliases].map((n) => n.toLowerCase());
    let best = null;
    for (const n of names) {
      // Akhiran -nya/-kah/-lah ikut dikenali ("nilai wajarnya", "likuiditasnya")
      const m = new RegExp(`(?<![\\p{L}\\d])${escapeRe(n)}(?:nya|kah|lah)?(?![\\p{L}\\d])`, 'u').exec(lower);
      if (m && (!best || n.length > best.len)) best = { entry, index: m.index, len: n.length };
    }
    if (best) hits.push(best);
  }
  // Buang istilah yang kemunculannya tertutup istilah lain yang lebih panjang
  return hits
    .filter((h) => !hits.some((o) => o !== h && o.len > h.len && o.index <= h.index && o.index + o.len >= h.index + h.len))
    .sort((a, b) => a.index - b.index)
    .map((h) => h.entry);
}

const PCT_KEYS = new Set(['roe', 'roa', 'net_margin', 'operating_margin', 'liability_to_asset', 'revenue_growth', 'earnings_growth']);
const fmtT = (key, v) => (PCT_KEYS.has(key) ? fmtPct(v, 0) : fmtMultiple(v, 1));

// "Ambang TelusurFin: sehat ≥ 15%, waspada 5%–15%, lemah < 5%."
export function thresholdText(metricKey) {
  const p = path.join(env.backendRoot, 'config', 'thresholds.json');
  const cfg = JSON.parse(fs.readFileSync(p, 'utf8'))[metricKey];
  if (!cfg || cfg.low == null || cfg.high == null) return null;
  const lo = fmtT(metricKey, cfg.low);
  const hi = fmtT(metricKey, cfg.high);
  return cfg.direction === 'lower_better'
    ? `Ambang TelusurFin: sehat ≤ ${lo}, waspada ${lo}–${hi}, lemah > ${hi}.`
    : `Ambang TelusurFin: sehat ≥ ${hi}, waspada ${lo}–${hi}, lemah < ${lo}.`;
}
