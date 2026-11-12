// Bangun input narasi dari JSON metrics/tiering/valuation; angka sudah diformat kode (FR-NAR-01)
import { fmtRupiah } from '../format.js';

export function buildInput(r = {}) {
  const m = (k) => {
    const item = r?.metrics?.[k];
    if (!item || item.value == null || !item.display || item.display === '—') return null;
    return { display: item.display, status: item.status ?? null };
  };
  const v = (k) => {
    const item = r?.valuation?.[k];
    if (!item) return null;
    const hasVal = item.value != null && item.display && item.display !== '—';
    return {
      display: hasVal ? item.display : null,
      reason: item.unavailable_reason ?? null,
    };
  };

  return {
    ticker: r?.entity?.ticker ?? null,
    period_type: r?.entity?.period_type ?? null,
    period_end: r?.entity?.period_end ?? null,
    profitability: {
      roe: m('roe'),
      roa: m('roa'),
      net_margin: m('net_margin'),
      operating_margin: m('operating_margin'),
    },
    liquidity: {
      current_ratio: m('current_ratio'),
    },
    solvency: {
      der: m('der'),
      liability_to_asset: m('liability_to_asset'),
    },
    growth_cash: {
      revenue_growth: m('revenue_growth'),
      earnings_growth: m('earnings_growth'),
      cash_conversion: m('cash_conversion'),
      ocf_to_assets: m('ocf_to_assets'),
    },
    valuation: {
      price: r?.market?.price != null ? fmtRupiah(r.market.price) : null,
      price_source: r?.market?.source ?? null,
      per: v('per'),
      pbv: v('pbv'),
      ps: v('ps'),
      fair_value: v('fair_value'),
      premium_discount: v('premium_discount'),
    },
    tier: {
      label: r?.tiering?.tier ?? null,
      model_version: r?.tiering?.model_version ?? null,
    },
    limitations: [
      r?.validation?.needs_review && 'Sebagian angka tidak lolos validasi dan perlu diperiksa.',
      Object.values(r?.fields ?? {}).some((f) => f?.corrected) && 'Sebagian angka telah dikoreksi pengguna.',
      ['Q1', 'Q2', 'Q3'].includes(r?.entity?.period_type) &&
        'ROE, ROA, dan valuasi berbasis laba disetahunkan dari laporan kuartalan.',
      'Jumlah saham belum dikurangi saham treasuri.',
    ].filter(Boolean),
  };
}

// REV-06: lembar fakta untuk prompt v4. Nama metrik di sini sama dengan alias di binding.js,
// sehingga bila Qwen menyalin nama + angka apa adanya, kalimatnya lolos cek pasangan metrik-angka.
const FACT_ROWS = [
  ['Profitabilitas', 'profitability', [['roe', 'ROE', true], ['roa', 'ROA', true], ['net_margin', 'margin laba bersih'], ['operating_margin', 'margin usaha']]],
  ['Likuiditas dan solvabilitas', null, [['liquidity.current_ratio', 'current ratio'], ['solvency.der', 'liabilitas terhadap ekuitas'], ['solvency.liability_to_asset', 'liabilitas terhadap aset']]],
  [
    'Pertumbuhan dan arus kas',
    'growth_cash',
    [
      ['revenue_growth', 'pertumbuhan pendapatan', false, 'dibanding periode yang sama tahun lalu'],
      ['earnings_growth', 'pertumbuhan laba', false, 'laba pemilik entitas induk, dibanding periode yang sama tahun lalu'],
      ['cash_conversion', 'konversi kas', false, 'arus kas operasi dibagi laba bersih'],
      ['ocf_to_assets', 'arus kas operasi terhadap aset', true],
    ],
  ],
];

export function buildFactSheet(input = {}) {
  const quarterly = ['Q1', 'Q2', 'Q3'].includes(input.period_type);
  const lines = [`Emiten: ${input.ticker ?? '-'}, periode ${input.period_type ?? '-'} (${input.period_end ?? '-'})`];
  for (const [title, group, rows] of FACT_ROWS) {
    const items = [];
    for (const [path, name, annual, note] of rows) {
      const [g, k] = path.includes('.') ? path.split('.') : [group, path];
      const m = input[g]?.[k];
      if (!m?.display) continue;
      const extra = [
        m.status ? `status ${m.status}` : 'tanpa status',
        annual && quarterly ? 'disetahunkan' : null,
        note ?? null,
      ].filter(Boolean);
      items.push(`- ${name}: ${m.display} (${extra.join('; ')})`);
    }
    if (items.length) lines.push('', title, ...items);
  }
  const v = input.valuation ?? {};
  const vItems = [];
  if (v.price) vItems.push(`- harga saham: ${v.price} (${v.price_source === 'manual' ? 'input manual' : v.price_source ?? 'sumber tidak tercatat'})`);
  for (const [k, name] of [['per', 'PER'], ['pbv', 'PBV'], ['ps', 'P/S'], ['fair_value', 'nilai wajar Graham'], ['premium_discount', 'premium terhadap nilai wajar']]) {
    const item = v[k];
    if (!item) continue;
    if (item.display) vItems.push(`- ${name}: ${item.display}`);
    else if (item.reason) vItems.push(`- ${name}: tidak dihitung karena ${item.reason}`);
  }
  if (!v.price && !vItems.length) vItems.push('- harga saham belum tersedia, valuasi tidak dihitung');
  lines.push('', 'Valuasi', ...vItems);
  return lines.join('\n');
}
