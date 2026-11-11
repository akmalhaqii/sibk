// FR-UI-01: unggah PDF + kode saham BEI (+ jumlah saham opsional).
// Selama POST /api/analyze berjalan (sinkron), tampilkan AnalyzingOverlay; hasil diteruskan ke /result.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyze } from '../api/client.js';
import AnalyzingOverlay from '../components/AnalyzingOverlay.jsx';

export default function UploadPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await analyze(new FormData(e.currentTarget));
      navigate('/result', { state: { result } });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <h1>Unggah Laporan Keuangan</h1>
      <form onSubmit={onSubmit}>
        <input type="file" name="file" accept="application/pdf" required />
        <input type="text" name="ticker" placeholder="Kode saham, mis. SMGR" required />
        <input type="number" name="shares" placeholder="Jumlah saham beredar (opsional)" />
        <button type="submit" disabled={loading}>Analisis</button>
      </form>
      {error && <p role="alert">{error}</p>}
      {loading && <AnalyzingOverlay />}
    </main>
  );
}
