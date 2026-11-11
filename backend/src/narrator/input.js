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
