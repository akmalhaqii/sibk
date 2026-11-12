// GET /api/health — status server dan Ollama, plus saklar fitur (frontend menyembunyikan fitur yang mati)
import { Router } from 'express';
import env from '../config/env.js';
import { pingOllama } from '../narrator/client.js';

const router = Router();
router.get('/', async (_req, res) => {
  const chatOn = env.chat.enabled && process.env.CHAT_ENABLED !== 'false';
  const pageOn = chatOn && env.chat.pageEnabled && process.env.CHAT_PAGE_ENABLED !== 'false';
  res.json({
    server: 'ok',
    ollama: await pingOllama(),
    features: {
      chat: chatOn,
      chat_page: pageOn,
      chat_free_mode: chatOn && Boolean(env.chat.financeModel),
    },
  });
});
export default router;
