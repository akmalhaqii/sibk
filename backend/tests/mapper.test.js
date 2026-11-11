import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mapFields } from '../src/pipeline/mapper.js';
import { Extracted } from '../src/schemas/index.js';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const load = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));

test('mapFields(smgr_rows) memetakan keempat field neraca dan lolos skema Extracted', () => {
  const rows = load('smgr_rows.json');
  const out = mapFields(rows, { ticker: 'SMGR' });
  Extracted.parse(out);

  assert.equal(out.fields.total_assets.value, 75459729);
  assert.equal(out.fields.total_assets.prior, 76568724);
  assert.equal(out.fields.total_liabilities.value, 26067683);
  assert.equal(out.fields.temporary_syirkah.value, 1600000);
  assert.equal(out.fields.total_equity.value, 47792046);
  assert.equal(
    out.fields.total_assets.value,
    out.fields.total_liabilities.value + out.fields.temporary_syirkah.value + out.fields.total_equity.value
  );
});
