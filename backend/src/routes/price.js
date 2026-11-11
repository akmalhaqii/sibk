// GET /api/price/:ticker — harga terkini + waktu ambil (FR-MKT)
import { Router } from 'express';
import { fetchPrice } from '../pipeline/market.js';

const router = Router();
router.get('/:ticker', async (req, res, next) => {
  try { res.json(await fetchPrice(req.params.ticker)); } catch (e) { next(e); }
});
export default router;