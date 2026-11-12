// C5: dialog buat sesi baru (pilih emiten dari GET /api/analyses, Kamus saja, atau opsi Tahap 2 nonaktif)
import { useEffect, useState } from 'react';
import { listAnalyses } from '../api/chat.js';

export default function NewSessionDialog({ open, onClose, onCreate }) {
  const [mode, setMode] = useState('analysis');
  const [analyses, setAnalyses] = useState([]);
  const [selectedFileId, setSelectedFileId] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    listAnalyses()
      .then((rows) => {
        if (cancelled) return;
        const list = Array.isArray(rows) ? rows : [];
        setAnalyses(list);
        if (list.length > 0) {
          setSelectedFileId(list[0].file_id || '');
          setMode('analysis');
        } else {
          setSelectedFileId('');
          setMode('glossary_only');
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Gagal memuat daftar analisis.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const canSubmit =
    !submitting &&
    ((mode === 'analysis' && Boolean(selectedFileId)) || mode === 'glossary_only');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit || !onCreate) return;
    setSubmitting(true);
    setError(null);
    try {
      if (mode === 'glossary_only') {
        await onCreate({ mode: 'glossary_only', origin: 'chatbot' });
      } else {
        await onCreate({ file_id: selectedFileId, origin: 'chatbot' });
      }
    } catch (err) {
      setError(err.message || 'Gagal membuat sesi baru.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="dialog-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-session-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <form className="dialog-card" onSubmit={handleSubmit}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 id="new-session-title" style={{ margin: 0, fontSize: 18 }}>
            Sesi Baru
          </h2>
          <button
            type="button"
            className="mini-chat-icon-btn"
            aria-label="Tutup dialog"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <label className={`dialog-option ${mode === 'analysis' ? 'dialog-option-selected' : ''}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="radio"
              name="sessionMode"
              value="analysis"
              checked={mode === 'analysis'}
              onChange={() => setMode('analysis')}
              disabled={analyses.length === 0}
            />
            <strong>Analisis emiten tersimpan</strong>
          </div>
          {loading ? (
            <span className="meta-note">Memuat daftar analisis…</span>
          ) : analyses.length > 0 ? (
            <select
              value={selectedFileId}
              onChange={(e) => {
                setSelectedFileId(e.target.value);
                setMode('analysis');
              }}
              style={{
                width: '100%',
                padding: '7px 9px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: 13,
              }}
            >
              {analyses.map((a) => (
                <option key={a.file_id} value={a.file_id}>
                  {[
                    a.ticker,
                    [a.period_type, a.period_end].filter(Boolean).join(' '),
                    a.source ? `(${a.source})` : null,
                    a.tier ? `· Tier ${a.tier}` : null,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                </option>
              ))}
            </select>
          ) : (
            <span className="meta-note">
              Belum ada hasil analisis tersimpan. Unggah laporan PDF terlebih dahulu.
            </span>
          )}
        </label>

        <label
          className={`dialog-option ${mode === 'glossary_only' ? 'dialog-option-selected' : ''}`}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="radio"
              name="sessionMode"
              value="glossary_only"
              checked={mode === 'glossary_only'}
              onChange={() => setMode('glossary_only')}
            />
            <strong>Tanpa emiten (kamus saja)</strong>
          </div>
          <span className="meta-note">
            Menjawab definisi istilah rasio keuangan dan ambang interpretasi TelusurFin.
          </span>
        </label>

        <div className="dialog-option dialog-option-disabled" aria-disabled="true">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="radio" name="sessionMode" value="free" disabled />
            <strong>Tanya bebas keuangan</strong>
          </div>
          <span className="meta-note">Tersedia setelah model Qwen Finance dipasang</span>
        </div>

        {error && (
          <div className="chat-notice-error" role="alert">
            {error}
          </div>
        )}

        <div className="dialog-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Batal
          </button>
          <button type="submit" className="btn-primary" disabled={!canSubmit}>
            {submitting ? 'Membuat…' : 'Mulai Sesi'}
          </button>
        </div>
      </form>
    </div>
  );
}
