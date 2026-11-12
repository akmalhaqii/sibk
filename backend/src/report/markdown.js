// FR-OUT-01: laporan akhir dalam Markdown dan JSON.
// Semua angka diambil dari field display/value hasil kode; laporan tidak menghitung ulang apa pun.
import { fmtNumber } from '../format.js';
import { buildInput } from '../narrator/input.js';

const METRIC_GROUPS = [
  ['Profitabilitas', [['roe', 'ROE'], ['roa', 'ROA'], ['net_margin', 'Margin laba bersih'], ['operating_margin', 'Margin usaha']]],
  ['Likuiditas', [['current_ratio', 'Current ratio']]],
  ['Solvabilitas', [['der', 'Liabilitas terhadap ekuitas'], ['liability_to_asset', 'Liabilitas/aset']]],
  [
    'Pertumbuhan dan arus kas',
    [
      ['revenue_growth', 'Pertumbuhan pendapatan'],
      ['earnings_growth', 'Pertumbuhan laba'],
      ['cash_conversion', 'Konversi kas'],
      ['ocf_to_assets', 'Arus kas operasi/aset'],
    ],
  ],
];

const VALUATION_ITEMS = [
  ['shares_outstanding', 'Jumlah saham'],
  ['eps', 'EPS'],
  ['bvps', 'BVPS'],
  ['market_cap', 'Kapitalisasi pasar'],
  ['per', 'PER'],
  ['pbv', 'PBV'],
  ['ps', 'P/S'],
  ['fair_value', 'Nilai wajar Graham (konservatif)'],
  ['premium_discount', 'Premium/diskon harga'],
];

const SOURCE_LABEL = { company_pdf: 'PDF perusahaan', bei_pdf: 'PDF BEI' };

// Isi sel tabel Markdown: buang baris baru dan amankan tanda |
const cell = (v) => (v == null || v === '' ? '—' : String(v).replace(/\r?\n/g, ' ').replace(/\|/g, '\\|'));
const row = (cols) => `| ${cols.map(cell).join(' | ')} |`;
const table = (head, rows) =>
  [row(head), row(head.map(() => '---')), ...rows.map(row)].join('\n');

function fmtDateTime(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'medium', timeStyle: 'short' }) + ' WIB';
}

export function reportFilename(result = {}, ext = 'md') {
  const e = result.entity ?? {};
  const year = (e.period_end ?? '').slice(0, 4);
  const parts = ['TelusurFin', e.ticker || 'EMITEN', `${year}${e.period_type ?? ''}`].filter(Boolean);
  return `${parts.join('_').replace(/[^A-Za-z0-9_-]/g, '')}.${ext}`;
}

export function buildReportMarkdown(result = {}, narrative = null, { generatedAt = new Date() } = {}) {
  const { entity = {}, fields = {}, validation = {}, metrics = {}, tiering = {}, market = null, valuation = {} } = result;
  const isQuarterly = ['Q1', 'Q2', 'Q3'].includes(entity.period_type);
  const lines = [];

  const year = (entity.period_end ?? '').slice(0, 4);
  lines.push(`# Laporan Analisis ${entity.ticker ?? 'Emiten'} · ${entity.period_type ?? ''} ${year}`.trim());
  lines.push('');
  lines.push(
    table(
      ['Informasi', 'Nilai'],
      [
        ['Periode laporan', entity.period_end],
        ['Jenis periode', entity.period_type],
        ['Satuan angka laporan', entity.unit],
        ['Sumber dokumen', SOURCE_LABEL[entity.source] ?? entity.source],
        ['Status validasi', validation.needs_review ? 'Perlu diperiksa' : 'Lolos semua cek'],
        ['Dibuat', fmtDateTime(generatedAt.toISOString())],
      ]
    )
  );
  lines.push('');

  // 1. Ringkasan eksekutif
  lines.push('## 1. Ringkasan eksekutif');
  lines.push('');
  if (narrative?.text) {
    const label =
      narrative.source === 'llm'
        ? `Ringkasan AI · Qwen3 lokal${narrative.model ? ` (${narrative.model})` : ''}${narrative.prompt_version ? `, prompt ${narrative.prompt_version}` : ''}`
        : narrative.label || 'Ringkasan otomatis (tanpa AI)';
    lines.push(`*${label}*`);
    lines.push('');
    lines.push(String(narrative.text).trim());
  } else {
    lines.push('Ringkasan belum tersedia saat laporan dibuat.');
  }
  lines.push('');

  // 2. Rasio kesehatan
  lines.push('## 2. Rasio kesehatan keuangan');
  lines.push('');
  const metricRows = [];
  for (const [group, items] of METRIC_GROUPS) {
    for (const [key, label] of items) {
      const m = metrics[key];
      if (!m) continue;
      metricRows.push([group, label, m.display ?? '—', m.status ?? '—', m.formula ?? '—']);
    }
  }
  lines.push(table(['Kelompok', 'Metrik', 'Nilai', 'Status', 'Rumus'], metricRows));
  if (isQuarterly) {
    lines.push('');
    lines.push(`ROE, ROA, dan arus kas operasi/aset disetahunkan dari laporan ${entity.period_type}.`);
  }
  lines.push('');
  lines.push(
    'Liabilitas terhadap ekuitas memakai total liabilitas (termasuk dana syirkah temporer), bukan hanya utang berbunga, ' +
      'sehingga nilainya bisa lebih tinggi daripada "DER" di situs data saham.'
  );
  lines.push('');

  // 3. Tier performa
  lines.push('## 3. Tier performa');
  lines.push('');
  if (tiering?.tier) {
    lines.push(
      `Tier **${tiering.tier}** (klaster ${tiering.cluster ?? '—'}, model ${tiering.model_version ?? '—'}). ` +
        'Tier bersifat relatif terhadap emiten non-keuangan BEI periode Q1 2025, bukan penilaian mutlak.'
    );
  } else {
    lines.push(`Tier tidak tersedia${tiering?.reason ? `: ${tiering.reason}` : '.'}`);
  }
  lines.push('');

  // 4. Valuasi
  lines.push('## 4. Valuasi');
  lines.push('');
  if (market?.price != null) {
    const src = market.source === 'manual' ? 'input manual' : market.source;
    lines.push(`Harga acuan Rp${fmtNumber(market.price)} (${src}, ${fmtDateTime(market.fetched_at) ?? 'waktu tidak tercatat'}).`);
  } else {
    lines.push('Harga saham belum tersedia; valuasi berbasis harga tidak dihitung.');
  }
  lines.push('');
  const valRows = VALUATION_ITEMS.filter(([k]) => valuation[k]).map(([k, label]) => {
    const v = valuation[k];
    const notes = [v.annualized && isQuarterly ? 'disetahunkan' : null, v.unavailable_reason].filter(Boolean).join('; ');
    return [label, v.display ?? '—', notes || '—'];
  });
  lines.push(table(['Item', 'Nilai', 'Catatan'], valRows));
  lines.push('');
  lines.push(
    `Nilai wajar Graham = √(22,5 × EPS × BVPS)${isQuarterly ? `, dengan EPS dari laba ${entity.period_type} yang disetahunkan` : ''}. ` +
      'Angka ini estimasi konservatif dari laporan keuangan, bukan target harga analis; situs lain dapat memakai model berbeda ' +
      '(misalnya DCF atau konsensus analis) dan laba 12 bulan terakhir, sehingga hasilnya bisa berbeda.'
  );
  lines.push('');

  // 5. Validasi
  lines.push('## 5. Cek validasi');
  lines.push('');
  lines.push(
    table(
      ['Cek', 'Sisi kiri', 'Sisi kanan', 'Hasil'],
      (validation.checks ?? []).map((c) => [c.name, fmtNumber(c.lhs), fmtNumber(c.rhs), c.pass ? 'Lolos' : 'Gagal'])
    )
  );
  lines.push('');

  // 6. Angka hasil ekstraksi
  lines.push(`## 6. Angka hasil ekstraksi (${entity.unit ?? 'satuan laporan'})`);
  lines.push('');
  lines.push(
    table(
      ['Field', 'Label di laporan', 'Berjalan', 'Pembanding', 'Halaman', 'Dikoreksi'],
      Object.entries(fields).map(([key, f]) => [
        key,
        f?.label,
        f?.value != null ? fmtNumber(f.value) : '—',
        f?.prior != null ? fmtNumber(f.prior) : '—',
        f?.page,
        f?.corrected ? 'Ya' : '',
      ])
    )
  );
  lines.push('');

  // 7. Keterbatasan
  lines.push('## 7. Keterbatasan');
  lines.push('');
  const limitations = buildInput(result).limitations ?? [];
  for (const l of limitations) lines.push(`- ${l}`);
  lines.push('- Angka diekstrak secara otomatis dari PDF dan dapat dilacak ke halaman sumbernya; periksa kembali sebelum dipakai.');
  lines.push('- Laporan ini bukan rekomendasi investasi.');
  lines.push('');
  lines.push('---');
  lines.push('Dibuat oleh TelusurFin, sistem informasi finansial berbasis ekstraksi dokumen.');
  lines.push('');

  return lines.join('\n');
}

export function buildReportJson(result = {}, narrative = null, { generatedAt = new Date() } = {}) {
  return {
    app: 'TelusurFin',
    report_version: 1,
    generated_at: generatedAt.toISOString(),
    ...result,
    narrative: narrative ?? null,
  };
}
