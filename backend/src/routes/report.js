// POST /api/report — FR-OUT-01: unduh laporan akhir (format md atau json).
// Body: { result: <hasil analysis/recompute>, narrative?: <respons /api/narrative>, format?: 'md' | 'json' }
// PDF dibuat di browser lewat tombol "Cetak / Simpan PDF" (window.print + gaya cetak).
import { Router } from 'express';
import { AnalysisInput } from '../schemas/index.js';
import { buildReportMarkdown, buildReportJson, reportFilename } from '../report/markdown.js';

const router = Router();
router.post('/', (req, res, next) => {
  try {
    const { result, narrative = null, format = 'md' } = req.body ?? {};
    if (!AnalysisInput.safeParse(result).success) {
      return res.status(400).json({ error: 'Body laporan harus memuat result berupa hasil analisis.' });
    }
    if (!['md', 'json'].includes(format)) {
      return res.status(400).json({ error: 'Format laporan harus md atau json.' });
    }
    const narr = narrative && typeof narrative.text === 'string' ? narrative : null;

    if (format === 'json') {
      res.setHeader('Content-Disposition', `attachment; filename="${reportFilename(result, 'json')}"`);
      return res.json(buildReportJson(result, narr));
    }
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${reportFilename(result, 'md')}"`);
    return res.send(buildReportMarkdown(result, narr));
  } catch (e) {
    next(e);
  }
});
export default router;
