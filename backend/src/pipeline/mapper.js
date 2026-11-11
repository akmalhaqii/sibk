// FR-EXT-05: label dwibahasa -> field kanonik (exact, contains, fuzzy);
// tak dikenal -> masuk unmapped & ditandai untuk koreksi pengguna.
import { distance } from 'fastest-levenshtein';
import labels from '../../config/labels.json' with { type: 'json' };

const FIELD_STATEMENT = {
  cash: 'posisi_keuangan',
  cash_and_equivalents: 'posisi_keuangan',
  inventories: 'posisi_keuangan',
  current_assets: 'posisi_keuangan',
  non_current_assets: 'posisi_keuangan',
  fixed_assets: 'posisi_keuangan',
  total_assets: 'posisi_keuangan',
  current_liabilities: 'posisi_keuangan',
  non_current_liabilities: 'posisi_keuangan',
  total_liabilities: 'posisi_keuangan',
  temporary_syirkah: 'posisi_keuangan',
  share_capital: 'posisi_keuangan',
  treasury_shares: 'posisi_keuangan',
  retained_earnings: 'posisi_keuangan',
  equity_parent: 'posisi_keuangan',
  total_equity: 'posisi_keuangan',
  revenue: 'laba_rugi',
  cost_of_revenue: 'laba_rugi',
  gross_profit: 'laba_rugi',
  operating_profit: 'laba_rugi',
  profit_before_tax: 'laba_rugi',
  net_income: 'laba_rugi',
  net_income_parent: 'laba_rugi',
  eps_basic: 'laba_rugi',
  operating_cash_flow: 'arus_kas',
  investing_cash_flow: 'arus_kas',
  financing_cash_flow: 'arus_kas',
  capex: 'arus_kas',
};

const ALIAS_GROUPS = [
  ['cash', 'cash_and_equivalents'],
];

export function normalizeLabel(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreCandidate(row, synNorm, isTotalField) {
  const candidates = [normalizeLabel(row.label), normalizeLabel(row.label_en)].filter(Boolean);
  for (const cand of candidates) {
    if (cand === synNorm) return 1.0;
  }
  for (const cand of candidates) {
    // Jangan biarkan "jumlah liabilitas jangka pendek" cocok dengan "jumlah liabilitas"
    if (isTotalField && cand !== synNorm) {
      if (synNorm === 'jumlah liabilitas' || synNorm === 'total liabilities') continue;
      if (synNorm === 'jumlah aset' || synNorm === 'total assets') continue;
      if (synNorm === 'jumlah ekuitas' || synNorm === 'total equity') continue;
    }
    if (cand.includes(synNorm) || (cand.length >= 10 && synNorm.includes(cand))) {
      return 0.8;
    }
  }
  for (const cand of candidates) {
    const maxLen = Math.max(cand.length, synNorm.length);
    if (maxLen < 6) continue;
    const sim = 1 - distance(cand, synNorm) / maxLen;
    if (sim >= 0.82) return Number(sim.toFixed(2));
  }
  return 0;
}

function extractShareCountFromLabel(rows) {
  for (const r of rows) {
    if (r.statement && r.statement !== 'posisi_keuangan') continue;
    const text = r.label || '';
    if (!/modal\s+ditempatkan\s+dan\s+disetor/i.test(text)) continue;
    // Cari bagian setelah "Modal ditempatkan dan disetor penuh"
    const sub = text.split(/modal\s+ditempatkan\s+dan\s+disetor(?:\s+penuh)?/i)[1] || text;
    const matches = [...sub.matchAll(/(\d{1,3}(?:[.,]\d{3})+|\d+)\s*lembar\s+saham/gi)];
    if (matches.length > 0) {
      let totalShares = 0;
      for (const m of matches) {
        const n = Number(m[1].replace(/[.,]/g, ''));
        if (Number.isFinite(n)) totalShares += n;
      }
      if (totalShares > 0) {
        return { value: totalShares, prior: totalShares, page: r.page, label: r.label, confidence: 1.0 };
      }
    }
  }
  return null;
}

export function mapFields(rows = [], { ticker = 'UNKNOWN' } = {}) {
  const meta = rows._meta ?? {
    unit: 'juta IDR',
    locale: 'id-dot',
    period_end: '2026-03-31',
    period_type: 'Q1',
    source: 'company_pdf',
  };

  const fields = {};
  const matchedRowIndices = new Set();

  for (const [field, synonyms] of Object.entries(labels)) {
    const targetStmt = FIELD_STATEMENT[field];
    const isTotalField = field.startsWith('total_');
    const synNorms = synonyms.map(normalizeLabel);

    let best = null;
    for (let idx = 0; idx < rows.length; idx++) {
      const r = rows[idx];
      if (targetStmt && r.statement && r.statement !== targetStmt) continue;
      if (r.value == null && r.prior == null) continue;

      let rowBestScore = 0;
      for (const sn of synNorms) {
        const sc = scoreCandidate(r, sn, isTotalField);
        if (sc > rowBestScore) rowBestScore = sc;
      }
      if (rowBestScore <= 0) continue;

      if (
        !best ||
        rowBestScore > best.score ||
        (rowBestScore === best.score && isTotalField) // untuk baris "Jumlah ...", pilih yang terakhir bila skor sama
      ) {
        best = { idx, row: r, score: rowBestScore };
      }
    }

    if (best) {
      matchedRowIndices.add(best.idx);
      fields[field] = {
        value: best.row.value,
        prior: best.row.prior ?? null,
        page: best.row.page ?? null,
        label: best.row.label,
        confidence: best.score,
      };
    }
  }

  // Sinkronkan alias (mis. cash <-> cash_and_equivalents)
  for (const group of ALIAS_GROUPS) {
    const found = group.find((k) => fields[k]);
    if (found) {
      for (const k of group) {
        if (!fields[k]) fields[k] = { ...fields[found] };
      }
    }
  }

  // Ekstrak jumlah lembar saham beredar dari keterangan modal ditempatkan & disetor bila ada (FR-MKT-04)
  const shareCount = extractShareCountFromLabel(rows);
  if (shareCount) {
    fields.issued_and_paid_shares = shareCount;
  }

  const unmapped = [];
  rows.forEach((r, idx) => {
    if (!matchedRowIndices.has(idx)) {
      unmapped.push({ label: r.label, page: r.page ?? null });
    }
  });

  return {
    entity: {
      ticker,
      period_end: meta.period_end,
      period_type: meta.period_type,
      unit: meta.unit,
      locale: meta.locale,
      source: meta.source,
    },
    fields,
    unmapped,
  };
}
