// Alur evaluasi parser (Node -> berkas -> Python), pola sama dengan build_features.js:
//
//   data/raw/pdf/<TICKER>_<PERIODE>_<company|bei>.pdf
//     -> [skrip ini] ingest + parser + mapper (kode pipeline yang sama dengan API)
//     -> data/processed/parser_output/<TICKER>_<PERIODE>_<company|bei>.json   (skema Extracted)
//     -> ai-model/eval/run_eval.py membandingkan dengan data/ground_truth/bei_excel/<TICKER>_<PERIODE>.json
//
// Pemakaian:  npm run export:parser                (semua PDF di data/raw/pdf)
//             npm run export:parser -- SMGR_2026Q1_company.pdf
import fs from 'node:fs';
import path from 'node:path';
import env from '../src/config/env.js';
import { ingest } from '../src/pipeline/ingest.js';
import { parse } from '../src/pipeline/parser.js';
import { mapFields } from '../src/pipeline/mapper.js';
import { Extracted } from '../src/schemas/index.js';

const pdfDir = path.join(env.dataDir, 'raw/pdf');
const targets = process.argv.slice(2).length
  ? process.argv.slice(2)
  : fs.readdirSync(pdfDir).filter((f) => f.toLowerCase().endsWith('.pdf'));

fs.mkdirSync(env.parserOutputDir, { recursive: true });

for (const name of targets) {
  const base = path.basename(name, '.pdf');
  const [ticker, period, source] = base.split('_');
  const pages = await ingest({ path: path.join(pdfDir, name), originalname: name });
  const rows = await parse(pages);
  const extracted = mapFields(rows, { ticker });
  extracted.entity.source ??= source === 'bei' ? 'bei_pdf' : 'company_pdf';

  Extracted.parse(extracted); // kontrak yang sama dengan API
  const out = path.join(env.parserOutputDir, `${base}.json`);
  fs.writeFileSync(out, JSON.stringify({ ...extracted, _meta: { pdf: name, period, exported_at: new Date().toISOString() } }, null, 2));
  console.log(`[export:parser] ${name} -> ${path.relative(env.dataDir, out)}`);
}
