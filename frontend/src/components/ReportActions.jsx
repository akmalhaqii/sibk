// FR-OUT-01: laporan akhir dalam Markdown, JSON, dan PDF (lewat dialog cetak browser)
import { useState } from 'react';
import { downloadReport } from '../api/client.js';

export default function ReportActions({ result, narrative }) {
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const narrativeReady = Boolean(narrative?.text);

  async function handleDownload(format) {
    setBusy(format);
    setError(null);
    try {
      await downloadReport(result, narrative, format);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="ReportActions card no-print" aria-label="Unduh laporan">
      <div className="report-actions-text">
        <h2>Unduh laporan</h2>
        <p className="meta-note">
          {narrativeReady
            ? 'Laporan memuat ringkasan, rasio, tier, valuasi, cek validasi, dan angka hasil ekstraksi.'
            : 'Ringkasan masih disusun; laporan yang diunduh sekarang belum memuat ringkasan.'}
        </p>
        {error && (
          <p className="text-danger" role="alert">
            Gagal mengunduh laporan: {error}
          </p>
        )}
      </div>
      <div className="report-actions-buttons">
        <button type="button" className="btn-secondary" onClick={() => handleDownload('md')} disabled={busy != null}>
          {busy === 'md' ? 'Menyiapkan…' : 'Markdown (.md)'}
        </button>
        <button type="button" className="btn-secondary" onClick={() => handleDownload('json')} disabled={busy != null}>
          {busy === 'json' ? 'Menyiapkan…' : 'JSON (.json)'}
        </button>
        <button type="button" className="btn-primary" onClick={() => window.print()} disabled={busy != null}>
          Cetak / Simpan PDF
        </button>
      </div>
    </section>
  );
}
