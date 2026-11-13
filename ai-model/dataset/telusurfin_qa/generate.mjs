// Generator dataset TelusurFin-QA (10.000 pasang tanya-jawab, format `messages`).
// Jalankan dari folder backend agar modul & config backend terbaca:
//   node ../ai-model/dataset/telusurfin_qa/generate.mjs
// Hasil: telusurfin_qa_train.jsonl (9.000), telusurfin_qa_holdout.jsonl (1.000), stats.json
import fs from 'node:fs';
import path from 'node:path';
import { HERE, makeRng, loadBeiRows } from './lib.mjs';
import { generateDataItem } from './tasks_data.mjs';
import { generateGlossaryItems, generateConceptItems, generateRefusalItems } from './tasks_other.mjs';

process.env.TELUSURFIN_TEST = '1'; // jangan biarkan backend/.env memengaruhi hasil
const SEED = 20261113;
const rng = makeRng(SEED);

const QUOTA = {
  data: { train: 6120, holdout: 680 },
  glossary: { train: 900, holdout: 100 },
  concept: { train: 1350, holdout: 150 },
  refusal: { train: 630, holdout: 70 },
};

const norm = (s) => s.toLowerCase().replace(/\s+/g, ' ').trim();
const seen = new Set();
const uniq = (item) => {
  const k = norm(item.q);
  if (seen.has(k)) return false;
  seen.add(k);
  return true;
};
const toRow = (category, item, i, split) => ({
  id: `tfqa-${split === 'train' ? 't' : 'h'}-${category}-${String(i).padStart(5, '0')}`,
  category,
  task: item.task,
  messages: [
    { role: 'user', content: item.q.charAt(0).toUpperCase() + item.q.slice(1) },
    { role: 'assistant', content: item.a },
  ],
});

const out = { train: [], holdout: [] };
const push = (category, split, items) => items.forEach((it, i) => out[split].push(toRow(category, it, out[split].length + i, split)));

// ---------- 1. Data BEI tersamar (holdout = emiten sumber yang tidak dipakai di train) ----------
const rows = loadBeiRows().filter((r) => r.ticker && r.total_assets);
const tickers = rng.shuffle(rows.map((r) => r.ticker));
const holdoutTickers = new Set(tickers.slice(0, Math.round(tickers.length * 0.1)));
const dataTrain = [];
const dataHold = [];
const rowsTrain = rows.filter((r) => !holdoutTickers.has(r.ticker));
const rowsHold = rows.filter((r) => holdoutTickers.has(r.ticker));
for (let guard = 0; dataTrain.length < QUOTA.data.train && guard < 200000; guard++) {
  const it = generateDataItem(rowsTrain, rng);
  if (it && uniq(it)) dataTrain.push(it);
}
for (let guard = 0; dataHold.length < QUOTA.data.holdout && guard < 50000; guard++) {
  const it = generateDataItem(rowsHold, rng);
  if (it && uniq(it)) dataHold.push(it);
}

// ---------- 2. Kamus ----------
const gl = rng.shuffle(generateGlossaryItems(rng)).filter(uniq);
const glHold = gl.filter((x) => x.holdoutTpl).slice(0, QUOTA.glossary.holdout);
const glTrain = gl.filter((x) => !glHold.includes(x)).slice(0, QUOTA.glossary.train);

// ---------- 3. Konsep ----------
const co = generateConceptItems().filter(uniq);
const coHoldPool = co.filter((x) => x.holdoutTpl);
const extra = rng.shuffle(co.filter((x) => !x.holdoutTpl && x.key.endsWith('|1|4')));
const coHold = [...coHoldPool, ...extra].slice(0, QUOTA.concept.holdout);
const coTrain = rng.shuffle(co.filter((x) => !coHold.includes(x))).slice(0, QUOTA.concept.train);

// ---------- 4. Penolakan ----------
const realTickers = rows.map((r) => r.ticker);
const re = rng.shuffle(generateRefusalItems(rng, realTickers)).filter(uniq);
const reHold = re.slice(0, QUOTA.refusal.holdout);
const reTrain = re.slice(QUOTA.refusal.holdout, QUOTA.refusal.holdout + QUOTA.refusal.train);

push('data', 'train', dataTrain);
push('glossary', 'train', glTrain);
push('concept', 'train', coTrain);
push('refusal', 'train', reTrain);
push('data', 'holdout', dataHold);
push('glossary', 'holdout', glHold);
push('concept', 'holdout', coHold);
push('refusal', 'holdout', reHold);

out.train = rng.shuffle(out.train);
out.holdout = rng.shuffle(out.holdout);

for (const split of ['train', 'holdout']) {
  fs.writeFileSync(path.join(HERE, `telusurfin_qa_${split}.jsonl`), out[split].map((r) => JSON.stringify(r)).join('\n') + '\n');
}

// ---------- Statistik ----------
const count = (arr, key) => arr.reduce((m, r) => ((m[r[key]] = (m[r[key]] ?? 0) + 1), m), {});
const len = (arr, role) => {
  const xs = arr.map((r) => r.messages.find((m) => m.role === role).content.length).sort((a, b) => a - b);
  return { min: xs[0], median: xs[Math.floor(xs.length / 2)], max: xs[xs.length - 1] };
};
const stats = {
  seed: SEED,
  generated_at: new Date().toISOString(),
  totals: { train: out.train.length, holdout: out.holdout.length, all: out.train.length + out.holdout.length },
  by_category: { train: count(out.train, 'category'), holdout: count(out.holdout, 'category') },
  by_task: { train: count(out.train, 'task'), holdout: count(out.holdout, 'task') },
  chars: { user: len([...out.train, ...out.holdout], 'user'), assistant: len([...out.train, ...out.holdout], 'assistant') },
  holdout_source_tickers: [...holdoutTickers].sort(),
  quota_met: Object.fromEntries(
    Object.entries(QUOTA).map(([c, q]) => [c, { train: (count(out.train, 'category')[c] ?? 0) === q.train, holdout: (count(out.holdout, 'category')[c] ?? 0) === q.holdout }])
  ),
};
fs.writeFileSync(path.join(HERE, 'stats.json'), JSON.stringify(stats, null, 2) + '\n');
console.log(JSON.stringify({ totals: stats.totals, by_category: stats.by_category, quota_met: stats.quota_met }, null, 2));
