// POST /api/narrative — Qwen3 lokal, fallback ringkasan templat (FR-NAR)
// REV-05: body divalidasi dulu; body yang bukan hasil analisis ditolak 400 tanpa memanggil LLM.
// REV-06: ?mode=template mengembalikan ringkasan templat seketika (UI menampilkannya selagi Qwen menulis).
import { Router } from 'express';
import { generateNarrative } from '../narrator/service.js';
import { AnalysisInput } from '../schemas/index.js';

const router = Router();
router.post('/', async (req, res, next) => {
  const parsed = AnalysisInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Body narasi harus berupa hasil analisis (entity dan metrics).' });
  }
  try {
    const templateOnly = req.query.mode === 'template';
    res.json(await generateNarrative(req.body, templateOnly ? { useLlm: false } : undefined));
  } catch (e) {
    next(e);
  }
});
export default router;
