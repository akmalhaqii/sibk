// R-03: multer.diskStorage menyimpan berkas dengan nama <hash>.pdf di data/uploads
// agar express.static('/files') menyajikan Content-Type: application/pdf
// dan tautan /files/<file_id>.pdf#page=N langsung membuka PDF di browser.
import fs from 'node:fs';
import crypto from 'node:crypto';
import multer from 'multer';
import env from '../config/env.js';

fs.mkdirSync(env.uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, env.uploadDir),
  filename: (_req, file, cb) => {
    const id = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    cb(null, `${id}.pdf`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: env.maxUploadMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const isPdf = file.mimetype === 'application/pdf' || file.originalname?.toLowerCase().endsWith('.pdf');
    cb(null, isPdf);
  },
});
