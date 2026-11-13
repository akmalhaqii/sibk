// C3: bangun pesan chat untuk Ollama (<= 1500 token ~ 6000 karakter)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildInput } from '../narrator/input.js';
import { buildStatusSheet } from '../narrator/qualitative.js';
import { fmtRupiah } from '../format.js';
import { factLines } from './facts.js';

const PROMPT_PATH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'prompts/chat_v2.txt');
const MAX_TOTAL_CHARS = 6000; // ~1500 token

const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export function formatEmitenHeader(entity = {}) {
  const ticker = entity.ticker || 'EMITEN';
  const periodType = entity.period_type || '';
  const periodEnd = entity.period_end || '';
  const year = periodEnd.slice(0, 4);
  let periodDate = periodEnd;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(periodEnd);
  if (m) {
    const mon = MONTHS_ID[Number(m[2]) - 1];
    if (mon) periodDate = `${Number(m[3])} ${mon} ${m[1]}`;
  }
  const head = [ticker, periodType && year ? `${periodType} ${year}` : periodType || year].filter(Boolean).join(' · ');
  return periodDate ? `${head} (periode berakhir ${periodDate})` : head;
}

function buildValuationLine(snapshot = {}) {
  const v = snapshot.valuation ?? {};
  const price = snapshot.market?.price;
  if (price == null) {
    const reason = v.per?.unavailable_reason ?? v.fair_value?.unavailable_reason ?? 'harga saham belum tersedia';
    return `- Valuasi: belum dapat dihitung (${reason})`;
  }
  const parts = [`harga saham ${fmtRupiah(price)}`];
  if (v.per?.display && v.per.display !== '—') parts.push(`PER ${v.per.display}`);
  if (v.pbv?.display && v.pbv.display !== '—') parts.push(`PBV ${v.pbv.display}`);
  if (v.ps?.display && v.ps.display !== '—') parts.push(`P/S ${v.ps.display}`);
  if (v.fair_value?.display && v.fair_value.display !== '—') parts.push(`nilai wajar Graham ${v.fair_value.display}`);
  if (v.premium_discount?.display && v.premium_discount.display !== '—') {
    const pd = v.premium_discount.display;
    parts.push(`harga terhadap nilai wajar ${pd} (${/^[−-]/.test(pd) ? 'di bawah nilai wajar Graham' : 'di atas nilai wajar Graham'})`);
  }
  return `- Valuasi: ${parts.join(', ')}`;
}

// CH-09: potong label field dari PDF maksimal 80 karakter bila disertakan
export const trimLabel = (label = '') => {
  const s = String(label).replace(/\s+/g, ' ').trim();
  return s.length > 80 ? `${s.slice(0, 77)}...` : s;
};

export function buildChatMessages({ session, question }) {
  const snapshot = session?.snapshot ?? {};
  const input = buildInput(snapshot);
  const rawSheet = buildStatusSheet(input, { withNumbers: true });
  // Ganti baris "- Valuasi: ..." agar angka PER, PBV, harga, dan nilai wajar tersedia di DATA
  // Tambah angka laporan (laba, pendapatan, aset, ...) agar "berapa labanya?" bisa dijawab dari DATA
  const facts = factLines(snapshot);
  const status = rawSheet
    .replace(/^- Valuasi:.*$/m, buildValuationLine(snapshot))
    .replace(/^(- Keterbatasan:)/m, facts ? `${facts}\n$1` : '$1');

  const template = fs.readFileSync(PROMPT_PATH, 'utf8');
  const systemContent = template
    .replace('{{emiten}}', formatEmitenHeader(snapshot.entity))
    .replace('{{status}}', status);

  const cleanQuestion = String(question ?? '').trim().slice(0, 500);

  // Maksimal 3 pasang tanya-jawab terakhir (user & assistant saja; system tidak dikirim)
  const conv = (session?.messages ?? [])
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .slice(-6)
    .map((m) => ({ role: m.role, content: String(m.content || '').slice(0, 600) }));

  // Pangkas pasangan tertua bila total karakter melebihi 6000 (~1500 token)
  const calcChars = (hist) =>
    systemContent.length +
    cleanQuestion.length +
    hist.reduce((sum, m) => sum + m.content.length, 0);

  while (conv.length > 0 && calcChars(conv) > MAX_TOTAL_CHARS) {
    conv.shift();
  }

  return [
    { role: 'system', content: systemContent },
    ...conv,
    { role: 'user', content: cleanQuestion },
  ];
}
