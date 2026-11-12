// Narasi Qwen3 atau "Ringkasan otomatis (tanpa AI)" (FR-NAR)
import { useState, useEffect } from 'react';
import { narrative } from '../api/client.js';

function cleanPlainText(raw = '') {
  let t = String(raw).replace(/\r\n?/g, '\n');
  t = t.replace(/<think>[\s\S]*?<\/think>/gi, '');
  t = t.replace(/```[a-z]*\n?/gi, '');
  t = t.replace(/(^|\n)[ \t]*\*\*([^*\n]+)\*\*[ \t]+(?=[-*•][ \t])/g, '$1$2\n');
  t = t.replace(/^[ \t]*#{1,6}[ \t]+(.*)$/gm, '\n$1\n');
  t = t.replace(/^[ \t]*(?:\*\*|__)([^*_\n]+)(?:\*\*|__)[ \t]*$/gm, '\n$1\n');
  t = t.replace(/^[ \t]*(?:[-*•+]|\d+[.)])[ \t]+/gm, '\n');
  t = t.replace(/([.!?])[ \t]+[-*•][ \t]+(?=\S)/g, '$1\n\n');
  t = t.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/__([^_]+)__/g, '$1');
  t = t.replace(/`([^`]*)`/g, '$1');
  t = t.replace(/^[ \t]*>[ \t]?/gm, '');
  t = t.replace(/[*#`|]/g, '');
  return t
    .split(/\n{2,}|\n(?=\S)/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .filter((p) => /[.!?]$/.test(p) || p.length > 80)
    .join('\n\n');
}

export default function NarrativePanel({ result }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!result) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    narrative(result)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [result]);

  const paragraphs = cleanPlainText(data?.text || '')
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <section className="NarrativePanel card">
      <div className="section-header">
        <h2>Ringkasan Eksekutif</h2>
        {loading ? (
          <span className="narrative-badge badge-loading">Menyusun ringkasan…</span>
        ) : data?.source === 'llm' ? (
          <span className="narrative-badge badge-llm">
            Ringkasan AI · Qwen3 lokal{data.model ? ` (${data.model})` : ''}
          </span>
        ) : data ? (
          <span className="narrative-badge badge-template">
            {data.label || 'Ringkasan otomatis (tanpa AI)'}
          </span>
        ) : null}
      </div>

      {loading && (
        <p className="narrative-loading" role="status">
          Menyusun ringkasan…
        </p>
      )}

      {!loading && error && (
        <p className="text-danger" role="alert">
          Gagal memuat ringkasan: {error}
        </p>
      )}

      {!loading && !error && paragraphs.length > 0 && (
        <div className="narrative-body">
          {paragraphs.map((p, idx) => (
            <p key={idx}>{p}</p>
          ))}
        </div>
      )}
    </section>
  );
}
