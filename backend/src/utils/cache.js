// Cache berkas hasil analisis & narasi di data/cache
import fs from 'node:fs/promises';
import path from 'node:path';
import env from '../config/env.js';

const safePath = (key) => path.join(env.cacheDir, `${key.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`);

export async function getCache(key) {
  try {
    return JSON.parse(await fs.readFile(safePath(key), 'utf8'));
  } catch {
    return null;
  }
}

export async function setCache(key, value) {
  await fs.mkdir(env.cacheDir, { recursive: true });
  await fs.writeFile(safePath(key), JSON.stringify(value, null, 2), 'utf8');
}
