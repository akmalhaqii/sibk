// C3: pemeriksa kalimat jawaban chat (saran investasi, narasi v6 + katalog halaman/ambang/Graham, panjang 4-60 kata)
import fs from 'node:fs';
import path from 'node:path';
import env from '../config/env.js';
import { fmtPct, fmtMultiple } from '../format.js';
import { buildCatalog } from '../narrator/binding.js';
import { checkQualitativeSentence } from '../narrator/qualitative.js';
import { factAliases, factCatalogEntries } from './facts.js';

// Alias khusus chat (tidak dipakai pemeriksa ringkasan eksekutif)
const CHAT_ALIASES = [
  ...[['@page', ['halaman', 'hal']], ['@threshold', ['ambang batas', 'ambang', 'batas', 'minimum', 'maksimal', 'standar']]].flatMap(
    ([key, names]) => names.map((name) => ({ key, name }))
  ),
  ...factAliases(),
  // Frasa pertumbuhan di DATA lebih panjang dari alias pos laporan "laba pemilik entitas induk"
  { key: 'earnings_growth', name: 'pertumbuhan laba pemilik entitas induk' },
  { key: 'earnings_growth', name: 'pertumbuhan laba yang diatribusikan kepada pemilik entitas induk' },
];

export const CHAT_FORBIDDEN_RE =
  /\b(beli|membeli|dibeli|jual|menjual|dijual|tahan|hold|buy|sell|layak|worth it|target harga|price target|potensi naik|cuan|entry|cut ?loss|average down|averaging|rekomendasi|rekomendasikan|sebaiknya (?:saya )?(?:beli|jual|masuk|keluar)|masuk (?:di|ke) harga|investasi(?:kan)? di|undervalued|overvalued|(?:murah|mahal)\s+untuk\s+dibeli)\b/i;

const PCT_KEYS = new Set([
  'roe',
  'roa',
  'net_margin',
  'operating_margin',
  'liability_to_asset',
  'revenue_growth',
  'earnings_growth',
]);

let thresholdsCache = null;
function loadThresholds() {
  if (!thresholdsCache) {
    const p = path.join(env.backendRoot, 'config', 'thresholds.json');
    thresholdsCache = JSON.parse(fs.readFileSync(p, 'utf8'));
  }
  return thresholdsCache;
}

function formatThresholdVariants(key, num) {
  const variants = new Set();
  if (PCT_KEYS.has(key)) {
    variants.add(fmtPct(num, 0).replace(/[.,]+$/, ''));
    variants.add(fmtPct(num, 1).replace(/[.,]+$/, ''));
    return variants;
  }
  variants.add(fmtMultiple(num, 1));
  variants.add(fmtMultiple(num, 2));
  const rawInt = `${Number(num.toFixed(2))}`.replace('.', ',');
  variants.add(`${rawInt}x`);
  return variants;
}

export function extendCatalog(baseCatalog = {}, result = {}) {
  const cat = {};
  for (const [k, v] of Object.entries(baseCatalog)) {
    if (k === '@extraAliases') continue;
    cat[k] = {
      ...v,
      displays: new Set(v?.displays ?? []),
      thresholds: v?.thresholds ? new Set(v.thresholds) : undefined,
    };
  }

  // 1. Nomor halaman PDF sumber yang valid dari result.fields[*].page
  const pages = new Set();
  for (const f of Object.values(result?.fields ?? {})) {
    if (Number.isFinite(f?.page)) pages.add(String(f.page));
  }
  cat['@page'] = { displays: pages, status: null };

  // 2. Konstanta 22,5 pada rumus nilai wajar Graham
  if (!cat['@valuation']) cat['@valuation'] = { displays: new Set(), status: null };
  cat['@valuation'].displays.add('22,5');

  // 3. Angka ambang dari config/thresholds.json
  const thAll = new Set();
  const thresholds = loadThresholds();
  for (const [k, cfg] of Object.entries(thresholds)) {
    if (!cfg || typeof cfg !== 'object' || cfg.low == null || cfg.high == null) continue;
    const vals = new Set([...formatThresholdVariants(k, cfg.low), ...formatThresholdVariants(k, cfg.high)]);
    for (const v of vals) thAll.add(v);
    if (cat[k]) {
      cat[k].thresholds = vals;
    } else {
      cat[k] = { displays: new Set(), status: null, thresholds: vals };
    }
  }
  cat['@threshold'] = { displays: thAll, status: null };

  // 4. Angka laporan (laba, pendapatan, aset, ...) dalam Rupiah juta/miliar/triliun, sama persis dengan DATA
  Object.assign(cat, factCatalogEntries(result));
  cat['@extraAliases'] = CHAT_ALIASES;

  return cat;
}

export function checkChatSentence(sentence, input = {}, catalog = null) {
  const s = String(sentence ?? '').trim();
  if (!s) return { ok: false, reason: 'kalimat kosong' };

  // 1. Tolak saran investasi & target harga
  const adv = s.match(CHAT_FORBIDDEN_RE);
  if (adv) return { ok: false, reason: `saran investasi "${adv[0]}"` };

  // 2 & 3. Narasi v6 + katalog diperluas (halaman, ambang, 22,5 Graham)
  const cat = catalog ?? buildCatalog(input);
  const qErr = checkQualitativeSentence(s, input, { allowNumbers: true, catalog: cat, allowThresholds: true });
  if (qErr) return { ok: false, reason: qErr };

  // 4. Panjang 4–60 kata
  const wordCount = s.split(/\s+/).filter(Boolean).length;
  if (wordCount < 4 || wordCount > 60) {
    return { ok: false, reason: `panjang ${wordCount} kata (harus 4–60 kata)` };
  }

  return { ok: true, reason: null };
}
