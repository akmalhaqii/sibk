// FR-UI-01: unggah PDF + kode saham BEI (+ jumlah saham opsional).
// Selama POST /api/analyze berjalan (sinkron), tampilkan AnalyzingOverlay; hasil diteruskan ke /result.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyze } from '../api/client.js';
import AnalyzingOverlay from '../components/AnalyzingOverlay.jsx';

const STORAGE_KEY = 'telusurfin:last_result';
const INITIAL_STORAGE_KEY = 'telusurfin:initial_result';
const SHARES_STORAGE_KEY = 'telusurfin:shares_input';

export default function UploadPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const file = formData.get('file');

    if (file && file instanceof File && file.name && !file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setError('Berkas harus PDF');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const rawShares = String(formData.get('shares') ?? '').trim();
      const sharesInput = rawShares !== '' ? Number(rawShares) : null;
      const result = await analyze(formData);
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(result));
        sessionStorage.setItem(INITIAL_STORAGE_KEY, JSON.stringify(result));
        if (sharesInput != null && Number.isFinite(sharesInput)) {
          sessionStorage.setItem(SHARES_STORAGE_KEY, String(sharesInput));
        } else {
          sessionStorage.removeItem(SHARES_STORAGE_KEY);
        }
      } catch {}
      navigate('/result', { state: { result, initialResult: result, sharesInput } });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-container upload-page">
      <div className="upload-card card">
        <header className="upload-header">
          <span className="brand-pill">TelusurFin · IDX Non-Keuangan</span>
          <h1>Analisis Laporan Keuangan</h1>
          <p className="subtitle">
            Unggah PDF laporan keuangan emiten BEI untuk mengekstrak pos utama, memvalidasi identitas akuntansi,
            menghitung rasio, valuasi Graham, dan klasifikasi tier klaster secara deterministik.
          </p>
        </header>

        <form onSubmit={onSubmit} className="upload-form" noValidate>
          <div className="form-field">
            <label htmlFor="file-input">Berkas Laporan Keuangan (PDF) *</label>
            <input
              id="file-input"
              type="file"
              name="file"
              accept="application/pdf,.pdf"
              required
              disabled={loading}
            />
            <small className="field-hint">Format PDF teks (laporan emiten atau publikasi BEI, maks. 50 MB).</small>
          </div>

          <div className="form-field">
            <label htmlFor="ticker-input">Kode Saham BEI (Ticker) *</label>
            <input
              id="ticker-input"
              type="text"
              name="ticker"
              placeholder="Contoh: SMGR, AKRA, AADI"
              defaultValue="SMGR"
              required
              disabled={loading}
            />
            <small className="field-hint">4 huruf kode saham tanpa akhiran .JK.</small>
          </div>

          <div className="form-field">
            <label htmlFor="shares-input">Jumlah Saham Beredar (Opsional)</label>
            <input
              id="shares-input"
              type="number"
              name="shares"
              min="1"
              step="1"
              placeholder="Contoh: 6751540090"
              disabled={loading}
            />
            <small className="field-hint">Kosongkan untuk memakai jumlah saham dari laporan.</small>
          </div>

          {error && (
            <div className="alert-error" role="alert">
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary btn-block" disabled={loading}>
            {loading ? 'Menganalisis…' : 'Analisis Laporan'}
          </button>
        </form>
      </div>
      {loading && <AnalyzingOverlay />}
    </main>
  );
}
