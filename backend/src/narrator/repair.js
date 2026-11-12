// REV-06: perbaiki narasi LLM per kalimat, bukan menolak seluruh narasi.
// - Kalimat dengan kata tren, kata terlarang, isian kosong, status tanpa angka, atau angka yang
//   tertempel ke metrik/status yang salah DIBUANG (kode hanya membuang, tidak menambah klaim).
// - LLM hanya menulis empat topik. Tier performa dan Keterbatasan selalu dari kode (templat).
// - Topik yang kosong setelah dibersihkan diisi paragraf templat untuk topik itu.
import { toPlainText } from './plaintext.js';
import { buildCatalog, checkSentenceBinding, classifyTopic } from './binding.js';

export const LLM_TOPICS = ['Profitabilitas', 'Likuiditas dan solvabilitas', 'Pertumbuhan dan arus kas', 'Valuasi'];
export const CODE_TOPICS = ['Tier performa', 'Keterbatasan'];

const FORBIDDEN_RE = /\b(beli|jual|tahan|rekomendasi|buy|sell|hold)\b/i;
const TREND_RE = /\b(stabil|konsisten|membaik|memburuk|fluktuatif|berfluktuasi|ketidakseimbangan|cenderung)\b/i;
const PLACEHOLDER_RE = /…|\.{3}|\[[^\]]*\]|\{\{|<[^>]+>|\bTBD\b/i;
const STATUS_RE = /\b(sehat|waspada|lemah)\b/i;
const HAS_NUMBER_RE = /\d[\d.,]*\s?[%x]/;
const TOPIC_NAMES =
  '(profitabilitas|likuiditas(?:\\s*(?:dan|&)\\s*solvabilitas)?|solvabilitas|pertumbuhan(?:\\s*(?:dan|&)\\s*arus\\s*kas)?|arus\\s*kas|valuasi|tier(?:\\s*performa)?|keterbatasan)';
const TOPIC_RE = new RegExp(`^${TOPIC_NAMES}\\s*:\\s*`, 'i');
// Awalan topik di barisnya sendiri ("Profitabilitas:" lalu baris baru), termasuk yang dibungkus ** **
const TOPIC_LINE_RE = new RegExp(`^[*_\\s]*${TOPIC_NAMES}[*_\\s]*:[*_]*[ \\t]*\\n+(?=\\S)`, 'gim');

function canonicalTopic(raw) {
  const t = raw.toLowerCase().replace(/\s+/g, ' ');
  if (t.startsWith('profitabilitas')) return 'Profitabilitas';
  if (t.startsWith('likuiditas') || t.startsWith('solvabilitas')) return 'Likuiditas dan solvabilitas';
  if (t.startsWith('pertumbuhan') || t.startsWith('arus kas')) return 'Pertumbuhan dan arus kas';
  if (t.startsWith('valuasi')) return 'Valuasi';
  if (t.startsWith('tier')) return 'Tier performa';
  return 'Keterbatasan';
}

function splitByTopic(text) {
  const out = new Map();
  const unknown = [];
  for (const para of text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)) {
    const m = para.match(TOPIC_RE);
    let topic;
    let body;
    if (m) {
      topic = canonicalTopic(m[1]);
      body = para.slice(m[0].length).trim();
    } else {
      // Tanpa awalan "Topik:" -> tentukan topik dari metrik yang disebut paragraf ini
      topic = classifyTopic(para);
      body = para;
      // "Profitabilitas emiten SMGR ..." -> "Emiten SMGR ..." agar tidak menjadi "Profitabilitas: Profitabilitas ..."
      if (topic && body.toLowerCase().startsWith(`${topic.toLowerCase()} `)) {
        const rest = body.slice(topic.length + 1);
        body = rest.charAt(0).toUpperCase() + rest.slice(1);
      }
      if (!topic) {
        unknown.push(para);
        continue;
      }
    }
    out.set(topic, [out.get(topic), body].filter(Boolean).join(' '));
  }
  return { byTopic: out, unknown };
}

const sentencesOf = (body) => body.split(/(?<=[.!?])\s+(?=\S)/).map((s) => s.trim()).filter(Boolean);

function sentenceProblem(sentence, catalog, tierLabel) {
  if (FORBIDDEN_RE.test(sentence)) return { reason: 'kata saran investasi' };
  if (TREND_RE.test(sentence)) return { reason: `kata tren "${sentence.match(TREND_RE)[1]}"` };
  if (PLACEHOLDER_RE.test(sentence)) return { reason: 'isian kosong' };
  if (!/[.!?]$/.test(sentence)) return { reason: 'kalimat terpotong' };
  const tierMatch = sentence.match(/\btier\s+(low|mid|high)\b/i);
  if (tierMatch && tierLabel && tierMatch[1].toLowerCase() !== String(tierLabel).toLowerCase()) {
    return { reason: `tier ${tierMatch[1]} tidak sesuai` };
  }
  const hasNumber = HAS_NUMBER_RE.test(sentence) || /Rp\s?\d/.test(sentence);
  if (STATUS_RE.test(sentence) && !hasNumber) return { reason: 'status tanpa angka metrik' };
  const b = checkSentenceBinding(sentence, catalog);
  if (!b.ok) return { reason: b.reason };
  return { reason: null, bound: b.bound };
}

// Pisahkan paragraf templat per topik
export function templateByTopic(templateText = '') {
  return splitByTopic(templateText).byTopic;
}

/**
 * @returns {{ ok:boolean, text:string, llmTopics:string[], filledTopics:string[], bound:number,
 *             dropped:{topic:string, sentence:string, reason:string}[], reason?:string }}
 */
export function repairNarrative(raw, input = {}, templateText = '') {
  const dropped = [];
  // Awalan topik yang ditulis di barisnya sendiri ("Profitabilitas:\nROE ...") disatukan dulu
  const joined = String(raw ?? '').replace(TOPIC_LINE_RE, '$1: ');
  const plain = toPlainText(joined);
  const { byTopic, unknown } = splitByTopic(plain);
  for (const u of unknown) dropped.push({ topic: '-', sentence: u.slice(0, 160), reason: 'paragraf tanpa topik yang dikenal' });

  const catalog = buildCatalog(input);
  const tierLabel = input?.tier?.label ?? null;
  const tpl = templateByTopic(templateText);

  const paragraphs = [];
  const llmTopics = [];
  const filledTopics = [];
  let bound = 0;

  // Tanpa PER/PBV (harga belum ada, saham tidak ada, atau laporan non-IDR), paragraf Valuasi
  // hanya berisi alasan. Alasan itu ditulis kode agar tepat (mis. "laporan dalam USD").
  const v = input?.valuation ?? {};
  const valuationByCode = !v.per?.display && !v.pbv?.display;

  for (const topic of LLM_TOPICS) {
    if (topic === 'Valuasi' && valuationByCode) {
      if (byTopic.get(topic)) dropped.push({ topic, sentence: byTopic.get(topic).slice(0, 160), reason: 'valuasi tanpa PER/PBV ditulis kode' });
      if (tpl.get(topic)) {
        paragraphs.push(`${topic}: ${tpl.get(topic)}`);
        filledTopics.push(topic);
      }
      continue;
    }
    const body = byTopic.get(topic);
    const kept = [];
    let topicBound = 0;
    let interpretive = 0;
    for (const s of body ? sentencesOf(body) : []) {
      const p = sentenceProblem(s, catalog, tierLabel);
      if (p.reason) {
        dropped.push({ topic, sentence: s, reason: p.reason });
        continue;
      }
      if (p.bound > 0) {
        kept.push(s);
        topicBound += p.bound;
      } else if (interpretive < 1) {
        // Satu kalimat penjelas tanpa angka boleh dipertahankan per paragraf
        kept.push(s);
        interpretive++;
      } else {
        dropped.push({ topic, sentence: s, reason: 'kalimat penjelas berlebih' });
      }
    }
    if (topicBound > 0) {
      paragraphs.push(`${topic}: ${kept.join(' ')}`);
      llmTopics.push(topic);
      bound += topicBound;
    } else if (tpl.get(topic)) {
      paragraphs.push(`${topic}: ${tpl.get(topic)}`);
      filledTopics.push(topic);
    }
  }
  for (const topic of CODE_TOPICS) {
    if (byTopic.get(topic)) dropped.push({ topic, sentence: byTopic.get(topic).slice(0, 160), reason: 'topik ini ditulis kode' });
    if (tpl.get(topic)) paragraphs.push(`${topic}: ${tpl.get(topic)}`);
  }

  const ok = llmTopics.length >= 2 && bound >= 3;
  return {
    ok,
    text: paragraphs.join('\n\n'),
    llmTopics,
    filledTopics,
    bound,
    dropped,
    ...(ok ? {} : { reason: `hanya ${llmTopics.length} topik dan ${bound} angka dari LLM yang lolos` }),
  };
}
