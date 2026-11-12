// FR-VLN: PER, PBV, P/S, EPS, BVPS, kapitalisasi pasar, nilai wajar Graham & premium/diskon.
// Tanpa jumlah saham atau harga -> ditandai unavailable_reason (bukan tebakan, FR-MKT-04).
// Satuan laporan (mis. "juta IDR" -> 1e6) dikalikan sebelum dibagi lembar saham penuh.
import Decimal from 'decimal.js';
import { annualizationFactor } from './metrics.js';
import { fmtMultiple, fmtNumber, fmtPct, fmtRupiah } from '../format.js';

export { annualizationFactor };

// Tahap 4-C: faktor dari skala saja ("juta"/"ribu"), mata uang dicek terpisah
export function unitFactor(unit = '') {
  if (/^juta\b/i.test(unit)) return 1e6;
  if (/^ribu\b/i.test(unit)) return 1e3;
  return 1;
}

const getVal = (fields, k) => {
  const v = fields?.[k]?.value;
  return v != null && Number.isFinite(v) ? v : null;
};

const fmtMarketCap = (v) => {
  if (v == null || !Number.isFinite(v)) return '—';
  if (Math.abs(v) >= 1e12) return `Rp${fmtNumber(v / 1e12, 2)} T`;
  if (Math.abs(v) >= 1e9) return `Rp${fmtNumber(v / 1e9, 2)} M`;
  return fmtRupiah(v, 0);
};

export function computeValuation({ fields = {}, entity = {}, market = null, shares = null } = {}) {
  const unitMul = new Decimal(unitFactor(entity?.unit));
  const annFactor = new Decimal(annualizationFactor(entity?.period_type ?? 'Q1'));
  const isAnnualized = annFactor.gt(1);

  const manualShares = shares != null && Number.isFinite(Number(shares)) && Number(shares) > 0 ? Number(shares) : null;
  const parsedShares = getVal(fields, 'issued_and_paid_shares');
  const effShares = manualShares ?? (parsedShares != null && parsedShares > 0 ? parsedShares : null);
  const sharesFromReport = manualShares == null && effShares != null;

  const price = market?.price != null && Number.isFinite(Number(market.price)) && Number(market.price) > 0 ? Number(market.price) : null;

  const nip = getVal(fields, 'net_income_parent');
  const eqParent = getVal(fields, 'equity_parent') ?? getVal(fields, 'total_equity');
  const rev = getVal(fields, 'revenue');

  // 1. shares_outstanding
  const sharesItem = effShares != null
    ? {
        value: effShares,
        display: fmtNumber(effShares, 0),
        inputs: manualShares != null ? ['shares_input'] : ['issued_and_paid_shares'],
        ...(sharesFromReport ? { unavailable_reason: 'belum dikurangi saham treasuri' } : {}),
      }
    : {
        value: null,
        display: '—',
        inputs: ['issued_and_paid_shares'],
        unavailable_reason: 'jumlah saham tidak tersedia',
      };

  // 2. eps (disetahunkan)
  let epsVal = null;
  let epsReason;
  if (effShares == null) epsReason = 'jumlah saham tidak tersedia';
  else if (nip == null) epsReason = 'laba pemilik entitas induk tidak tersedia';
  else epsVal = new Decimal(nip).mul(annFactor).mul(unitMul).div(effShares).toNumber();

  const epsItem = {
    value: epsVal,
    display: epsVal != null ? fmtRupiah(epsVal, 1) : '—',
    inputs: ['net_income_parent', 'issued_and_paid_shares'],
    annualized: isAnnualized,
    ...(epsReason ? { unavailable_reason: epsReason } : {}),
  };

  // 3. bvps
  let bvpsVal = null;
  let bvpsReason;
  if (effShares == null) bvpsReason = 'jumlah saham tidak tersedia';
  else if (eqParent == null) bvpsReason = 'ekuitas induk tidak tersedia';
  else bvpsVal = new Decimal(eqParent).mul(unitMul).div(effShares).toNumber();

  const bvpsItem = {
    value: bvpsVal,
    display: bvpsVal != null ? fmtRupiah(bvpsVal, 0) : '—',
    inputs: ['equity_parent', 'issued_and_paid_shares'],
    annualized: false,
    ...(bvpsReason ? { unavailable_reason: bvpsReason } : {}),
  };

  // 4. market_cap
  let mcapVal = null;
  let mcapReason;
  if (price == null) mcapReason = 'harga belum tersedia';
  else if (effShares == null) mcapReason = 'jumlah saham tidak tersedia';
  else mcapVal = new Decimal(price).mul(effShares).toNumber();

  const marketCapItem = {
    value: mcapVal,
    display: mcapVal != null ? fmtMarketCap(mcapVal) : '—',
    inputs: ['price', 'issued_and_paid_shares'],
    ...(mcapReason ? { unavailable_reason: mcapReason } : {}),
  };

  // 5. per
  let perVal = null;
  let perReason;
  if (price == null) perReason = 'harga belum tersedia';
  else if (effShares == null) perReason = 'jumlah saham tidak tersedia';
  else if (epsVal == null) perReason = 'EPS tidak tersedia';
  else if (epsVal <= 0) perReason = 'laba negatif';
  else perVal = new Decimal(price).div(epsVal).toNumber();

  const perItem = {
    value: perVal,
    display: perVal != null ? fmtMultiple(perVal, 2) : '—',
    inputs: ['price', 'net_income_parent', 'issued_and_paid_shares'],
    annualized: isAnnualized,
    ...(perReason ? { unavailable_reason: perReason } : {}),
  };

  // 6. pbv
  let pbvVal = null;
  let pbvReason;
  if (price == null) pbvReason = 'harga belum tersedia';
  else if (effShares == null) pbvReason = 'jumlah saham tidak tersedia';
  else if (bvpsVal == null || bvpsVal <= 0) pbvReason = 'ekuitas tidak positif';
  else pbvVal = new Decimal(price).div(bvpsVal).toNumber();

  const pbvItem = {
    value: pbvVal,
    display: pbvVal != null ? fmtMultiple(pbvVal, 2) : '—',
    inputs: ['price', 'equity_parent', 'issued_and_paid_shares'],
    annualized: false,
    ...(pbvReason ? { unavailable_reason: pbvReason } : {}),
  };

  // 7. ps (Price to Sales, pendapatan disetahunkan)
  let psVal = null;
  let psReason;
  if (price == null) psReason = 'harga belum tersedia';
  else if (effShares == null) psReason = 'jumlah saham tidak tersedia';
  else if (rev == null || rev <= 0) psReason = 'pendapatan tidak tersedia';
  else {
    const sps = new Decimal(rev).mul(annFactor).mul(unitMul).div(effShares);
    psVal = new Decimal(price).div(sps).toNumber();
  }

  const psItem = {
    value: psVal,
    display: psVal != null ? fmtMultiple(psVal, 2) : '—',
    inputs: ['price', 'revenue', 'issued_and_paid_shares'],
    annualized: isAnnualized,
    ...(psReason ? { unavailable_reason: psReason } : {}),
  };

  // 8. fair_value (Graham Number: sqrt(22.5 * eps * bvps)) & premium_discount (FR-VLN-03)
  let fvVal = null;
  let fvReason;
  if (epsVal == null || bvpsVal == null) fvReason = epsReason ?? bvpsReason ?? 'data tidak lengkap';
  else if (epsVal <= 0 || bvpsVal <= 0) fvReason = 'EPS atau BVPS negatif';
  else fvVal = Math.sqrt(22.5 * epsVal * bvpsVal);

  const fairValueItem = {
    value: fvVal,
    display: fvVal != null ? fmtRupiah(fvVal, 0) : '—',
    inputs: ['graham_number', 'eps', 'bvps'],
    annualized: isAnnualized,
    ...(fvReason ? { unavailable_reason: fvReason } : {}),
  };

  let pdVal = null;
  let pdReason;
  if (price == null) pdReason = 'harga belum tersedia';
  else if (fvVal == null || fvVal <= 0) pdReason = fvReason ?? 'nilai wajar tidak tersedia';
  else pdVal = price / fvVal - 1;

  const premiumDiscountItem = {
    value: pdVal,
    display: pdVal != null ? `${pdVal >= 0 ? '+' : ''}${fmtPct(pdVal, 1)}` : '—',
    inputs: ['price', 'fair_value'],
    ...(pdReason ? { unavailable_reason: pdReason } : {}),
  };

  const out = {
    shares_outstanding: sharesItem,
    eps: epsItem,
    bvps: bvpsItem,
    market_cap: marketCapItem,
    per: perItem,
    pbv: pbvItem,
    ps: psItem,
    fair_value: fairValueItem,
    premium_discount: premiumDiscountItem,
  };

  // Tahap 4-C: laporan non-IDR tidak boleh dibandingkan dengan harga Rupiah (tanpa kurs)
  const currency = entity?.currency ?? 'IDR';
  if (currency !== 'IDR') {
    const reason = `laporan dalam ${currency}; valuasi dengan harga Rupiah belum didukung`;
    for (const k of Object.keys(out)) {
      if (k === 'shares_outstanding') continue;
      out[k] = { ...out[k], value: null, display: '—', unavailable_reason: reason };
    }
  }
  return out;
}
