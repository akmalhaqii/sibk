// Angka laporan (pos laporan keuangan) untuk chat: "Berapa laba bersihnya?", "Total asetnya berapa?".
// Dipakai di tiga tempat: lembar DATA untuk Qwen (context.js), katalog pemeriksa (check.js), dan jawaban aturan (rules.js).
// Khusus chat: alias di sini TIDAK masuk ALIASES global binding.js, jadi pemeriksa ringkasan eksekutif tidak berubah.
import { fmtNumber } from '../format.js';
import { unitFactor } from '../pipeline/valuation.js';

// Urutan = urutan tampil di DATA. Alias huruf kecil; alias terpanjang menang saat pencocokan.
export const FACT_FIELDS = [
  { key: 'revenue', label: 'pendapatan', aliases: ['pendapatan usaha', 'pendapatan', 'penjualan', 'revenue'] },
  { key: 'gross_profit', label: 'laba bruto', aliases: ['laba bruto', 'laba kotor', 'gross profit'] },
  { key: 'profit_before_tax', label: 'laba sebelum pajak', aliases: ['laba sebelum pajak', 'laba sebelum beban pajak'] },
  {
    key: 'net_income',
    label: 'laba bersih periode berjalan',
    aliases: ['laba bersih periode berjalan', 'laba periode berjalan', 'laba tahun berjalan', 'jumlah laba', 'total laba', 'laba bersih', 'laba', 'net income'],
  },
  {
    key: 'net_income_parent',
    label: 'laba yang diatribusikan kepada pemilik entitas induk',
    aliases: ['laba yang diatribusikan kepada pemilik entitas induk', 'laba pemilik entitas induk', 'laba entitas induk', 'laba diatribusikan'],
  },
  { key: 'total_assets', label: 'total aset', aliases: ['total aset', 'jumlah aset', 'aset'] },
  { key: 'current_assets', label: 'aset lancar', aliases: ['aset lancar'] },
  { key: 'total_liabilities', label: 'total liabilitas', aliases: ['total liabilitas', 'jumlah liabilitas', 'total utang', 'liabilitas', 'utang'] },
  { key: 'current_liabilities', label: 'liabilitas jangka pendek', aliases: ['liabilitas jangka pendek', 'utang jangka pendek'] },
  { key: 'total_equity', label: 'total ekuitas', aliases: ['total ekuitas', 'jumlah ekuitas', 'ekuitas', 'modal'] },
  { key: 'cash', label: 'kas dan setara kas', aliases: ['kas dan setara kas', 'kas'] },
  { key: 'operating_cash_flow', label: 'arus kas operasi', aliases: ['arus kas dari aktivitas operasi', 'arus kas operasi'] },
];

const ALIAS_KEY = (k) => `@fact_${k}`;

// Rupiah penuh dari nilai PDF × satuan (mis. "ribu IDR"), ditulis dalam juta/miliar/triliun
export function formatAmount(value, unit) {
  if (value == null || !Number.isFinite(value)) return null;
  const v = value * unitFactor(unit);
  const sign = v < 0 ? '-' : '';
  const a = Math.abs(v);
  if (a >= 1e12) return `${sign}Rp${fmtNumber(a / 1e12, 2)} triliun`;
  if (a >= 1e9) return `${sign}Rp${fmtNumber(a / 1e9, 2)} miliar`;
  if (a >= 1e6) return `${sign}Rp${fmtNumber(a / 1e6, 2)} juta`;
  return `${sign}Rp${fmtNumber(a, 0)}`;
}

// [{ key, label, display, page }] untuk pos yang ada di hasil ekstraksi
export function collectFacts(result) {
  const fields = result?.fields ?? {};
  const unit = result?.entity?.unit ?? '';
  const out = [];
  for (const f of FACT_FIELDS) {
    const field = fields[f.key];
    const display = formatAmount(field?.value, unit);
    if (!display) continue;
    out.push({ key: f.key, label: f.label, display, page: Number.isFinite(field?.page) ? field.page : null });
  }
  return out;
}

// Baris DATA: "- Angka laporan: laba bersih periode berjalan Rp760,25 miliar (hal. 19), ..."
export function factLines(result) {
  const facts = collectFacts(result);
  if (!facts.length) return '';
  const items = facts.map((f) => `${f.label} ${f.display}${f.page ? ` (hal. ${f.page})` : ''}`);
  return `- Angka laporan (periode ini, dari PDF): ${items.join('; ')}`;
}

// Alias tambahan untuk pemeriksa chat: { key, name }
export function factAliases() {
  return FACT_FIELDS.flatMap((f) => f.aliases.map((name) => ({ key: ALIAS_KEY(f.key), name })));
}

// Entri katalog: "@fact_net_income" -> displays {"760,25"}; angka ditulis tanpa "Rp" dan satuan
export function factCatalogEntries(result) {
  const entries = {};
  for (const f of collectFacts(result)) {
    const num = f.display.replace(/^-?Rp/, '').replace(/\s.*$/, '');
    const neg = f.display.startsWith('-');
    entries[ALIAS_KEY(f.key)] = { displays: new Set([num]), status: null, negative: neg };
  }
  return entries;
}

// Pos yang disebut di pertanyaan (alias terpanjang menang, tanpa tumpang tindih)
export function factsInQuestion(question) {
  const lower = String(question ?? '').toLowerCase();
  const taken = new Array(lower.length).fill(false);
  const found = [];
  const list = FACT_FIELDS.flatMap((f) => f.aliases.map((name) => ({ key: f.key, name }))).sort((a, b) => b.name.length - a.name.length);
  for (const { key, name } of list) {
    const re = new RegExp(`(?<![\\p{L}\\d])${name.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}(?:nya)?(?![\\p{L}\\d])`, 'gu');
    let m;
    while ((m = re.exec(lower))) {
      const s = m.index;
      const e = s + m[0].length;
      if (taken.slice(s, e).some(Boolean)) continue;
      for (let i = s; i < e; i++) taken[i] = true;
      if (!found.includes(key)) found.push(key);
    }
  }
  return found;
}
