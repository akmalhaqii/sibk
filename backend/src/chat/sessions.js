// C2: penyimpanan sesi chat per file di data/chat_sessions/<id>.json (tulis atomik + antrean per id)
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import env from '../config/env.js';

export const SESSION_ID_RE = /^cs_\d+_[a-z0-9]{4}$/;
const PENDING_TIMEOUT_MS = 2 * 60 * 1000;

const locks = new Map();

function getSessionDir() {
  return process.env.CHAT_SESSION_DIR
    ? path.resolve(env.backendRoot, process.env.CHAT_SESSION_DIR)
    : env.chatSessionDir;
}

export function isValidSessionId(id) {
  return typeof id === 'string' && SESSION_ID_RE.test(id);
}

function sessionPath(id) {
  if (!isValidSessionId(id)) return null;
  return path.join(getSessionDir(), `${id}.json`);
}

function withSessionLock(id, fn) {
  const prev = locks.get(id) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  const tail = next.catch(() => {});
  locks.set(id, tail);
  tail.finally(() => {
    if (locks.get(id) === tail) locks.delete(id);
  });
  return next;
}

function genSessionId() {
  const ts = Math.floor(Date.now() / 1000);
  const rand = crypto.randomBytes(4).toString('hex').replace(/[^a-z0-9]/g, '').slice(0, 4).padEnd(4, '0');
  return `cs_${ts}_${rand}`;
}

export function genMsgId() {
  return `msg_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`;
}

async function writeAtomic(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(tmpPath, filePath);
}

export function trimSnapshot(result) {
  if (!result || typeof result !== 'object') return null;
  const { entity, fields, validation, metrics, tiering, market, valuation } = result;
  return { entity, fields, validation, metrics, tiering, market, valuation };
}

function formatBaseTitle(analysis) {
  if (!analysis?.ticker) return 'Analisis Emiten';
  const year = analysis.period_end ? String(analysis.period_end).slice(0, 4) : '';
  return [analysis.ticker, analysis.period_type, year].filter(Boolean).join(' ');
}

function truncateQuestion(q) {
  const clean = String(q || '').trim().replace(/\s+/g, ' ');
  return clean.length > 40 ? clean.slice(0, 40).trimEnd() : clean;
}

function isStalePending(session) {
  if (!session?.pending) return false;
  const updatedMs = Date.parse(session.updated_at || '');
  if (!Number.isFinite(updatedMs)) return true;
  return Date.now() - updatedMs > PENDING_TIMEOUT_MS;
}

async function readRawSession(id) {
  const fp = sessionPath(id);
  if (!fp) return null;
  try {
    const raw = await fs.readFile(fp, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function healIfStale(session) {
  if (!session || !isStalePending(session)) return session;
  return withSessionLock(session.id, async () => {
    const fresh = await readRawSession(session.id);
    if (!fresh || !isStalePending(fresh)) return fresh ?? session;
    const now = new Date().toISOString();
    fresh.pending = false;
    fresh.updated_at = now;
    fresh.messages = Array.isArray(fresh.messages) ? fresh.messages : [];
    fresh.messages.push({
      id: genMsgId(),
      role: 'system',
      content: 'Jawaban sebelumnya terputus karena server dimulai ulang.',
      created_at: now,
    });
    await writeAtomic(sessionPath(fresh.id), fresh);
    return fresh;
  });
}

export async function getSession(id) {
  const s = await readRawSession(id);
  if (!s) return null;
  return healIfStale(s);
}

export async function findByFileId(fileId) {
  if (!fileId) return null;
  const dir = getSessionDir();
  let entries = [];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return null;
  }
  const matches = [];
  for (const name of entries) {
    if (!name.endsWith('.json')) continue;
    const id = name.slice(0, -5);
    if (!isValidSessionId(id)) continue;
    const s = await readRawSession(id);
    if (s && s.mode === 'analysis' && s.analysis?.file_id === fileId) {
      matches.push(s);
    }
  }
  if (!matches.length) return null;
  matches.sort((a, b) => Date.parse(b.updated_at || 0) - Date.parse(a.updated_at || 0));
  return healIfStale(matches[0]);
}

export async function createSession({ result, mode, origin } = {}) {
  if (result) {
    const fileId = result.entity?.file_id ?? null;
    if (fileId && origin !== 'chatbot') {
      const existing = await findByFileId(fileId);
      if (existing) return { session: existing, created: false };
    }
    const now = new Date().toISOString();
    const id = genSessionId();
    const analysis = {
      ticker: result.entity?.ticker ?? 'UNKNOWN',
      period_type: result.entity?.period_type ?? null,
      period_end: result.entity?.period_end ?? null,
      file_id: fileId,
      source: result.entity?.source ?? null,
    };
    const session = {
      id,
      version: 1,
      mode: 'analysis',
      title: formatBaseTitle(analysis),
      created_at: now,
      updated_at: now,
      origin: origin || 'analysis',
      analysis,
      snapshot: trimSnapshot(result),
      pending: false,
      messages: [],
    };
    await withSessionLock(id, () => writeAtomic(sessionPath(id), session));
    return { session, created: true };
  }

  if (mode === 'glossary_only') {
    const now = new Date().toISOString();
    const id = genSessionId();
    const session = {
      id,
      version: 1,
      mode: 'glossary_only',
      title: 'Kamus TelusurFin',
      created_at: now,
      updated_at: now,
      origin: origin || 'chatbot',
      analysis: null,
      snapshot: null,
      pending: false,
      messages: [],
    };
    await withSessionLock(id, () => writeAtomic(sessionPath(id), session));
    return { session, created: true };
  }

  const err = new Error('Parameter pembuatan sesi tidak valid');
  err.status = 400;
  throw err;
}

export async function listSessions() {
  const dir = getSessionDir();
  let entries = [];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return [];
  }
  const summaries = [];
  for (const name of entries) {
    if (!name.endsWith('.json')) continue;
    const id = name.slice(0, -5);
    if (!isValidSessionId(id)) continue;
    const raw = await readRawSession(id);
    if (!raw) continue;
    const s = await healIfStale(raw);
    summaries.push({
      id: s.id,
      title: s.title,
      mode: s.mode,
      analysis: s.analysis
        ? {
            ticker: s.analysis.ticker,
            period_type: s.analysis.period_type ?? null,
            period_end: s.analysis.period_end ?? null,
            file_id: s.analysis.file_id ?? null,
            source: s.analysis.source ?? null,
          }
        : null,
      created_at: s.created_at,
      updated_at: s.updated_at,
      pending: Boolean(s.pending),
      message_count: Array.isArray(s.messages) ? s.messages.length : 0,
    });
  }
  summaries.sort((a, b) => Date.parse(b.updated_at || 0) - Date.parse(a.updated_at || 0));
  return summaries;
}

export async function updateSession(id, { result, title } = {}) {
  const fp = sessionPath(id);
  if (!fp) return null;
  return withSessionLock(id, async () => {
    const s = await readRawSession(id);
    if (!s) return null;
    const now = new Date().toISOString();

    if (result !== undefined) {
      const prevFileId = s.analysis?.file_id ?? null;
      const nextFileId = result.entity?.file_id ?? null;
      if (s.mode !== 'analysis' || prevFileId !== nextFileId) {
        const err = new Error('file_id pada snapshot tidak cocok dengan sesi');
        err.status = 409;
        throw err;
      }
      s.snapshot = trimSnapshot(result);
      s.analysis = {
        ticker: result.entity?.ticker ?? s.analysis?.ticker ?? 'UNKNOWN',
        period_type: result.entity?.period_type ?? s.analysis?.period_type ?? null,
        period_end: result.entity?.period_end ?? s.analysis?.period_end ?? null,
        file_id: nextFileId,
        source: result.entity?.source ?? s.analysis?.source ?? null,
      };
      s.messages = Array.isArray(s.messages) ? s.messages : [];
      s.messages.push({
        id: genMsgId(),
        role: 'system',
        content: 'Angka diperbarui.',
        created_at: now,
      });
    }

    if (title !== undefined) {
      s.title = String(title).trim();
    }

    s.updated_at = now;
    await writeAtomic(fp, s);
    return s;
  });
}

export async function appendMessage(id, message, { pending } = {}) {
  const fp = sessionPath(id);
  if (!fp) return null;
  return withSessionLock(id, async () => {
    const s = await readRawSession(id);
    if (!s) return null;
    const now = new Date().toISOString();
    s.messages = Array.isArray(s.messages) ? s.messages : [];

    const hasUserBefore = s.messages.some((m) => m.role === 'user');
    const saved = {
      id: message.id || genMsgId(),
      created_at: message.created_at || now,
      ...message,
    };

    if (saved.role === 'user' && !hasUserBefore) {
      const qShort = truncateQuestion(saved.content);
      if (s.mode === 'glossary_only') {
        s.title = `Kamus · ${qShort}`;
      } else if (s.mode === 'analysis') {
        s.title = `${formatBaseTitle(s.analysis)} · ${qShort}`;
      }
    }

    s.messages.push(saved);
    if (pending !== undefined) s.pending = Boolean(pending);
    s.updated_at = now;
    await writeAtomic(fp, s);
    return { session: s, message: saved };
  });
}

export async function setSessionPending(id, pending) {
  const fp = sessionPath(id);
  if (!fp) return null;
  return withSessionLock(id, async () => {
    const s = await readRawSession(id);
    if (!s) return null;
    s.pending = Boolean(pending);
    s.updated_at = new Date().toISOString();
    await writeAtomic(fp, s);
    return s;
  });
}

export async function deleteSession(id) {
  const fp = sessionPath(id);
  if (!fp) return false;
  return withSessionLock(id, async () => {
    try {
      await fs.unlink(fp);
      return true;
    } catch {
      return false;
    }
  });
}
