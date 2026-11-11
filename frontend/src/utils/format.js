// Format angka Indonesia untuk tampilan (identik dengan backend/src/format.js)
export const fmtNumber = (v, digits = 0) =>
  v == null ? '—' : new Intl.NumberFormat('id-ID', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v);

export const fmtPct = (v, digits = 1) =>
  v == null ? '—' : `${fmtNumber(v * 100, digits)}%`;

export const fmtMultiple = (v, digits = 2) =>
  v == null ? '—' : `${fmtNumber(v, digits)}x`;

export const fmtRupiah = (v, digits = 0) =>
  v == null ? '—' : `Rp${fmtNumber(v, digits)}`;
