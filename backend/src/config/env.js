// Semua path relatif terhadap folder backend/.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// Isi backend/.env MENANG atas variabel environment Windows/PowerShell yang sudah ada.
// Alasan: `node --env-file` tidak menimpa variabel yang sudah ter-set, sehingga PROMPT_VERSION lama
// di environment Windows diam-diam mengalahkan .env (ditemukan saat eval 13 Nov 2026).
// Dilewati saat tes (TELUSURFIN_TEST=1, diset tests/setup.js) agar tes tetap deterministik.
const envPath = path.join(backendRoot, '.env');
if (process.env.TELUSURFIN_TEST !== '1' && fs.existsSync(envPath)) {
  try {
    const fromFile = parseEnv(fs.readFileSync(envPath, 'utf8'));
    const overridden = Object.keys(fromFile).filter(
      (k) => process.env[k] !== undefined && process.env[k] !== fromFile[k]
    );
    Object.assign(process.env, fromFile);
    if (overridden.length) {
      console.warn(`[env] nilai dari backend/.env dipakai menggantikan variabel environment: ${overridden.join(', ')}`);
    }
  } catch (e) {
    console.warn(`[env] gagal membaca backend/.env: ${e.message}`);
  }
}
const r = (p, d) => path.resolve(backendRoot, p || d);

export default {
  backendRoot,
  dataDir: r(process.env.DATA_DIR, '../data'),
  uploadDir: r(process.env.UPLOAD_DIR, '../data/uploads'),
  cacheDir: r(process.env.CACHE_DIR, '../data/cache'),
  parserOutputDir: r(process.env.PARSER_OUTPUT_DIR, '../data/processed/parser_output'),
  tierModelPath: r(process.env.TIER_MODEL_PATH, './models/tier_kmeans.json'),
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB || 50),
  ollama: {
    url: process.env.OLLAMA_URL || 'http://127.0.0.1:11434',
    model: process.env.OLLAMA_MODEL || 'qwen3:4b',
    fallbackModel: process.env.OLLAMA_FALLBACK_MODEL || 'qwen3:1.7b',
    timeoutMs: Number(process.env.OLLAMA_TIMEOUT_MS || 60000),
    numPredict: Number(process.env.OLLAMA_NUM_PREDICT || 400), // REV-06
  },
  promptVersion: process.env.PROMPT_VERSION || 'narrative_v6',
};
