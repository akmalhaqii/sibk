// FR-UI-03 / FR-UI-04 / FR-UI-02 (needs_review): metrik, tier, valuasi, narasi, tabel koreksi.
// R-11: simpan hasil ke sessionStorage supaya halaman tidak kosong saat di-refresh waktu demo.
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import mockResult from '../mock/analyze.json';

const STORAGE_KEY = 'telusurfin:last_result';

export default function ResultPage() {
  const { state } = useLocation();
  const [result, setResult] = useState(() => {
    if (state?.result) return state.result;
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return import.meta.env.VITE_USE_MOCK === 'true' ? mockResult : null;
  });

  useEffect(() => {
    if (state?.result) {
      setResult(state.result);
      try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state.result)); } catch {}
    }
  }, [state?.result]);

  if (!result) return <main><p>Belum ada hasil. Unggah laporan dulu.</p></main>;

  return <main><h1>Hasil Analisis — {result.entity.ticker}</h1></main>;
}
