// C2: GET /api/analyses — ringkasan hasil analisis tersimpan (untuk dialog sesi baru di C5)
import { Router } from 'express';
import { listAnalyses } from '../chat/analyses.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const all = req.query.all === '1' || req.query.all === 'true';
    res.json(await listAnalyses({ all }));
  } catch (e) {
    next(e);
  }
});

export default router;
