import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isNumber, parseNumber, toRows, parsePageRows } from '../src/pipeline/parser.js';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const load = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));

test('parseNumber menangani pemisah ribuan titik (id-dot), koma (en-comma), tanda kurung negatif, dan strip', () => {
  assert.equal(parseNumber('75.459.729', 'id-dot'), 75459729);
  assert.equal(parseNumber('(6.619.196)', 'id-dot'), -6619196);
  assert.equal(parseNumber('75,459,729', 'en-comma'), 75459729);
  assert.equal(parseNumber('(40,039)', 'en-comma'), -40039);
  assert.equal(parseNumber('-', 'id-dot'), 0);
  assert.equal(parseNumber('—', 'id-dot'), 0);
  assert.equal( isNumber('75.459.729'), true);
});

test('toRows dan parsePageRows pada fixture smgr_textcontent_p5 menghasilkan smgr_rows.json', () => {
  const tc = load('smgr_textcontent_p5.json');
  const expected = load('smgr_rows.json');
  const rawRows = toRows(tc.items);
  assert.equal(rawRows.length, 4);

  const parsed = parsePageRows(tc.items, {
    page: tc.page,
    statement: 'posisi_keuangan',
    locale: 'id-dot',
    isFixture: true,
  });
  assert.deepEqual(parsed, expected);
});
