// Semua path relatif terhadap folder backend/.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
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
    url: process.env.OLLAMA_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'qwen3:4b',
    fallbackModel: process.env.OLLAMA_FALLBACK_MODEL || 'qwen3:1.7b',
    timeoutMs: Number(process.env.OLLAMA_TIMEOUT_MS || 60000),
  },
  promptVersion: process.env.PROMPT_VERSION || 'narrative_v1',
};
