// Wrapper fetch ke backend.
// R-07: bila VITE_USE_MOCK=true, kembalikan isi src/mock/*.json (dengan jeda singkat untuk overlay)
// sehingga frontend bisa dikembangkan tanpa backend menyala.
import mockAnalyze from '../mock/analyze.json';
import mockNarrative from '../mock/narrative.json';

const BASE = import.meta.env.VITE_API_BASE ?? '/api';
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function checkOk(res) {
  if (!res.ok) {
    const text = await res.text();
    let msg = text;
    try { msg = JSON.parse(text).error || text; } catch {}
    throw new Error(msg || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function analyze(formData) {
  if (USE_MOCK) {
    await delay(400);
    return structuredClone(mockAnalyze);
  }
  const res = await fetch(`${BASE}/analyze`, { method: 'POST', body: formData });
  return checkOk(res);
}

export async function recompute(payload) {
  if (USE_MOCK) {
    await delay(200);
    return { ...structuredClone(mockAnalyze), ...payload };
  }
  const res = await fetch(`${BASE}/recompute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return checkOk(res);
}

export async function narrative(payload) {
  if (USE_MOCK) {
    await delay(300);
    return structuredClone(mockNarrative);
  }
  const res = await fetch(`${BASE}/narrative`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return checkOk(res);
}

export const getPrice = (ticker) => fetch(`${BASE}/price/${ticker}`).then(checkOk);
export const getHealth = () => fetch(`${BASE}/health`).then(checkOk);
