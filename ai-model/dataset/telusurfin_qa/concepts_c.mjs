// Bank konsep TelusurFin-QA (bagian C): pasar modal Indonesia & literasi keuangan (edukasi umum, bukan saran).
// Aturan yang sering berubah (batas autoreject, biaya transaksi) sengaja tidak dimasukkan.
export const CONCEPTS_C = [
  {
    id: 'pm-saham', topic: 'pasar_modal',
    q: ['Apa itu saham?', 'Membeli saham artinya apa?', 'Saham itu bukti apa?'],
    a: 'Saham adalah bukti kepemilikan atas sebagian perusahaan. Pemegang saham berhak atas bagian laba yang dibagikan sebagai dividen dan bisa memperoleh keuntungan atau kerugian dari perubahan harga saham. Pemegang saham juga ikut menanggung risiko bila kinerja perusahaan memburuk.',
  },
  {
    id: 'pm-emiten', topic: 'pasar_modal',
    q: ['Apa itu emiten?', 'Perusahaan tercatat di bursa disebut apa?', 'Bedanya emiten dan perusahaan publik apa?'],
    a: 'Emiten adalah pihak yang menerbitkan efek melalui penawaran umum, misalnya perusahaan yang menjual sahamnya kepada publik lalu sahamnya tercatat di Bursa Efek Indonesia. Emiten wajib menyampaikan laporan keuangan berkala dan keterbukaan informasi kepada publik.',
  },
  {
    id: 'pm-bei-ojk', topic: 'pasar_modal',
    q: ['Apa peran BEI dan OJK?', 'Siapa yang mengawasi pasar modal Indonesia?', 'Bedanya BEI dan OJK apa?'],
    a: 'Bursa Efek Indonesia (BEI) menyelenggarakan perdagangan efek, menetapkan aturan pencatatan, dan menyediakan data perdagangan. Otoritas Jasa Keuangan (OJK) adalah regulator yang mengatur dan mengawasi seluruh sektor jasa keuangan, termasuk pasar modal, emiten, dan perusahaan efek.',
  },
  {
    id: 'pm-ksei-kpei', topic: 'pasar_modal',
    q: ['Apa itu KSEI dan KPEI?', 'Saham yang saya beli disimpan di mana?', 'Siapa yang menjamin penyelesaian transaksi saham?'],
    a: 'KSEI (Kustodian Sentral Efek Indonesia) menyimpan efek secara elektronik dan mencatat kepemilikannya. KPEI (Kliring Penjaminan Efek Indonesia) melakukan kliring dan menjamin penyelesaian transaksi bursa. Bersama BEI, keduanya disebut self-regulatory organization di pasar modal.',
  },
  {
    id: 'pm-sid-rdn', topic: 'pasar_modal',
    q: ['Apa itu SID dan RDN?', 'Rekening dana nasabah itu apa?', 'Kenapa investor saham perlu SID?'],
    a: 'SID (Single Investor Identification) adalah nomor identitas tunggal investor di pasar modal. RDN (Rekening Dana Nasabah) adalah rekening bank atas nama investor yang dipakai untuk menampung dana transaksi efek, sehingga dana investor terpisah dari dana perusahaan sekuritas.',
  },
  {
    id: 'pm-lot', topic: 'pasar_modal',
    q: ['Berapa lembar saham dalam satu lot?', 'Apa itu lot saham?', 'Minimal beli saham berapa lembar?'],
    a: 'Di BEI, satu lot berisi 100 lembar saham, dan transaksi di pasar reguler dilakukan dalam kelipatan lot. Jadi bila harga saham Rp1.000 per lembar, nilai satu lot adalah Rp100.000 di luar biaya transaksi.',
  },
  {
    id: 'pm-t2', topic: 'pasar_modal',
    q: ['Apa itu T+2?', 'Kapan transaksi saham diselesaikan?', 'Setelah jual saham, kapan dananya masuk?'],
    a: 'T+2 berarti penyelesaian transaksi bursa dilakukan dua hari bursa setelah tanggal transaksi. Pada hari itu saham berpindah ke pembeli dan dana berpindah ke penjual melalui rekening dana nasabah.',
  },
  {
    id: 'pm-ipo', topic: 'pasar_modal',
    q: ['Apa itu IPO?', 'Penawaran umum perdana itu apa?', 'Kenapa perusahaan melakukan IPO?'],
    a: 'IPO atau penawaran umum perdana adalah saat perusahaan pertama kali menawarkan sahamnya kepada publik sebelum tercatat di bursa. Tujuannya umumnya menghimpun dana untuk ekspansi atau membayar utang. Informasi lengkap tentang perusahaan dan penggunaan dana dimuat dalam prospektus.',
  },
  {
    id: 'pm-prospektus', topic: 'pasar_modal',
    q: ['Apa itu prospektus?', 'Apa yang perlu dibaca di prospektus?', 'Isi prospektus IPO apa saja?'],
    a: 'Prospektus adalah dokumen yang memuat informasi tentang perusahaan yang menawarkan efek: kegiatan usaha, laporan keuangan, risiko usaha, rencana penggunaan dana, struktur pemegang saham, dan harga penawaran. Bagian rencana penggunaan dana dan faktor risiko penting dibaca untuk memahami tujuan perusahaan menghimpun dana.',
  },
  {
    id: 'pm-right-issue', topic: 'pasar_modal',
    q: ['Apa itu right issue?', 'HMETD itu apa?', 'Kenapa perusahaan melakukan right issue?'],
    a: 'Right issue atau penambahan modal dengan hak memesan efek terlebih dahulu (HMETD) adalah penerbitan saham baru yang ditawarkan lebih dulu kepada pemegang saham lama sesuai porsinya. Pemegang saham yang tidak ikut menebus akan mengalami dilusi kepemilikan. Dana dari right issue biasanya dipakai untuk ekspansi atau memperbaiki struktur permodalan.',
  },
  {
    id: 'pm-stock-split', topic: 'pasar_modal',
    q: ['Apa itu stock split?', 'Kalau saham dipecah, nilai investasi saya berubah?', 'Bedanya stock split dan reverse stock split apa?'],
    a: 'Stock split memecah satu saham menjadi beberapa saham dengan harga per lembar yang lebih rendah, sehingga nilai total kepemilikan tidak berubah. Reverse stock split kebalikannya, yaitu menggabungkan beberapa saham menjadi satu. Setelah stock split, EPS dan BVPS per lembar ikut mengecil sesuai rasio pemecahan.',
  },
  {
    id: 'pm-dividen', topic: 'pasar_modal',
    q: ['Apa itu cum date dan ex date dividen?', 'Kapan harus punya saham agar dapat dividen?', 'Jenis dividen apa saja?'],
    a: 'Dividen bisa berupa dividen tunai atau dividen saham. Cum date adalah hari terakhir saham diperdagangkan dengan hak dividen; investor yang membeli setelahnya, pada ex date, tidak lagi berhak atas dividen tersebut. Harga saham biasanya menyesuaikan pada ex date.',
  },
  {
    id: 'pm-buyback', topic: 'pasar_modal',
    q: ['Apa itu buyback saham?', 'Kenapa perusahaan membeli kembali sahamnya?', 'Saham hasil buyback disebut apa?'],
    a: 'Buyback adalah pembelian kembali saham oleh emiten sendiri. Saham hasil buyback disebut saham treasuri; saham ini tidak beredar di publik dan tidak berhak atas dividen. Karena itu jumlah saham beredar untuk menghitung EPS seharusnya dikurangi saham treasuri.',
  },
  {
    id: 'pm-indeks', topic: 'pasar_modal',
    q: ['Apa itu IHSG?', 'Apa bedanya IHSG, LQ45, dan IDX30?', 'Indeks saham itu apa?'],
    a: 'Indeks saham mengukur pergerakan harga sekelompok saham. IHSG (Indeks Harga Saham Gabungan) mencakup saham yang tercatat di BEI. LQ45 berisi 45 saham dengan likuiditas tinggi dan kapitalisasi pasar besar, sedangkan IDX30 berisi 30 saham pilihan dari kriteria serupa. Anggota indeks dievaluasi secara berkala.',
  },
  {
    id: 'pm-papan', topic: 'pasar_modal',
    q: ['Apa itu papan pencatatan di BEI?', 'Kenapa saham ada di papan yang berbeda?', 'Apa itu papan pemantauan khusus?'],
    a: 'BEI mengelompokkan saham tercatat ke beberapa papan pencatatan sesuai kriteria tertentu, misalnya Papan Utama untuk emiten yang lebih besar dan mapan serta Papan Pengembangan untuk emiten yang sedang bertumbuh. Papan Pemantauan Khusus menampung saham dengan kondisi tertentu yang perlu perhatian lebih dari investor, misalnya ekuitas negatif atau tidak ada pendapatan.',
  },
  {
    id: 'pm-obligasi', topic: 'pasar_modal',
    q: ['Apa itu obligasi?', 'Bedanya saham dan obligasi apa?', 'Kupon obligasi itu apa?'],
    a: 'Obligasi adalah surat utang: pembelinya meminjamkan dana kepada penerbit dan menerima bunga berkala (kupon) serta pokok saat jatuh tempo. Pemegang saham adalah pemilik, sedangkan pemegang obligasi adalah kreditur yang didahulukan bila penerbit dilikuidasi. Risiko utama obligasi adalah gagal bayar dan perubahan suku bunga.',
  },
  {
    id: 'pm-sukuk', topic: 'pasar_modal',
    q: ['Apa itu sukuk?', 'Bedanya sukuk dan obligasi apa?', 'Sukuk ritel itu apa?'],
    a: 'Sukuk adalah efek syariah yang mewakili kepemilikan atas aset atau manfaat aset tertentu, sehingga imbal hasilnya berasal dari sewa, bagi hasil, atau margin, bukan bunga. Sukuk bisa diterbitkan negara maupun korporasi. Sukuk ritel adalah sukuk negara yang ditujukan untuk investor perorangan.',
  },
  {
    id: 'pm-reksadana', topic: 'pasar_modal',
    q: ['Apa itu reksa dana?', 'Jenis reksa dana apa saja?', 'Bagaimana reksa dana bekerja?'],
    a: 'Reksa dana menghimpun dana dari banyak investor untuk dikelola manajer investasi dalam portofolio efek. Jenis umumnya: reksa dana pasar uang, pendapatan tetap, campuran, dan saham, dengan risiko yang umumnya meningkat dalam urutan itu. Nilai investasi diukur dengan nilai aktiva bersih per unit penyertaan.',
  },
  {
    id: 'pm-etf', topic: 'pasar_modal',
    q: ['Apa itu ETF?', 'Bedanya ETF dan reksa dana biasa apa?', 'Reksa dana yang diperdagangkan di bursa itu apa?'],
    a: 'ETF (exchange traded fund) adalah reksa dana yang unit penyertaannya diperdagangkan di bursa seperti saham. Banyak ETF mengikuti indeks tertentu. Bedanya dengan reksa dana biasa, harga ETF bergerak sepanjang jam perdagangan, sedangkan reksa dana biasa dihitung nilainya sekali sehari.',
  },
  {
    id: 'pm-ilegal', topic: 'pasar_modal',
    q: ['Bagaimana mengenali investasi bodong?', 'Apa itu prinsip 2L dalam investasi?', 'Ciri-ciri investasi ilegal apa saja?'],
    a: 'OJK mengenalkan prinsip 2L: legal dan logis. Legal berarti lembaganya berizin dan diawasi otoritas, yang bisa dicek di situs resmi OJK. Logis berarti imbal hasil yang dijanjikan masuk akal. Ciri investasi bodong antara lain menjanjikan keuntungan tinggi tanpa risiko, imbal hasil tetap dalam waktu singkat, dan skema merekrut anggota baru.',
  },
  {
    id: 'pm-goreng', topic: 'pasar_modal',
    q: ['Apa itu saham gorengan?', 'Kenapa harga saham bisa naik turun ekstrem tanpa berita?', 'Apa risiko saham yang dimanipulasi?'],
    a: 'Istilah "saham gorengan" dipakai untuk saham yang harganya bergerak ekstrem karena aktivitas spekulatif atau dugaan manipulasi, bukan karena perubahan fundamental. Manipulasi pasar dilarang dalam peraturan pasar modal. Membaca laporan keuangan membantu membedakan apakah kenaikan harga didukung kinerja atau tidak.',
  },
  {
    id: 'pm-insider', topic: 'pasar_modal',
    q: ['Apa itu insider trading?', 'Bolehkah transaksi saham berdasarkan informasi orang dalam?', 'Kenapa perdagangan orang dalam dilarang?'],
    a: 'Perdagangan orang dalam (insider trading) adalah transaksi efek berdasarkan informasi material yang belum diumumkan ke publik oleh pihak yang memiliki akses khusus. Praktik ini dilarang karena merugikan investor lain dan merusak keadilan pasar, serta dapat dikenai sanksi.',
  },
  {
    id: 'pm-keterbukaan', topic: 'pasar_modal',
    q: ['Apa itu keterbukaan informasi emiten?', 'Di mana mencari laporan keuangan emiten?', 'Kenapa emiten wajib mengumumkan informasi material?'],
    a: 'Emiten wajib menyampaikan laporan keuangan berkala dan informasi material kepada publik melalui keterbukaan informasi, misalnya rencana aksi korporasi atau perkara penting. Laporan keuangan dan pengumuman emiten dapat diunduh dari situs resmi BEI dan situs masing-masing emiten. Keterbukaan informasi bertujuan agar semua investor memperoleh informasi yang sama.',
  },
  // ---------- Literasi keuangan ----------
  {
    id: 'lit-majemuk', topic: 'literasi',
    q: ['Apa itu bunga majemuk?', 'Kenapa investasi jangka panjang disebut bisa berlipat?', 'Bedanya bunga sederhana dan bunga majemuk apa?'],
    a: 'Bunga sederhana hanya dihitung dari pokok awal, sedangkan bunga majemuk juga dihitung dari bunga yang sudah terkumpul. Contohnya Rp10 juta dengan imbal hasil 10% per tahun menjadi sekitar Rp16,1 juta setelah lima tahun bila majemuk, dibanding Rp15 juta bila sederhana. Makin panjang jangka waktunya, makin besar perbedaannya.',
  },
  {
    id: 'lit-inflasi', topic: 'literasi',
    q: ['Apa pengaruh inflasi terhadap tabungan?', 'Apa itu imbal hasil riil?', 'Kenapa uang di tabungan nilainya bisa turun?'],
    a: 'Inflasi membuat daya beli uang turun dari waktu ke waktu. Imbal hasil riil kira-kira sama dengan imbal hasil nominal dikurangi inflasi. Bila bunga tabungan 2% sementara inflasi 3%, daya beli tabungan berkurang sekitar 1% per tahun.',
  },
  {
    id: 'lit-dana-darurat', topic: 'literasi',
    q: ['Apa itu dana darurat?', 'Kenapa perlu dana darurat sebelum berinvestasi?', 'Dana darurat sebaiknya disimpan di mana?'],
    a: 'Dana darurat adalah dana cadangan untuk kebutuhan mendadak, seperti kehilangan pekerjaan atau biaya kesehatan. Dana ini umumnya disimpan di instrumen yang mudah dicairkan dengan risiko rendah, seperti tabungan atau reksa dana pasar uang. Memiliki dana darurat mengurangi risiko terpaksa menjual investasi saat harganya sedang turun.',
  },
  {
    id: 'lit-diversifikasi', topic: 'literasi',
    q: ['Apa itu diversifikasi?', 'Kenapa tidak menaruh semua dana di satu saham?', 'Bagaimana diversifikasi mengurangi risiko?'],
    a: 'Diversifikasi berarti menyebar dana ke beberapa aset, sektor, atau jenis instrumen yang tidak bergerak persis sama. Bila satu aset turun, aset lain tidak selalu ikut turun, sehingga gejolak nilai portofolio berkurang. Diversifikasi mengurangi risiko spesifik perusahaan, tetapi tidak menghilangkan risiko pasar secara keseluruhan.',
  },
  {
    id: 'lit-profil-risiko', topic: 'literasi',
    q: ['Apa itu profil risiko investor?', 'Kenapa sekuritas menanyakan profil risiko?', 'Bagaimana horizon investasi memengaruhi pilihan instrumen?'],
    a: 'Profil risiko menggambarkan seberapa besar fluktuasi nilai investasi yang sanggup ditoleransi seseorang, dipengaruhi tujuan, usia, penghasilan, dan horizon investasi. Dana untuk kebutuhan jangka pendek umumnya ditempatkan di instrumen berisiko rendah, sedangkan instrumen yang lebih fluktuatif lebih cocok untuk horizon panjang.',
  },
  {
    id: 'lit-risiko-jenis', topic: 'literasi',
    q: ['Apa saja jenis risiko investasi?', 'Risiko likuiditas itu apa?', 'Risiko kredit dalam investasi maksudnya apa?'],
    a: 'Jenis risiko investasi antara lain risiko pasar (harga turun karena kondisi pasar), risiko likuiditas (sulit menjual tanpa menurunkan harga), risiko kredit (penerbit gagal membayar), risiko inflasi, dan risiko spesifik perusahaan seperti kinerja yang memburuk. Membaca laporan keuangan terutama membantu menilai risiko spesifik perusahaan.',
  },
  {
    id: 'lit-tabung-investasi', topic: 'literasi',
    q: ['Apa bedanya menabung dan berinvestasi?', 'Kenapa tabungan dan investasi punya tujuan berbeda?', 'Kapan sebaiknya menabung dan kapan berinvestasi?'],
    a: 'Menabung menyimpan dana dengan risiko sangat rendah dan mudah dicairkan, tetapi imbal hasilnya kecil. Berinvestasi menempatkan dana pada aset yang diharapkan tumbuh, dengan risiko nilai turun. Umumnya tabungan dipakai untuk dana darurat dan kebutuhan dekat, sedangkan investasi untuk tujuan jangka panjang.',
  },
  {
    id: 'lit-fundamental-teknikal', topic: 'literasi',
    q: ['Apa bedanya analisis fundamental dan teknikal?', 'TelusurFin termasuk analisis fundamental atau teknikal?', 'Analisis fundamental itu melihat apa?'],
    a: 'Analisis fundamental menilai perusahaan dari kinerja dan kondisi keuangannya, seperti laba, utang, arus kas, dan valuasi. Analisis teknikal mempelajari pola pergerakan harga dan volume perdagangan. TelusurFin berfokus pada analisis fundamental dari laporan keuangan dan tidak membaca grafik harga.',
  },
];
