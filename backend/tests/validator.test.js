import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate } from '../src/pipeline/validator.js';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const load = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));

test('validator: keempat cek SMGR lulus dan needs_review = false', () => {
  const { fields } = load('smgr_fields_company.json');
  const res = validate(fields);
  assert.equal(res.needs_review, false);
  const byName = Object.fromEntries(res.checks.map((c) => [c.name, c]));
  assert.equal(byName.balance_identity?.pass, true);
  assert.equal(byName.assets_split?.pass, true);
  assert.equal(byName.liabilities_split?.pass, true);
  assert.equal(byName.gross_profit?.pass, true);
});

test('validator: ubah total_equity +1000 -> balance_identity gagal dan needs_review = true', () => {
  const { fields } = load('smgr_fields_company.json');
  fields.total_equity.value += 1000;
  const res = validate(fields);
  assert.equal(res.needs_review, true);
  const bal = res.checks.find((c) => c.name === 'balance_identity');
  assert.equal(bal.pass, false);
});
