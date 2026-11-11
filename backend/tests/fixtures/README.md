# tests/fixtures

Potongan kecil supaya `npm test` jalan tanpa folder `data/` (yang tidak masuk git).

| Berkas | Isi | Asal angka |
| --- | --- | --- |
| `smgr_textcontent_p5.json` | Potongan keluaran `pdfjs getTextContent` (str + transform) untuk baris total neraca | **Angka asli** SMGR Q1 2026; **koordinat sintetis** |
| `smgr_rows.json` | Keluaran parser yang diharapkan dari potongan di atas | Angka asli |
| `smgr_fields_company.json` | Keluaran mapper, format PDF perusahaan (dana syirkah terpisah dari liabilitas) | Angka asli |
| `smgr_fields_bei.json` | Keluaran mapper, format paket BEI (dana syirkah di dalam liabilitas: 27.667.683) | Angka asli |
| `tier_model.json` | Model klaster tier **sintetis** yang lolos skema `TierModel` | Sintetis |

> [!IMPORTANT]
> Nomor halaman (`page`) dan koordinat masih ilustrasi. Setelah spike parser G0 jalan,
> ganti dengan potongan hasil parse nyata (`npm run export:parser`), lalu pangkas
> secukupnya. Jangan mengarang angka: pos yang belum diketahui diisi `null`.

Identitas akuntansi yang diuji (dari dokumen Desain MVP):
- Perusahaan: 75.459.729 = 26.067.683 (liabilitas) + 1.600.000 (syirkah temporer) + 47.792.046 (ekuitas)
- BEI:        75.459.729 = 27.667.683 (liabilitas, termasuk syirkah) + 47.792.046 (ekuitas)
