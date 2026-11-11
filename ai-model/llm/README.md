# LLM lokal (narasi)

Tidak ada LLM API (NFR-08). Narasi memakai Qwen3 via Ollama, tanpa pelatihan.

```bash
ollama pull qwen3:4b
ollama pull qwen3:1.7b   # cadangan untuk perangkat lambat
```

Prompt ada di `backend/src/narrator/prompts/`; versi prompt dicatat via `PROMPT_VERSION`.