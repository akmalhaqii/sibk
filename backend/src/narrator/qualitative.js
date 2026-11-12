import { buildCatalog, checkSentenceBinding } from './binding.js';
// Narasi v5: satu paragraf kualitatif tanpa angka ("AKRA menunjukkan kinerja keuangan yang relatif kuat ...").
// Angka tetap tampil di kartu metrik; narasi menafsirkan STATUS hasil kode, bukan menghitung.
// Pemeriksa: setiap klausa yang menyebut aspek (profitabilitas, margin, likuiditas, ...) dan kata penilaian
// (kuat, sehat, waspada, lemah, ...) harus sesuai dengan status metrik aspek itu di data.


// Aspek -> metrik penyusunnya (kunci buildInput)
export const ASPECTS = {
  profitabilitas: { label: 'Profitabilitas (ROE, ROA)', metrics: [['profitability', 'roe'], ['profitability', 'roa']] },
  margin: { label: 'Margin (margin usaha, margin laba bersih)', metrics: [['profitability', 'operating_margin'], ['profitability', 'net_margin']] },
  pertumbuhan: { label: 'Pertumbuhan pendapatan dan laba', metrics: [['growth_cash', 'revenue_growth'], ['growth_cash', 'earnings_growth']] },
  arus_kas: { label: 'Arus kas operasi', metrics: [['growth_cash', 'cash_conversion']] },
  likuiditas: { label: 'Likuiditas (current ratio)', metrics: [['liquidity', 'current_ratio']] },
  permodalan: { label: 'Struktur permodalan (liabilitas terhadap ekuitas, liabilitas terhadap aset)', metrics: [['solvency', 'der'], ['solvency', 'liability_to_asset']] },
};

// Kata kunci aspek dalam teks (huruf kecil; frasa lebih panjang dicocokkan dulu)
const ASPECT_TERMS = [
  ['margin', ['margin usaha', 'margin laba bersih', 'margin operasional', 'margin bersih', 'margin laba', 'margin']],
  ['arus_kas', ['arus kas operasi', 'arus kas', 'konversi kas']],
  ['pertumbuhan', ['pertumbuhan pendapatan', 'pertumbuhan laba', 'pertumbuhan', 'tumbuh']],
  ['profitabilitas', ['profitabilitas', 'roe', 'roa', 'imbal hasil', 'tingkat pengembalian']],
  ['likuiditas', ['likuiditas', 'current ratio', 'rasio lancar']],
  ['permodalan', ['struktur permodalan', 'permodalan', 'struktur modal', 'solvabilitas', 'leverage', 'utang', 'liabilitas', 'der']],
  ['overall', ['kinerja keuangan', 'kondisi keuangan', 'kinerja emiten', 'kinerja secara umum', 'kinerja']],
];

// Kata penilaian -> kelas sentimen (frasa lebih panjang dulu)
const SENTIMENT_TERMS = [
  ['mild', ['cukup baik', 'cukup sehat', 'cukup kuat', 'cukup solid', 'cukup tinggi', 'relatif baik', 'memadai', 'moderat', 'cukup']],
  ['caution', ['perlu diperhatikan', 'perlu dicermati', 'perlu perhatian', 'perlu diwaspadai', 'kewaspadaan', 'waspada']],
  ['negative', ['lemah', 'buruk', 'rendah', 'tertekan', 'kurang', 'negatif', 'tipis']],
  ['positive', ['sangat baik', 'kuat', 'sehat', 'solid', 'baik', 'positif', 'kokoh', 'unggul', 'tinggi']],
];

const FORBIDDEN_RE =
  /\b(beli|dibeli|membeli|jual|dijual|menjual|tahan|ditahan|rekomendasi|direkomendasikan|layak|buy|sell|hold|murah|mahal|undervalued|overvalued|target harga|akumulasi)\b/i;
const TREND_RE = /\b(stabil|konsisten|membaik|memburuk|fluktuatif|berfluktuasi|ketidakseimbangan|cenderung|meningkat|menurun)\b/i;

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
const termRe = (t) => new RegExp(`(?<![\\p{L}\\d])${escapeRe(t)}(?![\\p{L}\\d])`, 'giu');

function findTerms(text, table) {
  const lower = text.toLowerCase();
  const taken = new Array(lower.length).fill(false);
  const hits = [];
  const flat = table.flatMap(([key, terms]) => terms.map((t) => ({ key, t }))).sort((a, b) => b.t.length - a.t.length);
  for (const { key, t } of flat) {
    const re = termRe(t);
    let m;
    while ((m = re.exec(lower))) {
      if (taken.slice(m.index, m.index + m[0].length).some(Boolean)) continue;
      for (let i = m.index; i < m.index + m[0].length; i++) taken[i] = true;
      hits.push({ key, term: t, start: m.index });
    }
  }
  return hits.sort((a, b) => a.start - b.start);
}

// Status per aspek dari input narasi
export function aspectStatuses(input = {}) {
  const out = {};
  for (const [key, { metrics }] of Object.entries(ASPECTS)) {
    const statuses = metrics.map(([g, k]) => input[g]?.[k]?.status).filter(Boolean);
    if (statuses.length) out[key] = [...new Set(statuses)];
  }
  return out;
}

// Sentimen yang diizinkan per aspek. Kata "waspada/perlu diperhatikan" boleh untuk status lemah (lebih halus),
// tetapi kata positif hanya untuk status sehat dan kata negatif hanya untuk status lemah.
// sehat: positif/cukup · waspada: cukup/waspada · lemah: waspada/negatif
const ALLOWED_BY_STATUS = {
  sehat: ['positive', 'mild'],
  waspada: ['mild', 'caution'],
  lemah: ['caution', 'negative'],
};
function allowedSentiments(statuses = []) {
  return new Set(statuses.flatMap((s) => ALLOWED_BY_STATUS[s] ?? []));
}

// Penilaian umum ("kinerja keuangan yang relatif kuat") mengikuti tier klaster
function overallAllowed(tier) {
  if (tier === 'high') return new Set(['positive', 'mild']);
  if (tier === 'mid') return new Set(['mild', 'caution']);
  if (tier === 'low') return new Set(['caution', 'negative']);
  return new Set();
}


// Lembar status untuk prompt v5 (tanpa angka)
const METRIC_NAME = {
  roe: 'ROE', roa: 'ROA', operating_margin: 'margin usaha', net_margin: 'margin laba bersih',
  revenue_growth: 'pertumbuhan pendapatan', earnings_growth: 'pertumbuhan laba pemilik entitas induk',
  cash_conversion: 'arus kas operasi terhadap laba bersih', current_ratio: 'current ratio', der: 'liabilitas terhadap ekuitas',
  liability_to_asset: 'liabilitas terhadap aset',
};

function metricItems(input, key) {
  return ASPECTS[key].metrics
    .map(([g, k]) => ({ k, m: input[g]?.[k] }))
    .filter(({ m }) => m?.display && m.status)
    .map(({ k, m }) => ({ name: METRIC_NAME[k], display: m.display, status: m.status }));
}

export function buildStatusSheet(input = {}, { withNumbers = false } = {}) {
  const st = aspectStatuses(input);
  const lines = [`Emiten: ${input.ticker ?? '-'} (periode ${input.period_type ?? '-'})`];
  for (const [key, { label }] of Object.entries(ASPECTS)) {
    if (!st[key]) continue;
    if (withNumbers) {
      const items = metricItems(input, key).map((i) => `${i.name} ${i.display} (${i.status})`);
      lines.push(`- ${label.replace(/ \(.*\)$/, '')}: ${items.join(', ')}`);
    } else {
      lines.push(`- ${label}: ${st[key].join(' dan ')}`);
    }
  }
  if (input.tier?.label) {
    lines.push(`- Tier performa: ${input.tier.label} (model ${input.tier.model_version ?? 'tier_kmeans_v1'}, relatif terhadap emiten non-keuangan BEI Q1 2025)`);
  }
  lines.push(`- Valuasi: ${valuationPhrase(input)}`);
  const lims = input.limitations ?? [];
  if (lims.length) lines.push(`- Keterbatasan: ${lims.join(' ')}`);
  return lines.join('\n');
}

function valuationPhrase(input = {}) {
  const v = input.valuation ?? {};
  const reason = [v.per, v.pbv, v.fair_value].map((x) => x?.reason).find(Boolean);
  if (v.per?.display || v.pbv?.display) {
    const pd = v.premium_discount?.display;
    if (pd) return pd.startsWith('−') || pd.startsWith('-') ? 'harga di bawah nilai wajar Graham' : 'harga di atas nilai wajar Graham';
    return 'PER dan PBV tersedia';
  }
  if (!v.price) return 'belum dapat dinilai karena harga saham belum tersedia';
  return `belum dapat dinilai karena ${reason ?? 'data tidak lengkap'}`;
}

// Pecah kalimat menjadi klausa penilaian
const clausesOf = (sentence) =>
  sentence
    .split(/[,;:]|\b(?:namun|tetapi|sementara|meski(?:pun)?|sedangkan|walaupun|walau)\b/i)
    .map((c) => c.trim())
    .filter(Boolean);

function maskAllowedNumbers(s) {
  return s
    .replace(/`?tier_kmeans_v\d+`?/gi, 'MODEL')
    .replace(/\b(?:Q[1-4]|H[12]|9M|FY)\s*(?:19|20)\d{2}\b/gi, 'PERIODE')
    .replace(/\b(?:Q[1-4]|H[12]|9M|FY)\b/gi, 'PERIODE')
    .replace(/\b(?:19|20)\d{2}\b/g, 'TAHUN')
    .replace(/qwen3[:\w.]*/gi, 'QWEN');
}

// allowNumbers (v6): angka boleh, tetapi setiap angka harus tertempel ke metrik & status yang benar (binding.js)
export function checkQualitativeSentence(sentence, input = {}, { allowNumbers = false, catalog = null } = {}) {
  if (FORBIDDEN_RE.test(sentence)) return `kata terlarang "${sentence.match(FORBIDDEN_RE)[1]}"`;
  if (TREND_RE.test(sentence)) return `kata tren "${sentence.match(TREND_RE)[1]}"`;
  if (/…|\.{3}|\[[^\]]*\]|\{\{/.test(sentence)) return 'isian kosong';
  if (!/[.!?]$/.test(sentence)) return 'kalimat terpotong';
  if (allowNumbers) {
    const b = checkSentenceBinding(sentence, catalog ?? buildCatalog(input));
    if (!b.ok) return b.reason;
  } else if (/\d/.test(maskAllowedNumbers(sentence))) {
    return 'memuat angka';
  }
  const tierMatch = sentence.match(/\b(?:tier|kategori|kelompok|klaster)\s+(low|mid|high)\b/i);
  if (tierMatch && input?.tier?.label && tierMatch[1].toLowerCase() !== String(input.tier.label).toLowerCase()) {
    return `tier ${tierMatch[1]} tidak sesuai`;
  }
  // Klaim valuasi harus sesuai ketersediaan data
  const v = input?.valuation ?? {};
  const hasMultiples = Boolean(v.per?.display || v.pbv?.display);
  if (v.price && /harga(?: saham)? belum tersedia/i.test(sentence)) return 'klaim harga belum tersedia padahal ada';
  if (!hasMultiples && /\b(di atas|di bawah) nilai wajar\b/i.test(sentence)) return 'klaim nilai wajar tanpa data valuasi';
  if (hasMultiples && v.premium_discount?.display) {
    const above = !/^[−-]/.test(v.premium_discount.display);
    if (/\bdi bawah nilai wajar\b/i.test(sentence) && above) return 'harga sebenarnya di atas nilai wajar';
    if (/\bdi atas nilai wajar\b/i.test(sentence) && !above) return 'harga sebenarnya di bawah nilai wajar';
  }
  const modelMatch = sentence.match(/tier_kmeans_v\d+/i);
  if (modelMatch && input?.tier?.model_version && modelMatch[0] !== input.tier.model_version) return 'versi model tidak sesuai';

  const statuses = aspectStatuses(input);
  for (const clause of clausesOf(sentence)) {
    // Klausa tentang tier/valuasi/keterbatasan tidak dinilai dengan status metrik
    if (/\btier\b|valuasi|keterbatasan|disetahunkan|treasuri/i.test(clause)) continue;
    const aspects = [...new Set(findTerms(clause, ASPECT_TERMS).map((h) => h.key))];
    const sentiments = [...new Set(findTerms(clause, SENTIMENT_TERMS).map((h) => h.key))];
    if (!aspects.length || !sentiments.length) continue;
    for (const a of aspects) {
      const allowed = a === 'overall' ? overallAllowed(input?.tier?.label) : allowedSentiments(statuses[a]);
      if (!allowed.size) return `aspek ${a} tidak punya status di data`;
      const bad = sentiments.find((s) => !allowed.has(s));
      if (bad) return `penilaian ${bad} tidak sesuai untuk ${a} (data: ${(statuses[a] ?? [input?.tier?.label]).join('/')})`;
    }
  }
  return null;
}

const sentencesOf = (t) => t.split(/(?<=[.!?])\s+(?=\S)/).map((s) => s.trim()).filter(Boolean);

// Kalimat penutup dari kode bila Qwen tidak menyebut tier, valuasi, atau keterbatasan
function codeSentences(input = {}) {
  const t = input.tier ?? {};
  const out = {};
  if (t.label) {
    out.tier = `Berdasarkan model klaster ${t.model_version ?? 'tier_kmeans_v1'}, ${input.ticker ?? 'emiten'} tergolong dalam tier ${t.label} dibandingkan emiten non-keuangan BEI pada Q1 2025.`;
  }
  out.valuasi = `Penilaian valuasi: ${valuationPhrase(input)}.`;
  const lims = input.limitations ?? [];
  if (lims.length) {
    // Huruf kapital awal butir kedua dst. diturunkan, kecuali singkatan (ROE, ROA)
    const items = lims.map((l, i) => {
      const x = l.replace(/\.$/, '');
      return i > 0 && /^[A-Z][a-z]/.test(x) ? x.charAt(0).toLowerCase() + x.slice(1) : x;
    });
    out.keterbatasan = `Keterbatasan: ${items.join('; ')}.`;
  }
  return out;
}

export function repairQualitative(raw, input = {}, plain = (x) => x, { allowNumbers = false } = {}) {
  const text = plain(String(raw ?? '').replace(/`/g, '')).replace(/\s*\n+\s*/g, ' ').trim();
  const catalog = allowNumbers ? buildCatalog(input) : null;
  const kept = [];
  const dropped = [];
  for (const s of sentencesOf(text)) {
    const reason = checkQualitativeSentence(s, input, { allowNumbers, catalog });
    if (reason) dropped.push({ topic: 'narasi', sentence: s, reason });
    else kept.push(s);
  }
  const joined = kept.join(' ');
  const aspectsCovered = new Set(findTerms(joined, ASPECT_TERMS).map((h) => h.key).filter((k) => k !== 'overall'));
  const code = codeSentences(input);
  const added = [];
  if (code.tier && !/\b(?:tier|kategori|kelompok)\s+(?:low|mid|high)\b/i.test(joined)) added.push('tier');
  if (!/valuasi/i.test(joined)) added.push('valuasi');
  if (code.keterbatasan && !/keterbatasan|disetahunkan|treasuri/i.test(joined)) added.push('keterbatasan');
  const finalText = [joined, ...added.map((k) => code[k])].filter(Boolean).join(' ');
  const ok = kept.length >= 2 && aspectsCovered.size >= 2;
  return {
    ok,
    text: finalText,
    llmSentences: kept.length,
    aspects: [...aspectsCovered],
    added,
    dropped,
    ...(ok ? {} : { reason: `hanya ${kept.length} kalimat dan ${aspectsCovered.size} aspek dari Qwen yang lolos` }),
  };
}

// Fallback tanpa LLM: paragraf kualitatif yang disusun kode dari status yang sama
const SENT_WORD = { sehat: 'sehat', waspada: 'perlu diwaspadai', lemah: 'lemah' };
export function qualitativeSummary(input = {}, { withNumbers = false } = {}) {
  if (withNumbers) return numericSummary(input);
  const st = aspectStatuses(input);
  const ticker = input.ticker ?? 'Emiten';
  const groups = { sehat: [], waspada: [], lemah: [] };
  const names = {
    profitabilitas: 'profitabilitas',
    margin: 'margin',
    pertumbuhan: 'pertumbuhan pendapatan dan laba',
    arus_kas: 'arus kas operasi',
    likuiditas: 'likuiditas',
    permodalan: 'struktur permodalan',
  };
  for (const [k, s] of Object.entries(st)) {
    // Aspek dengan status campuran dimasukkan ke status terlemahnya
    const worst = s.includes('lemah') ? 'lemah' : s.includes('waspada') ? 'waspada' : 'sehat';
    groups[worst].push(names[k]);
  }
  const join = (xs) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} serta ${xs[xs.length - 1]}`);
  const parts = [];
  const overall = {
    high: 'kinerja keuangan yang relatif kuat',
    mid: 'kinerja keuangan yang cukup baik dengan beberapa aspek yang perlu dicermati',
    low: 'kinerja keuangan yang relatif lemah',
  }[input.tier?.label] ?? 'kinerja keuangan dengan gambaran yang beragam';
  parts.push(`${ticker} menunjukkan ${overall}.`);
  if (groups.sehat.length) parts.push(`Aspek ${join(groups.sehat)} tergolong ${SENT_WORD.sehat}.`);
  if (groups.waspada.length) parts.push(`Aspek ${join(groups.waspada)} ${SENT_WORD.waspada}.`);
  if (groups.lemah.length) parts.push(`Aspek ${join(groups.lemah)} masih ${SENT_WORD.lemah}.`);
  const code = codeSentences(input);
  return [...parts, code.tier, code.valuasi, code.keterbatasan].filter(Boolean).join(' ');
}

// Fallback v6: paragraf dengan angka, disusun kode dari metrik yang sama
function numericSummary(input = {}) {
  const ticker = input.ticker ?? 'Emiten';
  const by = { sehat: [], waspada: [], lemah: [] };
  for (const key of Object.keys(ASPECTS)) {
    for (const i of metricItems(input, key)) by[i.status].push(`${i.name} ${i.display}`);
  }
  const join = (xs) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')}, dan ${xs[xs.length - 1]}`);
  const overall = {
    high: 'kinerja keuangan yang relatif kuat',
    mid: 'kinerja keuangan yang cukup baik dengan beberapa hal yang perlu dicermati',
    low: 'kinerja keuangan yang relatif lemah',
  }[input.tier?.label] ?? 'kinerja keuangan dengan gambaran yang beragam';
  const parts = [`${ticker} menunjukkan ${overall}.`];
  if (by.sehat.length) parts.push(`Metrik yang berstatus sehat meliputi ${join(by.sehat)}.`);
  if (by.waspada.length) parts.push(`Metrik yang perlu diwaspadai meliputi ${join(by.waspada)}.`);
  if (by.lemah.length) parts.push(`Metrik yang masih lemah meliputi ${join(by.lemah)}.`);
  const code = codeSentences(input);
  return [...parts, code.tier, code.valuasi, code.keterbatasan].filter(Boolean).join(' ');
}
