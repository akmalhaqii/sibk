// C1: jawaban tanpa LLM — penolakan tetap, sapaan, jawaban kamus (+ nilai emiten), jawaban aturan per metrik.
// Semua angka diambil dari display hasil kode; tidak ada perhitungan baru.
import { buildInput } from '../narrator/input.js';
import { qualitativeSummary } from '../narrator/qualitative.js';
import { thresholdText } from './glossary.js';
import { collectFacts, factsInQuestion } from './facts.js';

export const LABELS = {
  glossary: 'Dari kamus TelusurFin',
  rule: 'Jawaban otomatis (tanpa AI)',
  refusal: 'Jawaban otomatis',
};

const METRIC_LABEL = {
  roe: 'ROE',
  roa: 'ROA',
  net_margin: 'margin laba bersih',
  operating_margin: 'margin usaha',
  current_ratio: 'current ratio',
  der: 'liabilitas terhadap ekuitas',
  liability_to_asset: 'liabilitas terhadap aset',
  revenue_growth: 'pertumbuhan pendapatan',
  earnings_growth: 'pertumbuhan laba pemilik entitas induk',
  cash_conversion: 'konversi kas (arus kas operasi terhadap laba bersih)',
  ocf_to_assets: 'arus kas operasi terhadap aset',
};
const ANNUALIZED = new Set(['roe', 'roa', 'ocf_to_assets']);
const VALUATION_LABEL = { eps: 'EPS', bvps: 'BVPS', per: 'PER', pbv: 'PBV', ps: 'P/S', fair_value: 'nilai wajar Graham', premium_discount: 'harga terhadap nilai wajar Graham' };

// Kata aspek -> metrik yang relevan
const ASPECT_KEYS = [
  [/\bprofitabilitas|untung|laba\b/i, ['roe', 'roa', 'net_margin', 'operating_margin']],
  [/\bmargin\b/i, ['net_margin', 'operating_margin']],
  [/\blikuiditas|likuid|jangka pendek\b/i, ['current_ratio']],
  [/\bsolvabilitas|permodalan|utang|hutang|liabilitas|leverage\b/i, ['der', 'liability_to_asset']],
  [/\bpertumbuhan|tumbuh|naik|turun\b/i, ['revenue_growth', 'earnings_growth']],
  [/\barus kas|kas\b/i, ['cash_conversion', 'ocf_to_assets']],
];
const VALUATION_RE = /\b(valuasi|harga|nilai wajar|graham|per|pbv|p\/s|eps|bvps|murah|mahal|premium|diskon)(?:nya)?\b/i;
const TIER_RE = /\b(tier|klaster|kategori|kelompok|kmeans|k-means)(?:-?nya)?\b/i;

const period = (r) => [r?.entity?.period_type, (r?.entity?.period_end ?? '').slice(0, 4)].filter(Boolean).join(' ');

function pagesOf(result, metricKey) {
  const inputs = result?.metrics?.[metricKey]?.inputs ?? result?.valuation?.[metricKey]?.inputs ?? [];
  const pages = inputs.map((k) => result?.fields?.[k]?.page).filter((p) => Number.isFinite(p));
  return [...new Set(pages)].sort((a, b) => a - b);
}

function metricSentence(result, key) {
  const m = result?.metrics?.[key];
  if (!m || m.value == null || !m.display || m.display === '—') return null;
  const notes = [m.status, ANNUALIZED.has(key) && ['Q1', 'Q2', 'Q3'].includes(result?.entity?.period_type) ? 'disetahunkan' : null].filter(Boolean);
  return `${capitalize(METRIC_LABEL[key])} ${result.entity?.ticker ?? ''} ${m.display}${notes.length ? ` (${notes.join(', ')})` : ''}.`.replace(/\s+/g, ' ');
}

function valuationSentences(result) {
  const v = result?.valuation ?? {};
  const out = [];
  const price = result?.market?.price;
  for (const k of ['per', 'pbv', 'fair_value', 'premium_discount']) {
    const item = v[k];
    if (item?.display && item.display !== '—' && item.value != null) out.push(`${capitalize(VALUATION_LABEL[k])} ${item.display}.`);
  }
  if (!out.length) {
    const reason = v.per?.unavailable_reason ?? v.fair_value?.unavailable_reason;
    out.push(`Valuasi ${result?.entity?.ticker ?? ''} belum dapat dihitung${reason ? ` karena ${reason}` : ''}.`.replace(/\s+/g, ' '));
  } else if (price != null) {
    out.unshift(`Pada harga Rp${new Intl.NumberFormat('id-ID').format(price)} (${result.market.source === 'manual' ? 'input manual' : result.market.source}):`);
  }
  return out;
}

function tierSentence(result) {
  const t = result?.tiering;
  if (!t?.tier) return 'Tier performa belum dapat ditentukan karena sebagian rasio input klaster tidak tersedia.';
  return `Model klaster ${t.model_version ?? 'tier_kmeans_v1'} menempatkan ${result?.entity?.ticker ?? 'emiten ini'} pada tier ${t.tier}, relatif terhadap emiten non-keuangan BEI periode Q1 2025.`;
}

const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const ref = (result, key, type = 'metric') => ({ type, key, pages: pagesOf(result, key) });

// ---------- jawaban tetap ----------
export function refusalAdvice(result) {
  const t = result?.entity?.ticker;
  return {
    intent: 'advice',
    source: 'refusal',
    label: LABELS.refusal,
    answer:
      'TelusurFin tidak memberi saran beli, jual, atau tahan, maupun target harga. ' +
      (t
        ? `Saya bisa menjelaskan rasio, tier, dan valuasi ${t} berdasarkan laporan keuangannya.`
        : 'Saya bisa menjelaskan istilah dan rasio keuangan dari kamus TelusurFin.'),
    refs: [],
  };
}

export function refusalOutOfScope(result) {
  const t = result?.entity?.ticker;
  return {
    intent: 'out_of_scope',
    source: 'refusal',
    label: LABELS.refusal,
    answer: t
      ? `Saya hanya bisa menjawab pertanyaan tentang hasil analisis ${t} ${period(result)} dan istilah keuangan di kamus TelusurFin.`.replace(/\s+/g, ' ')
      : 'Saya hanya bisa menjawab pertanyaan tentang istilah keuangan di kamus TelusurFin. Untuk analisis emiten, buka hasil analisisnya terlebih dahulu.',
    refs: [],
  };
}

export function greeting(question, result) {
  const thanks = /terima kasih|makasih|thanks/i.test(question);
  const t = result?.entity?.ticker;
  return {
    intent: 'greeting',
    source: 'refusal',
    label: LABELS.refusal,
    answer: thanks
      ? 'Sama-sama. Silakan bertanya lagi bila ada yang ingin dijelaskan.'
      : t
        ? `Halo! Tanyakan apa saja tentang hasil analisis ${t} ${period(result)}, misalnya rasio, tier, atau valuasinya.`.replace(/\s+/g, ' ')
        : 'Halo! Tanyakan istilah keuangan apa saja dari kamus TelusurFin.',
    refs: [],
  };
}

// ---------- kamus ----------
export function glossaryAnswer(entries, result) {
  const parts = [];
  const refs = [];
  for (const e of entries.slice(0, 2)) {
    const lines = [`${e.term}: ${e.definisi}`];
    if (e.rumus) lines.push(`Rumus: ${e.rumus}.`);
    const th = e.metric_key ? thresholdText(e.metric_key) : null;
    if (th) lines.push(th);
    if (e.catatan_proyek && e.catatan_proyek !== '-') lines.push(e.catatan_proyek);
    // Nilai emiten yang sedang dibuka
    if (result?.entity?.ticker) {
      if (e.metric_key && result.metrics?.[e.metric_key]) {
        const s = metricSentence(result, e.metric_key);
        if (s) {
          lines.push(`Untuk ${result.entity.ticker} ${period(result)}: ${s.charAt(0).toLowerCase()}${s.slice(1)}`.replace(/\s+/g, ' '));
          refs.push(ref(result, e.metric_key));
        }
      } else if (e.metric_key && result.valuation?.[e.metric_key]) {
        const item = result.valuation[e.metric_key];
        lines.push(
          item.display && item.display !== '—' && item.value != null
            ? `Untuk ${result.entity.ticker}: ${VALUATION_LABEL[e.metric_key] ?? e.term} ${item.display}.`
            : `Untuk ${result.entity.ticker}: belum dapat dihitung${item.unavailable_reason ? ` (${item.unavailable_reason})` : ''}.`
        );
      } else if (e.term === 'Tier performa') {
        lines.push(tierSentence(result));
      }
    }
    parts.push(lines.join(' '));
  }
  return { intent: 'glossary', source: 'glossary', label: LABELS.glossary, answer: parts.join('\n\n'), refs, terms: entries.map((e) => e.term) };
}

// ---------- jawaban aturan (cadangan bila Qwen gagal / mati) ----------
export function ruleAnswer(question, result) {
  const q = String(question ?? '');
  const keys = [];
  for (const [re, ks] of ASPECT_KEYS) if (re.test(q)) keys.push(...ks);
  for (const [k, label] of Object.entries(METRIC_LABEL)) {
    if (new RegExp(`(?<![\\p{L}])${label.split(' (')[0].replace(/[/]/g, '\\/')}(?![\\p{L}])`, 'iu').test(q)) keys.push(k);
  }
  if (/\b(der|roe|roa)\b/i.test(q)) keys.push(...(q.match(/\b(der|roe|roa)\b/gi) ?? []).map((x) => x.toLowerCase()));
  const uniqueKeys = [...new Set(keys)].filter((k) => result?.metrics?.[k]);

  const sentences = [];
  const refs = [];
  for (const k of uniqueKeys) {
    const s = metricSentence(result, k);
    if (s) {
      sentences.push(s);
      refs.push(ref(result, k));
    }
  }
  // Angka laporan yang ditanyakan ("Berapa laba bersihnya?"): langsung dari PDF, dengan halaman
  const asksAmount = /\b(berapa|jumlah|total|nilai(?:nya)?|besar(?:nya)?|sebesar|angka(?:nya)?|halaman)\b/i.test(q);
  const askedFacts = asksAmount ? factsInQuestion(q) : [];
  if (askedFacts.length) {
    const byKey = Object.fromEntries(collectFacts(result).map((f) => [f.key, f]));
    for (const k of askedFacts) {
      const f = byKey[k];
      if (!f) continue;
      const label = f.label.charAt(0).toUpperCase() + f.label.slice(1);
      sentences.unshift(`${label} ${result.entity?.ticker ?? 'emiten'} ${period(result)} ${f.display}${f.page ? `, tercantum di halaman ${f.page}` : ''}.`.replace(/\s+/g, ' '));
      refs.unshift({ type: 'field', key: k, pages: f.page ? [f.page] : [] });
    }
  }
  if (TIER_RE.test(q)) sentences.push(tierSentence(result));
  if (VALUATION_RE.test(q)) sentences.push(...valuationSentences(result));

  const answer = sentences.length ? sentences.join(' ') : qualitativeSummary(buildInput(result), { withNumbers: true });
  return { intent: 'analysis', source: 'rule', label: LABELS.rule, answer, refs };
}

// ---------- pintu masuk C1 ----------
// Mengembalikan jawaban tanpa LLM, atau null bila pertanyaan perlu dijawab Qwen (niat "analysis").
export function answerWithoutLlm({ question, result, intent, terms = [] }) {
  if (intent === 'advice') return refusalAdvice(result);
  if (intent === 'out_of_scope') return refusalOutOfScope(result);
  if (intent === 'greeting') return greeting(question, result);
  if (intent === 'glossary' && terms.length) return glossaryAnswer(terms, result);
  return null;
}
