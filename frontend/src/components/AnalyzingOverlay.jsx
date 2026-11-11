// Indikator loading sederhana. Sengaja TIDAK menampilkan stepper per tahap:
// API sinkron tidak mengirim status tahap, jadi stepper hanya akan berupa animasi palsu.
// Status per tahap yang nyata menunggu job latar + polling (ditunda setelah demo).
export default function AnalyzingOverlay() {
  return (
    <div className="analyzing-overlay" role="status" aria-live="polite">
      <div className="spinner" />
      <p>Menganalisis laporan…</p>
      <small>Membaca PDF, memvalidasi angka, menghitung metrik, tier, dan valuasi.</small>
    </div>
  );
}
