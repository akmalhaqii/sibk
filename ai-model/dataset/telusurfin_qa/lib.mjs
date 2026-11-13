// Utilitas generator TelusurFin-QA: RNG deterministik, nama fiktif, format angka Indonesia, skenario dari data BEI.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '../../..');

// ---------- RNG deterministik (mulberry32) ----------
export function makeRng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
    float: (lo, hi) => lo + next() * (hi - lo),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    chance: (p) => next() < p,
    shuffle: (arr) => {
      const a2 = [...arr];
      for (let i = a2.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [a2[i], a2[j]] = [a2[j], a2[i]];
      }
      return a2;
    },
  };
}

// ---------- Format angka Indonesia ----------
const nf = (d) => new Intl.NumberFormat('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d });
export const num = (v, d = 0) => nf(d).format(v);
export const pct = (v, d = 1) => `${num(v * 100, d)}%`;
export const mult = (v, d = 2) => `${num(v, d)}x`;
export const rp = (v, d = 0) => `Rp${num(v, d)}`;

// Nilai dalam juta Rupiah -> kalimat skala ("Rp1,25 triliun")
export function rpScale(jutaValue) {
  const full = jutaValue * 1e6;
  const abs = Math.abs(full);
  const sign = full < 0 ? '−' : '';
  if (abs >= 1e12) return `${sign}Rp${num(abs / 1e12, 2)} triliun`;
  if (abs >= 1e9) return `${sign}Rp${num(abs / 1e9, 2)} miliar`;
  return `${sign}Rp${num(abs / 1e6, 0)} juta`;
}

// ---------- Nama perusahaan fiktif ----------
const W1 = ['Arunika', 'Baskara', 'Candrika', 'Dirgasana', 'Elangsari', 'Gandawangi', 'Halimun', 'Jatiraga', 'Kencanasari', 'Lintangsari', 'Mandalika', 'Nawasena', 'Pancaraya', 'Rajawangsa', 'Samudrasa', 'Tirtamaya', 'Udayana Raya', 'Wiradarma', 'Yasaguna', 'Banyuasri', 'Cakrawira', 'Dewangga', 'Galuhsari', 'Kalingga Raya', 'Larasati', 'Mahameru Jaya', 'Nirmalasari', 'Paramitha', 'Sagarayasa', 'Tunggadewi'];
const W2 = ['Karya', 'Niaga', 'Industri', 'Mandiri', 'Sentosa', 'Persada', 'Abadi', 'Lestari', 'Utama', 'Gemilang', 'Sejahtera', 'Nusantara', 'Perkasa', 'Makmur', 'Cemerlang', 'Agung', 'Prima', 'Tama', 'Semesta', 'Buana'];
export function fakeCompany(rng) {
  return `PT ${rng.pick(W1)} ${rng.pick(W2)} Tbk`;
}
export const LETTER_NAMES = ['PT A', 'PT B', 'Perusahaan X', 'Perusahaan Y', 'Emiten Contoh'];

// ---------- Data BEI ----------
export function loadBeiRows() {
  const p = path.join(ROOT, 'data', 'processed', 'raw_bei.csv');
  const [head, ...lines] = fs.readFileSync(p, 'utf8').trim().split(/\r?\n/);
  const cols = head.split(',');
  return lines.map((line) => {
    // name/sector bisa mengandung koma dalam tanda kutip
    const out = [];
    let cur = '';
    let q = false;
    for (const ch of line) {
      if (ch === '"') q = !q;
      else if (ch === ',' && !q) {
        out.push(cur);
        cur = '';
      } else cur += ch;
    }
    out.push(cur);
    return Object.fromEntries(cols.map((c, i) => [c, out[i]]));
  });
}

const FIELDS = [
  'total_assets', 'current_assets', 'total_liabilities', 'current_liabilities', 'total_equity',
  'equity_parent', 'revenue', 'net_income', 'net_income_parent', 'operating_cash_flow',
];

export const PERIODS = {
  Q1: { label: 'kuartal I 2025', end: '31 Maret 2025', flowPrior: 'kuartal I 2024', factor: 4, factorText: '× 4', months: 3 },
  Q2: { label: 'semester I 2025', end: '30 Juni 2025', flowPrior: 'semester I 2024', factor: 2, factorText: '× 2', months: 6 },
  Q3: { label: 'sembilan bulan 2025', end: '30 September 2025', flowPrior: 'sembilan bulan 2024', factor: 4 / 3, factorText: '× 4/3', months: 9 },
  FY: { label: 'tahun 2025', end: '31 Desember 2025', flowPrior: 'tahun 2024', factor: 1, factorText: '× 1', months: 12 },
};

// Skenario tersamar: data asli diskalakan & diberi derau, dibulatkan ke juta Rupiah (seperti laporan)
export function makeScenario(row, rng, { periodType } = {}) {
  const s = Math.exp(rng.float(Math.log(0.25), Math.log(4)));
  const fields = {};
  for (const f of FIELDS) {
    const cur = Number(row[f]);
    const pr = Number(row[`${f}_prior`]);
    if (!Number.isFinite(cur)) return null;
    const jit = () => 1 + rng.float(-0.08, 0.08);
    fields[f] = {
      value: Math.round((cur * s * jit()) / 1e6),
      prior: Number.isFinite(pr) && row[`${f}_prior`] !== '' ? Math.round((pr * s * jit()) / 1e6) : null,
    };
  }
  const pt = periodType ?? rng.pick(['Q1', 'Q1', 'Q1', 'Q2', 'Q3', 'FY', 'FY']);
  // Data sumber = Q1; untuk periode lebih panjang, pos arus (laba, pendapatan, arus kas) diperbesar sesuai jumlah bulan
  const flowMul = (PERIODS[pt].months / 3) * (1 + rng.float(-0.1, 0.1));
  for (const f of ['revenue', 'net_income', 'net_income_parent', 'operating_cash_flow']) {
    for (const k of ['value', 'prior']) if (fields[f][k] != null) fields[f][k] = Math.round(fields[f][k] * flowMul);
  }
  // Jaga konsistensi neraca: total aset = liabilitas + ekuitas (tanpa syirkah)
  for (const k of ['value', 'prior']) {
    if (fields.total_liabilities[k] != null && fields.total_equity[k] != null) {
      fields.total_assets[k] = fields.total_liabilities[k] + fields.total_equity[k];
    }
  }
  return {
    sourceTicker: row.ticker,
    sector: row.sector,
    name: rng.chance(0.8) ? fakeCompany(rng) : rng.pick(LETTER_NAMES),
    periodType: pt,
    period: PERIODS[pt],
    fields,
  };
}
