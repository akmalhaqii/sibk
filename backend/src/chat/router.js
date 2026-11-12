// C1: pemilah pertanyaan TANPA LLM. Niat: advice | greeting | glossary | out_of_scope | analysis
import { findTerms } from './glossary.js';

const ADVICE_RE =
  /\b(beli|membeli|dibeli|jual|menjual|dijual|tahan|hold|buy|sell|layak|worth it|target harga|price target|cuan|entry|cut ?loss|average down|averaging|rekomendasi|rekomendasikan|sebaiknya (?:saya )?(?:beli|jual|masuk|keluar)|masuk (?:di|ke) harga|investasi(?:kan)? di)\b/i;
const GREETING_RE = /^\s*(halo|hai|hi|hello|selamat (pagi|siang|sore|malam)|assalamu'?alaikum|terima kasih|makasih|thanks)\b[\s!.,?]*$/i;
// Pertanyaan definisi atau "kenapa angka TelusurFin beda dengan situs lain"
const DEFINITION_RE =
  /\b(apa (itu|yang dimaksud|maksud(nya)?|arti(nya)?)|apakah itu|arti(nya)?|maksud(nya)?|definisi|pengertian|jelaskan|rumus(nya)?|cara (menghitung|hitung)|bagaimana (menghitung|cara hitung)|(kenapa|mengapa) .*(beda|berbeda|lain)|beda(nya)? (dengan|dari))\b/i;
// Kosakata keuangan/analisis: pertanyaan tanpa satu pun kata ini dianggap di luar topik
const FINANCE_RE =
  /\b(kinerja|keuangan|laporan|laba|rugi|pendapatan|penjualan|aset|aktiva|utang|hutang|liabilitas|ekuitas|modal|kas|arus|saham|harga|valuasi|nilai|tier|klaster|rasio|margin|risiko|emiten|perusahaan|profit|profitabilitas|likuiditas|solvabilitas|pertumbuhan|tumbuh|dividen|beban|biaya|neraca|sehat|waspada|lemah|kuat|status|kuartal|tahun|periode|angka|metrik|data|syirkah|treasuri|graham|der|roe|roa|eps|bvps|per|pbv)(?:nya|kah|lah)?\b/i;

export function classifyQuestion(question, { ticker = null } = {}) {
  const q = String(question ?? '').trim();
  const terms = findTerms(q);
  if (!q) return { intent: 'out_of_scope', terms };
  if (ADVICE_RE.test(q)) return { intent: 'advice', terms };
  if (GREETING_RE.test(q)) return { intent: 'greeting', terms };
  if (terms.length && DEFINITION_RE.test(q)) return { intent: 'glossary', terms };
  // Pertanyaan sangat pendek yang hanya menyebut istilah ("DER?", "nilai wajar graham")
  if (terms.length && q.replace(/[?!.]/g, '').trim().split(/\s+/).length <= 3) return { intent: 'glossary', terms };
  const mentionsTicker = ticker && new RegExp(`\\b${ticker}\\b`, 'i').test(q);
  if (!terms.length && !mentionsTicker && !FINANCE_RE.test(q)) return { intent: 'out_of_scope', terms };
  return { intent: 'analysis', terms };
}
