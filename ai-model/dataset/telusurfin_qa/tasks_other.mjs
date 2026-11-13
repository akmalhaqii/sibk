// Kamus (glossary.json TelusurFin), konsep (bank tulisan sendiri), dan penolakan.
import fs from 'node:fs';
import path from 'node:path';
import { thresholdText } from '../../../backend/src/chat/glossary.js';
import { ROOT, num, pct, mult } from './lib.mjs';
import { CONCEPTS_A } from './concepts_a.mjs';
import { CONCEPTS_B } from './concepts_b.mjs';
import { CONCEPTS_C } from './concepts_c.mjs';

export const GLOSSARY = JSON.parse(fs.readFileSync(path.join(ROOT, 'backend', 'config', 'glossary.json'), 'utf8')).entries;
export const CONCEPTS = [...CONCEPTS_A, ...CONCEPTS_B, ...CONCEPTS_C];

// ================= KAMUS =================
const Q_DEF = [
  'Apa itu {t}?', 'Apa yang dimaksud dengan {t}?', '{t} itu apa?', 'Jelaskan {t}.', 'Pengertian {t} apa?', 'Arti {t} apa?',
  'Bisa jelaskan {t} dengan bahasa sederhana?', 'Saya baru belajar laporan keuangan, {t} itu apa?', 'Definisi {t} menurut TelusurFin apa?',
  'Tolong jelaskan maksud {t}.', '{t}?', 'Apa sih {t}?', 'Bisa dijelaskan apa itu {t}?', 'Mohon penjelasan tentang {t}.',
];
const Q_FORMULA = ['Bagaimana rumus {t}?', 'Cara menghitung {t} bagaimana?', 'Rumus {t} di TelusurFin apa?', '{t} dihitung dari apa saja?', 'Bagaimana cara hitung {t}?'];
const Q_THRESH = ['Berapa {t} yang dianggap sehat?', 'Ambang status {t} di TelusurFin berapa?', 'Kapan {t} dianggap lemah?', '{t} yang bagus itu berapa?'];
const Q_WHY = ['Kenapa {t} penting?', 'Untuk apa melihat {t}?', 'Apa gunanya {t} dalam analisis?'];
const Q_NOTE = ['Apa yang perlu diperhatikan soal {t} di TelusurFin?', 'Kenapa {t} di TelusurFin bisa beda dengan situs lain?', 'Apa catatan penting tentang {t}?'];

// Kalimat contoh perhitungan untuk istilah berbasis metrik (angka acak, dihitung di sini)
function example(entry, rng) {
  const k = entry.metric_key;
  const big = () => rng.int(200, 90000) * 100;
  switch (k) {
    case 'roe': {
      const l = big(); const e = l * rng.float(3, 25);
      return `Contoh: laba pemilik entitas induk setahun ${num(l)} juta dan rata-rata ekuitas pemilik entitas induk ${num(Math.round(e))} juta menghasilkan ROE ${pct(l / Math.round(e))}.`;
    }
    case 'roa': {
      const l = big(); const a = l * rng.float(8, 60);
      return `Contoh: laba bersih setahun ${num(l)} juta dan rata-rata aset ${num(Math.round(a))} juta menghasilkan ROA ${pct(l / Math.round(a))}.`;
    }
    case 'net_margin': case 'operating_margin': {
      const r = big(); const l = Math.round(r * rng.float(0.02, 0.25));
      return `Contoh: laba ${num(l)} juta dari pendapatan ${num(r)} juta berarti margin ${pct(l / r)}.`;
    }
    case 'current_ratio': {
      const cl = big(); const ca = Math.round(cl * rng.float(0.6, 2.8));
      return `Contoh: aset lancar ${num(ca)} juta dan liabilitas jangka pendek ${num(cl)} juta menghasilkan current ratio ${mult(ca / cl)}.`;
    }
    case 'der': {
      const e = big(); const l = Math.round(e * rng.float(0.2, 2.5));
      return `Contoh: total liabilitas ${num(l)} juta dan total ekuitas ${num(e)} juta menghasilkan liabilitas terhadap ekuitas ${mult(l / e)}.`;
    }
    case 'liability_to_asset': {
      const a = big(); const l = Math.round(a * rng.float(0.15, 0.8));
      return `Contoh: liabilitas ${num(l)} juta dari total aset ${num(a)} juta berarti ${pct(l / a)} aset dibiayai kewajiban.`;
    }
    case 'revenue_growth': case 'earnings_growth': {
      const p = big(); const c = Math.round(p * rng.float(0.7, 1.4));
      return `Contoh: dari ${num(p)} juta menjadi ${num(c)} juta berarti pertumbuhan ${pct(c / p - 1)}.`;
    }
    case 'cash_conversion': {
      const l = big(); const o = Math.round(l * rng.float(0.3, 2.2));
      return `Contoh: arus kas operasi ${num(o)} juta dibanding laba bersih ${num(l)} juta menghasilkan konversi kas ${mult(o / l)}.`;
    }
    default:
      return null;
  }
}

function glossaryAnswer(entry, kind, rng) {
  const parts = [`${entry.term}: ${entry.definisi}`];
  const rumus = entry.rumus ? `Rumus: ${entry.rumus}.` : null;
  const th = entry.metric_key ? thresholdText(entry.metric_key) : null;
  const note = entry.catatan_proyek && entry.catatan_proyek !== '-' ? entry.catatan_proyek : null;
  if (kind === 'def') parts.push(rumus, rng.chance(0.5) ? th : null, note);
  if (kind === 'formula') parts.push(rumus ?? 'Istilah ini tidak memiliki rumus tunggal.', example(entry, rng), note && rng.chance(0.5) ? note : null);
  if (kind === 'thresh') parts.push(th ?? 'TelusurFin tidak memberi status sehat/waspada/lemah untuk istilah ini.', rumus);
  if (kind === 'why') parts.push(rumus, note);
  if (kind === 'note') parts.push(note ?? 'Tidak ada catatan khusus selain definisi di atas.', rumus);
  return parts.filter(Boolean).join(' ');
}

const PAIRS = [
  ['ROE', 'ROA', 'ROE mengukur laba terhadap modal pemilik, sedangkan ROA mengukur laba terhadap seluruh aset, baik yang dibiayai modal maupun utang. Selisih besar antara keduanya biasanya menandakan perusahaan memakai banyak liabilitas.'],
  ['Liabilitas terhadap ekuitas', 'Liabilitas terhadap aset', 'Keduanya mengukur porsi kewajiban. Liabilitas terhadap ekuitas membandingkan kewajiban dengan modal pemilik (bisa di atas 1x), sedangkan liabilitas terhadap aset menunjukkan persentase aset yang dibiayai kewajiban (di bawah 100% bila ekuitas positif).'],
  ['Margin laba bersih', 'Margin usaha', 'Margin usaha dihitung dari laba usaha, sebelum beban keuangan dan pajak. Margin laba bersih dihitung dari laba setelah semua beban. Bila margin usaha jauh lebih tinggi daripada margin bersih, beban bunga atau pajaknya besar.'],
  ['Nilai wajar Graham', 'Target harga analis', 'Nilai wajar Graham dihitung dari EPS dan BVPS di laporan keuangan dengan rumus √(22,5 × EPS × BVPS). Target harga analis adalah perkiraan harga 12 bulan ke depan yang memakai proyeksi dan ekspektasi pasar. Keduanya mengukur hal berbeda sehingga angkanya wajar berbeda.'],
  ['Disetahunkan', 'Laba 12 bulan terakhir (TTM)', 'Disetahunkan mengalikan laba satu periode, misalnya Q1 × 4. TTM menjumlahkan laba empat kuartal terakhir yang benar-benar terjadi. Untuk bisnis musiman, keduanya bisa berbeda cukup jauh.'],
  ['EPS', 'BVPS', 'EPS adalah laba pemilik entitas induk per lembar saham, sedangkan BVPS adalah ekuitas pemilik entitas induk per lembar saham. EPS dipakai untuk PER, BVPS untuk PBV, dan keduanya dipakai dalam rumus Graham.'],
  ['PER', 'PBV', 'PER membandingkan harga saham dengan laba per saham, sedangkan PBV membandingkan harga dengan nilai buku per saham. PER tidak bermakna saat perusahaan rugi, sementara PBV tetap bisa dihitung selama ekuitas positif.'],
  ['Konversi kas', 'Arus kas operasi terhadap aset', 'Konversi kas membandingkan arus kas operasi dengan laba bersih, untuk melihat kualitas laba. Arus kas operasi terhadap aset membandingkannya dengan aset, untuk melihat seberapa besar kas yang dihasilkan aset dan dipakai sebagai fitur model klaster.'],
  ['Pertumbuhan pendapatan', 'Pertumbuhan laba', 'Pertumbuhan pendapatan melihat perubahan penjualan, sedangkan pertumbuhan laba melihat perubahan laba pemilik entitas induk, keduanya dibanding periode yang sama tahun lalu. Laba bisa tumbuh lebih cepat atau lebih lambat daripada pendapatan, tergantung perubahan margin.'],
  ['Current ratio', 'Liabilitas terhadap ekuitas', 'Current ratio mengukur likuiditas jangka pendek: aset lancar dibanding liabilitas jangka pendek. Liabilitas terhadap ekuitas mengukur struktur permodalan secara keseluruhan. Perusahaan bisa likuid tetapi tetap banyak berutang, atau sebaliknya.'],
];
const Q_PAIR = ['Apa bedanya {a} dan {b}?', '{a} vs {b}, bedanya apa?', 'Bedakan {a} dengan {b}.', 'Kapan melihat {a} dan kapan {b}?', 'Mana yang lebih penting, {a} atau {b}?', 'Jelaskan perbedaan {a} dan {b}.', 'Kenapa {a} dan {b} bisa memberi kesan berbeda?', 'Saya bingung antara {a} dan {b}, bedanya apa?'];

export function generateGlossaryItems(rng) {
  const items = [];
  const groups = [['def', Q_DEF], ['formula', Q_FORMULA], ['thresh', Q_THRESH], ['why', Q_WHY], ['note', Q_NOTE]];
  for (const entry of GLOSSARY) {
    const aliases = entry.aliases.filter((a) => a.length > 2 && a.toLowerCase() !== entry.term.toLowerCase());
    const show = (name) => (/^[a-z/]+$/.test(name) && name.length <= 4 ? name.toUpperCase() : name);
    for (const [kind, templates] of groups) {
      if (kind === 'thresh' && !entry.metric_key) continue;
      // "Rumus" hanya untuk istilah yang memang punya rumus hitung
      if (kind === 'formula' && (!entry.rumus || entry.term === 'Tier performa')) continue;
      templates.forEach((tpl, ti) => {
        // Setiap templat dipakai dengan nama istilah resmi dan satu alias (bila ada)
        const names = [entry.term, ...(aliases.length ? [rng.pick(aliases)] : [])];
        names.forEach((name, ni) => {
          items.push({
            q: tpl.replace('{t}', show(name)),
            a: glossaryAnswer(entry, kind, rng),
            task: `glossary_${kind}`,
            key: `${entry.term}|${kind}|${ti}|${ni}`,
            holdoutTpl: ti === templates.length - 1,
          });
        });
      });
    }
  }
  for (const [a, b, ans] of PAIRS) {
    Q_PAIR.forEach((tpl, ti) => items.push({ q: tpl.replace('{a}', a).replace('{b}', b), a: ans, task: 'glossary_pair', key: `${a}|${b}|${ti}`, holdoutTpl: ti === Q_PAIR.length - 1 }));
  }
  return items;
}

// ================= KONSEP =================
const WRAP = [
  (q) => q,
  (q) => `Tolong jelaskan: ${q.charAt(0).toLowerCase()}${q.slice(1)}`,
  (q) => `Saya mahasiswa akuntansi. ${q}`,
  (q) => `Jawab singkat saja: ${q.charAt(0).toLowerCase()}${q.slice(1)}`,
  (q) => `${q} Jelaskan dengan bahasa sederhana.`,
];
const firstSentences = (t, n) => (t.match(/[^.!?]+[.!?]+(\s|$)/g) ?? [t]).slice(0, n).join('').trim();

export function generateConceptItems() {
  const items = [];
  for (const c of CONCEPTS) {
    c.q.forEach((q, qi) => {
      WRAP.forEach((w, wi) => {
        const a = wi === 3 ? firstSentences(c.a, 2) : c.a;
        // Holdout: varian "bahasa sederhana" dari pertanyaan ketiga (bentuk soal yang tidak dilihat saat latih)
        items.push({ q: w(q), a, task: `concept_${c.topic}`, key: `${c.id}|${qi}|${wi}`, holdoutTpl: qi === 2 && wi === 4 });
      });
    });
  }
  return items;
}

// ================= PENOLAKAN =================
const ADVICE_Q = [
  'Saham {T} layak dibeli sekarang?', 'Sebaiknya saya beli atau jual {T}?', 'Berapa target harga {T}?', 'Kapan waktu yang tepat masuk ke {T}?',
  'Kalau saya beli {T} di harga sekarang, bisa cuan berapa persen?', 'Rekomendasikan saham yang bagus untuk dibeli minggu ini.', 'Saham apa yang bakal naik besok?',
  'Saya punya Rp10 juta, sebaiknya beli saham apa?', 'Apakah {T} sudah murah untuk diakumulasi?', 'Kasih sinyal entry dan take profit untuk {T}.',
  'Lebih baik pegang {T} atau pindah ke saham lain?', 'Berapa stop loss yang pas untuk {T}?', 'Prediksi harga {T} akhir tahun berapa?',
  'Saya rugi di {T}, perlu average down tidak?', 'Kripto atau saham {T}, mana yang lebih cuan?', '{T} undervalued, jadi beli kan?',
  'Tolong pilihkan tiga saham untuk portofolio saya.', 'Apakah {T} aman untuk investasi jangka panjang?', 'Harga {T} turun terus, jual sekarang atau tahan?', 'Kalau nilai wajar Graham di atas harga, artinya wajib beli kan?',
];
const ADVICE_A = [
  'TelusurFin tidak memberi saran beli, jual, atau tahan, maupun target harga. Saya bisa membantu menjelaskan rasio keuangan, tier, valuasi, dan keterbatasan data {T} bila laporannya dianalisis di TelusurFin, sehingga Anda bisa menilai sendiri sesuai tujuan dan profil risiko Anda.',
  'Maaf, saya tidak dapat memberikan rekomendasi investasi atau prediksi harga. Yang bisa saya bantu adalah membaca kondisi keuangan {T} dari laporan keuangannya, misalnya profitabilitas, likuiditas, struktur permodalan, dan valuasi relatif terhadap harga yang Anda masukkan.',
  'Keputusan membeli atau menjual saham bergantung pada tujuan, horizon, dan profil risiko masing-masing, sehingga TelusurFin tidak memberi saran semacam itu. Saya bisa menjelaskan angka-angka di laporan keuangan {T} dan arti setiap rasionya agar keputusan Anda lebih terinformasi.',
  'Saya tidak bisa menentukan kapan harus membeli, menjual, atau berapa target harga. Nilai wajar Graham dan rasio di TelusurFin adalah alat bantu membaca laporan keuangan, bukan sinyal transaksi. Bila perlu nasihat investasi pribadi, pertimbangkan berkonsultasi dengan penasihat investasi yang berizin OJK.',
];
const NUMBER_Q = [
  'Berapa laba bersih {R} tahun 2024?', 'Berapa ROE {R} sekarang?', 'Berapa pendapatan {R} kuartal lalu?', 'Berapa total aset {R}?', 'Berapa DER {R} terbaru?',
  'Berapa EPS {R} tahun lalu?', 'Berapa dividen {R} tahun ini?', 'Berapa utang {R} sekarang?', 'Margin laba bersih {R} berapa?', 'Berapa PER {R} hari ini?',
];
const NUMBER_A = [
  'Saya tidak menyimpan data laporan keuangan emiten tertentu, dan angka dari ingatan model bisa keliru atau sudah usang. Untuk angka {R} yang akurat, unggah laporan keuangannya ke TelusurFin lalu gunakan mode Analisis emiten, karena setiap angka di sana diambil langsung dari laporan dan bisa dilacak ke halaman sumbernya.',
  'Angka spesifik {R} sebaiknya tidak diambil dari ingatan model. Silakan unggah laporan keuangan {R} periode yang Anda maksud ke TelusurFin; sistem akan mengekstrak angkanya dari dokumen dan menghitung rasionya dengan kode.',
  'Saya tidak bisa memastikan angka {R} tanpa laporan keuangannya. Laporan resmi emiten tersedia di situs BEI dan situs perusahaan; setelah diunggah ke TelusurFin, angka dan rasionya bisa dihitung serta dicek ke halaman sumber.',
];
const ILLEGAL = [
  ['Bagaimana cara menggoreng saham agar harganya naik?', 'Saya tidak bisa membantu manipulasi harga saham. Menggerakkan harga secara artifisial dilarang dalam peraturan pasar modal dan merugikan investor lain. Bila tertarik, saya bisa menjelaskan cara membaca laporan keuangan untuk membedakan kenaikan harga yang didukung kinerja.'],
  ['Saya punya info orang dalam soal akuisisi, boleh saya beli sahamnya dulu?', 'Bertransaksi berdasarkan informasi material yang belum diumumkan ke publik termasuk perdagangan orang dalam yang dilarang dan dapat dikenai sanksi. Saya tidak bisa membantu hal tersebut. Tunggu sampai informasinya diumumkan resmi melalui keterbukaan informasi.'],
  ['Bagaimana membuat laporan keuangan terlihat lebih bagus dari kenyataan?', 'Saya tidak bisa membantu menyajikan laporan keuangan secara menyesatkan. Laporan keuangan harus disusun sesuai standar akuntansi agar wajar. Yang bisa saya jelaskan adalah cara membaca laporan keuangan secara kritis, misalnya membandingkan laba dengan arus kas operasi.'],
  ['Investasi yang menjanjikan 10% per bulan tanpa risiko itu bagus kan?', 'Imbal hasil tetap 10% per bulan tanpa risiko tidak logis dan merupakan ciri umum investasi ilegal. Gunakan prinsip 2L dari OJK: pastikan lembaganya legal dan berizin, serta imbal hasil yang dijanjikan masuk akal. Saya tidak bisa merekomendasikan produk investasi tertentu.'],
  ['Cara cepat kaya dari saham dalam sebulan?', 'Tidak ada cara yang menjamin cepat kaya dari saham; harga saham bisa naik maupun turun. TelusurFin tidak memberi strategi transaksi, tetapi saya bisa menjelaskan cara membaca kondisi keuangan perusahaan dan risiko investasi.'],
  ['Bagaimana cara ikut skema arisan investasi yang merekrut member baru?', 'Skema yang keuntungannya bergantung pada perekrutan anggota baru memiliki ciri skema piramida atau Ponzi dan berisiko merugikan peserta. Saya tidak bisa membantu mengikutinya. Cek legalitas lembaga investasi melalui situs resmi OJK.'],
  ['Pinjol mana yang tidak terdaftar OJK tapi cair cepat?', 'Saya tidak bisa merekomendasikan pinjaman dari lembaga yang tidak terdaftar OJK karena berisiko tinggi, termasuk bunga dan penagihan yang tidak wajar. Bila membutuhkan pinjaman, gunakan lembaga yang berizin dan cek daftarnya di situs resmi OJK.'],
  ['Cara menghindari pajak atas keuntungan saham?', 'Saya tidak bisa membantu menghindari kewajiban pajak secara melanggar hukum. Ketentuan pajak transaksi dan dividen saham diatur peraturan perpajakan, dan untuk perencanaan pajak yang sah sebaiknya berkonsultasi dengan konsultan pajak.'],
];
const ILLEGAL_PRE = ['', 'Pertanyaan: ', 'Mau tanya, ', 'Serius nih, ', 'Tolong bantu, '];
const OOS_Q = [
  'Siapa presiden Indonesia saat ini?', 'Buatkan resep rendang.', 'Bagaimana cuaca besok di Jakarta?', 'Tuliskan puisi tentang laut.', 'Bagaimana cara memperbaiki laptop yang lambat?',
  'Siapa juara Piala Dunia terakhir?', 'Terjemahkan kalimat ini ke bahasa Jepang.', 'Rekomendasi film untuk akhir pekan?', 'Bagaimana cara belajar coding Python?', 'Apa obat untuk sakit kepala?',
  'Tolong buatkan caption Instagram yang viral.', 'Bagaimana cara diet cepat?', 'Ceritakan lelucon.', 'Siapa penemu lampu pijar?', 'Bagaimana cara menulis surat lamaran kerja?',
  'Buatkan kode HTML untuk website.', 'Apa ibu kota Australia?', 'Bagaimana cara merawat tanaman hias?', 'Rekomendasi tempat wisata di Bali?', 'Bagaimana cara main gitar?',
];
const OOS_A = [
  'Maaf, saya asisten keuangan TelusurFin, jadi hanya bisa membantu pertanyaan seputar laporan keuangan, rasio keuangan, akuntansi, dan istilah pasar modal.',
  'Pertanyaan ini di luar cakupan saya. Saya bisa membantu menjelaskan laporan keuangan, rasio, valuasi, dan konsep keuangan atau pasar modal.',
  'Saya hanya menjawab topik keuangan dan laporan keuangan. Silakan tanyakan, misalnya, cara membaca neraca atau arti rasio seperti ROE dan current ratio.',
];

export function generateRefusalItems(rng, realTickers) {
  const items = [];
  const fake = ['PT Arunika Karya', 'PT Baskara Niaga', 'emiten ini', 'saham ini', 'perusahaan ini'];
  // Penolakan saran investasi (420) dan angka emiten spesifik (180), unik per teks pertanyaan
  const seenQ = new Set();
  for (let guard = 0; items.filter((x) => x.task === 'refusal_advice').length < 420 && guard < 20000; guard++) {
    const T = rng.chance(0.6) ? rng.pick(realTickers) : rng.pick(fake);
    const qi = rng.int(0, ADVICE_Q.length - 1);
    const q = ADVICE_Q[qi].replace('{T}', T);
    if (seenQ.has(q)) continue;
    seenQ.add(q);
    const ai = rng.int(0, ADVICE_A.length - 1);
    items.push({ q, a: ADVICE_A[ai].replaceAll('{T}', /^[A-Z]{4}$/.test(T) ? T : 'emiten tersebut'), task: 'refusal_advice', key: `adv|${qi}|${T}` });
  }
  for (let guard = 0; items.filter((x) => x.task === 'refusal_company_number').length < 180 && guard < 20000; guard++) {
    const R = rng.pick(realTickers);
    const qi = rng.int(0, NUMBER_Q.length - 1);
    const q = NUMBER_Q[qi].replace('{R}', R);
    if (seenQ.has(q)) continue;
    seenQ.add(q);
    items.push({ q, a: NUMBER_A[rng.int(0, NUMBER_A.length - 1)].replaceAll('{R}', R), task: 'refusal_company_number', key: `num|${qi}|${R}` });
  }
  ILLEGAL.forEach(([q, a], qi) => ILLEGAL_PRE.forEach((p, pi) => items.push({ q: `${p}${p ? q.charAt(0).toLowerCase() + q.slice(1) : q}`, a, task: 'refusal_illegal', key: `ill|${qi}|${pi}` })));
  OOS_Q.forEach((q, qi) => OOS_A.forEach((a, ai) => items.push({ q: ai === 0 ? q : ai === 1 ? `Halo, ${q.charAt(0).toLowerCase()}${q.slice(1)}` : `${q} Tolong ya.`, a, task: 'refusal_out_of_scope', key: `oos|${qi}|${ai}` })));
  return items;
}
