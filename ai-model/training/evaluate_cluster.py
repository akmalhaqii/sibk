"""FR-TRN-03: Evaluasi model klaster tier yang tersimpan di models/tier_kmeans.json."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main():
    model = json.loads((ROOT / "models" / "tier_kmeans.json").read_text(encoding="utf-8"))
    report = (ROOT / "reports" / "cluster_evaluation.md").read_text(encoding="utf-8")
    print(f"[evaluate_cluster] model_version={model['model_version']}, n_samples={model['n_samples']}, evaluation={model.get('evaluation')}")
    print(report)


if __name__ == "__main__":
    main()
