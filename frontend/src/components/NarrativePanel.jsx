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

export default function NarrativePanel({ result, onLoaded }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!result) return;
    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    onLoaded?.(null);

    // Narasi v5: satu panggilan; selama menunggu hanya status "Qwen sedang menulis…" yang tampil
    narrative(result, { signal: controller.signal })
      .then((res) => {
        if (cancelled) return;
        setData(res);
        onLoaded?.(res); // FR-OUT-01: narasi ikut masuk laporan yang diunduh
      })
      .catch((err) => {
        if (!cancelled && err.name !== 'AbortError') setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [result]); // eslint-disable-line react-hooks/exhaustive-deps

  const text = cleanPlainText(data?.text || '');
  const paragraphs = text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  const isLlm = data?.source === 'llm';

  let note = null;
  if (data && !isLlm) {
    if (data.llm_error) note = 'Qwen tidak selesai tepat waktu, jadi ringkasan disusun otomatis dari status metrik.';
    else if (data.repairs) note = 'Narasi Qwen tidak lolos pemeriksaan, jadi ringkasan disusun otomatis dari status metrik.';
    else note = 'Qwen tidak aktif; ringkasan disusun otomatis dari status metrik.';
  }

  return (
    <section className="NarrativePanel card" aria-busy={loading}>
      <div className="section-header">
        <h2>Ringkasan Eksekutif</h2>
        {loading ? (
          <span className="narrative-badge badge-loading" role="status">
            Qwen sedang menulis…
          </span>
        ) : isLlm ? (
          <span className="narrative-badge badge-llm">
            {data.label || 'Ringkasan AI · Qwen3 lokal'}
            {data.model ? ` (${data.model})` : ''}
          </span>
        ) : data ? (
          <span className="narrative-badge badge-template">{data.label || 'Ringkasan otomatis (tanpa AI)'}</span>
        ) : null}
      </div>

      {loading && (
        <div className="narrative-writing" role="status">
          <span className="writing-dot" />
          <span className="writing-dot" />
          <span className="writing-dot" />
          <span className="writing-text">Qwen sedang menulis ringkasan dari hasil analisis…</span>
        </div>
      )}

      {!loading && error && (
        <p className="text-danger" role="alert">
          Gagal memuat ringkasan: {error}
        </p>
      )}

      {!loading && paragraphs.length > 0 && (
        <div className="narrative-body">
          {paragraphs.map((p, idx) => (
            <p key={idx}>{p}</p>
          ))}
        </div>
      )}

      {!loading && note && <p className="meta-note">{note}</p>}
    </section>
  );
}
