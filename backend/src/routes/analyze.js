// POST /api/analyze — PDF + ticker + shares (opsional) -> fields, validation, metrics, tiering, market, valuation
// R-08: kembalikan 400 "Berkas harus PDF" bila req.file kosong; parse shares ke angka / null.
import { Router } from 'express';
import { upload } from '../middleware/upload.js';
import { runPipeline } from '../pipeline/index.js';

const router = Router();
router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Berkas harus PDF' });
    }
    const ticker = String(req.body?.ticker || '').trim().toUpperCase();
    if (!ticker) {
      return res.status(400).json({ error: 'Kode saham (ticker) wajib diisi' });
    }
    const rawShares = req.body?.shares;
    const shares =
      rawShares === undefined || rawShares === null || String(rawShares).trim() === ''
        ? null
        : Number(rawShares);
    if (shares !== null && (!Number.isFinite(shares) || shares <= 0)) {
      return res.status(400).json({ error: 'Jumlah saham harus angka positif' });
    }
    res.json(await runPipeline({ file: req.file, ticker, shares }));
  } catch (e) {
    next(e);
  }
});
export default router;
