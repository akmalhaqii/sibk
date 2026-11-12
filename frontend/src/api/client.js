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

// REV-06: mode 'template' = ringkasan otomatis seketika; mode 'llm' = coba Qwen (bisa ±30 detik)
export async function narrative(payload, { mode = 'llm', signal } = {}) {
  if (USE_MOCK) {
    await delay(mode === 'template' ? 50 : 300);
    return structuredClone(mockNarrative);
  }
  const qs = mode === 'template' ? '?mode=template' : '';
  const res = await fetch(`${BASE}/narrative${qs}`, {
    signal,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return checkOk(res);
}

export const getPrice = (ticker) => fetch(`${BASE}/price/${ticker}`).then(checkOk);
export const getHealth = () => fetch(`${BASE}/health`).then(checkOk);

// FR-OUT-01: unduh laporan akhir (md | json) dari backend dan simpan sebagai berkas
export async function downloadReport(result, narrativeData, format = 'md') {
  if (USE_MOCK) throw new Error('Ekspor laporan membutuhkan backend (VITE_USE_MOCK=false).');
  const res = await fetch(`${BASE}/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ result, narrative: narrativeData ?? null, format }),
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { msg = (await res.json()).error || msg; } catch {}
    throw new Error(msg);
  }
  const disposition = res.headers.get('Content-Disposition') || '';
  const filename = /filename="([^"]+)"/.exec(disposition)?.[1] || `TelusurFin_laporan.${format}`;
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return filename;
}
