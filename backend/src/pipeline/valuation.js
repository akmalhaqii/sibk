// FR-VLN: PER, PBV, EV/EBITDA, P/S, dividend yield; tanpa jumlah saham -> tidak tersedia (bukan tebakan)
// R-06: bila entity.period_type = Q1/Q2/Q3, setahunkan laba (x4 / x2 / x(4/3)) dan beri flag annualized: true.
const ANNUAL_FACTOR = { Q1: 4, Q2: 2, Q3: 4 / 3, FY: 1 };

export function annualizationFactor(periodType) {
  return ANNUAL_FACTOR[periodType] ?? 1;
}

export function computeValuation({ fields, entity, market, shares }) {
  return {};
}
