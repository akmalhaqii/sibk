// Klien Ollama (Qwen3). Tidak ada LLM API eksternal (NFR-08).
// R-09: kirim think: false, keep_alive, format (opsional), cek res.ok, fallback ke fallbackModel bila gagal.
import env from '../config/env.js';

const ollamaUrl = () => process.env.OLLAMA_URL || env.ollama.url;

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

  const res = await fetch(`${ollamaUrl()}/api/generate`, {
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

export async function* chatStream(
  messages,
  { model = env.chat?.model || env.ollama.model, options, signal } = {}
) {
  const body = {
    model,
    messages,
    stream: true,
    think: false,
    keep_alive: '30m',
    options: {
      temperature: 0.2,
      num_predict: 250,
      num_ctx: 4096,
      ...(options ?? {}),
    },
  };

  const res = await fetch(`${ollamaUrl()}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    throw new Error(`Ollama chat HTTP ${res.status}: ${await res.text()}`);
  }
  if (!res.body) {
    throw new Error('Ollama chat stream tidak memiliki body');
  }

  const decoder = new TextDecoder();
  let buf = '';
  for await (const chunk of res.body) {
    buf += decoder.decode(chunk, { stream: true });
    let nl;
    while ((nl = buf.indexOf('\n')) !== -1) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      let obj;
      try {
        obj = JSON.parse(line);
      } catch {
        continue;
      }
      if (obj.message?.content) yield obj.message.content;
      if (obj.done) return;
    }
  }
  const rest = buf.trim();
  if (rest) {
    try {
      const obj = JSON.parse(rest);
      if (obj.message?.content) yield obj.message.content;
    } catch {}
  }
}

export async function pingOllama() {
  try {
    return (await fetch(`${ollamaUrl()}/api/tags`, { signal: AbortSignal.timeout(800) })).ok ? 'ok' : 'down';
  } catch {
    return 'down';
  }
}
