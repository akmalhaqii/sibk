// POST /api/narrative — Qwen3 lokal, fallback ringkasan templat (FR-NAR)
import { Router } from 'express';
import { generateNarrative } from '../narrator/service.js';

const router = Router();
router.post('/', async (req, res, next) => {
  try { res.json(await generateNarrative(req.body)); } catch (e) { next(e); }
});
export default router;