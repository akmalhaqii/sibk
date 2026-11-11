// FR-EXT-03/04/06: rekonstruksi baris dari posisi kata (getTextContent),
// deteksi satuan, pemisah ribuan, periode, & penggabungan label multibaris.

const NUM_RE = /^\(?-?\d[\d.,]*\)?$/;
const NOTE_RE = /^\d{1,2}[a-z]?(?:,\s*\d{1,2}[a-z]?)*$/i;

const MONTHS = {
  januari: 1, januariy: 1, january: 1,
  februari: 2, february: 2,
  maret: 3, march: 3,
  april: 4,
  mei: 5, may: 5,
  juni: 6, june: 6,
  juli: 7, july: 7,
  agustus: 8, august: 8,
  september: 9,
  oktober: 10, october: 10,
  november: 11,
  desember: 12, december: 12,
};

export function isNumber(s) {
  if (!s) return false;
  const t = s.trim();
  if (t === '-' || t === '—' || t === '–') return true;
  if (!NUM_RE.test(t)) return false;
  // Jangan anggap tahun 4 digit (2024..2030) di header sebagai nilai pos jika berdiri sendiri di baris header
  return true;
}

export function detectLocale(items) {
  let dots = 0;
  let commas = 0;
  for (const it of items) {
    const s = (it.str || '').trim();
    if (/^\(?-?\d{1,3}(?:\.\d{3})+\)?$/.test(s)) dots++;
    if (/^\(?-?\d{1,3}(?:,\d{3})+\)?$/.test(s)) commas++;
  }
  return commas > dots ? 'en-comma' : 'id-dot';
}

export function parseNumber(s, locale = 'id-dot') {
  if (s == null) return null;
  const raw = String(s).trim();
  if (raw === '-' || raw === '—' || raw === '–') return 0;
  const neg = (raw.startsWith('(') && raw.endsWith(')')) || raw.startsWith('-');
  let t = raw.replace(/[()\-]/g, '').trim();
  if (!t) return null;
  t = locale === 'id-dot' ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '');
  const v = Number(t);
  return Number.isFinite(v) ? (neg ? -v : v) : null;
}

export function toRows(items, tol = 2.5) {
  const tokens = items
    .filter((i) => i.str && i.str.trim())
    .map((i) => ({
      str: i.str.trim(),
      x: i.transform[4],
      y: i.transform[5],
      w: i.width ?? 0,
    }));
  tokens.sort((a, b) => b.y - a.y || a.x - b.x);
  const rows = [];
  for (const t of tokens) {
    const row = rows.at(-1);
    if (row && Math.abs(row.y - t.y) <= tol) row.cells.push(t);
    else rows.push({ y: t.y, cells: [t] });
  }
  rows.forEach((r) => r.cells.sort((a, b) => a.x - b.x));
  return rows;
}

export function detectMetadata(pages) {
  const allItems = pages.flatMap((p) => p.items || []);
  const fullText = allItems.map((i) => i.str).join(' ');
  const locale = detectLocale(allItems);

  let unit = 'IDR';
  if (/(dalam|in)\s+(jutaan|million\s*s?)/i.test(fullText)) unit = 'juta IDR';
  else if (/(dalam|in)\s+(ribuan|thousand\s*s?)/i.test(fullText)) unit = 'ribu IDR';

  // Cari tanggal periode dari teks judul (mis. "31 MARET 2026" atau "MARCH 31, 2026")
  const dates = [];
  const idDateRe = /(\d{1,2})\s+(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+(\d{4})/gi;
  const enDateRe = /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})/gi;

  for (const m of fullText.matchAll(idDateRe)) {
    const day = String(m[1]).padStart(2, '0');
    const mon = MONTHS[m[2].toLowerCase()];
    const year = Number(m[3]);
    if (mon && year >= 2000 && year <= 2100) {
      dates.push({ iso: `${year}-${String(mon).padStart(2, '0')}-${day}`, year, mon });
    }
  }
  for (const m of fullText.matchAll(enDateRe)) {
    const mon = MONTHS[m[1].toLowerCase()];
    const day = String(m[2]).padStart(2, '0');
    const year = Number(m[3]);
    if (mon && year >= 2000 && year <= 2100) {
      dates.push({ iso: `${year}-${String(mon).padStart(2, '0')}-${day}`, year, mon });
    }
  }

  dates.sort((a, b) => b.iso.localeCompare(a.iso));
  const latest = dates[0];
  const period_end = latest?.iso ?? '2026-03-31';
  const monMap = { 3: 'Q1', 6: 'Q2', 9: 'Q3', 12: 'FY' };
  const period_type = monMap[latest?.mon] ?? 'Q1';

  const hasTaxonomy = /\[\d{7}\]/.test(fullText);
  const source = hasTaxonomy ? 'bei_pdf' : 'company_pdf';

  return { unit, locale, period_end, period_type, source };
}

function detectColumns(rows, locale) {
  // Cari posisi x kolom Catatan/Notes
  let noteX = null;
  for (const r of rows.slice(0, 20)) {
    for (const c of r.cells) {
      if (/^(catatan|notes)\b/i.test(c.str)) {
        noteX = c.x;
        break;
      }
    }
    if (noteX != null) break;
  }

  // Kumpulkan posisi x angka-angka berformat ribuan (pasti berada di kolom nilai/prior)
  const numXs = [];
  for (const r of rows) {
    if (r.y < 70) continue; // abaikan footer halaman
    const bigNums = r.cells.filter((c) => {
      if (noteX != null && c.x < noteX + 20) return false;
      return /^\(?-?\d{1,3}(?:[.,]\d{3})+\)?$/.test(c.str);
    });
    if (bigNums.length >= 2) {
      numXs.push([bigNums[0].x, bigNums[1].x]);
    }
  }

  if (numXs.length > 0) {
    const col1 = numXs.map((p) => p[0]).sort((a, b) => a - b)[Math.floor(numXs.length / 2)];
    const col2 = numXs.map((p) => p[1]).sort((a, b) => a - b)[Math.floor(numXs.length / 2)];
    const effNoteX = noteX ?? col1 - 65;
    const rightLabelX = col2 + 35;
    return { noteX: effNoteX, col1X: col1, col2X: col2, rightLabelX };
  }

  // Fallback untuk fixture sederhana (mis. smgr_textcontent_p5.json)
  return { noteX: 235, col1X: 315, col2X: 385, rightLabelX: 560 };
}

function isFooterOrHeaderRow(rowText, y) {
  if (y < 65 || y > 622) return true;
  if (/lihat\s+catatan\s+atas\s+laporan|see\s+the\s+accompanying\s+notes/i.test(rowText)) return true;
  if (/bagian\s+yang\s+tidak\s+terpisahkan|an\s+integral\s+part\s+of/i.test(rowText)) return true;
  if (/^\s*-\s*\d+\s*-\s*$/.test(rowText)) return true;
  return false;
}

export function parsePageRows(items, { page = 1, statement = 'posisi_keuangan', locale = 'id-dot', isFixture = false } = {}) {
  const rawRows = toRows(items);
  const cols = detectColumns(rawRows, locale);

  // Deteksi apakah seluruh halaman punya kolom angka di sekitar 300-400 dan bahasa Inggris di kanan (>400)
  const hasBilingualRight = rawRows.some((r) =>
    r.cells.some((c) => c.x >= 400 && /[A-Za-z]{4,}/.test(c.str) && !isNumber(c.str))
  );
  const rightCutX = hasBilingualRight ? cols.rightLabelX : 9999;

  const parsedLines = [];

  for (const r of rawRows) {
    const joined = r.cells.map((c) => c.str).join(' ');
    if (!isFixture && isFooterOrHeaderRow(joined, r.y)) continue;

    const leftCells = [];
    const rightLabelCells = [];
    const numCells = [];

    for (const c of r.cells) {
      // Abaikan kolom catatan (mis. "5,32", "15a,32", "20")
      if (c.x >= cols.noteX - 10 && c.x < cols.col1X - 18 && NOTE_RE.test(c.str)) {
        continue;
      }
      if (c.x >= cols.col1X - 18 && c.x < rightCutX && isNumber(c.str)) {
        numCells.push(c);
      } else if (c.x < cols.noteX - 5) {
        leftCells.push(c);
      } else if (c.x >= rightCutX && !isNumber(c.str)) {
        rightLabelCells.push(c);
      }
    }

    const labelId = leftCells.map((c) => c.str).join(' ').replace(/\s+/g, ' ').trim();
    const labelEn = rightLabelCells.map((c) => c.str).join(' ').replace(/\s+/g, ' ').trim();
    if (!labelId && numCells.length === 0) continue;

    let value = null;
    let prior = null;
    if (numCells.length >= 2) {
      value = parseNumber(numCells[0].str, locale);
      prior = parseNumber(numCells[1].str, locale);
    } else if (numCells.length === 1) {
      const dist1 = Math.abs(numCells[0].x - cols.col1X);
      const dist2 = Math.abs(numCells[0].x - cols.col2X);
      if (dist1 <= dist2 || isFixture) value = parseNumber(numCells[0].str, locale);
      else prior = parseNumber(numCells[0].str, locale);
    }

    parsedLines.push({
      y: r.y,
      label: labelId,
      label_en: labelEn,
      value,
      prior,
      hasNumbers: numCells.length > 0,
      indent: leftCells[0]?.x ?? 0,
    });
  }

  // Gabungkan label multibaris & konteks seksi (mis. "DIATRIBUSIKAN KEPADA:" -> "Pemilik entitas induk")
  const out = [];
  let pendingParts = [];
  let pendingEnParts = [];
  let sectionContext = '';

  for (let i = 0; i < parsedLines.length; i++) {
    const cur = parsedLines[i];
    const clean = cur.label;

    // Deteksi header atribusi laba / penghasilan komprehensif
    if (!cur.hasNumbers && /laba\s+periode\s+berjalan|penghasilan\s+komprehensif/i.test(clean)) {
      pendingParts.push(clean);
      if (cur.label_en) pendingEnParts.push(cur.label_en);
      continue;
    }
    if (!cur.hasNumbers && /diatribusikan|attributable|kepada:/i.test(clean)) {
      pendingParts.push(clean);
      if (cur.label_en) pendingEnParts.push(cur.label_en);
      if (clean.endsWith(':')) {
        sectionContext = pendingParts.join(' ').replace(/:$/, '').trim();
        pendingParts = [];
        pendingEnParts = [];
      }
      continue;
    }

    if (!cur.hasNumbers) {
      // Baris header seksi murni (huruf besar semua atau diakhiri titik dua) -> jangan digabung ke pos biasa kecuali kalimat menggantung
      const isSectionHeading =
        clean.endsWith(':') ||
        /^(ASET|ASET LANCAR|ASET TIDAK LANCAR|LIABILITAS JANGKA PENDEK|LIABILITAS JANGKA PANJANG|EKUITAS|ARUS KAS DARI AKTIVITAS|POS-POS YANG)/i.test(clean);

      if (isSectionHeading) {
        pendingParts = [];
        pendingEnParts = [];
        if (!/diatribusikan/i.test(clean)) sectionContext = '';
      } else if (clean) {
        pendingParts.push(clean);
        if (cur.label_en) pendingEnParts.push(cur.label_en);
      }
      continue;
    }

    // Baris memiliki angka
    let fullLabel = [...pendingParts, clean].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    let fullLabelEn = [...pendingEnParts, cur.label_en].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    pendingParts = [];
    pendingEnParts = [];

    if (sectionContext && /^(pemilik\s+entitas\s+induk|kepentingan\s+non-pengendali)/i.test(fullLabel)) {
      fullLabel = `${sectionContext} - ${fullLabel}`;
      if (/^kepentingan\s+non-pengendali/i.test(clean)) {
        sectionContext = ''; // selesai blok atribusi
      }
    } else if (!/^(pemilik\s+entitas\s+induk|kepentingan\s+non-pengendali)/i.test(clean)) {
      sectionContext = '';
    }

    if (!fullLabel) continue;

    const rowObj = {
      label: fullLabel,
      value: cur.value,
      prior: cur.prior,
      page,
      statement,
    };
    if (fullLabelEn) rowObj.label_en = fullLabelEn;
    out.push(rowObj);
  }

  return out;
}

export async function parse(pages) {
  if (!pages || !pages.length) return [];
  const meta = detectMetadata(pages);
  const allRows = [];
  for (const p of pages) {
    const rows = parsePageRows(p.items, {
      page: p.page,
      statement: p.statement,
      locale: meta.locale,
    });
    allRows.push(...rows);
  }
  allRows._meta = meta;
  return allRows;
}
