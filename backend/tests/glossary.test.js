// A-3: kamus istilah untuk chatbot memuat penjelasan perbedaan angka TelusurFin vs situs lain
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const g = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../config/glossary.json'), 'utf8'));

test('glossary: struktur setiap entri lengkap', () => {
  assert.ok(Array.isArray(g.entries) && g.entries.length >= 8);
  for (const e of g.entries) {
    for (const k of ['term', 'aliases', 'definisi', 'catatan_proyek']) assert.ok(e[k], `${e.term}: ${k}`);
    assert.ok(Array.isArray(e.aliases) && e.aliases.length > 0);
  }
});

test('glossary: istilah yang menjelaskan perbedaan dengan situs lain tersedia', () => {
  const terms = g.entries.map((e) => e.term);
  for (const t of ['Nilai wajar Graham', 'Target harga analis', 'Liabilitas terhadap ekuitas', 'Disetahunkan', 'Laba 12 bulan terakhir (TTM)']) {
    assert.ok(terms.includes(t), t);
  }
  const graham = g.entries.find((e) => e.term === 'Nilai wajar Graham');
  assert.match(graham.catatan_proyek, /bukan target harga analis/);
});
