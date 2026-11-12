// FR-NAR-04 / R-01: ringkasan templat berlabel "Ringkasan otomatis (tanpa AI)"
// Menyertakan checks_passed: true agar lolos skema NarrativeResponse.
import env from '../config/env.js';

function joinId(items) {
  const list = items.filter(Boolean);
  if (list.length === 0) return '';
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} dan ${list[1]}`;
  return `${list.slice(0, -1).join(', ')}, dan ${list[list.length - 1]}`;
}

function fmtItem(label, metric) {
  if (!metric?.display || metric.display === '—') return null;
  return metric.status ? `${label} ${metric.display} (${metric.status})` : `${label} ${metric.display}`;
}

export function templateSummary(input = {}) {
  const paragraphs = [];

  // 1. Profitabilitas
  const profItems = [
    fmtItem('ROE', input.profitability?.roe),
    fmtItem('ROA', input.profitability?.roa),
    fmtItem('margin laba bersih', input.profitability?.net_margin),
    fmtItem('margin usaha', input.profitability?.operating_margin),
  ].filter(Boolean);
  if (profItems.length > 0) {
    paragraphs.push(`Profitabilitas: ${joinId(profItems)}.`);
  }

  // 2. Likuiditas dan solvabilitas
  const liqSolvItems = [
    fmtItem('current ratio', input.liquidity?.current_ratio),
    fmtItem('liabilitas terhadap ekuitas', input.solvency?.der), // A-2: bukan DER utang berbunga
    fmtItem('liabilitas terhadap aset', input.solvency?.liability_to_asset),
  ].filter(Boolean);
  if (liqSolvItems.length > 0) {
    paragraphs.push(`Likuiditas dan solvabilitas: ${joinId(liqSolvItems)}.`);
  }

  // 3. Pertumbuhan dan arus kas
  const growthParts = [
    fmtItem('pendapatan tumbuh', input.growth_cash?.revenue_growth),
    fmtItem('laba pemilik entitas induk tumbuh', input.growth_cash?.earnings_growth),
  ].filter(Boolean);
  const growthClause =
    growthParts.length > 0 ? `${joinId(growthParts)} dibanding periode yang sama tahun lalu` : null;

  const cc = input.growth_cash?.cash_conversion;
  const cashClause =
    cc?.display && cc.display !== '—'
      ? `arus kas operasi ${cc.display} laba bersih${cc.status ? ` (${cc.status})` : ''}`
      : null;

  const gcClauses = [growthClause, cashClause].filter(Boolean);
  if (gcClauses.length > 0) {
    paragraphs.push(`Pertumbuhan dan arus kas: ${gcClauses.join('; ')}.`);
  }

  // 4. Valuasi
  const val = input.valuation ?? {};
  // Tahap 5: laporan non-IDR (tahap 4-C) -> sebut alasannya, bukan "harga belum tersedia"
  const currencyReason = [val.per, val.pbv, val.fair_value]
    .map((x) => x?.reason)
    .find((r) => r && /^laporan dalam /.test(r));
  if (currencyReason) {
    paragraphs.push(`Valuasi: belum dihitung karena ${currencyReason}.`);
  } else if (!val.price) {
    paragraphs.push(
      'Valuasi: harga belum tersedia, sehingga PER, PBV, dan premium terhadap nilai wajar belum dapat dihitung.'
    );
  } else {
    const srcText = val.price_source ? ` (${val.price_source})` : '';
    const mults = [
      val.per?.display ? `PER ${val.per.display}` : null,
      val.pbv?.display ? `PBV ${val.pbv.display}` : null,
    ].filter(Boolean);
    const multClause =
      mults.length > 0
        ? `pada harga ${val.price}${srcText}, ${joinId(mults)}`
        : `pada harga ${val.price}${srcText}`;

    const fv = val.fair_value?.display;
    const pd = val.premium_discount?.display;
    const grahamClause =
      fv && pd
        ? `harga ${pd} terhadap nilai wajar Graham ${fv}`
        : val.fair_value?.reason
          ? `nilai wajar Graham belum dapat dihitung (${val.fair_value.reason})`
          : null;

    paragraphs.push(`Valuasi: ${[multClause, grahamClause].filter(Boolean).join('; ')}.`);
  }

  // 5. Tier performa
  const tier = input.tier ?? {};
  const ticker = input.ticker || 'Emiten';
  if (tier.label) {
    const modelVer = tier.model_version || 'tier_kmeans_v1';
    paragraphs.push(
      `Tier performa: model klaster ${modelVer} menempatkan ${ticker} pada tier ${tier.label}, relatif terhadap emiten non-keuangan BEI periode Q1 2025.`
    );
  } else {
    paragraphs.push(
      `Tier performa: klasifikasi tier untuk ${ticker} belum dapat ditentukan karena sebagian rasio input klaster tidak tersedia.`
    );
  }

  // 6. Keterbatasan
  const lims = Array.isArray(input.limitations) ? input.limitations.filter(Boolean) : [];
  if (lims.length > 0) {
    paragraphs.push(`Keterbatasan: ${lims.join(' ')}`);
  }

  return {
    source: 'template',
    label: 'Ringkasan otomatis (tanpa AI)',
    text: paragraphs.join('\n\n'),
    checks_passed: true,
    prompt_version: env.promptVersion,
  };
}
