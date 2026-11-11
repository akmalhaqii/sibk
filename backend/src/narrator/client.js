// Klien Ollama (Qwen3). Tidak ada LLM API eksternal (NFR-08).
// R-09: kirim think: false, keep_alive, format (opsional), cek res.ok, fallback ke fallbackModel bila gagal.
import env from '../config/env.js';

async function callGenerate(prompt, model, format) {
  const body = {
    model,
    prompt,
    stream: false,
    think: false,
    keep_alive: '10m',
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

export async function chat(prompt, { model = env.ollama.model, format } = {}) {
  try {
    return await callGenerate(prompt, model, format);
  } catch (err) {
    if (env.ollama.fallbackModel && env.ollama.fallbackModel !== model) {
      return await callGenerate(prompt, env.ollama.fallbackModel, format);
    }
    throw err;
  }
}

export async function pingOllama() {
  try {
    return (await fetch(`${env.ollama.url}/api/tags`)).ok ? 'ok' : 'down';
  } catch {
    return 'down';
  }
}
