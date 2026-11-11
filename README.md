# TelusurFin — Pipeline Analisis Laporan Keuangan

PDF laporan keuangan emiten BEI → metrik kesehatan, tier klaster, valuasi, dan narasi
yang setiap angkanya bisa ditelusuri ke halaman sumber.

> Prinsip: **kode membaca dan menghitung; LLM lokal hanya menulis.** Tidak ada LLM API.

| Folder | Isi | Stack |
| --- | --- | --- |
| `frontend/` | UI unggah (+ loading), hasil, tabel koreksi | React + Vite |
| `backend/` | API + pipeline (ingest → parser → mapper → validator → metrics → tiering → market → valuation → narrator) | Node + Express |
| `ai-model/` | Pelatihan klaster tier (K-Means/GMM), evaluasi parser, setup Qwen3 (Ollama) | Python |
| `data/` | PDF, Excel BEI, dataset latih, upload, cache (tidak masuk git) | — |

## Runbook demo

```bash
nvm use                         # Node 24 (.nvmrc)
ollama pull qwen3:4b            # sekali saja; cadangan: qwen3:1.7b
npm run setup                   # install root + backend + frontend (sekali saja)
copy backend\.env.example backend\.env
npm run dev                     # backend :3001 + frontend :5173 sekaligus (concurrently)
```

Buka http://localhost:5173. Cek kesehatan: http://localhost:3001/api/health (server + Ollama).
Model tier harus sudah ada di `backend/models/tier_kmeans.json` (lihat alur 1).

```bash
npm test                        # tes backend: kontrak mock, fixture SMGR (tanpa folder data/)
```

## Titik pertemuan antarfolder

Folder hanya bertukar **berkas** dengan lokasi tetap; tidak ada folder yang mengimpor kode folder lain.

### 1. Model klaster tier (ai-model → backend)

```text
data/raw/bei_excel_bulk/*.xlsx
  → ai-model/training/prepare_dataset.py   → data/processed/raw_bei.csv
  → backend/scripts/build_features.js      → data/processed/features.csv     (metrics.js yang sama, FR-TRN-01)
  → ai-model/training/train_cluster.py     → ai-model/models/tier_kmeans.json
  → ai-model/training/evaluate_cluster.py  → ai-model/reports/
  → ai-model/training/export_model.py      → backend/models/tier_kmeans.json  (validasi + salin)
```

- Backend **hanya** membaca salinan lokalnya, `backend/models/tier_kmeans.json` (default `TIER_MODEL_PATH`).
  Salinan ini masuk git supaya demo tidak bergantung pada folder Python.
- JSON model wajib memuat `model_version`; nilainya diteruskan ke respons API dan tampil di UI (FR-TIER-02).
- Bentuk JSON dijaga di dua sisi: skema zod `TierModel` ([schemas/index.js](backend/src/schemas/index.js))
  dan `REQUIRED_KEYS` di [export_model.py](ai-model/training/export_model.py). Ubah keduanya bersamaan.

### 2. Evaluasi parser (backend → ai-model)

```text
data/raw/pdf/<TICKER>_<PERIODE>_<company|bei>.pdf
  → backend: npm run export:parser         → data/processed/parser_output/<TICKER>_<PERIODE>_<company|bei>.json
data/raw/bei_excel/<TICKER>_<PERIODE>.xlsx
  → ai-model/eval/bei_excel.py             → data/ground_truth/bei_excel/<TICKER>_<PERIODE>.json
keduanya
  → ai-model/eval/run_eval.py              → ai-model/reports/parser_eval.csv
```

- `export_parser_output.js` memakai kode pipeline yang sama dengan API dan memvalidasi hasilnya dengan skema `Extracted`.
- Kunci jawaban memakai nama field kanonik yang sama dengan `backend/config/labels.json`
  (pemetaan taksonomi BEI di `ai-model/eval/bei_field_map.json`). Berkas dipasangkan lewat `<TICKER>_<PERIODE>`.
- Contoh nama: `SMGR_2026Q1_company.pdf`, `SMGR_2026Q1_bei.pdf`, `SMGR_2026Q1.xlsx`.

### 3. Kontrak API (backend ↔ frontend)

- Skema zod di [backend/src/schemas/index.js](backend/src/schemas/index.js) adalah satu-satunya sumber kontrak.
- [contract.mock.test.js](backend/tests/contract.mock.test.js) memvalidasi **semua** `frontend/src/mock/*.json`;
  mock baru wajib didaftarkan. Kontrak berubah tapi mock belum diperbarui → `npm test` gagal.
- Frontend dengan mock: `VITE_USE_MOCK=true` di `frontend/.env`.
