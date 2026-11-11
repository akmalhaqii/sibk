"""FR-TRN-02 & FR-TRN-03: winsorize + standarisasi, latih K-Means (k=3) & pembanding GMM,
urutkan klaster menjadi low/mid/high, evaluasi silhouette & Davies-Bouldin,
lalu tulis ai-model/models/tier_kmeans.json dan laporan evaluasi di ai-model/reports/.

Langkah (Bagian 6.5 Brief Tahap 2):
1. Muat features.csv. Buang baris yang punya fitur kosong (catat jumlahnya).
2. Sisihkan holdout_ratio (10%) secara acak dengan random_state=0.
3. Winsorize setiap fitur pada persentil 1% dan 99% dari data latih; simpan batasnya.
4. StandardScaler; simpan mean_ dan scale_.
5. KMeans(n_clusters=3, n_init=20, random_state=0).
6. Urutkan klaster dengan skor kesehatan pada centroid: jumlah semua fitur terstandar,
   dengan liability_to_asset diberi tanda negatif. Skor terendah = low, tertinggi = high.
7. Hitung silhouette score dan Davies-Bouldin pada data latih.
8. Tulis ai-model/models/tier_kmeans.json dengan semua key di REQUIRED_KEYS.
9. Cetak ukuran setiap klaster dan nilai rata-rata fitur asli per tier.
"""
import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
import yaml
from sklearn.cluster import KMeans
from sklearn.metrics import davies_bouldin_score, silhouette_score
from sklearn.mixture import GaussianMixture
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parents[1]
CFG_PATH = ROOT / "config.yaml"


def main():
    cfg = yaml.safe_load(CFG_PATH.read_text(encoding="utf-8"))
    features = cfg["features"]
    period_end = str(cfg.get("period_end", "2025-03-31"))
    model_version = str(cfg.get("model_version", "tier_kmeans_v1"))
    holdout_ratio = float(cfg.get("holdout_ratio", 0.1))
    w_low, w_high = cfg.get("winsorize", [0.01, 0.99])

    feat_csv = (ROOT / cfg["paths"]["features_csv"]).resolve()
    model_out = (ROOT / cfg["paths"]["model_out"]).resolve()
    reports_dir = (ROOT / cfg["paths"]["reports_dir"]).resolve()

    df_all = pd.read_csv(feat_csv)
    n_total = len(df_all)
    df_clean = df_all.dropna(subset=features).reset_index(drop=True)
    n_dropped = n_total - len(df_clean)

    train_df, holdout_df = train_test_split(
        df_clean, test_size=holdout_ratio, random_state=0, shuffle=True
    )
    train_df = train_df.reset_index(drop=True)
    holdout_df = holdout_df.reset_index(drop=True)

    X_raw = train_df[features].to_numpy(dtype=float)
    lower = np.quantile(X_raw, w_low, axis=0)
    upper = np.quantile(X_raw, w_high, axis=0)
    X_win = np.clip(X_raw, lower, upper)

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_win)

    km = KMeans(n_clusters=3, n_init=20, random_state=0)
    labels_km = km.fit_predict(X_scaled)
    centroids = km.cluster_centers_

    # Skor kesehatan per centroid: semua fitur positif kecuali liability_to_asset negatif
    signs = np.array([-1.0 if f == "liability_to_asset" else 1.0 for f in features])
    health_scores = (centroids * signs).sum(axis=1)
    order = np.argsort(health_scores)  # [low_cluster, mid_cluster, high_cluster]
    tier_names = ["low", "mid", "high"]
    tier_by_cluster = [""] * 3
    for rank, cluster_idx in enumerate(order):
        tier_by_cluster[int(cluster_idx)] = tier_names[rank]

    sil_km = float(silhouette_score(X_scaled, labels_km))
    db_km = float(davies_bouldin_score(X_scaled, labels_km))

    # Pembanding GMM & kestabilan antar-seed
    gmm = GaussianMixture(n_components=3, random_state=0, n_init=5)
    labels_gmm = gmm.fit_predict(X_scaled)
    sil_gmm = float(silhouette_score(X_scaled, labels_gmm))
    db_gmm = float(davies_bouldin_score(X_scaled, labels_gmm))

    base_tiers = [tier_by_cluster[int(c)] for c in labels_km]
    seed_agreements = []
    for seed in cfg.get("kmeans", {}).get("seeds", [0, 1, 2, 3, 4]):
        km_s = KMeans(n_clusters=3, n_init=20, random_state=int(seed))
        lbl_s = km_s.fit_predict(X_scaled)
        sc_s = (km_s.cluster_centers_ * signs).sum(axis=1)
        ord_s = np.argsort(sc_s)
        t_map = {int(ord_s[r]): tier_names[r] for r in range(3)}
        tiers_s = [t_map[int(c)] for c in lbl_s]
        agree = float(np.mean([a == b for a, b in zip(base_tiers, tiers_s)]))
        seed_agreements.append(agree)
    mean_stability = float(np.mean(seed_agreements))

    # Evaluasi pada holdout
    X_hold_win = np.clip(holdout_df[features].to_numpy(dtype=float), lower, upper)
    X_hold_scaled = scaler.transform(X_hold_win)
    hold_clusters = km.predict(X_hold_scaled)
    hold_tiers = [tier_by_cluster[int(c)] for c in hold_clusters]

    model_json = {
        "model_version": model_version,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "algorithm": "kmeans",
        "period_end": period_end,
        "n_samples": int(len(train_df)),
        "features": features,
        "winsor": {
            "lower": [round(float(x), 8) for x in lower],
            "upper": [round(float(x), 8) for x in upper],
        },
        "scaler": {
            "mean": [round(float(x), 8) for x in scaler.mean_],
            "scale": [round(float(x), 8) for x in scaler.scale_],
        },
        "centroids": [
            [round(float(v), 8) for v in row] for row in centroids
        ],
        "tier_by_cluster": tier_by_cluster,
        "evaluation": {
            "silhouette": round(sil_km, 4),
            "davies_bouldin": round(db_km, 4),
        },
    }

    model_out.parent.mkdir(parents=True, exist_ok=True)
    model_out.write_text(json.dumps(model_json, indent=2) + "\n", encoding="utf-8")

    # Statistik per tier (rata-rata fitur winsorized asli)
    train_df = train_df.copy()
    for idx, f in enumerate(features):
        train_df[f] = X_win[:, idx]
    train_df["cluster"] = labels_km
    train_df["tier"] = base_tiers

    print(f"\n=== HASIL PELATIHAN KLASTER ({model_version}) ===")
    print(f"Total di features.csv       : {n_total}")
    print(f"Dibuang (fitur kosong)      : {n_dropped}")
    print(f"Sampel latih (train)        : {len(train_df)}")
    print(f"Sampel uji (holdout 10%)    : {len(holdout_df)}")
    print(f"K-Means Silhouette Score    : {sil_km:.4f} (GMM: {sil_gmm:.4f})")
    print(f"K-Means Davies-Bouldin      : {db_km:.4f} (GMM: {db_gmm:.4f})")
    print(f"Kestabilan antar-seed (0..4): {mean_stability * 100:.2f}%")
    print(f"Urutan tier_by_cluster      : {tier_by_cluster} (health_scores={np.round(health_scores, 3).tolist()})")

    summary_rows = []
    print("\nRata-rata fitur per tier (data latih, winsorized):")
    for t in ["low", "mid", "high"]:
        sub = train_df[train_df["tier"] == t]
        means = {f: float(sub[f].mean()) for f in features}
        summary_rows.append({"tier": t, "count": len(sub), **means})
        fmt_means = ", ".join(f"{f}={means[f]:.3f}" for f in features)
        print(f"  - {t.upper():4s} (n={len(sub):3d}): {fmt_means}")

    reports_dir.mkdir(parents=True, exist_ok=True)
    eval_md = reports_dir / "cluster_evaluation.md"
    md_lines = [
        f"# Laporan Evaluasi Klaster Tier (`{model_version}`)\n",
        f"- **Periode data latih:** `{period_end}` (BEI Q1 2025)",
        f"- **Emiten di `raw_bei.csv`:** {n_total}",
        f"- **Emiten dibuang karena fitur kosong (mis. `revenue_prior <= 0`):** {n_dropped}",
        f"- **Sampel latih (`n_samples`):** {len(train_df)}",
        f"- **Sampel holdout (10%):** {len(holdout_df)}",
        f"- **Emiten demo (`SMGR`):** dikeluarkan dari sampel latih (out-of-sample)\n",
        "## Perbandingan K-Means vs GMM & Kestabilan Seed\n",
        "| Model | Silhouette Score (↑) | Davies-Bouldin Index (↓) | Kestabilan Antar-Seed (0–4) |",
        "| --- | ---: | ---: | ---: |",
        f"| **K-Means (k=3)** | **{sil_km:.4f}** | **{db_km:.4f}** | **{mean_stability * 100:.2f}%** |",
        f"| GMM (n=3) | {sil_gmm:.4f} | {db_gmm:.4f} | — |\n",
        "## Ukuran Klaster & Rata-Rata Fitur Asli (Winsorized) per Tier\n",
        "| Tier | Klaster | Jumlah Emiten (Train) | Jumlah (Holdout) | ROA | ROE | Liabilitas/Aset | Net Margin | Current Ratio | Pertumbuhan Pendapatan | OCF/Aset |",
        "| --- | :---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ]
    for row in summary_rows:
        t = row["tier"]
        c_idx = tier_by_cluster.index(t)
        h_cnt = sum(1 for ht in hold_tiers if ht == t)
        md_lines.append(
            f"| **{t.upper()}** | {c_idx} | {row['count']} | {h_cnt} | "
            f"{row['roa']*100:.2f}% | {row['roe']*100:.2f}% | {row['liability_to_asset']*100:.1f}% | "
            f"{row['net_margin']*100:.2f}% | {row['current_ratio']:.2f}x | "
            f"{row['revenue_growth']*100:.2f}% | {row['ocf_to_assets']*100:.2f}% |"
        )
    eval_md.write_text("\n".join(md_lines) + "\n", encoding="utf-8")
    print(f"[train_cluster] model disimpan ke {model_out} dan laporan ke {eval_md}")


if __name__ == "__main__":
    main()
