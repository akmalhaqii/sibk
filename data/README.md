# data (tidak masuk git)

| Folder | Isi | Ditulis oleh |
| --- | --- | --- |
| `raw/pdf/` | PDF laporan, nama `<TICKER>_<PERIODE>_<company\|bei>.pdf` — DT-01, DT-08 | Pengguna |
| `raw/bei_excel/` | Excel BEI per emiten (kunci jawaban), nama `<TICKER>_<PERIODE>.xlsx` | Pengguna |
| `raw/bei_excel_bulk/` | Excel BEI banyak emiten non-keuangan untuk data latih — DT-10 | Pengguna |
| `interim/` | Hasil antara (dump text layer, output OCR) — DT-02 | backend |
| `processed/raw_bei.csv` | Angka mentah data latih | `ai-model/training/prepare_dataset.py` |
| `processed/features.csv` | Fitur latih | `backend/scripts/build_features.js` |
| `processed/excluded_rows.csv` | Baris yang dikeluarkan + alasan | `prepare_dataset.py` |
| `processed/parser_output/` | Keluaran parser per PDF (skema `Extracted`) | `backend: npm run export:parser` |
| `ground_truth/bei_excel/` | Kunci jawaban otomatis dari Excel BEI — DT-09 | `ai-model/eval/bei_excel.py` |
| `ground_truth/manual/` | Label manual (OQ-05) | Pengguna |
| `uploads/` | PDF unggahan dari UI | backend |
| `cache/` | Hasil analisis & narasi (JSON) | backend |
