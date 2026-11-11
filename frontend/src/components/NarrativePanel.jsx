// Narasi Qwen3 atau "Ringkasan otomatis (tanpa AI)" (FR-NAR)
import { useState, useEffect } from 'react';
import { narrative } from '../api/client.js';

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

  const paragraphs = (data?.text || '')
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
