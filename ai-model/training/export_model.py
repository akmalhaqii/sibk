"""Validasi model hasil train_cluster.py lalu salin ke backend/models/tier_kmeans.json.

Backend hanya membaca salinan lokalnya sendiri (backend/models/), tidak pernah
membaca folder ai-model. Jalankan setiap kali model dilatih ulang:

    python training/export_model.py                      # models/tier_kmeans.json -> backend
    python training/export_model.py --src models/x.json

REQUIRED_KEYS harus selaras dengan skema zod `TierModel` di backend/src/schemas/index.js.
"""
import argparse
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT.parent / "backend" / "models" / "tier_kmeans.json"

REQUIRED_KEYS = [
    "model_version", "created_at", "algorithm", "period_end", "n_samples",
    "features", "winsor", "scaler", "centroids", "tier_by_cluster",
]


def validate(model: dict) -> None:
    missing = [k for k in REQUIRED_KEYS if k not in model]
    if missing:
        raise ValueError(f"key hilang: {missing}")
    n = len(model["features"])
    assert len(model["centroids"]) == 3, "harus 3 centroid"
    assert all(len(c) == n for c in model["centroids"]), "dimensi centroid != jumlah fitur"
    assert len(model["scaler"]["mean"]) == n and len(model["scaler"]["scale"]) == n
    assert sorted(model["tier_by_cluster"]) == ["high", "low", "mid"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default=str(ROOT / "models" / "tier_kmeans.json"))
    args = ap.parse_args()

    src = Path(args.src)
    validate(json.loads(src.read_text(encoding="utf-8")))
    DEST.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(src, DEST)
    print(f"[export_model] {src} -> {DEST}")


if __name__ == "__main__":
    main()
