// REV-06: setiap angka di kalimat narasi harus milik metrik yang disebut tepat sebelumnya,
// dan kata status (sehat/waspada/lemah) setelah angka harus sama dengan status metrik itu di data.
// Ditemukan pada eval 13 Nov 2026: Qwen 1.7B menulis "arus kas meningkat 8,3%" padahal 8,3% = pertumbuhan pendapatan.

// Alias nama metrik dalam teks (huruf kecil). Alias yang lebih panjang dicocokkan lebih dulu.
// Kelompok "cash" dan "valuation" sengaja longgar: alias umum ("arus kas", "harga") boleh menunjuk
// ke angka mana pun di kelompok itu, tetapi tidak ke angka kelompok lain.
const ALIASES = [
  ['roe', ['roe', 'return on equity', 'imbal hasil ekuitas', 'tingkat pengembalian ekuitas']],
  ['roa', ['roa', 'return on assets', 'return on asset', 'imbal hasil aset', 'tingkat pengembalian aset']],
  ['net_margin', ['margin laba bersih', 'margin bersih', 'net margin', 'net profit margin', 'margin net']],
  ['operating_margin', ['margin usaha', 'margin operasi', 'margin operasional', 'operating margin', 'margin laba usaha']],
  ['current_ratio', ['current ratio', 'rasio lancar', 'rasio likuiditas', 'rasio current ratio']],
  ['der', ['der', 'debt to equity', 'debt-to-equity', 'rasio utang terhadap ekuitas', 'liabilitas terhadap ekuitas', 'utang terhadap ekuitas']],
  [
    'liability_to_asset',
    ['liabilitas terhadap aset', 'rasio liabilitas terhadap aset', 'utang terhadap aset', 'rasio utang terhadap aset', 'liability to asset', 'l/a'],
  ],
  [
    'revenue_growth',
    ['pertumbuhan pendapatan', 'pendapatan tumbuh', 'pendapatan naik', 'pendapatan meningkat', 'pendapatan turun', 'pendapatan menurun', 'pertumbuhan penjualan', 'penjualan tumbuh', 'revenue growth'],
  ],
  [
    'earnings_growth',
    ['pertumbuhan laba', 'laba tumbuh', 'laba naik', 'laba meningkat', 'laba turun', 'laba menurun', 'laba pemilik entitas induk tumbuh', 'earnings growth'],
  ],
  ['cash_conversion', ['konversi kas', 'cash conversion', 'arus kas operasi terhadap laba bersih', 'arus kas operasi terhadap laba']],
  ['ocf_to_assets', ['arus kas operasi terhadap aset', 'arus kas terhadap aset', 'ocf to assets']],
  // Istilah yang tidak punya angka di data narasi: angka yang ditempel padanya selalu ditolak
  ['@none', ['arus kas bersih', 'arus kas tahunan', 'arus kas investasi', 'arus kas pendanaan', 'kas bersih', 'laba kotor', 'laba usaha']],
  ['@cash', ['arus kas operasi', 'arus kas']],
  // "Pendapatan emiten mengalami pertumbuhan -10,3%": angka boleh milik salah satu metrik pertumbuhan
  ['@growth', ['pertumbuhan', 'tumbuh', 'bertumbuh']],
  [
    '@valuation',
    ['per', 'pbv', 'p/s', 'price to sales', 'price to book', 'price to earnings', 'nilai wajar', 'graham', 'premium', 'diskon', 'harga saham', 'harga', 'eps', 'bvps', 'kapitalisasi pasar'],
  ],
];

const GROUPS = {
  '@cash': ['cash_conversion', 'ocf_to_assets'],
  '@growth': ['revenue_growth', 'earnings_growth'],
};

const METRIC_GROUP_KEYS = {
  profitability: ['roe', 'roa', 'net_margin', 'operating_margin'],
  liquidity: ['current_ratio'],
  solvency: ['der', 'liability_to_asset'],
  growth_cash: ['revenue_growth', 'earnings_growth', 'cash_conversion', 'ocf_to_assets'],
};

const STATUS_WORDS = ['sehat', 'waspada', 'lemah'];

const norm = (s) =>
  String(s)
    .trim()
    .replace(/\s+(?=[%x]$)/, '')
    .replace(/^Rp\s*/i, '')
    .replace(/^[+−-]/, '')
    .replace(/[.,]+$/, '');

// Katalog dari input narasi (buildInput): key -> { displays:Set, status }
export function buildCatalog(input = {}) {
  const cat = {};
  for (const [group, keys] of Object.entries(METRIC_GROUP_KEYS)) {
    for (const k of keys) {
      const m = input[group]?.[k];
      if (m?.display && m.display !== '—') cat[k] = { displays: new Set([norm(m.display)]), status: m.status ?? null };
    }
  }
  const valDisplays = new Set();
  const v = input.valuation ?? {};
  if (v.price) valDisplays.add(norm(v.price));
  for (const k of ['per', 'pbv', 'ps', 'fair_value', 'premium_discount']) {
    if (v[k]?.display) valDisplays.add(norm(v[k].display));
  }
  cat['@valuation'] = { displays: valDisplays, status: null };
  cat['@none'] = { displays: new Set(), status: null };
  for (const [g, members] of Object.entries(GROUPS)) {
    const displays = new Set();
    for (const m of members) for (const d of cat[m]?.displays ?? []) displays.add(d);
    cat[g] = { displays, status: null, members };
  }
  return cat;
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
const ALIAS_LIST = ALIASES.flatMap(([key, names]) => names.map((name) => ({ key, name })))
  .sort((a, b) => b.name.length - a.name.length);

// Temukan semua kemunculan alias (tanpa tumpang tindih; alias terpanjang menang)
function findAliases(sentence) {
  const lower = sentence.toLowerCase();
  const taken = new Array(lower.length).fill(false);
  const hits = [];
  for (const { key, name } of ALIAS_LIST) {
    const re = new RegExp(`(?<![\\p{L}\\d])${escapeRe(name)}(?![\\p{L}\\d])`, 'gu');
    let m;
    while ((m = re.exec(lower))) {
      const s = m.index;
      const e = s + m[0].length;
      if (taken.slice(s, e).some(Boolean)) continue;
      for (let i = s; i < e; i++) taken[i] = true;
      hits.push({ key, start: s, end: e });
    }
  }
  return hits.sort((a, b) => a.start - b.start);
}

// Token angka (setelah tahun, kuartal, tanggal, dan versi model dibuang)
function findNumbers(sentence) {
  const masked = sentence
    .replace(/tier_kmeans_v\d+|yahoo-finance2|qwen3[:\w.]*/gi, (s) => ' '.repeat(s.length))
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, (s) => ' '.repeat(s.length))
    .replace(/\b(?:Q[1-4]|H[12]|9M|FY)\b/g, (s) => ' '.repeat(s.length))
    .replace(/\b(?:19|20)\d{2}\b/g, (s) => ' '.repeat(s.length));
  const out = [];
  // "1,87 kali" = 1,87x dan "21,0 persen" = 21,0% (gaya penulisan Qwen pada narasi paragraf)
  const re = /(?:Rp\s*)?[+−-]?\d[\d.,]*(?:\s?(?:%|x(?![\p{L}])|kali(?![\p{L}])|persen(?![\p{L}])))?/gu;
  let m;
  while ((m = re.exec(masked))) {
    const raw = m[0];
    const tok = norm(raw.replace(/\s?kali$/i, 'x').replace(/\s?persen$/i, '%'));
    if (!tok || !/\d/.test(tok)) continue;
    out.push({ tok, start: m.index, end: m.index + raw.length });
  }
  return out;
}

// Periksa satu kalimat. Hasil: { ok, reason, bound } — bound = jumlah angka yang terikat benar.
export function checkSentenceBinding(sentence, catalog) {
  const aliases = findAliases(sentence);
  const numbers = findNumbers(sentence);
  let bound = 0;
  let prevEnd = 0;
  for (let i = 0; i < numbers.length; i++) {
    const n = numbers[i];
    // Alias terakhir antara angka sebelumnya dan angka ini
    const owner = [...aliases].reverse().find((a) => a.end <= n.start && a.start >= prevEnd);
    if (!owner) return { ok: false, reason: `angka ${n.tok} tanpa nama metrik`, bound };
    // "Arus kas operasi tumbuh 8,3%": kata pertumbuhan umum yang menempel pada metrik lain -> pertumbuhan
    // metrik itu tidak ada di data (yang ada hanya pertumbuhan pendapatan & laba)
    if (owner.key === '@growth') {
      const subject = [...aliases].reverse().find((a) => a.end <= owner.start && a.start >= prevEnd);
      if (subject && !['revenue_growth', 'earnings_growth', '@growth'].includes(subject.key)) {
        return { ok: false, reason: `pertumbuhan ${subject.key} tidak ada di data`, bound };
      }
    }
    const entry = catalog[owner.key];
    if (!entry || !entry.displays.has(n.tok)) {
      return { ok: false, reason: `angka ${n.tok} bukan milik ${owner.key}`, bound };
    }
    // Status setelah angka: sampai alias berikutnya / angka berikutnya / akhir kalimat
    const nextAlias = aliases.find((a) => a.start >= n.end);
    const nextNum = numbers[i + 1];
    const winEnd = Math.min(nextAlias?.start ?? sentence.length, nextNum?.start ?? sentence.length);
    // Status boleh ditulis sebelum angka ("ROE berstatus lemah sebesar 0,7%") atau sesudahnya
    const window = (sentence.slice(owner.end, n.start) + ' ' + sentence.slice(n.end, winEnd)).toLowerCase();
    const said = STATUS_WORDS.find((w) => new RegExp(`(?<!\\p{L})${w}(?!\\p{L})`, 'u').test(window));
    if (said) {
      const members = entry.members ?? [owner.key];
      const okStatus = members.some((k) => catalog[k]?.displays.has(n.tok) && catalog[k]?.status === said);
      if (!okStatus) return { ok: false, reason: `status ${said} tidak sesuai untuk ${owner.key} ${n.tok}`, bound };
    }
    bound++;
    prevEnd = n.end;
  }
  return { ok: true, reason: null, bound };
}

// REV-06b: tentukan topik paragraf dari isinya (Qwen sering tidak menulis awalan "Topik:")
const TOPIC_OF_KEY = {
  roe: 'Profitabilitas', roa: 'Profitabilitas', net_margin: 'Profitabilitas', operating_margin: 'Profitabilitas',
  current_ratio: 'Likuiditas dan solvabilitas', der: 'Likuiditas dan solvabilitas', liability_to_asset: 'Likuiditas dan solvabilitas',
  revenue_growth: 'Pertumbuhan dan arus kas', earnings_growth: 'Pertumbuhan dan arus kas', cash_conversion: 'Pertumbuhan dan arus kas',
  ocf_to_assets: 'Pertumbuhan dan arus kas', '@cash': 'Pertumbuhan dan arus kas', '@growth': 'Pertumbuhan dan arus kas',
  '@valuation': 'Valuasi',
};

export function classifyTopic(paragraph) {
  const counts = new Map();
  let first = null;
  for (const h of findAliases(paragraph)) {
    const t = TOPIC_OF_KEY[h.key];
    if (!t) continue;
    counts.set(t, (counts.get(t) ?? 0) + 1);
    first ??= t;
  }
  if (!counts.size) return null;
  const max = Math.max(...counts.values());
  const winners = [...counts.entries()].filter(([, c]) => c === max).map(([t]) => t);
  return winners.includes(first) ? first : winners[0];
}
