// C2/C3: endpoint sesi chat (/api/chat/*). Bila CHAT_ENABLED=false, semua endpoint mengembalikan 404.
import { Router } from 'express';
import env from '../config/env.js';
import { ChatSessionCreate, ChatSessionPatch } from '../schemas/index.js';
import {
  createSession,
  deleteSession,
  getSession,
  isValidSessionId,
  listSessions,
  updateSession,
} from '../chat/sessions.js';

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

export default router;
