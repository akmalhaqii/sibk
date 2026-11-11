# ai-model

Komponen model AI proyek:
1. **Klaster tier (dilatih sendiri)** — K-Means k=3, GMM sebagai pembanding. Hasil ditulis ke
   `models/tier_kmeans.json`, lalu `training/export_model.py` memvalidasi dan menyalinnya ke
   `backend/models/tier_kmeans.json` (satu-satunya lokasi yang dibaca backend).
2. **Evaluasi parser** — Excel BEI sebagai kunci jawaban (KPI-06), dibandingkan dengan
   keluaran parser Node di `data/processed/parser_output/`.
3. **LLM narasi** — Qwen3 lokal via Ollama (tidak dilatih), lihat `llm/`.

```bash
pip install -r requirements.txt

# alur model tier
python training/prepare_dataset.py
node ../backend/scripts/build_features.js
python training/train_cluster.py
python training/evaluate_cluster.py
python training/export_model.py

# alur evaluasi parser
npm --prefix ../backend run export:parser
python eval/bei_excel.py
python eval/run_eval.py
```

Detail kedua alur ada di README root.
