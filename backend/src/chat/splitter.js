// C3: pemecah aliran token Qwen menjadi kalimat lengkap (teks biasa)
import { toPlainText } from '../narrator/plaintext.js';

const ABBREV_RE = /(?:^|[\s(])(?:hal|tbk|dll|dsb|mis|no|rp|pt|cv|dr|prof|ir|dkk)$/i;
const SINGLE_LETTER_RE = /(?:^|[\s(.])[\p{L}]$/u;

function cleanSentencePlain(raw) {
  const t = toPlainText(raw);
  return t ? t.replace(/\s+/g, ' ').trim() : '';
}

function isSentenceBoundary(str, dotIdx) {
  const ch = str[dotIdx];
  const before = str.slice(0, dotIdx);
  const after = str.slice(dotIdx + 1);

  // Wajib diikuti spasi/baris baru lalu awal kata huruf besar (atau penanda Markdown/list lalu huruf besar)
  const nextMatch = after.match(/^(\s+)(?:[*_`#\-\d.)]+\s*)?([\p{Lu}])/u);
  if (!nextMatch) {
    // Baris baru diikuti teks apa pun jika tanda akhir adalah ! atau ?
    if ((ch === '!' || ch === '?') && /^\s+[\p{L}\d]/u.test(after)) return true;
    return false;
  }

  if (ch === '.') {
    // Titik desimal / pemisah ribuan (mis. 1.300 atau 22.5)
    if (dotIdx > 0 && /\d/.test(str[dotIdx - 1]) && /^\d/.test(after)) return false;
    // Singkatan umum (hal., Tbk., dll., Rp., No., P.T.)
    if (ABBREV_RE.test(before)) return false;
    if (SINGLE_LETTER_RE.test(before)) return false;
  }
  return true;
}

export function createSentenceSplitter() {
  let buf = '';

  function drainComplete() {
    // Tahan sementara bila blok <think> masih terbuka
    buf = buf.replace(/<think>[\s\S]*?<\/think>/gi, '');
    const openThink = buf.search(/<think>/i);
    if (openThink !== -1) {
      // Hanya proses teks sebelum <think>
      const head = buf.slice(0, openThink);
      const rest = buf.slice(openThink);
      const res = extractFrom(head);
      buf = res.remaining + rest;
      return res.sentences;
    }
    const res = extractFrom(buf);
    buf = res.remaining;
    return res.sentences;
  }

  function extractFrom(text) {
    const sentences = [];
    let start = 0;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch !== '.' && ch !== '!' && ch !== '?') continue;
      if (!isSentenceBoundary(text.slice(start), i - start)) continue;
      const rawSent = text.slice(start, i + 1);
      const clean = cleanSentencePlain(rawSent);
      if (clean) sentences.push(clean);
      start = i + 1;
    }
    return { sentences, remaining: text.slice(start).replace(/^\s+/, '') };
  }

  return {
    push(chunk = '') {
      if (!chunk) return [];
      buf += String(chunk);
      return drainComplete();
    },

    flush() {
      // Buang blok <think> yang tidak sempat tertutup
      buf = buf.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/<think>[\s\S]*$/gi, '');
      const sentences = drainComplete();
      const tailRaw = buf.trim();
      buf = '';
      if (!tailRaw) return { sentences, truncated: false, truncatedText: null };
      // Cek apakah ekor sebelum toPlainText memang berakhir dengan tanda akhir kalimat
      const tailStripped = tailRaw.replace(/[*_`]+$/g, '').trim();
      if (/[.!?]$/.test(tailStripped)) {
        const clean = cleanSentencePlain(tailRaw);
        if (clean) sentences.push(clean);
        return { sentences, truncated: false, truncatedText: null };
      }
      // Kalimat terpotong tanpa tanda titik akhir -> dibuang
      return { sentences, truncated: true, truncatedText: tailRaw.replace(/\s+/g, ' ').trim() };
    },
  };
}
