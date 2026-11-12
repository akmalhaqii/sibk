// FR-NAR-02 / FR-TIER-03: setiap angka, tier, dan klaim tren di teks harus ada di data sumber
const FORBIDDEN_RE = /\b(beli|jual|tahan|rekomendasi|buy|sell|hold)\b/i;
// REV-04: kata tren tanpa data periode dan status tanpa metrik
const TREND_RE = /\b(stabil|konsisten|membaik|memburuk|fluktuatif|berfluktuasi|ketidakseimbangan)\b/i;
const STATUS_RE = /\b(sehat|waspada|lemah)\b/i;
const NUMBER_RE = /\d[\d.,]*\s?[%x]/;

function collectAllowedNumbers(input = {}) {
  const allowed = new Set();
  const addDisplay = (str) => {
    if (!str || typeof str !== 'string' || str === '—') return;
    const trimmed = str.trim();
    allowed.add(trimmed);
    // Izinkan variasi tanpa awalan Rp, tanda +, atau tanda minus Unicode (U+2212) vs ASCII (-)
    const noRp = trimmed.replace(/^Rp\s*/i, '');
    allowed.add(noRp);
    allowed.add(noRp.replace(/^[+−-]/, ''));
    allowed.add(noRp.replace(/^−/, '-'));
    allowed.add(noRp.replace(/^-/, '−'));
  };

  for (const group of [input.profitability, input.liquidity, input.solvency, input.growth_cash]) {
    if (!group) continue;
    for (const item of Object.values(group)) {
      if (item?.display) addDisplay(item.display);
    }
  }
  if (input.valuation) {
    addDisplay(input.valuation.price);
    for (const k of ['per', 'pbv', 'ps', 'fair_value', 'premium_discount']) {
      if (input.valuation[k]?.display) addDisplay(input.valuation[k].display);
    }
  }
  return allowed;
}

export function checkNarrative(text, input = {}) {
  if (!text || typeof text !== 'string' || !text.trim()) {
    return { ok: false, pass: false, unmatched: ['empty_text'], reason: 'empty_text' };
  }

  if (FORBIDDEN_RE.test(text)) {
    return { ok: false, pass: false, unmatched: ['forbidden_word'], reason: 'forbidden_word' };
  }

  if (TREND_RE.test(text)) {
    return { ok: false, pass: false, unmatched: ['trend_word'], reason: 'trend_word' };
  }

  const sentences = text.split(/(?<=[.!?])\s+/);
  const badStatus = sentences.find((s) => STATUS_RE.test(s) && !NUMBER_RE.test(s));
  if (badStatus) {
    return { ok: false, pass: false, unmatched: ['status_without_metric'], reason: 'status_without_metric' };
  }

  // Cek kesesuaian label tier bila kata "tier" disebut
  const tierMatch = text.match(/\btier\s+(low|mid|high)\b/i);
  if (tierMatch && input?.tier?.label) {
    if (tierMatch[1].toLowerCase() !== String(input.tier.label).toLowerCase()) {
      return { ok: false, pass: false, unmatched: [`tier:${tierMatch[1]}`], reason: 'tier_mismatch' };
    }
  }

  // Bersihkan token non-metrik seperti versi model, sumber harga, tanggal, tahun (20xx), dan kuartal (Q1..Q4, 9M, H1)
  let cleaned = text
    .replace(/tier_kmeans_v\d+/gi, '')
    .replace(/yahoo-finance2/gi, '')
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, '')
    .replace(/\b(?:Q[1-4]|H[12]|9M|FY)\b/g, '')
    .replace(/\b(?:19|20)\d{2}\b/g, '')
    .replace(/Rp\s*/g, '');

  const allowed = collectAllowedNumbers(input);
  const tokens = cleaned.match(/[+−-]?\d[\d.,]*\s?[%x]?/g) || [];
  const unmatched = [];

  for (const rawTok of tokens) {
    const tok = rawTok.trim().replace(/[.,]+$/, '');
    if (!tok) continue;
    const tokNoSign = tok.replace(/^[+−-]/, '');
    if (!allowed.has(tok) && !allowed.has(tokNoSign)) {
      unmatched.push(tok);
    }
  }

  const pass = unmatched.length === 0;
  return { ok: pass, pass, unmatched };
}

// REV-05: kelengkapan narasi LLM. checkNarrative memeriksa kebenaran tiap klaim;
// checkCoverage memastikan teks benar-benar berisi data, bukan salinan contoh atau isian kosong.
const PLACEHOLDER_RE = /…|\.{3}|\[[^\]]*\]|\{\{|<[^>]+>|\bTBD\b/i;

export function countAvailableNumbers(input = {}) {
  return [input.profitability, input.liquidity, input.solvency, input.growth_cash]
    .flatMap((g) => Object.values(g ?? {}))
    .filter((item) => item?.display && item.display !== '—').length;
}

export function checkCoverage(text, input = {}, { minNumbers = 3 } = {}) {
  const problems = [];
  if (!text || typeof text !== 'string') {
    return { ok: false, problems: ['empty_text'], matched: 0 };
  }
  if (PLACEHOLDER_RE.test(text)) problems.push('placeholder');

  const allowed = collectAllowedNumbers(input);
  const tokens = (text.replace(/Rp\s*/g, '').match(/[+−-]?\d[\d.,]*\s?[%x]/g) || [])
    .map((t) => t.trim().replace(/[.,]+$/, ''))
    .filter((t) => allowed.has(t) || allowed.has(t.replace(/^[+−-]/, '')));
  const matched = new Set(tokens).size;
  const need = Math.min(minNumbers, countAvailableNumbers(input));
  if (matched < need) problems.push('too_few_numbers');

  const hasProfit = Object.values(input.profitability ?? {}).some((m) => m?.display);
  if (hasProfit && !/(^|\n)\s*Profitabilitas\s*:/i.test(text)) problems.push('missing_topic:Profitabilitas');
  if ((input.limitations ?? []).length > 0 && !/(^|\n)\s*Keterbatasan\s*:/i.test(text)) {
    problems.push('missing_topic:Keterbatasan');
  }
  return { ok: problems.length === 0, problems, matched };
}
