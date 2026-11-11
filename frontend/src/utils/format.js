// Format angka Indonesia untuk tampilan (selaras backend/src/format.js)
export const fmtNumber = (v, digits = 0) =>
  v == null ? '—' : new Intl.NumberFormat('id-ID', { maximumFractionDigits: digits }).format(v);
export const fmtPct = (v, digits = 1) => (v == null ? '—' : `${fmtNumber(v * 100, digits)}%`);