// GET /api/health — status server dan Ollama, plus saklar fitur (frontend menyembunyikan fitur yang mati)
import { Router } from 'express';
import env from '../config/env.js';
import { pingOllama } from '../narrator/client.js';

const router = Router();
router.get('/', async (_req, res) => {
  res.json({
    server: 'ok',
    ollama: await pingOllama(),
    features: {
      chat: env.chat.enabled,
      chat_page: env.chat.enabled && env.chat.pageEnabled,
      chat_free_mode: env.chat.enabled && Boolean(env.chat.financeModel),
    },
  });
});
export default router;
