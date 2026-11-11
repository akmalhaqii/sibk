"""FR-TRN-02: winsorize + standarisasi, latih K-Means (k=3) & GMM, urutkan klaster
menjadi low/mid/high, lalu tulis ai-model/models/tier_kmeans.json.

Isi JSON wajib memuat `model_version` (tampil di UI, FR-TIER-02) dan key lain di
training/export_model.py::REQUIRED_KEYS. Setelah itu jalankan export_model.py
untuk menyalin model ke backend/models/.

in : data/processed/features.csv (dari backend/scripts/build_features.js)
out: ai-model/models/tier_kmeans.json
"""


def main():
    raise NotImplementedError


if __name__ == "__main__":
    main()
