// C4: klien API chatbot + pembaca SSE (ReadableStream)
const BASE = import.meta.env.VITE_API_BASE ?? '/api';
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

async function checkOk(res) {
  if (!res.ok) {
    const text = await res.text();
    let msg = text;
    try {
      msg = JSON.parse(text).error || text;
    } catch {}
    const err = new Error(msg || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}

export async function listAnalyses({ all = false } = {}) {
  if (USE_MOCK) return [];
  const qs = all ? '?all=1' : '';
  return checkOk(await fetch(`${BASE}/analyses${qs}`));
}

export async function listChatSessions() {
  if (USE_MOCK) return [];
  return checkOk(await fetch(`${BASE}/chat/sessions`));
}

export async function getChatSession(id) {
  return checkOk(await fetch(`${BASE}/chat/sessions/${encodeURIComponent(id)}`));
}

export async function createChatSession(payload) {
  return checkOk(
    await fetch(`${BASE}/chat/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  );
}

export async function patchChatSession(id, payload) {
  return checkOk(
    await fetch(`${BASE}/chat/sessions/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  );
}

export async function deleteChatSession(id) {
  return checkOk(
    await fetch(`${BASE}/chat/sessions/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
  );
}

export async function sendMessage(id, content, { onEvent, signal } = {}) {
  const res = await fetch(`${BASE}/chat/sessions/${encodeURIComponent(id)}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
    signal,
  });

  if (!res.ok) {
    return checkOk(res);
  }
  if (!res.body) {
    throw new Error('Respons aliran tidak tersedia');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  const dispatchBlock = (block) => {
    const lines = block.split(/\r?\n/);
    let eventName = 'message';
    const dataLines = [];
    for (const line of lines) {
      if (line.startsWith('event:')) {
        eventName = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trim());
      }
    }
    if (!dataLines.length) return;
    let payload = {};
    try {
      payload = JSON.parse(dataLines.join('\n'));
    } catch {}
    onEvent?.(eventName, payload);
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf('\n\n')) !== -1) {
      const block = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      if (block.trim()) dispatchBlock(block);
    }
  }
  if (buf.trim()) dispatchBlock(buf);
}
