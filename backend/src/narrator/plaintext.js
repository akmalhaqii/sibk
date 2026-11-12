// REV-03: ubah keluaran LLM menjadi teks biasa sebelum divalidasi dan dikirim ke UI
export function toPlainText(raw = '') {
  let t = String(raw).replace(/\r\n?/g, '\n');
  t = t.replace(/<think>[\s\S]*?<\/think>/gi, ''); // sisa mode berpikir
  t = t.replace(/```[a-z]*\n?/gi, ''); // pagar blok kode
  t = t.replace(/(^|\n)[ \t]*\*\*([^*\n]+)\*\*[ \t]+(?=[-*•][ \t])/g, '$1$2\n'); // judul tebal sebaris dengan butir
  t = t.replace(/^[ \t]*#{1,6}[ \t]+(.*)$/gm, '\n$1\n'); // judul #
  t = t.replace(/^[ \t]*(?:\*\*|__)([^*_\n]+)(?:\*\*|__)[ \t]*$/gm, '\n$1\n'); // baris tebal sebagai judul
  t = t.replace(/^[ \t]*(?:[-*•+]|\d+[.)])[ \t]+/gm, '\n'); // butir dan penomoran di awal baris
  t = t.replace(/([.!?])[ \t]+[-*•][ \t]+(?=\S)/g, '$1\n\n'); // butir sebaris: ". - Topik"
  t = t.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/__([^_]+)__/g, '$1'); // tebal
  t = t.replace(/`([^`]*)`/g, '$1'); // kode sebaris
  t = t.replace(/^[ \t]*>[ \t]?/gm, ''); // kutipan
  t = t.replace(/[*#`|]/g, ''); // sisa simbol
  return t
    .split(/\n{2,}|\n(?=\S)/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .filter((p) => /[.!?]$/.test(p) || p.length > 80) // buang baris judul pendek tanpa titik
    .join('\n\n');
}

export function checkPlainText(text, { maxParagraphs = 6 } = {}) {
  const problems = [];
  if (/[*#`|]/.test(text)) problems.push('markdown_symbol');
  if (/^\s*(?:[-•+]|\d+[.)])\s/m.test(text)) problems.push('list_marker');
  if (/[.!?]\s+[-•]\s/.test(text)) problems.push('inline_bullet');
  const paras = text.split(/\n\n/);
  if (paras.length > maxParagraphs) problems.push('too_many_paragraphs');
  if (paras.some((p) => p.includes('\n'))) problems.push('single_newline');
  return { ok: problems.length === 0, problems };
}
