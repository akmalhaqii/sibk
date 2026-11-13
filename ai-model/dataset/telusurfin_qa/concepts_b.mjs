// Bank konsep TelusurFin-QA (bagian B): rasio & analisis, valuasi, metodologi TelusurFin.
export const CONCEPTS_B = [
  // ---------- Rasio & analisis ----------
  {
    id: 'ra-jenis', topic: 'rasio',
    q: ['Apa saja kelompok rasio keuangan?', 'Rasio keuangan dibagi menjadi apa saja?', 'Jenis-jenis rasio untuk menganalisis perusahaan apa?'],
    a: 'Rasio keuangan umumnya dikelompokkan menjadi rasio likuiditas (kemampuan membayar kewajiban jangka pendek), solvabilitas (struktur pendanaan dan beban utang), profitabilitas (kemampuan menghasilkan laba), aktivitas (efisiensi penggunaan aset), pertumbuhan, dan valuasi (harga saham dibanding fundamental). TelusurFin menghitung rasio dari kelompok likuiditas, solvabilitas, profitabilitas, pertumbuhan, arus kas, dan valuasi.',
  },
  {
    id: 'ra-quick', topic: 'rasio',
    q: ['Apa itu quick ratio?', 'Bedanya current ratio dan quick ratio apa?', 'Acid test ratio itu apa?'],
    a: 'Quick ratio atau acid test ratio membandingkan aset lancar tanpa persediaan dengan liabilitas jangka pendek. Persediaan dikeluarkan karena tidak selalu cepat dijual. Rasio ini lebih ketat daripada current ratio. TelusurFin saat ini baru menghitung current ratio.',
  },
  {
    id: 'ra-cash-ratio', topic: 'rasio',
    q: ['Apa itu cash ratio?', 'Rasio kas itu menghitung apa?', 'Cash ratio dihitung bagaimana?'],
    a: 'Cash ratio membandingkan kas dan setara kas dengan liabilitas jangka pendek. Rasio ini paling konservatif di antara rasio likuiditas karena hanya menghitung kas yang benar-benar tersedia.',
  },
  {
    id: 'ra-der-berbunga', topic: 'rasio',
    q: ['Apa bedanya DER total dan DER utang berbunga?', 'Kenapa DER di aplikasi beda dengan di situs saham?', 'Utang berbunga itu apa saja?'],
    a: 'DER total membagi seluruh liabilitas dengan ekuitas, termasuk utang usaha dan uang muka pelanggan. DER utang berbunga hanya memakai utang yang menanggung bunga, seperti pinjaman bank, obligasi, dan liabilitas sewa. Situs data saham sering memakai versi utang berbunga sehingga angkanya lebih kecil. TelusurFin menamai versinya "liabilitas terhadap ekuitas" agar tidak tertukar.',
  },
  {
    id: 'ra-icr', topic: 'rasio',
    q: ['Apa itu interest coverage ratio?', 'Bagaimana menilai kemampuan membayar bunga?', 'Rasio cakupan bunga dihitung bagaimana?'],
    a: 'Interest coverage ratio membandingkan laba sebelum bunga dan pajak (EBIT) dengan beban bunga. Nilai 3x berarti laba operasional tiga kali lebih besar dari beban bunganya. Makin rendah rasionya, makin sempit ruang perusahaan bila laba turun. TelusurFin belum menghitung rasio ini.',
  },
  {
    id: 'ra-gross', topic: 'rasio',
    q: ['Apa itu margin laba kotor?', 'Gross margin dihitung bagaimana?', 'Bedanya margin kotor, margin usaha, dan margin bersih apa?'],
    a: 'Margin laba kotor = laba bruto ÷ pendapatan, menunjukkan sisa pendapatan setelah beban pokok. Margin usaha = laba usaha ÷ pendapatan, setelah beban penjualan dan administrasi. Margin laba bersih = laba bersih ÷ pendapatan, setelah semua beban termasuk bunga dan pajak. Membandingkan ketiganya membantu melihat di tahap mana laba tergerus.',
  },
  {
    id: 'ra-dupont', topic: 'rasio',
    q: ['Apa itu analisis DuPont?', 'ROE bisa dipecah menjadi apa saja?', 'Kenapa ROE tinggi belum tentu bagus?'],
    a: 'Analisis DuPont memecah ROE menjadi tiga komponen: margin laba bersih × perputaran aset × pengungkit keuangan (aset ÷ ekuitas). ROE tinggi bisa berasal dari margin yang baik, aset yang dipakai efisien, atau utang yang besar. ROE tinggi karena utang besar membawa risiko lebih tinggi, jadi ROE sebaiknya dibaca bersama rasio liabilitas.',
  },
  {
    id: 'ra-perputaran', topic: 'rasio',
    q: ['Apa itu perputaran persediaan?', 'Rasio aktivitas itu apa?', 'Days sales outstanding artinya apa?'],
    a: 'Rasio aktivitas mengukur seberapa cepat aset berputar. Perputaran persediaan = beban pokok penjualan ÷ rata-rata persediaan. Days sales outstanding (DSO) memperkirakan berapa hari rata-rata piutang tertagih. Perputaran yang melambat bisa menjadi tanda barang sulit dijual atau penagihan memburuk. TelusurFin belum menghitung rasio aktivitas.',
  },
  {
    id: 'ra-yoy', topic: 'rasio',
    q: ['Apa bedanya YoY dan QoQ?', 'Pertumbuhan year on year itu apa?', 'Kenapa pertumbuhan dibandingkan dengan periode yang sama tahun lalu?'],
    a: 'Year on year (YoY) membandingkan suatu periode dengan periode yang sama tahun sebelumnya, misalnya Q1 tahun ini dengan Q1 tahun lalu. Quarter on quarter (QoQ) membandingkan dengan kuartal sebelumnya. YoY lebih aman untuk bisnis musiman karena musimnya sama. TelusurFin memakai YoY untuk pertumbuhan pendapatan dan laba.',
  },
  {
    id: 'ra-musiman', topic: 'rasio',
    q: ['Kenapa menyetahunkan laba kuartal bisa menyesatkan?', 'Apa risiko mengalikan laba Q1 dengan empat?', 'Bisnis musiman pengaruhnya ke rasio apa?'],
    a: 'Menyetahunkan laba kuartal (misalnya Q1 × 4) mengasumsikan setiap kuartal sama. Untuk bisnis musiman, seperti ritel menjelang hari raya atau perkebunan saat panen, asumsi itu bisa membuat ROE, ROA, dan EPS tahunan terlalu tinggi atau terlalu rendah. Pembanding yang lebih baik adalah laba 12 bulan terakhir (TTM), yang butuh laporan tahunan sebelumnya.',
  },
  {
    id: 'ra-sektor', topic: 'rasio',
    q: ['Kenapa rasio bank tidak bisa dibandingkan dengan perusahaan manufaktur?', 'Apakah ambang rasio sama untuk semua sektor?', 'Kenapa TelusurFin tidak menganalisis bank?'],
    a: 'Struktur keuangan antarsektor sangat berbeda. Bank dibiayai dana pihak ketiga sehingga rasio liabilitasnya tinggi secara alami, dan tidak memakai konsep aset lancar seperti perusahaan dagang. Karena itu ambang dan model klaster TelusurFin hanya dilatih pada emiten non-keuangan. Idealnya ambang juga disesuaikan per sektor, misalnya margin ritel memang lebih tipis daripada margin teknologi.',
  },
  {
    id: 'ra-rugi', topic: 'rasio',
    q: ['Bagaimana membaca ROE kalau perusahaan rugi?', 'Kenapa pertumbuhan laba tidak dihitung saat laba tahun lalu negatif?', 'Rasio apa yang tidak bermakna saat rugi?'],
    a: 'Saat laba negatif, ROE dan ROA bernilai negatif dan menunjukkan rugi relatif terhadap modal atau aset. Pertumbuhan laba tidak bermakna bila laba pembandingnya nol atau negatif, karena persentasenya bisa menyesatkan, sehingga TelusurFin mengosongkannya. Konversi kas juga tidak dihitung bila laba bersih nol atau negatif.',
  },
  {
    id: 'ra-ekuitas-negatif', topic: 'rasio',
    q: ['Apa arti ekuitas negatif?', 'Perusahaan dengan ekuitas minus itu bagaimana?', 'Kenapa liabilitas bisa lebih besar dari aset?'],
    a: 'Ekuitas negatif berarti total liabilitas melebihi total aset, biasanya karena akumulasi rugi bertahun-tahun. Pada kondisi ini rasio liabilitas terhadap ekuitas dan ROE tidak bisa dibaca dengan cara biasa, sehingga perlu dilihat langsung kemampuan perusahaan melunasi kewajiban dan rencana restrukturisasinya. Kondisi ini merupakan tanda risiko keuangan yang serius.',
  },
  {
    id: 'ra-konteks', topic: 'rasio',
    q: ['Apakah satu rasio cukup untuk menilai perusahaan?', 'Kenapa rasio harus dibaca bersama-sama?', 'Bagaimana cara membaca rasio dengan benar?'],
    a: 'Satu rasio jarang cukup. Current ratio tinggi bisa berarti likuid, tetapi bisa juga berarti kas menganggur atau persediaan menumpuk. ROE tinggi bisa karena utang besar. Rasio sebaiknya dibaca bersama rasio lain, dibandingkan dengan periode sebelumnya, dan dibandingkan dengan perusahaan sejenis di sektor yang sama.',
  },
  // ---------- Valuasi ----------
  {
    id: 'va-per', topic: 'valuasi',
    q: ['Bagaimana membaca PER?', 'PER rendah artinya murah?', 'Apa itu price to earnings ratio?'],
    a: 'PER = harga saham ÷ laba per saham. PER 10x berarti investor membayar sepuluh kali laba setahun per lembar. PER rendah tidak otomatis murah; bisa saja pasar memperkirakan laba akan turun. PER juga sangat bergantung pada laba yang dipakai: laba tahunan, laba 12 bulan terakhir, atau laba kuartal yang disetahunkan.',
  },
  {
    id: 'va-pbv', topic: 'valuasi',
    q: ['Bagaimana membaca PBV?', 'PBV di bawah 1 artinya apa?', 'Apa itu price to book value?'],
    a: 'PBV = harga saham ÷ nilai buku per saham. PBV di bawah 1 berarti harga pasar lebih rendah daripada nilai buku ekuitas per saham. Hal ini bisa terjadi karena pasar meragukan kualitas aset atau kemampuan perusahaan menghasilkan laba. Perusahaan dengan ROE tinggi umumnya dihargai dengan PBV yang lebih tinggi.',
  },
  {
    id: 'va-ev-ebitda', topic: 'valuasi',
    q: ['Apa itu EV/EBITDA?', 'Enterprise value dihitung bagaimana?', 'Kenapa analis memakai EV/EBITDA?'],
    a: 'Enterprise value (EV) = kapitalisasi pasar + utang berbunga − kas. EV/EBITDA membandingkan nilai seluruh perusahaan dengan laba sebelum bunga, pajak, penyusutan, dan amortisasi. Rasio ini berguna untuk membandingkan perusahaan dengan struktur utang yang berbeda. TelusurFin belum menghitungnya karena butuh rincian utang berbunga.',
  },
  {
    id: 'va-dividen', topic: 'valuasi',
    q: ['Apa itu dividend yield?', 'Bagaimana menghitung imbal hasil dividen?', 'Apa itu dividend payout ratio?'],
    a: 'Dividend yield = dividen per saham setahun ÷ harga saham. Dividend payout ratio = dividen ÷ laba bersih, menunjukkan porsi laba yang dibagikan. Yield tinggi belum tentu menarik bila dividennya tidak berkelanjutan atau harga sahamnya turun tajam. TelusurFin belum menghitung dividen karena datanya ada di catatan atau pengumuman terpisah.',
  },
  {
    id: 'va-graham', topic: 'valuasi',
    q: ['Kenapa Graham Number disebut konservatif?', 'Dari mana angka 22,5 di rumus Graham?', 'Apa kelemahan Graham Number?'],
    a: 'Graham Number = √(22,5 × EPS × BVPS). Angka 22,5 berasal dari batas PER 15 dikali PBV 1,5 yang dianggap wajar oleh Benjamin Graham untuk investor defensif. Kelemahannya: rumus ini tidak memperhitungkan pertumbuhan, sehingga perusahaan dengan ROE tinggi atau pertumbuhan kuat cenderung terlihat "mahal". Karena itu TelusurFin menyebutnya estimasi konservatif.',
  },
  {
    id: 'va-dcf', topic: 'valuasi',
    q: ['Apa itu DCF?', 'Discounted cash flow cara kerjanya bagaimana?', 'Kenapa hasil DCF bisa sangat berbeda antar analis?'],
    a: 'Discounted cash flow (DCF) menilai perusahaan dari perkiraan arus kas masa depan yang didiskonto ke nilai sekarang memakai biaya modal. Hasilnya sangat peka terhadap asumsi, seperti pertumbuhan, margin, dan tingkat diskonto; perubahan kecil asumsi bisa mengubah nilai secara besar. Itulah sebabnya nilai wajar dari berbagai situs atau analis sering berbeda.',
  },
  {
    id: 'va-mos', topic: 'valuasi',
    q: ['Apa itu margin of safety?', 'Margin keamanan dalam investasi maksudnya apa?', 'Bagaimana menghitung diskon terhadap nilai wajar?'],
    a: 'Margin of safety adalah selisih antara estimasi nilai wajar dan harga pasar, biasanya dinyatakan dalam persen. Misalnya nilai wajar Rp1.000 dan harga Rp800 berarti harga 20% di bawah nilai wajar. Konsep ini dipakai sebagai bantalan atas kemungkinan salah estimasi, bukan jaminan keuntungan.',
  },
  {
    id: 'va-target', topic: 'valuasi',
    q: ['Apa bedanya nilai wajar dan target harga analis?', 'Kenapa target harga analis lebih tinggi dari nilai wajar?', 'Target harga 12 bulan itu apa?'],
    a: 'Target harga analis adalah perkiraan harga saham sekitar 12 bulan ke depan, berdasarkan proyeksi laba dan ekspektasi pasar. Nilai wajar adalah estimasi nilai intrinsik dengan metode tertentu, misalnya Graham Number atau DCF. Keduanya mengukur hal berbeda sehingga angkanya wajar berbeda. TelusurFin hanya menghitung nilai wajar Graham dari laporan keuangan.',
  },
  {
    id: 'va-marketcap', topic: 'valuasi',
    q: ['Apa itu kapitalisasi pasar?', 'Market cap dihitung bagaimana?', 'Kenapa kapitalisasi pasar berubah setiap hari?'],
    a: 'Kapitalisasi pasar = harga saham × jumlah saham beredar. Nilainya berubah mengikuti harga saham di bursa, sedangkan nilai buku hanya berubah saat laporan keuangan baru terbit. TelusurFin memakai jumlah saham dari modal ditempatkan dan disetor, yang belum dikurangi saham treasuri.',
  },
  {
    id: 'va-relatif', topic: 'valuasi',
    q: ['Apa itu valuasi relatif?', 'Bagaimana membandingkan PER antar perusahaan?', 'Kenapa PER harus dibandingkan dengan perusahaan sejenis?'],
    a: 'Valuasi relatif membandingkan rasio seperti PER atau PBV dengan perusahaan sejenis atau rata-rata sektornya. PER 15x bisa tergolong tinggi di sektor yang tumbuh lambat, tetapi tergolong rendah di sektor yang tumbuh cepat. Perbandingan hanya adil bila definisi laba dan periodenya sama.',
  },
  // ---------- Metodologi TelusurFin ----------
  {
    id: 'tf-cara-kerja', topic: 'telusurfin',
    q: ['Bagaimana cara kerja TelusurFin?', 'TelusurFin menghitung angka dari mana?', 'Apakah angka di TelusurFin dibuat oleh AI?'],
    a: 'TelusurFin membaca PDF laporan keuangan, mengekstrak angka setiap pos dengan aturan yang bisa ditelusuri ke halaman sumbernya, memeriksa persamaan neraca, lalu menghitung rasio dengan kode. Model klaster menentukan tier, dan model bahasa lokal hanya menulis ringkasan dari angka yang sudah dihitung. Angka akhir tidak dibuat oleh model bahasa.',
  },
  {
    id: 'tf-status', topic: 'telusurfin',
    q: ['Dari mana status sehat, waspada, dan lemah?', 'Bagaimana TelusurFin menentukan status rasio?', 'Ambang status rasio di TelusurFin itu apa?'],
    a: 'Setiap rasio punya dua ambang. Untuk rasio yang makin tinggi makin baik, nilai di atas ambang atas berstatus sehat, di antara kedua ambang waspada, dan di bawah ambang bawah lemah. Untuk rasio yang makin rendah makin baik, seperti liabilitas terhadap ekuitas, arahnya dibalik. Ambang ini bersifat umum lintas sektor dan perlu dibaca bersama konteks industri.',
  },
  {
    id: 'tf-tier', topic: 'telusurfin',
    q: ['Apa arti tier low, mid, dan high?', 'Bagaimana tier di TelusurFin ditentukan?', 'Apakah tier high berarti saham bagus?'],
    a: 'Tier ditentukan oleh model klaster K-Means yang dilatih pada emiten non-keuangan BEI periode Q1 2025 dengan tujuh fitur: ROA, ROE, liabilitas terhadap aset, margin laba bersih, current ratio, pertumbuhan pendapatan, dan arus kas operasi terhadap aset. Tier menunjukkan posisi relatif terhadap emiten pembanding, bukan penilaian mutlak, dan bukan saran membeli saham.',
  },
  {
    id: 'tf-beda', topic: 'telusurfin',
    q: ['Kenapa angka TelusurFin berbeda dengan situs saham?', 'Kenapa PER di aplikasi beda dengan di internet?', 'Mana yang benar, angka TelusurFin atau situs lain?'],
    a: 'Perbedaan biasanya berasal dari definisi dan data dasar, bukan kesalahan hitung. Penyebab yang sering muncul: laba kuartal yang disetahunkan dibanding laba 12 bulan terakhir, harga saham pada tanggal berbeda, DER total liabilitas dibanding DER utang berbunga, jumlah saham dengan atau tanpa saham treasuri, serta metode nilai wajar yang berbeda. Keduanya bisa benar menurut definisinya masing-masing.',
  },
  {
    id: 'tf-saran', topic: 'telusurfin',
    q: ['Kenapa TelusurFin tidak memberi rekomendasi saham?', 'Apakah TelusurFin bisa menyarankan beli atau jual?', 'Kenapa asisten AI menolak memberi target harga?'],
    a: 'TelusurFin dirancang sebagai alat bantu membaca laporan keuangan, bukan penasihat investasi. Keputusan membeli atau menjual saham bergantung pada tujuan, profil risiko, dan informasi di luar laporan keuangan, serta di Indonesia nasihat investasi termasuk kegiatan yang diatur. Karena itu sistem hanya menjelaskan angka, status, dan keterbatasannya.',
  },
  {
    id: 'tf-keterbatasan', topic: 'telusurfin',
    q: ['Apa saja keterbatasan analisis TelusurFin?', 'Hal apa yang perlu diperhatikan saat membaca hasil TelusurFin?', 'Kenapa ada catatan keterbatasan di ringkasan?'],
    a: 'Keterbatasan utama: rasio berbasis laba pada laporan kuartalan disetahunkan, jumlah saham belum dikurangi saham treasuri, ambang status bersifat umum lintas sektor, tier relatif terhadap sampel Q1 2025, dan valuasi bergantung pada harga yang diisi pengguna atau diambil dari sumber harga. Laporan dalam mata uang asing tidak divaluasi dengan harga Rupiah.',
  },
  {
    id: 'tf-usd', topic: 'telusurfin',
    q: ['Kenapa valuasi laporan dalam dolar tidak dihitung?', 'Apa yang terjadi kalau laporan keuangan dalam USD?', 'Kenapa PER tidak muncul untuk emiten yang melapor dalam dolar?'],
    a: 'Bila laporan disajikan dalam dolar AS sedangkan harga saham dalam Rupiah, membagi harga dengan EPS akan mencampur dua mata uang dan hasilnya salah. TelusurFin tetap menghitung rasio yang tidak bergantung mata uang, seperti ROE dan current ratio, tetapi menandai valuasi sebagai belum dapat dihitung sampai ada konversi kurs.',
  },
  {
    id: 'tf-sumber', topic: 'telusurfin',
    q: ['Bagaimana mengecek angka di TelusurFin benar?', 'Apa gunanya nomor halaman di tabel hasil ekstraksi?', 'Kalau angka hasil ekstraksi salah bagaimana?'],
    a: 'Setiap angka hasil ekstraksi disertai nomor halaman PDF sumbernya, sehingga bisa dicek langsung. TelusurFin juga memeriksa persamaan neraca dan subtotal. Bila ada angka yang salah, pengguna bisa mengoreksinya di tabel, lalu rasio, tier, valuasi, dan ringkasan dihitung ulang dengan tanda bahwa angka telah dikoreksi.',
  },
];
