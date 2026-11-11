// Kontrak: setiap mock frontend harus lolos skema zod backend.
// Mock baru wajib didaftarkan di MOCK_SCHEMAS, kalau tidak tes gagal.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AnalyzeResponse, NarrativeResponse } from '../src/schemas/index.js';

const mockDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../frontend/src/mock');

const MOCK_SCHEMAS = {
  'analyze.json': AnalyzeResponse,
  'narrative.json': NarrativeResponse,
};

const files = fs.readdirSync(mockDir).filter((f) => f.endsWith('.json'));

test('semua mock terdaftar di MOCK_SCHEMAS', () => {
  const unregistered = files.filter((f) => !MOCK_SCHEMAS[f]);
  assert.deepEqual(unregistered, [], `Daftarkan skema untuk: ${unregistered.join(', ')}`);
});

for (const file of files) {
  test(`mock ${file} sesuai skema`, () => {
    const schema = MOCK_SCHEMAS[file];
    if (!schema) return; // sudah dilaporkan tes di atas
    const data = JSON.parse(fs.readFileSync(path.join(mockDir, file), 'utf8'));
    const r = schema.safeParse(data);
    assert.ok(r.success, r.success ? '' : JSON.stringify(r.error.issues, null, 2));
  });
}
