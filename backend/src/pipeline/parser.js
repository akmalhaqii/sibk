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
  const neg = raw.startsWith('(') || raw.endsWith(')') || raw.startsWith('-');
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

function isIncompleteNumberToken(str) {
  const s = str.replace(/^\(/, '');
  if (!s || s.endsWith(')')) return false;
  if (s.endsWith('.') || s.endsWith(',')) return true;
  const parts = s.split(/[.,]/);
  if (parts.length >= 2 && parts.at(-1).length < 3) return true;
  return false;
}

function mergeRowFragments(cells) {
  if (!cells || cells.length <= 1) return cells;
  const out = [];
  for (const c of cells) {
    const prev = out.at(-1);
    if (!prev) {
      out.push({ ...c });
      continue;
    }

    const dx = c.x - prev.x;
    const prevEnd = prev.x + (prev.w || prev.str.length * 4.2);
    const gap = c.x - prevEnd;
    const inNumZone = prev.x >= 195 && c.x < 405;

    // Gabungkan pecahan angka atau tanda kurung negatif di zona kolom nilai/prior
    if (
      inNumZone &&
      dx < 62 &&
      !prev.str.endsWith(')') &&
      /^[()\-.,\d]+$/.test(prev.str) &&
      /^[()\-.,\d]+$/.test(c.str) &&
      !c.str.startsWith('(')
    ) {
      const openParen = prev.str === '(' || (prev.str.startsWith('(') && !prev.str.endsWith(')'));
      const closeParen = c.str === ')';
      const sepEdge =
        prev.str.endsWith('.') ||
        prev.str.endsWith(',') ||
        c.str.startsWith('.') ||
        c.str.startsWith(',');
      const incomplete = isIncompleteNumberToken(prev.str);

      if ((openParen && gap <= 22) || (closeParen && gap <= 24) || (gap <= 14 && (sepEdge || incomplete || gap < 6))) {
        prev.str = `${prev.str}${c.str}`;
        prev.w = c.x - prev.x + (c.w || c.str.length * 4.2);
        continue;
      }
    }

    // Gabungkan kata label yang terpotong di tengah kata (mis. "b" + "ruto" -> "bruto", "202" + "6" -> "2026")
    if (!inNumZone && gap < 3.5) {
      if (
        (/^[A-Za-z]$/.test(prev.str) && /^[a-z]{2,}/.test(c.str)) ||
        (/^\d{3}$/.test(prev.str) && /^\d$/.test(c.str))
      ) {
        prev.str = `${prev.str}${c.str}`;
        prev.w = c.x - prev.x + (c.w || c.str.length * 4.5);
        continue;
      }
    }

    out.push({ ...c });
  }
  return out;
}

export function detectMetadata(pages) {
  const allItems = pages.flatMap((p) => p.items || []);
  const stmtText = allItems.map((i) => i.str).join(' ');
  const fullText = `${pages._generalText || ''} ${stmtText}`;
  const locale = detectLocale(allItems);

  let unit = 'IDR';
  if (
    /(dalam|in)\s+(jutaan|million\s*s?)/i.test(fullText) ||
    /pembulatan[^]{0,120}(jutaan|in\s+million)/i.test(fullText)
  ) {
    unit = 'juta IDR';
  } else if (
    /(dalam|in)\s+(ribuan|thousand\s*s?)/i.test(fullText) ||
    /pembulatan[^]{0,120}(ribuan|in\s+thousand)/i.test(fullText)
  ) {
    unit = 'ribu IDR';
  }

  const dates = [];
  const idDateRe = /(\d{1,2})\s+(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+(\d{4})/gi;
  const enDateRe = /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})/gi;
  const enDayFirstRe = /(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/gi;

  for (const m of stmtText.matchAll(idDateRe)) {
    const day = String(m[1]).padStart(2, '0');
    const mon = MONTHS[m[2].toLowerCase()];
    const year = Number(m[3]);
    if (mon && year >= 2000 && year <= 2100) {
      dates.push({ iso: `${year}-${String(mon).padStart(2, '0')}-${day}`, year, mon });
    }
  }
  for (const m of stmtText.matchAll(enDateRe)) {
    const mon = MONTHS[m[1].toLowerCase()];
    const day = String(m[2]).padStart(2, '0');
    const year = Number(m[3]);
    if (mon && year >= 2000 && year <= 2100) {
      dates.push({ iso: `${year}-${String(mon).padStart(2, '0')}-${day}`, year, mon });
    }
  }
  for (const m of stmtText.matchAll(enDayFirstRe)) {
    const day = String(m[1]).padStart(2, '0');
    const mon = MONTHS[m[2].toLowerCase()];
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

function detectColumns(rows) {
  let noteX = null;
  for (const r of rows.slice(0, 25)) {
    for (const c of r.cells) {
      if (/^(catatan|notes)\b/i.test(c.str)) {
        noteX = c.x;
        break;
      }
    }
    if (noteX != null) break;
  }

  // Kumpulkan pasangan posisi x angka berformat ribuan di area nilai (x antara 195 dan 400)
  const numXs = [];
  for (const r of rows) {
    if (r.y < 65) continue;
    const bigNums = r.cells.filter((c) => {
      if (c.x < 195 || c.x > 400) return false;
      if (noteX != null && Math.abs(c.x - noteX) <= 18 && NOTE_RE.test(c.str)) return false;
      return /^\(?-?\d{1,3}(?:[.,]\d{3})+(?:[.,]\d+)?\)?$/.test(c.str);
    });
    if (bigNums.length >= 2) {
      numXs.push([bigNums[0].x, bigNums[1].x]);
    }
  }

  if (numXs.length > 0) {
    const col1 = numXs.map((p) => p[0]).sort((a, b) => a - b)[Math.floor(numXs.length / 2)];
    const col2 = numXs.map((p) => p[1]).sort((a, b) => a - b)[Math.floor(numXs.length / 2)];
    const effNoteX = noteX ?? col1 - 65;
    const leftCutX = Math.min(col1, effNoteX) - 12;
    const rightLabelX = Math.max(col2 + 35, 392);
    return { noteX: effNoteX, hasExplicitNote: noteX != null, col1X: col1, col2X: col2, leftCutX, rightLabelX };
  }

  return { noteX: 235, hasExplicitNote: false, col1X: 315, col2X: 385, leftCutX: 225, rightLabelX: 560 };
}

function isHeaderOrFooterRow(rowText, y, numCells) {
  if (y < 62) return true;
  if (/lihat\s+catatan\s+atas\s+laporan|see\s+the\s+accompanying\s+notes/i.test(rowText)) return true;
  if (/bagian\s+yang\s+tidak\s+terpisahkan|an\s+integral\s+part\s+of/i.test(rowText)) return true;
  if (/pengungkapan\s+tambahan\s+informasi\s+arus\s+kas|supplemental\s+cash\s+flow\s+information/i.test(rowText)) return true;
  if (/^\s*-\s*\d+\s*-\s*$/.test(rowText)) return true;

  // Baris judul/header tabel di bagian atas halaman (tanpa angka laporan, atau hanya angka tahun 2024..2030)
  const onlyYearNumbers =
    numCells.length === 0 || numCells.every((c) => /^202\d$/.test(c.str.trim()));

  if (onlyYearNumbers && y > 615) {
    if (
      /the\s+original\s+consolidated|are\s+in\s+indonesian|pt\s+[a-z0-9\s]+tbk|dan\s+entitas\s+anak|and\s+its\s+subsidiaries|laporan\s+posisi\s+keuangan|consolidated\s+statement|laporan\s+laba\s+rugi|statement\s+of\s+profit|laporan\s+arus\s+kas|statement\s+of\s+cash|untuk\s+periode|for\s+the\s+three|periode\s+tiga\s+bulan|three\s+months\s+period|tanggal\s+31|as\s+of\s+march|disajikan\s+dalam|expressed\s+in|kecuali\s+dinyatakan|unless\s+otherwise|\[\d{7}\]|31\s+maret\s+202\d|31\s+march\s+202\d|31\s+desember\s+202\d|december\s+31,\s*202\d|march\s+31,\s*202\d|catatan\/|notes\b/i.test(
        rowText
      )
    ) {
      return true;
    }
  }
  return false;
}

export function parsePageRows(
  items,
  { page = 1, statement = 'posisi_keuangan', locale = 'id-dot', source = 'company_pdf', isFixture = false } = {}
) {
  const rawRows = toRows(items);
  const mergedRows = isFixture
    ? rawRows
    : rawRows.map((r) => ({ y: r.y, cells: mergeRowFragments(r.cells) }));

  const cols = detectColumns(mergedRows);
  const hasBilingualRight = mergedRows.some((r) =>
    r.cells.some((c) => c.x >= 395 && /[A-Za-z]{4,}/.test(c.str) && !isNumber(c.str))
  );
  const rightCutX = hasBilingualRight ? cols.rightLabelX : 9999;
  const noteBetweenCols = cols.hasExplicitNote && cols.col1X < cols.noteX && cols.noteX < cols.col2X;
  const noteLeftOfCols = cols.hasExplicitNote && cols.noteX < cols.col1X - 25;
  const numStartX = noteLeftOfCols ? cols.col1X - 30 : 198;
  const labelEndX = noteLeftOfCols ? cols.noteX - 8 : 198;

  const parsedLines = [];

  for (const r of mergedRows) {
    const joined = r.cells.map((c) => c.str).join(' ');

    const leftCells = [];
    const rightLabelCells = [];
    const numCells = [];

    for (const c of r.cells) {
      // Abaikan kolom catatan
      if (noteBetweenCols && Math.abs(c.x - cols.noteX) <= 22) {
        continue;
      }
      if (noteLeftOfCols && c.x >= cols.noteX - 8 && c.x < numStartX && NOTE_RE.test(c.str)) {
        continue;
      }

      if (c.x >= numStartX && c.x < rightCutX && isNumber(c.str)) {
        numCells.push(c);
      } else if (c.x < labelEndX) {
        leftCells.push(c);
      } else if (c.x >= rightCutX && !isNumber(c.str)) {
        rightLabelCells.push(c);
      }
    }

    if (!isFixture && isHeaderOrFooterRow(joined, r.y, numCells)) continue;

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

  // Mode BEI XBRL PDF: angka berada di baris PERTAMA pos, dan baris lanjutan di bawahnya diawali huruf kecil / tanda kurung
  if (source === 'bei_pdf' && !isFixture) {
    const out = [];
    for (let i = 0; i < parsedLines.length; i++) {
      const cur = parsedLines[i];
      if (!cur.hasNumbers) continue;

      const labelParts = [cur.label].filter(Boolean);
      const labelEnParts = [cur.label_en].filter(Boolean);
      let lastY = cur.y;

      while (i + 1 < parsedLines.length) {
        const next = parsedLines[i + 1];
        if (next.hasNumbers) break;
        if (lastY - next.y > 16) break;
        const nextId = next.label || '';
        const nextEn = next.label_en || '';
        const isContinuation =
          /^[a-z(]/.test(nextId) || (!nextId && /^[a-z(]/.test(nextEn));
        if (!isContinuation) break;

        if (nextId) labelParts.push(nextId);
        if (nextEn) labelEnParts.push(nextEn);
        lastY = next.y;
        i++;
      }

      const fullLabel = labelParts.join(' ').replace(/\s+/g, ' ').trim();
      const fullLabelEn = labelEnParts.join(' ').replace(/\s+/g, ' ').trim();
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

  // Mode Company PDF: angka berada di baris TERAKHIR dari label multibaris
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
      const joinedPending = [...pendingParts, clean].join(' ').trim();
      const nextLine = parsedLines[i + 1];
      const isEquityParentHeading =
        /ekuitas\s+yang\s+dapat\s+diatribusikan\s+kepada\s+pemilik\s+entitas\s+induk/i.test(joinedPending) &&
        nextLine &&
        !nextLine.hasNumbers &&
        /^modal\s+saham/i.test(nextLine.label);

      const isSectionHeading =
        isEquityParentHeading ||
        clean.endsWith(':') ||
        /^(ASET|ASET LANCAR|ASET TIDAK LANCAR|LIABILITAS DAN EKUITAS|LIABILITAS|LIABILITAS JANGKA PENDEK|LIABILITAS JANGKA PANJANG|EKUITAS|SALDO LABA|BEBAN USAHA|PENDAPATAN \(BEBAN\) USAHA LAINNYA|PENGHASILAN KOMPREHENSIF LAIN|LABA PER SAHAM|ARUS KAS DARI AKTIVITAS|POS-POS YANG)/i.test(
          clean
        );

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

    // Baris subtotal tanpa label tepat sebelum "Kepentingan nonpengendali" pada laporan posisi keuangan (mis. AKRA)
    if (!clean && pendingParts.length === 0 && statement === 'posisi_keuangan') {
      const nextLine = parsedLines[i + 1];
      if (nextLine && /^kepentingan\s+non\s*-?\s*pengendali/i.test(nextLine.label)) {
        out.push({
          label: 'Jumlah ekuitas yang dapat diatribusikan kepada pemilik entitas induk',
          label_en: 'Total equity attributable to owners of the parent entity',
          value: cur.value,
          prior: cur.prior,
          page,
          statement,
        });
      }
      continue;
    }

    let fullLabel = [...pendingParts, clean].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    let fullLabelEn = [...pendingEnParts, cur.label_en].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    pendingParts = [];
    pendingEnParts = [];

    if (sectionContext && /^(pemilik\s+entitas\s+induk|kepentingan\s+non\s*-?\s*pengendali)/i.test(fullLabel)) {
      fullLabel = `${sectionContext} - ${fullLabel}`;
      if (/^kepentingan\s+non\s*-?\s*pengendali/i.test(clean)) {
        sectionContext = '';
      }
    } else if (!/^(pemilik\s+entitas\s+induk|kepentingan\s+non\s*-?\s*pengendali)/i.test(clean)) {
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
      source: meta.source,
    });
    allRows.push(...rows);
  }
  allRows._meta = meta;
  return allRows;
}
