# Laporan Evaluasi Klaster Tier (`tier_kmeans_v1`)

- **Periode data latih:** `2025-03-31` (BEI Q1 2025)
- **Emiten di `raw_bei.csv`:** 401
- **Emiten dibuang karena fitur kosong (mis. `revenue_prior <= 0`):** 2
- **Sampel latih (`n_samples`):** 359
- **Sampel holdout (10%):** 40
- **Emiten demo (`SMGR`):** dikeluarkan dari sampel latih (out-of-sample)

## Perbandingan K-Means vs GMM & Kestabilan Seed

| Model | Silhouette Score (↑) | Davies-Bouldin Index (↓) | Kestabilan Antar-Seed (0–4) |
| --- | ---: | ---: | ---: |
| **K-Means (k=3)** | **0.2776** | **1.4431** | **100.00%** |
| GMM (n=3) | 0.1999 | 2.6088 | — |

## Ukuran Klaster & Rata-Rata Fitur Asli (Winsorized) per Tier

| Tier | Klaster | Jumlah Emiten (Train) | Jumlah (Holdout) | ROA | ROE | Liabilitas/Aset | Net Margin | Current Ratio | Pertumbuhan Pendapatan | OCF/Aset |
| --- | :---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **LOW** | 1 | 38 | 3 | -9.85% | -30.08% | 50.8% | -75.07% | 4.56x | -6.48% | -3.21% |
| **MID** | 0 | 247 | 29 | 2.49% | 4.45% | 38.6% | 3.21% | 3.62x | 10.05% | -0.46% |
| **HIGH** | 2 | 74 | 8 | 15.29% | 25.17% | 31.9% | 17.00% | 4.08x | 53.01% | 21.46% |
