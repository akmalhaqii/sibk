// C2/C3: endpoint sesi chat (/api/chat/*). Bila CHAT_ENABLED=false, semua endpoint mengembalikan 404.
import { Router } from 'express';
import env from '../config/env.js';
import { ChatMessageCreate, ChatSessionCreate, ChatSessionPatch } from '../schemas/index.js';
import {
  createSession,
  deleteSession,
  getSession,
  isValidSessionId,
  listSessions,
  setSessionPending,
  updateSession,
} from '../chat/sessions.js';
import { answerQuestion } from '../chat/service.js';

const router = Router();

router.use((_req, res, next) => {
  const enabled = env.chat.enabled && process.env.CHAT_ENABLED !== 'false';
  if (!enabled) return res.status(404).json({ error: 'chat_disabled' });
  next();
});

router.get('/sessions', async (_req, res, next) => {
  try {
    res.json(await listSessions());
  } catch (e) {
    next(e);
  }
});

router.post('/sessions', async (req, res, next) => {
  const parsed = ChatSessionCreate.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Payload pembuatan sesi tidak valid.' });
  }
  const body = parsed.data;
  if (body.mode === 'free') {
    return res.status(400).json({ error: 'Mode tanya bebas belum tersedia pada Tahap 1.' });
  }
  try {
    const { session, created } = await createSession(body);
    return res.status(created ? 201 : 200).json(session);
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message });
    next(e);
  }
});

router.get('/sessions/:id', async (req, res, next) => {
  if (!isValidSessionId(req.params.id)) {
    return res.status(404).json({ error: 'Sesi tidak ditemukan' });
  }
  try {
    const s = await getSession(req.params.id);
    if (!s) return res.status(404).json({ error: 'Sesi tidak ditemukan' });
    res.json(s);
  } catch (e) {
    next(e);
  }
});

router.patch('/sessions/:id', async (req, res, next) => {
  if (!isValidSessionId(req.params.id)) {
    return res.status(404).json({ error: 'Sesi tidak ditemukan' });
  }
  const parsed = ChatSessionPatch.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Payload pembaruan sesi tidak valid.' });
  }
  try {
    const updated = await updateSession(req.params.id, parsed.data);
    if (!updated) return res.status(404).json({ error: 'Sesi tidak ditemukan' });
    res.json(updated);
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message });
    next(e);
  }
});

router.delete('/sessions/:id', async (req, res, next) => {
  if (!isValidSessionId(req.params.id)) {
    return res.status(404).json({ error: 'Sesi tidak ditemukan' });
  }
  try {
    const ok = await deleteSession(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Sesi tidak ditemukan' });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

router.post('/sessions/:id/messages', async (req, res) => {
  if (!isValidSessionId(req.params.id)) {
    return res.status(404).json({ error: 'Sesi tidak ditemukan' });
  }
  const parsed = ChatMessageCreate.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Pesan harus berisi 1 sampai 500 karakter.' });
  }
  const session = await getSession(req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Sesi tidak ditemukan' });
  }

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  let clientGone = false;
  res.on('close', () => {
    if (!res.writableEnded) clientGone = true;
  });

  const emit = (event, data) => {
    if (clientGone || res.writableEnded) return;
    try {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch {
      clientGone = true;
    }
  };

  try {
    await answerQuestion({ session, question: parsed.data.content, emit });
  } catch (err) {
    await setSessionPending(session.id, false).catch(() => {});
    emit('error', { error: err?.message || 'Gagal memproses pesan.' });
  } finally {
    if (!res.writableEnded) res.end();
  }
});

export default router;
