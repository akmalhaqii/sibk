// FR-MET: rasio deterministik (decimal.js); rumus, arah, & ambang dari config/thresholds.json.
// Dipakai juga oleh scripts/build_features.js (FR-TRN-01).
//
// DEFINISI YANG DIKUNCI (Bagian 2 Brief Tahap 2):
// - Laba untuk ROE dan EPS              : net_income_parent (sebanding dengan equity_parent & EPS laporan)
// - Laba untuk ROA, margin, konversi kas: net_income (laba periode berjalan total, sebanding dengan total_assets & revenue)
// - Ekuitas untuk ROE dan BVPS          : equity_parent (jatuh kembali ke total_equity hanya bila equity_parent kosong)
// - Rata-rata neraca                    : (nilai sekarang + prior) / 2  (jika prior kosong, gunakan nilai sekarang)
// - Pembanding pertumbuhan              : prior laba rugi (periode yang sama tahun lalu)
// - Disetahunkan                        : HANYA ROE, ROA, ocf_to_assets (dan EPS/SPS di valuasi), dengan faktor dari
//                                         entity.period_type (Q1 x4, Q2 x2, Q3 x4/3, FY x1). Rasio dalam periode yang sama
//                                         (margin, pertumbuhan, konversi kas) TIDAK disetahunkan.
// - Liabilitas untuk DER & L/A           : liabilitas efektif = total_liabilities + temporary_syirkah bila syirkah
//                                         belum termasuk (definisi BEI = definisi data latih klaster). Lihat effectiveLiabilities().
import Decimal from 'decimal.js';
import thresholds from '../../config/thresholds.json' with { type: 'json' };
import { fmtMultiple, fmtPct } from '../format.js';

const ANNUAL_FACTOR = { Q1: 4, Q2: 2, Q3: 4 / 3, FY: 1 };

export function annualizationFactor(periodType = 'Q1') {
  return ANNUAL_FACTOR[periodType] ?? 1;
}

export function evaluateStatus(value, cfg) {
  if (value == null || !cfg || cfg.low == null || cfg.high == null) return null;
  if (cfg.direction === 'lower_better') {
    if (value <= cfg.low) return 'sehat';
    if (value <= cfg.high) return 'waspada';
    return 'lemah';
  }
  if (value >= cfg.high) return 'sehat';
  if (value >= cfg.low) return 'waspada';
  return 'lemah';
}

const getVal = (fields, k) => {
  const v = fields?.[k]?.value;
  return v != null && Number.isFinite(v) ? v : null;
};

const getPrior = (fields, k) => {
  const v = fields?.[k]?.prior;
  return v != null && Number.isFinite(v) ? v : null;
};

const avgBalance = (fields, k) => {
  const cur = getVal(fields, k);
  if (cur == null) return null;
  const pr = getPrior(fields, k);
  if (pr == null) return new Decimal(cur);
  return new Decimal(cur).plus(pr).div(2);
};

function makeMetric(key, numVal, kind, inputs, formulaOverride) {
  const cfg = thresholds[key];
  const formula = formulaOverride ?? cfg?.formula ?? '';
  if (numVal == null || !Number.isFinite(numVal)) {
    return { value: null, display: '—', status: null, formula, inputs };
  }
  const status = evaluateStatus(numVal, cfg);
  const display = kind === 'multiple' ? fmtMultiple(numVal, 2) : fmtPct(numVal, 1);
  return { value: numVal, display, status, formula, inputs };
}

// Tahap 4-A: samakan definisi liabilitas dengan Excel/XBRL BEI (data latih), yang memasukkan dana syirkah temporer.
// Syirkah dianggap SUDAH termasuk bila aset = liabilitas + ekuitas (dalam toleransi pembulatan).
export function effectiveLiabilities(fields = {}) {
  const tl = getVal(fields, 'total_liabilities');
  if (tl == null) return null;
  const ts = getVal(fields, 'temporary_syirkah');
  if (ts == null || ts === 0) return tl;
  const ta = getVal(fields, 'total_assets');
  const te = getVal(fields, 'total_equity');
  const tol = thresholds.balance_tolerance ?? 1;
  if (ta != null && te != null && Math.abs(ta - (tl + te)) <= tol) return tl;
  return tl + ts;
}

export function computeMetrics(fields = {}, entity = {}) {
  const factor = new Decimal(annualizationFactor(entity?.period_type ?? 'Q1'));

  const ca = getVal(fields, 'current_assets');
  const cl = getVal(fields, 'current_liabilities');
  const tl = effectiveLiabilities(fields);
  const te = getVal(fields, 'total_equity');
  const ta = getVal(fields, 'total_assets');
  const rev = getVal(fields, 'revenue');
  const revPrior = getPrior(fields, 'revenue');
  const ni = getVal(fields, 'net_income');
  const nip = getVal(fields, 'net_income_parent');
  const nipPrior = getPrior(fields, 'net_income_parent');
  const opInc = getVal(fields, 'operating_profit') ?? getVal(fields, 'operating_income');
  const ocf = getVal(fields, 'operating_cash_flow');

  const avgTa = avgBalance(fields, 'total_assets');
  const avgEqParent = avgBalance(fields, 'equity_parent') ?? avgBalance(fields, 'total_equity');

  // 1. current_ratio = current_assets / current_liabilities
  const currentRatio =
    ca != null && cl != null && cl > 0 ? new Decimal(ca).div(cl).toNumber() : null;

  // 2. der = total_liabilities / total_equity
  const der =
    tl != null && te != null && te > 0 ? new Decimal(tl).div(te).toNumber() : null;

  // 3. liability_to_asset = total_liabilities / total_assets
  const liabilityToAsset =
    tl != null && ta != null && ta > 0 ? new Decimal(tl).div(ta).toNumber() : null;

  // 4. roe = net_income_parent * factor / avg(equity_parent)
  const roe =
    nip != null && avgEqParent != null && avgEqParent.gt(0)
      ? new Decimal(nip).mul(factor).div(avgEqParent).toNumber()
      : null;

  // 5. roa = net_income * factor / avg(total_assets)
  const roa =
    ni != null && avgTa != null && avgTa.gt(0)
      ? new Decimal(ni).mul(factor).div(avgTa).toNumber()
      : null;

  // 6. net_margin = net_income / revenue
  const netMargin =
    ni != null && rev != null && rev > 0 ? new Decimal(ni).div(rev).toNumber() : null;

  // 7. operating_margin = operating_income / revenue
  const operatingMargin =
    opInc != null && rev != null && rev > 0 ? new Decimal(opInc).div(rev).toNumber() : null;

  // 8. cash_conversion = operating_cash_flow / net_income (kosong bila laba <= 0)
  const cashConversion =
    ocf != null && ni != null && ni > 0 ? new Decimal(ocf).div(ni).toNumber() : null;

  // 9. ocf_to_assets = operating_cash_flow * factor / avg(total_assets) (tetap terdefinisi saat rugi, untuk klaster)
  const ocfToAssets =
    ocf != null && avgTa != null && avgTa.gt(0)
      ? new Decimal(ocf).mul(factor).div(avgTa).toNumber()
      : null;

  // 10. revenue_growth = revenue / revenue_prior - 1 (kosong bila pembanding <= 0)
  const revenueGrowth =
    rev != null && revPrior != null && revPrior > 0
      ? new Decimal(rev).div(revPrior).minus(1).toNumber()
      : null;

  // 11. earnings_growth = net_income_parent / net_income_parent_prior - 1 (kosong bila pembanding <= 0)
  const earningsGrowth =
    nip != null && nipPrior != null && nipPrior > 0
      ? new Decimal(nip).div(nipPrior).minus(1).toNumber()
      : null;

  return {
    current_ratio: makeMetric('current_ratio', currentRatio, 'multiple', ['current_assets', 'current_liabilities']),
    der: makeMetric('der', der, 'multiple', ['total_liabilities', 'temporary_syirkah', 'total_equity']),
    liability_to_asset: makeMetric('liability_to_asset', liabilityToAsset, 'pct', ['total_liabilities', 'temporary_syirkah', 'total_assets']),
    roe: makeMetric('roe', roe, 'pct', ['net_income_parent', 'equity_parent'], 'net_income_parent * annual_factor / avg(equity_parent)'),
    roa: makeMetric('roa', roa, 'pct', ['net_income', 'total_assets'], 'net_income * annual_factor / avg(total_assets)'),
    net_margin: makeMetric('net_margin', netMargin, 'pct', ['net_income', 'revenue']),
    operating_margin: makeMetric('operating_margin', operatingMargin, 'pct', ['operating_profit', 'revenue']),
    cash_conversion: makeMetric('cash_conversion', cashConversion, 'multiple', ['operating_cash_flow', 'net_income']),
    ocf_to_assets: makeMetric('ocf_to_assets', ocfToAssets, 'pct', ['operating_cash_flow', 'total_assets'], 'operating_cash_flow * annual_factor / avg(total_assets)'),
    revenue_growth: makeMetric('revenue_growth', revenueGrowth, 'pct', ['revenue']),
    earnings_growth: makeMetric('earnings_growth', earningsGrowth, 'pct', ['net_income_parent'], 'net_income_parent / net_income_parent_prior - 1'),
  };
}
