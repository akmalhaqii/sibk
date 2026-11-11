// GET /api/health — status server dan Ollama
import { Router } from 'express';
import { pingOllama } from '../narrator/client.js';

const router = Router();
router.get('/', async (_req, res) => {
  res.json({ server: 'ok', ollama: await pingOllama() });
});
export default router;