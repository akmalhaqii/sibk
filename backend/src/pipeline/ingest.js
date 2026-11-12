// FR-ING: simpan PDF, deteksi text layer, temukan halaman laporan inti (kode taksonomi / judul).
// R-11: gunakan pdfjs-dist/legacy/build/pdf.mjs untuk lingkungan Node.js.
import fs from 'node:fs/promises';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const CORE = {
  posisi_keuangan: [/posisi\s+keuangan/i, /financial\s+position/i],
  laba_rugi: [/laba\s+rugi/i, /profit\s+or\s+loss/i],
  arus_kas: [/arus\s+kas/i, /cash\s+flows?/i],
};

const TAXONOMY = {
  '1210000': 'posisi_keuangan',
  '1220000': 'posisi_keuangan',
  '1311000': 'laba_rugi',
  '1321000': 'laba_rugi',
  '1510000': 'arus_kas',
  '1520000': 'arus_kas',
};

const NUM_RE = /^\(?-?\d{1,3}(?:[.,]\d{3})+(?:[.,]\d+)?\)?$/;

export function classify(items) {
  if (!items || !items.length) return null;
  const sorted = items
    .filter((i) => i.str && i.str.trim())
    .slice()
    .sort((a, b) => (b.transform?.[5] ?? 0) - (a.transform?.[5] ?? 0) || (a.transform?.[4] ?? 0) - (b.transform?.[4] ?? 0));

  const headerText = sorted.slice(0, 40).map((i) => i.str.trim()).join(' ');
  const head = headerText.slice(0, 450);

  // Abaikan halaman Catatan atas Laporan Keuangan, Daftar Isi, atau Perubahan Ekuitas
  if (/catatan\s+atas\s+laporan|notes\s+to\s+(the\s+)?consolidated/i.test(head)) return null;
  if (/daftar\s+isi|table\s+of\s+contents/i.test(head)) return null;
  if (/perubahan\s+ekuitas|changes\s+in\s+equity/i.test(head)) return null;

  // Abaikan halaman tanpa baris berangka sama sekali
  const hasNumbers = sorted.some((i) => NUM_RE.test(i.str.trim()));
  if (!hasNumbers) return null;

  // 1. Cek kode taksonomi BEI bila ada
  const taxMatch = head.match(/\[(1[235]\d{5})\]/);
  if (taxMatch && TAXONOMY[taxMatch[1]]) {
    return TAXONOMY[taxMatch[1]];
  }

  // 2. Laporan perusahaan: syarat "konsolidasian" atau "consolidated" di bagian judul
  const isConsolidated = /konsolidasian|konsolidasi\s+an|consolidated/i.test(head);
  if (!isConsolidated) return null;

  for (const [statement, patterns] of Object.entries(CORE)) {
    if (patterns.some((re) => re.test(head))) return statement;
  }
  return null;
}

export async function ingest(file) {
  const data = new Uint8Array(await fs.readFile(file.path));
  const doc = await getDocument({ data, useSystemFonts: true }).promise;
  const pages = [];
  const generalTexts = [];
  let lastTaxonomyStatement = null;

  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const { items } = await page.getTextContent();
    const text = items.map((i) => i.str).join(' ');
    const hasText = text.trim().length > 50;
    if (n <= 5) {
      generalTexts.push(text);
    }

    const sortedTop = items
      .filter((i) => i.str && i.str.trim())
      .slice()
      .sort((a, b) => (b.transform?.[5] ?? 0) - (a.transform?.[5] ?? 0) || (a.transform?.[4] ?? 0) - (b.transform?.[4] ?? 0))
      .slice(0, 30)
      .map((i) => i.str)
      .join(' ');

    const anyTax = sortedTop.match(/\[(\d{7})\]/);
    if (anyTax) {
      lastTaxonomyStatement = TAXONOMY[anyTax[1]] ?? null;
    }

    const statement =
      classify(items) ??
      (lastTaxonomyStatement && items.some((i) => NUM_RE.test(i.str.trim())) ? lastTaxonomyStatement : null);
    pages.push({ page: n, items, hasText, statement });
  }

  const corePages = pages.filter((p) => p.statement);
  corePages._generalText = generalTexts.join(' ');
  return corePages;
}
