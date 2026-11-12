// Klien Ollama (Qwen3). Tidak ada LLM API eksternal (NFR-08).
// R-09: kirim think: false, keep_alive, format (opsional), cek res.ok, fallback ke fallbackModel bila gagal.
import env from '../config/env.js';

// REV-06: batasi panjang keluaran agar narasi selesai < 30 detik di laptop (qwen3:1.7b ~ 50 dtk tanpa batas)
const DEFAULT_OPTIONS = () => ({
  num_predict: env.ollama.numPredict,
  temperature: 0.3,
  num_ctx: 4096,
});

async function callGenerate(prompt, model, format, options) {
  const body = {
    model,
    prompt,
    stream: false,
    think: false,
    keep_alive: '30m',
    options: { ...DEFAULT_OPTIONS(), ...(options ?? {}) },
  };
  if (format) body.format = format;

  const res = await fetch(`${env.ollama.url}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(env.ollama.timeoutMs),
  });
  if (!res.ok) {
    throw new Error(`Ollama HTTP ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return { response: data.response, model };
}

export async function chat(prompt, { model = env.ollama.model, format, options } = {}) {
  try {
    return await callGenerate(prompt, model, format, options);
  } catch (err) {
    if (env.ollama.fallbackModel && env.ollama.fallbackModel !== model) {
      return await callGenerate(prompt, env.ollama.fallbackModel, format, options);
    }
    throw err;
  }
}

export async function pingOllama() {
  try {
    return (await fetch(`${env.ollama.url}/api/tags`, { signal: AbortSignal.timeout(800) })).ok ? 'ok' : 'down';
  } catch {
    return 'down';
  }
}
