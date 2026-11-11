// POST /api/recompute — koreksi angka dari pengguna -> hitung ulang metrics, tiering, valuation (FR-UI-04)
import { Router } from 'express';
import { recompute } from '../pipeline/index.js';

const router = Router();
router.post('/', async (req, res, next) => {
  try { res.json(await recompute(req.body)); } catch (e) { next(e); }
});
export default router;