# LLM lokal (narasi) & Hasil Smoke Test Tahap 1

Tidak ada LLM API (`NFR-08`). Narasi memakai Qwen3 via Ollama, dengan ringkasan templat berlabel `"Ringkasan otomatis (tanpa AI)"` sebagai cadangan otomatis (`FR-NAR-04`).

## Hasil Smoke Test (Tahap 1 — 12 Nov 2026)

- **Status perangkat saat Tahap 1:** binary `ollama` dan service `http://localhost:11434` belum terpasang/menyala di mesin ini.
- **Keputusan model narasi:**
  1. **Default kode & demo tanpa Ollama:** otomatis memakai **ringkasan templat berlabel** (`source: "template"`, `label: "Ringkasan otomatis (tanpa AI)"`, `checks_passed: true`) sesuai matriks keputusan Bagian 6 Brief Tahap 1 dan `FR-NAR-04`.
  2. **Bila Ollama dipasang sebelum demo:** jalankan `ollama pull qwen3:1.7b` (atau `qwen3:4b`); `narrator/client.js` otomatis memakai `OLLAMA_MODEL` (`qwen3:4b`), turun ke `OLLAMA_FALLBACK_MODEL` (`qwen3:1.7b`), lalu turun ke templat bila Ollama mati atau timeout.

```bash
ollama pull qwen3:4b
ollama pull qwen3:1.7b   # cadangan untuk perangkat lambat
```

Prompt ada di `backend/src/narrator/prompts/narrative_v1.txt`; versi prompt dicatat via `PROMPT_VERSION`.
