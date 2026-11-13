// Soal penalaran dari data BEI tersamar. Semua jawaban dihitung kode backend TelusurFin (computeMetrics,
// computeValuation, assignTier, evaluateStatus), sehingga angka & status di dataset = angka & status di aplikasi.
import { computeMetrics, evaluateStatus } from '../../../backend/src/pipeline/metrics.js';
import { computeValuation } from '../../../backend/src/pipeline/valuation.js';
import { assignTier } from '../../../backend/src/pipeline/tiering.js';
import { buildInput } from '../../../backend/src/narrator/input.js';
import { checkQualitativeSentence } from '../../../backend/src/narrator/qualitative.js';
import { thresholdText } from '../../../backend/src/chat/glossary.js';
import thresholds from '../../../backend/config/thresholds.json' with { type: 'json' };
import { num, pct, mult, rp, rpScale, makeScenario } from './lib.mjs';

const j = (v) => (v < 0 ? `-Rp${num(-v)} juta` : `Rp${num(v)} juta`); // nilai juta Rupiah dalam soal
const statusWord = { sehat: 'sehat', waspada: 'waspada', lemah: 'lemah' };
const annualNote = (sc) =>
  sc.periodType === 'FY'
    ? 'Karena datanya setahun penuh, laba tidak perlu disetahunkan.'
    : `Karena datanya ${sc.period.label} (${sc.period.months} bulan), laba disetahunkan dengan dikali ${sc.periodType === 'Q3' ? '4/3' : num(sc.period.factor)}.`;
const statusSentence = (key, m) => (m.status ? `Menurut ambang TelusurFin, nilai ini berstatus ${statusWord[m.status]}. ${thresholdText(key) ?? ''}`.trim() : '');

function metricsOf(sc) {
  return computeMetrics(sc.fields, { period_type: sc.periodType });
}
const f = (sc, k) => sc.fields[k].value;
const fp = (sc, k) => sc.fields[k].prior;

// ---------- T1 ROE ----------
function tROE(sc, rng) {
  const m = metricsOf(sc).roe;
  if (m.value == null || fp(sc, 'equity_parent') == null) return null;
  const nip = f(sc, 'net_income_parent');
  const e0 = fp(sc, 'equity_parent');
  const e1 = f(sc, 'equity_parent');
  const avg = (e0 + e1) / 2;
  const annual = nip * sc.period.factor;
  const q = rng.pick([
    `${sc.name} membukukan laba yang dapat diatribusikan kepada pemilik entitas induk sebesar ${j(nip)} untuk ${sc.period.label}. Ekuitas pemilik entitas induk tercatat ${j(e0)} pada 31 Desember 2024 dan ${j(e1)} pada ${sc.period.end}. Berapa ROE-nya?`,
    `Hitung ROE ${sc.name}: laba pemilik entitas induk ${sc.period.label} ${j(nip)}, ekuitas pemilik entitas induk awal ${j(e0)} dan akhir ${j(e1)}. Bagaimana statusnya?`,
    `Data ${sc.name} (${sc.period.label}, dalam juta Rupiah): laba pemilik entitas induk ${num(nip)}; ekuitas pemilik entitas induk 31 Desember 2024 ${num(e0)}, ${sc.period.end} ${num(e1)}. Berapa ROE dan apa artinya?`,
  ]);
  const a = [
    `Rata-rata ekuitas pemilik entitas induk = (${num(e0)} + ${num(e1)}) ÷ 2 = ${j(Math.round(avg))}.`,
    annualNote(sc),
    sc.periodType === 'FY' ? `Laba setahun = ${j(nip)}.` : `Laba disetahunkan = ${num(nip)} ${sc.period.factorText} = ${j(Math.round(annual))}.`,
    `ROE = ${num(Math.round(annual))} ÷ ${num(Math.round(avg))} = ${m.display}.`,
    statusSentence('roe', m),
    m.value < 0 ? 'ROE negatif berarti perusahaan merugi relatif terhadap modal pemiliknya.' : `Artinya, setiap Rp100 modal pemilik menghasilkan sekitar Rp${num(m.value * 100, 1)} laba per tahun.`,
  ].filter(Boolean).join(' ');
  return { q, a, task: 'roe' };
}

// ---------- T2 ROA ----------
function tROA(sc, rng) {
  const m = metricsOf(sc).roa;
  if (m.value == null || fp(sc, 'total_assets') == null) return null;
  const ni = f(sc, 'net_income');
  const a0 = fp(sc, 'total_assets');
  const a1 = f(sc, 'total_assets');
  const avg = (a0 + a1) / 2;
  const annual = ni * sc.period.factor;
  const q = rng.pick([
    `${sc.name} mencatat laba bersih ${j(ni)} untuk ${sc.period.label}. Total aset ${j(a0)} pada 31 Desember 2024 dan ${j(a1)} pada ${sc.period.end}. Berapa ROA-nya?`,
    `Berapa ROA ${sc.name} jika laba bersih ${sc.period.label} ${j(ni)}, total aset awal ${j(a0)}, dan total aset akhir ${j(a1)}?`,
    `Tolong hitung ROA dari data ini (juta Rupiah): laba bersih ${num(ni)} (${sc.period.label}), total aset awal tahun ${num(a0)}, total aset akhir periode ${num(a1)}.`,
  ]);
  const a = [
    `Rata-rata total aset = (${num(a0)} + ${num(a1)}) ÷ 2 = ${j(Math.round(avg))}.`,
    annualNote(sc),
    sc.periodType === 'FY' ? '' : `Laba disetahunkan = ${num(ni)} ${sc.period.factorText} = ${j(Math.round(annual))}.`,
    `ROA = ${num(Math.round(annual))} ÷ ${num(Math.round(avg))} = ${m.display}.`,
    statusSentence('roa', m),
  ].filter(Boolean).join(' ');
  return { q, a, task: 'roa' };
}

// ---------- T3 margin laba bersih ----------
function tNetMargin(sc, rng) {
  const m = metricsOf(sc).net_margin;
  if (m.value == null) return null;
  const ni = f(sc, 'net_income');
  const rev = f(sc, 'revenue');
  const q = rng.pick([
    `Pendapatan ${sc.name} ${sc.period.label} ${j(rev)} dan laba bersihnya ${j(ni)}. Berapa margin laba bersihnya?`,
    `Hitung net margin: pendapatan ${j(rev)}, laba bersih ${j(ni)}.`,
    `${sc.name} punya pendapatan ${rpScale(rev)} dan laba bersih ${rpScale(ni)} pada ${sc.period.label}. Bagaimana margin laba bersihnya?`,
  ]);
  const a = [
    `Margin laba bersih = laba bersih ÷ pendapatan = ${num(ni)} ÷ ${num(rev)} = ${m.display}.`,
    'Rasio ini tidak perlu disetahunkan karena laba dan pendapatan berasal dari periode yang sama.',
    statusSentence('net_margin', m),
    m.value < 0 ? 'Margin negatif berarti beban total melebihi pendapatan pada periode ini.' : `Artinya, dari setiap Rp100 pendapatan tersisa sekitar Rp${num(m.value * 100, 1)} sebagai laba bersih.`,
  ].filter(Boolean).join(' ');
  return { q, a, task: 'net_margin' };
}

// ---------- T4 current ratio ----------
function tCurrentRatio(sc, rng) {
  const m = metricsOf(sc).current_ratio;
  if (m.value == null) return null;
  const ca = f(sc, 'current_assets');
  const cl = f(sc, 'current_liabilities');
  const q = rng.pick([
    `Aset lancar ${sc.name} per ${sc.period.end} ${j(ca)} dan liabilitas jangka pendeknya ${j(cl)}. Berapa current ratio-nya?`,
    `Bagaimana likuiditas ${sc.name} bila aset lancar ${j(ca)} dan liabilitas jangka pendek ${j(cl)}?`,
    `Hitung rasio lancar: aset lancar ${num(ca)}, liabilitas jangka pendek ${num(cl)} (juta Rupiah).`,
  ]);
  const a = [
    `Current ratio = aset lancar ÷ liabilitas jangka pendek = ${num(ca)} ÷ ${num(cl)} = ${m.display}.`,
    statusSentence('current_ratio', m),
    m.value < 1
      ? 'Nilai di bawah 1x berarti aset lancar tidak cukup menutup seluruh kewajiban jangka pendek bila semuanya jatuh tempo bersamaan.'
      : `Artinya, setiap Rp1 liabilitas jangka pendek dijamin sekitar Rp${num(m.value, 2)} aset lancar.`,
  ].filter(Boolean).join(' ');
  return { q, a, task: 'current_ratio' };
}

// ---------- T5 liabilitas terhadap ekuitas ----------
function tDER(sc, rng) {
  const m = metricsOf(sc).der;
  if (m.value == null) return null;
  const tl = f(sc, 'total_liabilities');
  const te = f(sc, 'total_equity');
  const q = rng.pick([
    `Total liabilitas ${sc.name} ${j(tl)} dan total ekuitas ${j(te)} per ${sc.period.end}. Berapa rasio liabilitas terhadap ekuitasnya?`,
    `Hitung DER ${sc.name} dengan total liabilitas ${j(tl)} dan ekuitas ${j(te)}.`,
    `Liabilitas ${rpScale(tl)}, ekuitas ${rpScale(te)}. Berapa liabilitas terhadap ekuitasnya dan apa artinya?`,
  ]);
  const a = [
    `Liabilitas terhadap ekuitas = total liabilitas ÷ total ekuitas = ${num(tl)} ÷ ${num(te)} = ${m.display}.`,
    statusSentence('der', m),
    `Artinya, setiap Rp1 modal pemilik diimbangi sekitar Rp${num(m.value, 2)} kewajiban.`,
    'Rasio ini memakai total liabilitas, sehingga bisa lebih tinggi daripada DER versi utang berbunga yang sering dipakai situs data saham.',
  ].filter(Boolean).join(' ');
  return { q, a, task: 'der' };
}

// ---------- T6 liabilitas terhadap aset ----------
function tLA(sc, rng) {
  const m = metricsOf(sc).liability_to_asset;
  if (m.value == null) return null;
  const tl = f(sc, 'total_liabilities');
  const ta = f(sc, 'total_assets');
  const q = rng.pick([
    `Total liabilitas ${sc.name} ${j(tl)} dan total asetnya ${j(ta)}. Berapa persen aset yang dibiayai kewajiban?`,
    `Hitung rasio liabilitas terhadap aset: liabilitas ${num(tl)}, aset ${num(ta)} (juta Rupiah).`,
    `Bagaimana struktur pendanaan ${sc.name} bila liabilitas ${rpScale(tl)} dan aset ${rpScale(ta)}?`,
  ]);
  const a = [
    `Liabilitas terhadap aset = ${num(tl)} ÷ ${num(ta)} = ${m.display}.`,
    `Artinya, sekitar ${m.display} aset dibiayai kewajiban dan sisanya oleh ekuitas.`,
    statusSentence('liability_to_asset', m),
  ].filter(Boolean).join(' ');
  return { q, a, task: 'liability_to_asset' };
}

// ---------- T7 pertumbuhan pendapatan ----------
function tRevGrowth(sc, rng) {
  const m = metricsOf(sc).revenue_growth;
  const r1 = f(sc, 'revenue');
  const r0 = fp(sc, 'revenue');
  if (r0 == null) return null;
  const q = rng.pick([
    `Pendapatan ${sc.name} ${sc.period.label} ${j(r1)}, sedangkan ${sc.period.flowPrior} ${j(r0)}. Berapa pertumbuhan pendapatannya?`,
    `Hitung pertumbuhan pendapatan YoY: ${sc.period.label} ${num(r1)}, ${sc.period.flowPrior} ${num(r0)} (juta Rupiah).`,
    `Apakah pendapatan ${sc.name} tumbuh? ${sc.period.label}: ${rpScale(r1)}; ${sc.period.flowPrior}: ${rpScale(r0)}.`,
  ]);
  if (m.value == null) {
    return { q, a: 'Pertumbuhan pendapatan tidak dihitung karena pendapatan periode pembanding nol atau negatif, sehingga persentasenya tidak bermakna.', task: 'revenue_growth' };
  }
  const a = [
    `Pertumbuhan pendapatan = ${num(r1)} ÷ ${num(r0)} − 1 = ${m.display}, dibandingkan periode yang sama tahun lalu.`,
    statusSentence('revenue_growth', m),
    m.value < 0 ? 'Nilai negatif berarti pendapatan turun dibanding periode yang sama tahun lalu.' : '',
  ].filter(Boolean).join(' ');
  return { q, a, task: 'revenue_growth' };
}

// ---------- T8 pertumbuhan laba ----------
function tEarnGrowth(sc, rng) {
  const m = metricsOf(sc).earnings_growth;
  const n1 = f(sc, 'net_income_parent');
  const n0 = fp(sc, 'net_income_parent');
  if (n0 == null) return null;
  const q = rng.pick([
    `Laba pemilik entitas induk ${sc.name} ${sc.period.label} ${j(n1)}, sedangkan ${sc.period.flowPrior} ${j(n0)}. Berapa pertumbuhan labanya?`,
    `Hitung pertumbuhan laba: ${sc.period.label} ${num(n1)}, ${sc.period.flowPrior} ${num(n0)} (juta Rupiah, laba pemilik entitas induk).`,
    `Laba ${sc.name} berubah dari ${rpScale(n0)} menjadi ${rpScale(n1)}. Berapa persen pertumbuhannya?`,
  ]);
  if (m.value == null) {
    return {
      q,
      a: `Pertumbuhan laba tidak dihitung karena laba pembandingnya ${n0 === 0 ? 'nol' : 'negatif'} (${j(n0)}). Persentase pertumbuhan dari angka negatif bisa menyesatkan, jadi lebih tepat membandingkan nilainya secara langsung: laba berubah dari ${j(n0)} menjadi ${j(n1)}.`,
      task: 'earnings_growth',
    };
  }
  const a = [
    `Pertumbuhan laba = ${num(n1)} ÷ ${num(n0)} − 1 = ${m.display}.`,
    statusSentence('earnings_growth', m),
  ].filter(Boolean).join(' ');
  return { q, a, task: 'earnings_growth' };
}

// ---------- T9 konversi kas ----------
function tCashConv(sc, rng) {
  const m = metricsOf(sc).cash_conversion;
  const ocf = f(sc, 'operating_cash_flow');
  const ni = f(sc, 'net_income');
  const q = rng.pick([
    `Arus kas operasi ${sc.name} ${sc.period.label} ${j(ocf)} dan laba bersihnya ${j(ni)}. Bagaimana kualitas labanya dilihat dari kas?`,
    `Hitung konversi kas: arus kas operasi ${num(ocf)}, laba bersih ${num(ni)} (juta Rupiah).`,
    `Apakah laba ${sc.name} benar-benar menjadi kas? Arus kas operasi ${rpScale(ocf)}, laba bersih ${rpScale(ni)}.`,
  ]);
  if (m.value == null) {
    return {
      q,
      a: `Konversi kas tidak dihitung karena laba bersihnya ${ni === 0 ? 'nol' : 'negatif'}. Yang bisa dibaca: arus kas operasi ${ocf >= 0 ? 'positif' : 'negatif'} ${j(ocf)}, ${ocf >= 0 ? 'jadi kegiatan usaha masih menghasilkan kas walaupun perusahaan merugi' : 'jadi kegiatan usaha sedang menyerap kas'}.`,
      task: 'cash_conversion',
    };
  }
  const a = [
    `Konversi kas = arus kas operasi ÷ laba bersih = ${num(ocf)} ÷ ${num(ni)} = ${m.display}.`,
    statusSentence('cash_conversion', m),
    m.value >= 1 ? 'Nilai di atas 1x berarti kas dari operasi lebih besar dari laba bersih yang dilaporkan.' : 'Nilai di bawah 1x berarti sebagian laba belum menjadi kas, misalnya karena piutang atau persediaan naik.',
  ].filter(Boolean).join(' ');
  return { q, a, task: 'cash_conversion' };
}

// ---------- T10 valuasi (EPS, BVPS, PER, PBV, Graham) ----------
function tValuation(sc, rng) {
  const nip = f(sc, 'net_income_parent');
  const eq = f(sc, 'equity_parent');
  if (!(nip > 0) || !(eq > 0)) return null;
  const bvpsTarget = Math.exp(rng.float(Math.log(80), Math.log(6000)));
  const shares = Math.round((eq * 1e6) / bvpsTarget / 1e5) * 1e5;
  if (shares <= 0) return null;
  const bvps = (eq * 1e6) / shares;
  const priceRaw = bvps * Math.exp(rng.float(Math.log(0.4), Math.log(4)));
  const tick = priceRaw < 200 ? 1 : priceRaw < 500 ? 2 : priceRaw < 2000 ? 5 : priceRaw < 5000 ? 10 : 25;
  const price = Math.max(tick, Math.round(priceRaw / tick) * tick);
  const fields = { ...sc.fields, issued_and_paid_shares: { value: shares, prior: null } };
  const v = computeValuation({ fields, entity: { period_type: sc.periodType, unit: 'juta IDR', currency: 'IDR' }, market: { price } });
  if (v.per.value == null || v.fair_value.value == null) return null;
  // Buang kasus ekstrem yang tidak realistis untuk latihan (laba sangat tipis -> PER ratusan kali)
  if (v.per.value < 2 || v.per.value > 80 || Math.abs(v.premium_discount.value) > 1.5 || v.eps.value < 1) return null;
  const q = rng.pick([
    `${sc.name}: laba pemilik entitas induk ${sc.period.label} ${j(nip)}, ekuitas pemilik entitas induk ${j(eq)}, jumlah saham ${num(shares)} lembar, harga saham ${rp(price)}. Hitung EPS, BVPS, PER, PBV, dan nilai wajar Graham-nya.`,
    `Berapa PER dan PBV ${sc.name} pada harga ${rp(price)}? Laba pemilik entitas induk ${num(nip)} juta (${sc.period.label}), ekuitas pemilik entitas induk ${num(eq)} juta, saham beredar ${num(shares)} lembar.`,
    `Apakah harga ${rp(price)} di atas atau di bawah nilai wajar Graham? Data: laba pemilik entitas induk ${j(nip)} (${sc.period.label}), ekuitas pemilik entitas induk ${j(eq)}, ${num(shares)} lembar saham.`,
  ]);
  const above = v.premium_discount.value >= 0;
  const a = [
    sc.periodType === 'FY'
      ? `EPS = ${num(nip)} juta ÷ ${num(shares)} lembar = ${v.eps.display}.`
      : `EPS disetahunkan = (${num(nip)} juta ${sc.period.factorText}) ÷ ${num(shares)} lembar = ${v.eps.display}.`,
    `BVPS = ${num(eq)} juta ÷ ${num(shares)} lembar = ${v.bvps.display}.`,
    `PER = ${rp(price)} ÷ EPS = ${v.per.display}; PBV = ${rp(price)} ÷ BVPS = ${v.pbv.display}.`,
    `Nilai wajar Graham = √(22,5 × EPS × BVPS) = ${v.fair_value.display}, sehingga harga ${above ? 'berada di atas' : 'berada di bawah'} nilai wajar Graham sebesar ${v.premium_discount.display.replace(/^[+−-]/, '')}.`,
    'Graham Number adalah estimasi konservatif, bukan target harga, dan bukan saran membeli atau menjual.',
  ].join(' ');
  return { q, a, task: 'valuation' };
}

// ---------- T11 cek persamaan neraca ----------
function tBalance(sc, rng) {
  const tl = f(sc, 'total_liabilities');
  const te = f(sc, 'total_equity');
  let ta = f(sc, 'total_assets');
  const broken = rng.chance(0.5);
  const syirkah = rng.chance(0.15) ? Math.round(Math.abs(tl) * rng.float(0.02, 0.1)) : 0;
  ta = tl + te + syirkah;
  if (broken) ta += rng.pick([1, -1]) * Math.round(Math.abs(ta) * rng.float(0.003, 0.08));
  const rhs = tl + te + syirkah;
  const diff = ta - rhs;
  const q = `Neraca ${sc.name} per ${sc.period.end} (juta Rupiah): total aset ${num(ta)}, total liabilitas ${num(tl)}${syirkah ? `, dana syirkah temporer ${num(syirkah)}` : ''}, total ekuitas ${num(te)}. Apakah neracanya seimbang?`;
  const a = diff === 0
    ? `Seimbang. Liabilitas${syirkah ? ' + dana syirkah temporer' : ''} + ekuitas = ${num(rhs)}, sama dengan total aset ${num(ta)}.`
    : `Tidak seimbang. Liabilitas${syirkah ? ' + dana syirkah temporer' : ''} + ekuitas = ${num(rhs)}, sedangkan total aset ${num(ta)}, selisih ${num(Math.abs(diff))} juta. Kemungkinan ada angka yang salah terbaca atau pos yang terlewat; periksa kembali halaman neraca sebelum menghitung rasio.`;
  return { q, a, task: 'balance_check' };
}

// ---------- T12 satuan ----------
function tUnits(sc, rng) {
  const key = rng.pick(['total_assets', 'revenue', 'total_equity', 'net_income']);
  const label = { total_assets: 'total aset', revenue: 'pendapatan', total_equity: 'total ekuitas', net_income: 'laba bersih' }[key];
  const v = f(sc, key);
  const thousands = rng.chance(0.3);
  const shown = thousands ? v * 1000 : v;
  const q = `Laporan ${sc.name} disajikan dalam ${thousands ? 'ribuan' : 'jutaan'} Rupiah. Angka ${label} tertulis ${num(shown)}. Berapa nilai sebenarnya?`;
  const a = `Karena satuannya ${thousands ? 'ribuan' : 'jutaan'} Rupiah, ${num(shown)} berarti ${rp(v * 1e6)}, atau sekitar ${rpScale(v)}. Rasio tidak terpengaruh satuan, tetapi perhitungan per saham seperti EPS dan BVPS harus memakai nilai penuh ini.`;
  return { q, a, task: 'units' };
}

// ---------- T13 ringkasan eksekutif (gaya narasi v6) ----------
const LABEL = {
  roe: 'ROE', roa: 'ROA', net_margin: 'margin laba bersih', current_ratio: 'current ratio', der: 'liabilitas terhadap ekuitas',
  liability_to_asset: 'liabilitas terhadap aset', revenue_growth: 'pertumbuhan pendapatan', earnings_growth: 'pertumbuhan laba pemilik entitas induk',
  cash_conversion: 'arus kas operasi terhadap laba bersih',
};
const join = (xs) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')}, dan ${xs[xs.length - 1]}`);
function tSummary(sc, rng) {
  const metrics = metricsOf(sc);
  const tiering = assignTier(metrics);
  const ticker = sc.name.replace(/^PT /, '').replace(/ Tbk$/, '');
  const result = { entity: { ticker, period_type: sc.periodType, period_end: '2025' }, fields: sc.fields, metrics, tiering, valuation: {}, market: null, validation: { needs_review: false } };
  const input = buildInput(result);
  const items = Object.keys(LABEL)
    .filter((k) => metrics[k]?.value != null && metrics[k].status)
    .map((k) => ({ k, s: metrics[k].status, t: `${LABEL[k]} ${metrics[k].display}` }));
  if (items.length < 5) return null;
  const tableLines = items.map((i) => `- ${LABEL[i.k]}: ${metrics[i.k].display} (${i.s})`);
  if (tiering.tier) tableLines.push(`- tier performa: ${tiering.tier} (model ${tiering.model_version})`);
  const q = rng.pick([
    `Buat ringkasan eksekutif satu paragraf untuk ${ticker} (${sc.period.label}) dari data berikut, tanpa saran investasi:\n${tableLines.join('\n')}`,
    `Tulis ringkasan kinerja keuangan ${ticker} berdasarkan rasio ini:\n${tableLines.join('\n')}`,
    `Rangkum kondisi keuangan ${ticker} dalam satu paragraf:\n${tableLines.join('\n')}`,
  ]);
  const by = { sehat: [], waspada: [], lemah: [] };
  for (const i of items) by[i.s].push(i.t);
  const opening = { high: 'kinerja keuangan yang relatif kuat', mid: 'kinerja keuangan yang cukup baik dengan beberapa hal yang perlu dicermati', low: 'kinerja keuangan yang relatif lemah' }[tiering.tier] ?? 'kinerja keuangan dengan gambaran yang beragam';
  const s = [];
  s.push(by.sehat.length ? `${ticker} menunjukkan ${opening}, ${rng.pick(['didukung', 'ditopang'])} ${join(by.sehat)} yang ${rng.pick(['sehat', 'tergolong sehat', 'solid'])}.` : `${ticker} menunjukkan ${opening}.`);
  if (by.waspada.length) s.push(`${rng.pick(['Namun', 'Di sisi lain'])}, ${join(by.waspada)} ${rng.pick(['masih perlu diperhatikan', 'menunjukkan perlunya kewaspadaan'])}.`);
  if (by.lemah.length) s.push(`${join(by.lemah)} masih lemah.`.replace(/^./, (c) => c.toUpperCase()));
  if (tiering.tier) s.push(`Berdasarkan model klaster ${tiering.model_version}, ${ticker} berada pada tier ${tiering.tier} dibandingkan emiten non-keuangan BEI periode Q1 2025.`);
  s.push(
    sc.periodType === 'FY'
      ? 'Valuasi belum dapat dinilai karena harga saham tidak tersedia dalam data ini.'
      : 'Valuasi belum dapat dinilai karena harga saham tidak tersedia, dan rasio berbasis laba disetahunkan dari laporan interim.'
  );
  // Setiap kalimat harus lolos pemeriksa narasi aplikasi (angka, status, tier)
  for (const sent of s) if (checkQualitativeSentence(sent, input, { allowNumbers: true })) return null;
  return { q, a: s.join(' '), task: 'summary' };
}

// ---------- T14 interpretasi status ----------
const PCT_KEYS = new Set(['roe', 'roa', 'net_margin', 'liability_to_asset', 'revenue_growth', 'earnings_growth']);
function tStatus(sc, rng) {
  const key = rng.pick(['roe', 'roa', 'net_margin', 'current_ratio', 'der', 'liability_to_asset', 'revenue_growth', 'cash_conversion']);
  const m = metricsOf(sc)[key];
  if (m?.value == null) return null;
  const cfg = thresholds[key];
  const st = evaluateStatus(m.value, cfg);
  const q = rng.pick([`${LABEL[key][0].toUpperCase()}${LABEL[key].slice(1)} sebuah emiten ${m.display}. Statusnya apa menurut TelusurFin?`, `Kalau ${LABEL[key]} ${m.display}, termasuk sehat, waspada, atau lemah?`]);
  const a = `Statusnya ${st}. ${thresholdText(key)} ${cfg.direction === 'lower_better' ? 'Untuk rasio ini, makin rendah makin baik.' : 'Untuk rasio ini, makin tinggi makin baik.'} Ambang ini umum lintas sektor, jadi sebaiknya dibandingkan juga dengan perusahaan sejenis.`;
  return { q, a, task: 'status' };
}

// ---------- T15 kejujuran: data tidak tersedia ----------
function tHonesty(sc, rng) {
  const asks = [
    ['tren ROE lima tahun terakhir', 'tren lima tahun'],
    ['dividen yang dibagikan tahun ini', 'dividen'],
    ['rasio utang berbunga', 'rincian utang berbunga'],
    ['proyeksi laba tahun depan', 'proyeksi'],
    ['harga sahamnya hari ini', 'harga saham'],
  ];
  const [ask, what] = rng.pick(asks);
  const q = `Dari laporan ${sc.name} ${sc.period.label} yang hanya memuat periode berjalan dan pembandingnya, berapa ${ask}?`;
  const a = {
    'tren lima tahun': 'Data yang tersedia hanya periode berjalan dan satu periode pembanding, jadi tren lima tahun tidak bisa disimpulkan. Yang bisa dihitung adalah perubahan terhadap periode pembanding, misalnya pertumbuhan pendapatan dan laba secara tahunan.',
    dividen: 'Laporan ini tidak cukup untuk menjawabnya. Informasi dividen biasanya ada di laporan perubahan ekuitas, catatan, atau pengumuman aksi korporasi, dan angka yang tidak ada di data sebaiknya tidak ditebak.',
    'rincian utang berbunga': 'Rasio utang berbunga membutuhkan rincian pinjaman bank, obligasi, dan liabilitas sewa dari catatan atas laporan keuangan. Dengan data total liabilitas saja, yang bisa dihitung adalah liabilitas terhadap ekuitas dan liabilitas terhadap aset.',
    proyeksi: 'Laporan keuangan mencatat kinerja yang sudah terjadi, jadi proyeksi laba tahun depan tidak bisa diambil dari data ini. Proyeksi membutuhkan asumsi tambahan dan tidak termasuk analisis TelusurFin.',
    'harga saham': 'Harga saham tidak tercantum di laporan keuangan. Harga perlu diambil dari data bursa atau diisi manual sebelum PER, PBV, dan nilai wajar Graham bisa dibandingkan.',
  }[what];
  return { q, a, task: 'honesty' };
}

// ---------- T16 ekuitas negatif / rugi ----------
function tLoss(sc, rng) {
  const ni = f(sc, 'net_income');
  if (ni >= 0) return null;
  const m = metricsOf(sc);
  const q = `${sc.name} rugi bersih ${j(Math.abs(ni))} pada ${sc.period.label}. Bagaimana membaca ROE, margin, dan konversi kasnya?`;
  const a = [
    m.roe.value != null ? `ROE ${m.roe.display} dan margin laba bersih ${m.net_margin.display ?? '—'} bernilai negatif, artinya perusahaan merugi relatif terhadap modal dan pendapatannya.` : 'Karena perusahaan merugi, ROE dan margin laba bersih bernilai negatif.',
    'Konversi kas tidak dihitung saat laba bersih negatif karena hasil pembagiannya tidak bermakna.',
    `Yang lebih berguna dibaca adalah arus kas operasi (${j(f(sc, 'operating_cash_flow'))}) dan apakah kerugian ini berulang dibanding periode pembanding.`,
  ].join(' ');
  return { q, a, task: 'loss' };
}

// ---------- T17 bandingkan dua perusahaan ----------
function tCompare(sc, rng, sc2) {
  if (!sc2) return null;
  const key = rng.pick(['current_ratio', 'der', 'net_margin', 'liability_to_asset']);
  const m1 = metricsOf(sc)[key];
  const m2 = metricsOf(sc2)[key];
  if (m1?.value == null || m2?.value == null || m1.display === m2.display) return null;
  const nameA = 'Perusahaan A';
  const nameB = 'Perusahaan B';
  const inputs = {
    current_ratio: (s) => `aset lancar ${j(f(s, 'current_assets'))}, liabilitas jangka pendek ${j(f(s, 'current_liabilities'))}`,
    der: (s) => `total liabilitas ${j(f(s, 'total_liabilities'))}, total ekuitas ${j(f(s, 'total_equity'))}`,
    net_margin: (s) => `pendapatan ${j(f(s, 'revenue'))}, laba bersih ${j(f(s, 'net_income'))}`,
    liability_to_asset: (s) => `total liabilitas ${j(f(s, 'total_liabilities'))}, total aset ${j(f(s, 'total_assets'))}`,
  }[key];
  const question = { current_ratio: 'Mana yang lebih likuid?', der: 'Mana yang struktur permodalannya lebih longgar?', net_margin: 'Mana yang lebih efisien menghasilkan laba dari pendapatan?', liability_to_asset: 'Mana yang lebih sedikit dibiayai kewajiban?' }[key];
  const higherBetter = thresholds[key].direction !== 'lower_better';
  const aBetter = higherBetter ? m1.value > m2.value : m1.value < m2.value;
  const q = `${nameA}: ${inputs(sc)}. ${nameB}: ${inputs(sc2)}. ${question}`;
  const a = `${LABEL[key][0].toUpperCase()}${LABEL[key].slice(1)} ${nameA} ${m1.display}${m1.status ? ` (${m1.status})` : ''} dan ${nameB} ${m2.display}${m2.status ? ` (${m2.status})` : ''}. Berdasarkan rasio ini, ${aBetter ? nameA : nameB} lebih baik karena ${higherBetter ? 'nilainya lebih tinggi' : 'nilainya lebih rendah'}. Perbandingan ini sebaiknya dibaca bersama sektor usaha dan rasio lain, karena satu rasio tidak menggambarkan seluruh kondisi perusahaan.`;
  return { q, a, task: 'compare' };
}

export const DATA_TASKS = [
  { fn: tROE, weight: 8 }, { fn: tROA, weight: 7 }, { fn: tNetMargin, weight: 6 }, { fn: tCurrentRatio, weight: 6 },
  { fn: tDER, weight: 6 }, { fn: tLA, weight: 5 }, { fn: tRevGrowth, weight: 5 }, { fn: tEarnGrowth, weight: 5 },
  { fn: tCashConv, weight: 5 }, { fn: tValuation, weight: 10 }, { fn: tBalance, weight: 5 }, { fn: tUnits, weight: 3 },
  { fn: tSummary, weight: 13 }, { fn: tStatus, weight: 4 }, { fn: tHonesty, weight: 2 }, { fn: tLoss, weight: 2 },
  { fn: tCompare, weight: 5 },
];

export function generateDataItem(rows, rng) {
  const total = DATA_TASKS.reduce((s, t) => s + t.weight, 0);
  for (let attempt = 0; attempt < 20; attempt++) {
    let r = rng.next() * total;
    const t = DATA_TASKS.find((x) => (r -= x.weight) < 0) ?? DATA_TASKS[0];
    const row = rng.pick(rows);
    const sc = makeScenario(row, rng);
    if (!sc) continue;
    const sc2 = t.fn === tCompare ? makeScenario(rng.pick(rows), rng, { periodType: sc.periodType }) : null;
    const item = t.fn(sc, rng, sc2);
    if (item) return { ...item, source_ticker: row.ticker };
  }
  return null;
}
