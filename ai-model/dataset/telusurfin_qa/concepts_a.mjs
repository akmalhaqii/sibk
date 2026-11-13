// Bank konsep TelusurFin-QA (bagian A): dasar laporan keuangan, arus kas, PSAK.
// Ditulis ulang dengan kata-kata sendiri (bukan salinan teks PSAK/IAI, OJK, atau BEI).
// Penomoran PSAK 2024 diverifikasi dari publikasi IAI "Perubahan Penomoran PSAK & ISAK dalam SAK Indonesia".
export const CONCEPTS_A = [
  // ---------- Dasar laporan keuangan ----------
  {
    id: 'lk-komponen', topic: 'laporan_keuangan',
    q: ['Apa saja komponen laporan keuangan lengkap?', 'Laporan keuangan perusahaan terdiri dari apa saja?', 'Sebutkan bagian-bagian laporan keuangan.'],
    a: 'Laporan keuangan lengkap terdiri atas laporan posisi keuangan (neraca), laporan laba rugi dan penghasilan komprehensif lain, laporan perubahan ekuitas, laporan arus kas, dan catatan atas laporan keuangan. Catatan berisi kebijakan akuntansi serta rincian pos-pos yang angkanya disajikan di laporan utama. Perusahaan juga menyajikan angka periode pembanding agar perubahan bisa dibaca.',
  },
  {
    id: 'lk-neraca', topic: 'laporan_keuangan',
    q: ['Apa itu laporan posisi keuangan?', 'Neraca itu menunjukkan apa?', 'Fungsi laporan posisi keuangan apa?'],
    a: 'Laporan posisi keuangan atau neraca menunjukkan aset, liabilitas, dan ekuitas perusahaan pada satu tanggal tertentu, misalnya 31 Maret. Prinsip dasarnya: aset = liabilitas + ekuitas. Dari neraca kita bisa membaca likuiditas (aset lancar dibanding liabilitas jangka pendek) dan struktur permodalan (seberapa besar aset dibiayai utang).',
  },
  {
    id: 'lk-labarugi', topic: 'laporan_keuangan',
    q: ['Apa isi laporan laba rugi?', 'Laporan laba rugi menjelaskan apa?', 'Bagaimana membaca laporan laba rugi?'],
    a: 'Laporan laba rugi merangkum pendapatan dan beban selama satu periode, misalnya satu kuartal. Urutannya umumnya: pendapatan, beban pokok pendapatan, laba bruto, beban usaha, laba usaha, pendapatan dan beban lain, laba sebelum pajak, beban pajak, lalu laba periode berjalan. Berbeda dengan neraca yang memotret satu tanggal, laporan laba rugi menggambarkan kinerja sepanjang periode.',
  },
  {
    id: 'lk-oci', topic: 'laporan_keuangan',
    q: ['Apa itu penghasilan komprehensif lain?', 'OCI dalam laporan keuangan itu apa?', 'Bedanya laba bersih dan laba komprehensif apa?'],
    a: 'Penghasilan komprehensif lain (OCI) adalah keuntungan atau kerugian yang belum masuk laba rugi, misalnya selisih kurs penjabaran laporan anak usaha luar negeri atau pengukuran kembali program imbalan pasti. Laba komprehensif = laba periode berjalan + penghasilan komprehensif lain. Rasio seperti ROE dan margin laba bersih di TelusurFin memakai laba periode berjalan, bukan laba komprehensif.',
  },
  {
    id: 'lk-ekuitas-perubahan', topic: 'laporan_keuangan',
    q: ['Apa itu laporan perubahan ekuitas?', 'Laporan perubahan ekuitas menunjukkan apa?', 'Kenapa ada laporan perubahan ekuitas?'],
    a: 'Laporan perubahan ekuitas menjelaskan mengapa ekuitas berubah dari awal hingga akhir periode, misalnya karena laba periode berjalan, pembagian dividen, penerbitan saham baru, pembelian kembali saham (saham treasuri), atau penghasilan komprehensif lain. Laporan ini membantu memastikan saldo ekuitas di neraca bisa ditelusuri asal-usulnya.',
  },
  {
    id: 'lk-calk', topic: 'laporan_keuangan',
    q: ['Apa itu catatan atas laporan keuangan?', 'Kenapa CALK penting dibaca?', 'Isi catatan laporan keuangan apa saja?'],
    a: 'Catatan atas laporan keuangan (CALK) berisi kebijakan akuntansi, rincian pos (misalnya rincian utang bank, aset tetap, atau segmen usaha), komitmen, kontinjensi, dan peristiwa setelah tanggal pelaporan. Banyak informasi penting, seperti jumlah saham treasuri atau rincian utang berbunga, hanya ada di catatan. Angka di laporan utama sering baru bermakna setelah membaca catatannya.',
  },
  {
    id: 'lk-lancar', topic: 'laporan_keuangan',
    q: ['Apa bedanya aset lancar dan aset tidak lancar?', 'Kapan aset disebut lancar?', 'Contoh aset lancar dan tidak lancar apa?'],
    a: 'Aset lancar adalah aset yang diharapkan direalisasi, dijual, atau dipakai dalam siklus operasi normal atau dalam 12 bulan, misalnya kas, piutang usaha, dan persediaan. Aset tidak lancar dipakai lebih lama, misalnya aset tetap, properti investasi, aset hak guna, dan aset takberwujud. Pembedaan ini dipakai untuk menilai likuiditas.',
  },
  {
    id: 'lk-liab-pendek', topic: 'laporan_keuangan',
    q: ['Apa bedanya liabilitas jangka pendek dan jangka panjang?', 'Liabilitas jangka pendek itu apa?', 'Kapan utang dicatat sebagai jangka pendek?'],
    a: 'Liabilitas jangka pendek adalah kewajiban yang jatuh tempo dalam 12 bulan atau dalam siklus operasi normal, misalnya utang usaha, utang bank jangka pendek, dan bagian lancar dari utang jangka panjang. Liabilitas jangka panjang jatuh tempo lebih dari 12 bulan, misalnya obligasi atau pinjaman bank jangka panjang. Current ratio membandingkan aset lancar dengan liabilitas jangka pendek.',
  },
  {
    id: 'lk-nci', topic: 'laporan_keuangan',
    q: ['Apa itu kepentingan nonpengendali?', 'Laba yang diatribusikan ke pemilik entitas induk itu maksudnya apa?', 'Kenapa laba bersih dibagi dua di laporan konsolidasian?'],
    a: 'Pada laporan konsolidasian, laba dan ekuitas dibagi menjadi bagian pemilik entitas induk dan bagian kepentingan nonpengendali, yaitu pemegang saham minoritas di anak usaha. Bagi pemegang saham emiten, yang relevan adalah bagian pemilik entitas induk. Karena itu TelusurFin memakai laba pemilik entitas induk untuk ROE dan EPS, serta ekuitas pemilik entitas induk untuk BVPS.',
  },
  {
    id: 'lk-konsolidasi', topic: 'laporan_keuangan',
    q: ['Apa itu laporan keuangan konsolidasian?', 'Kenapa laporan emiten disebut konsolidasian?', 'Konsolidasi dalam akuntansi artinya apa?'],
    a: 'Laporan keuangan konsolidasian menggabungkan induk dan seluruh anak usaha yang dikendalikannya seolah-olah satu entitas ekonomi. Transaksi antarperusahaan dalam grup dieliminasi agar tidak terhitung dua kali. Pedomannya ada di PSAK 110 (sebelumnya PSAK 65) tentang laporan keuangan konsolidasian.',
  },
  {
    id: 'lk-interim', topic: 'laporan_keuangan',
    q: ['Apa itu laporan keuangan interim?', 'Laporan kuartalan beda apa dengan laporan tahunan?', 'Kenapa laporan Q1 tidak bisa langsung dibandingkan dengan laporan tahunan?'],
    a: 'Laporan interim disusun untuk periode kurang dari setahun, misalnya kuartal pertama (Q1). Angka laba rugi dan arus kasnya hanya mencakup periode itu, sedangkan neraca memotret tanggal akhir periode. Laporan interim umumnya tidak diaudit penuh. Untuk membandingkan rasio berbasis laba dengan ambang tahunan, angka kuartal perlu disetahunkan dan hasilnya dibaca dengan hati-hati.',
  },
  {
    id: 'lk-audit', topic: 'laporan_keuangan',
    q: ['Apa arti opini wajar tanpa modifikasian?', 'Opini audit itu apa?', 'Kenapa opini auditor penting?'],
    a: 'Opini audit adalah pendapat akuntan publik apakah laporan keuangan disajikan wajar sesuai standar akuntansi. Opini wajar tanpa modifikasian berarti auditor tidak menemukan salah saji material. Opini dengan modifikasi (wajar dengan pengecualian, tidak wajar, atau tidak menyatakan pendapat) adalah sinyal untuk lebih berhati-hati membaca angka. Laporan kuartalan umumnya tidak diaudit.',
  },
  {
    id: 'lk-satuan', topic: 'laporan_keuangan',
    q: ['Apa arti "dalam jutaan Rupiah" di laporan keuangan?', 'Kenapa angka di laporan keuangan terlihat kecil?', 'Bagaimana membaca satuan penyajian laporan keuangan?'],
    a: 'Banyak laporan menyajikan angka dalam satuan tertentu, misalnya jutaan atau ribuan Rupiah, yang ditulis di kepala tabel. Angka 1.250.000 dalam jutaan Rupiah berarti Rp1,25 triliun. Rasio tidak terpengaruh satuan, tetapi perhitungan per saham (EPS, BVPS) wajib mengalikan satuan dengan benar. Beberapa emiten juga melapor dalam mata uang asing seperti dolar AS.',
  },
  {
    id: 'lk-pembanding', topic: 'laporan_keuangan',
    q: ['Kenapa ada kolom tahun lalu di laporan keuangan?', 'Apa itu angka pembanding?', 'Angka pembanding neraca dan laba rugi tanggalnya beda, kenapa?'],
    a: 'Laporan keuangan menyajikan angka pembanding agar perubahan bisa dibaca. Untuk neraca kuartalan, pembandingnya biasanya posisi akhir tahun buku sebelumnya (misalnya 31 Desember). Untuk laba rugi dan arus kas, pembandingnya periode yang sama tahun lalu (misalnya Q1 tahun lalu). Karena itu pertumbuhan pendapatan dihitung terhadap periode yang sama tahun lalu, bukan terhadap kuartal sebelumnya.',
  },
  {
    id: 'lk-identitas', topic: 'laporan_keuangan',
    q: ['Apa itu persamaan akuntansi?', 'Kenapa aset harus sama dengan liabilitas ditambah ekuitas?', 'Bagaimana mengecek neraca sudah seimbang?'],
    a: 'Persamaan akuntansi menyatakan aset = liabilitas + ekuitas, karena setiap aset dibiayai oleh kreditur atau pemilik. Bila ada dana syirkah temporer (pada entitas syariah), persamaannya menjadi aset = liabilitas + dana syirkah temporer + ekuitas. TelusurFin memakai persamaan ini untuk memeriksa apakah angka hasil ekstraksi sudah benar.',
  },
  // ---------- Arus kas ----------
  {
    id: 'ak-tiga', topic: 'arus_kas',
    q: ['Apa saja jenis arus kas?', 'Arus kas operasi, investasi, dan pendanaan bedanya apa?', 'Laporan arus kas dibagi menjadi apa saja?'],
    a: 'Laporan arus kas dibagi tiga. Arus kas operasi berasal dari kegiatan usaha utama, seperti penerimaan dari pelanggan dan pembayaran ke pemasok serta karyawan. Arus kas investasi berasal dari pembelian atau penjualan aset jangka panjang, seperti aset tetap. Arus kas pendanaan berasal dari utang, penerbitan saham, dan pembayaran dividen.',
  },
  {
    id: 'ak-langsung', topic: 'arus_kas',
    q: ['Apa bedanya metode langsung dan tidak langsung pada arus kas?', 'Metode tidak langsung arus kas itu apa?', 'Kenapa ada dua metode laporan arus kas?'],
    a: 'Metode langsung menyajikan penerimaan dan pembayaran kas operasi secara bruto, misalnya penerimaan dari pelanggan. Metode tidak langsung dimulai dari laba, lalu disesuaikan dengan pos nonkas seperti penyusutan dan perubahan modal kerja. Total arus kas operasinya sama. Pedomannya ada di PSAK 207 (sebelumnya PSAK 2) tentang laporan arus kas.',
  },
  {
    id: 'ak-laba-kas', topic: 'arus_kas',
    q: ['Kenapa laba besar tapi arus kas operasi kecil?', 'Mengapa laba bersih tidak sama dengan kas?', 'Perusahaan untung tapi kasnya negatif, kok bisa?'],
    a: 'Laba dicatat saat pendapatan diakui, belum tentu saat kas diterima. Penjualan kredit menaikkan piutang, pembelian persediaan menyerap kas, dan penyusutan mengurangi laba tanpa mengeluarkan kas. Karena itu laba bisa tinggi sementara arus kas operasi kecil atau negatif. TelusurFin mengukurnya dengan konversi kas: arus kas operasi dibagi laba bersih.',
  },
  {
    id: 'ak-fcf', topic: 'arus_kas',
    q: ['Apa itu free cash flow?', 'Arus kas bebas itu dihitung bagaimana?', 'Kenapa investor melihat free cash flow?'],
    a: 'Free cash flow atau arus kas bebas umumnya dihitung sebagai arus kas operasi dikurangi belanja modal (capex). Angka ini menunjukkan kas yang tersisa setelah perusahaan merawat dan menambah asetnya, yang bisa dipakai untuk membayar utang atau dividen. TelusurFin belum menghitung free cash flow; yang dihitung adalah konversi kas dan arus kas operasi terhadap aset.',
  },
  {
    id: 'ak-capex', topic: 'arus_kas',
    q: ['Apa itu capex?', 'Belanja modal maksudnya apa?', 'Capex dicatat di arus kas bagian mana?'],
    a: 'Capex atau belanja modal adalah pengeluaran untuk membeli atau meningkatkan aset tetap, misalnya pabrik, mesin, atau kendaraan. Di laporan arus kas, capex masuk arus kas investasi sebagai arus keluar. Capex besar tidak otomatis buruk; bisa jadi perusahaan sedang ekspansi, sehingga perlu dibaca bersama pertumbuhan pendapatan.',
  },
  {
    id: 'ak-setara-kas', topic: 'arus_kas',
    q: ['Apa itu setara kas?', 'Kas dan setara kas itu apa saja?', 'Deposito termasuk setara kas tidak?'],
    a: 'Setara kas adalah investasi jangka sangat pendek yang mudah dicairkan dengan risiko perubahan nilai yang kecil, biasanya jatuh tempo tiga bulan atau kurang sejak diperoleh, misalnya deposito berjangka pendek. Deposito dengan jangka lebih panjang biasanya tidak termasuk setara kas.',
  },
  {
    id: 'ak-negatif', topic: 'arus_kas',
    q: ['Apakah arus kas investasi negatif itu buruk?', 'Arus kas pendanaan negatif artinya apa?', 'Bagaimana membaca arus kas yang negatif?'],
    a: 'Tanda negatif tidak selalu buruk. Arus kas investasi negatif sering berarti perusahaan membeli aset untuk tumbuh. Arus kas pendanaan negatif bisa berarti perusahaan melunasi utang atau membagikan dividen. Yang perlu diwaspadai adalah arus kas operasi negatif berulang, karena berarti kegiatan usaha utama belum menghasilkan kas.',
  },
  // ---------- PSAK & standar ----------
  {
    id: 'psak-penomoran', topic: 'psak',
    q: ['Kenapa nomor PSAK berubah?', 'Apa itu penomoran baru PSAK tahun 2024?', 'PSAK 71 sekarang jadi PSAK berapa?'],
    a: 'Mulai 1 Januari 2024, IAI mengubah penomoran PSAK dan ISAK menjadi tiga digit tanpa mengubah isi persyaratannya. Digit pertama menunjukkan acuannya: 1 untuk standar yang mengacu IFRS, 2 untuk IAS, 3 untuk standar lokal, dan 4 untuk standar syariah. Contohnya PSAK 71 menjadi PSAK 109, PSAK 72 menjadi PSAK 115, PSAK 73 menjadi PSAK 116, dan PSAK 1 menjadi PSAK 201.',
  },
  {
    id: 'psak-201', topic: 'psak',
    q: ['PSAK 201 mengatur apa?', 'Standar penyajian laporan keuangan itu PSAK berapa?', 'Apa isi PSAK tentang penyajian laporan keuangan?'],
    a: 'PSAK 201 (sebelumnya PSAK 1) mengatur penyajian laporan keuangan: komponen laporan yang wajib ada, pemisahan aset dan liabilitas lancar dan tidak lancar, pos minimum yang disajikan, serta kewajiban menyajikan angka pembanding. Standar ini menjadi dasar struktur laporan yang dibaca TelusurFin.',
  },
  {
    id: 'psak-207', topic: 'psak',
    q: ['PSAK 207 tentang apa?', 'Laporan arus kas diatur PSAK berapa?', 'Apa yang diatur standar laporan arus kas?'],
    a: 'PSAK 207 (sebelumnya PSAK 2) mengatur laporan arus kas, termasuk pembagian arus kas menjadi aktivitas operasi, investasi, dan pendanaan serta pilihan metode langsung atau tidak langsung untuk arus kas operasi.',
  },
  {
    id: 'psak-109', topic: 'psak',
    q: ['Apa itu PSAK 109?', 'PSAK 109 instrumen keuangan mengatur apa?', 'Apa itu kerugian kredit ekspektasian?'],
    a: 'PSAK 109 (sebelumnya PSAK 71) mengatur instrumen keuangan: klasifikasi dan pengukuran aset keuangan, penurunan nilai, dan akuntansi lindung nilai. Ciri pentingnya adalah model kerugian kredit ekspektasian, yaitu cadangan kerugian piutang atau kredit dibentuk berdasarkan perkiraan kerugian ke depan, bukan menunggu kerugian benar-benar terjadi.',
  },
  {
    id: 'psak-115', topic: 'psak',
    q: ['Apa itu PSAK 115?', 'Kapan pendapatan boleh diakui?', 'Lima langkah pengakuan pendapatan itu apa saja?'],
    a: 'PSAK 115 (sebelumnya PSAK 72) mengatur pendapatan dari kontrak dengan pelanggan dengan lima langkah: identifikasi kontrak, identifikasi kewajiban pelaksanaan, penentuan harga transaksi, alokasi harga ke setiap kewajiban pelaksanaan, lalu pengakuan pendapatan saat atau selama kewajiban itu dipenuhi. Intinya, pendapatan diakui ketika pengendalian barang atau jasa berpindah ke pelanggan.',
  },
  {
    id: 'psak-116', topic: 'psak',
    q: ['Apa itu PSAK 116?', 'Kenapa liabilitas perusahaan naik karena sewa?', 'Aset hak guna itu apa?'],
    a: 'PSAK 116 (sebelumnya PSAK 73) mengatur sewa. Penyewa umumnya mencatat aset hak guna dan liabilitas sewa di neraca, kecuali sewa jangka pendek atau bernilai rendah. Akibatnya total liabilitas bisa terlihat lebih besar, sehingga rasio liabilitas terhadap ekuitas ikut naik walaupun bisnisnya tidak berubah.',
  },
  {
    id: 'psak-202', topic: 'psak',
    q: ['PSAK 202 tentang apa?', 'Bagaimana persediaan diukur menurut standar?', 'Apa itu nilai realisasi neto persediaan?'],
    a: 'PSAK 202 (sebelumnya PSAK 14) mengatur persediaan. Persediaan diukur pada nilai terendah antara biaya perolehan dan nilai realisasi neto, yaitu perkiraan harga jual dikurangi biaya penyelesaian dan biaya penjualan. Bila nilai realisasi neto lebih rendah, perusahaan mencatat penurunan nilai persediaan.',
  },
  {
    id: 'psak-216', topic: 'psak',
    q: ['PSAK 216 mengatur apa?', 'Bagaimana aset tetap dicatat?', 'Apa itu penyusutan aset tetap?'],
    a: 'PSAK 216 (sebelumnya PSAK 16) mengatur aset tetap. Aset tetap dicatat sebesar biaya perolehan, lalu disusutkan selama umur manfaatnya. Perusahaan boleh memilih model biaya atau model revaluasi. Penyusutan adalah beban nonkas, sehingga mengurangi laba tanpa mengurangi kas pada periode itu.',
  },
  {
    id: 'psak-219', topic: 'psak',
    q: ['PSAK 219 tentang apa?', 'Liabilitas imbalan kerja itu apa?', 'Kenapa ada liabilitas imbalan pascakerja?'],
    a: 'PSAK 219 (sebelumnya PSAK 24) mengatur imbalan kerja, termasuk imbalan pascakerja seperti pesangon dan pensiun. Kewajiban imbalan pasti dihitung aktuaris lalu dicatat sebagai liabilitas. Pengukuran kembalinya masuk penghasilan komprehensif lain, bukan laba rugi.',
  },
  {
    id: 'psak-212', topic: 'psak',
    q: ['Apa itu pajak tangguhan?', 'PSAK 212 mengatur apa?', 'Kenapa beban pajak berbeda dari pajak yang dibayar?'],
    a: 'PSAK 212 (sebelumnya PSAK 46) mengatur pajak penghasilan, termasuk pajak tangguhan. Pajak tangguhan muncul karena perbedaan waktu antara pengakuan akuntansi dan pajak, misalnya penyusutan yang berbeda. Karena itu beban pajak di laporan laba rugi bisa berbeda dari pajak yang dibayar pada periode yang sama.',
  },
  {
    id: 'psak-113', topic: 'psak',
    q: ['Apa itu hierarki nilai wajar?', 'PSAK 113 tentang apa?', 'Level 1, 2, 3 nilai wajar itu apa?'],
    a: 'PSAK 113 (sebelumnya PSAK 68) mengatur pengukuran nilai wajar dengan hierarki tiga level. Level 1 memakai harga kuotasian di pasar aktif, Level 2 memakai input lain yang dapat diobservasi, dan Level 3 memakai input yang tidak dapat diobservasi seperti asumsi internal. Makin tinggi levelnya, makin besar unsur penilaian manajemen. Nilai wajar akuntansi ini berbeda dengan "nilai wajar Graham" di TelusurFin.',
  },
  {
    id: 'psak-117', topic: 'psak',
    q: ['PSAK 117 mengatur apa?', 'Apa itu standar kontrak asuransi yang baru?', 'PSAK 74 sekarang jadi apa?'],
    a: 'PSAK 117 (sebelumnya PSAK 74) mengatur kontrak asuransi dan berlaku efektif mulai 1 Januari 2025. Standar ini mengubah cara perusahaan asuransi mengakui pendapatan dan kewajiban kontraknya. Emiten asuransi termasuk sektor keuangan, yang tidak dianalisis model klaster TelusurFin.',
  },
  {
    id: 'psak-syariah', topic: 'psak',
    q: ['PSAK syariah sekarang nomornya berapa?', 'PSAK 101 syariah jadi apa?', 'Standar akuntansi syariah diatur PSAK berapa saja?'],
    a: 'Sejak 2024, PSAK syariah memakai digit pertama 4. Contohnya PSAK 101 menjadi PSAK 401 (penyajian laporan keuangan syariah), PSAK 102 menjadi PSAK 402 (murabahah), PSAK 105 menjadi PSAK 405 (mudharabah), PSAK 106 menjadi PSAK 406 (musyarakah), dan PSAK 59 menjadi PSAK 459 (perbankan syariah). Isinya tidak berubah, hanya nomornya.',
  },
  {
    id: 'psak-syirkah', topic: 'psak',
    q: ['Apa itu dana syirkah temporer?', 'Kenapa ada pos di antara liabilitas dan ekuitas?', 'Dana syirkah temporer termasuk utang atau modal?'],
    a: 'Dana syirkah temporer adalah dana pihak ketiga dengan akad bagi hasil, misalnya mudharabah, yang disajikan di antara liabilitas dan ekuitas. Dana ini bukan utang biasa karena tidak ada kewajiban mengembalikan jumlah tetap bila terjadi kerugian, tetapi juga bukan modal pemilik. TelusurFin memasukkannya ke liabilitas saat menghitung rasio, mengikuti definisi data BEI.',
  },
  {
    id: 'sak-ep', topic: 'psak',
    q: ['Apa itu SAK EP?', 'Standar akuntansi untuk perusahaan tertutup apa?', 'SAK ETAP masih berlaku?'],
    a: 'SAK Entitas Privat (SAK EP) adalah standar untuk entitas tanpa akuntabilitas publik yang signifikan, menggantikan SAK ETAP dan berlaku mulai 1 Januari 2025. Emiten di BEI memiliki akuntabilitas publik, sehingga tetap memakai PSAK dalam SAK Indonesia, bukan SAK EP.',
  },
  {
    id: 'sak-emkm', topic: 'psak',
    q: ['Apa itu SAK EMKM?', 'UMKM pakai standar akuntansi apa?', 'Standar laporan keuangan untuk usaha kecil apa?'],
    a: 'SAK EMKM adalah standar akuntansi yang disederhanakan untuk entitas mikro, kecil, dan menengah. Laporannya minimal terdiri atas laporan posisi keuangan, laporan laba rugi, dan catatan atas laporan keuangan. Standar ini membantu UMKM menyusun laporan yang cukup rapi untuk keperluan pembiayaan.',
  },
];
