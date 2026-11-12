// Kartu rasio kesehatan + rumus + interpretasi ambang (FR-MET)
// Mengambil nilai HANYA dari display dan status (tanpa menghitung ulang di frontend).
const STATUS_LABELS = {
  sehat: 'Sehat',
  waspada: 'Waspada',
  lemah: 'Lemah',
};

export default function MetricCard({ label, metric, annualized = false, hint = null }) {
  const display = metric?.display ?? '—';
  const status = metric?.status ?? null;
  const formula = metric?.formula ?? '';
  const isNull = !metric || metric.value == null || display === '—';

  return (
    <div
      className={`MetricCard ${isNull ? 'metric-null' : ''}`}
      title={formula ? `Rumus: ${formula}` : undefined}
    >
      <div className="metric-header">
        <span className="metric-label">
          {label}
          {annualized && <sup className="annualized-mark" title="Disetahunkan">*</sup>}
        </span>
        {status && (
          <span className={`status-chip status-${status}`}>
            {STATUS_LABELS[status] ?? status}
          </span>
        )}
      </div>

      <div className="metric-value">{display}</div>

      {hint && <p className="metric-hint">{hint}</p>}

      <div className="metric-footer">
        {annualized && <span className="metric-note">disetahunkan</span>}
        {formula && <span className="metric-formula" title={formula}>{formula}</span>}
      </div>
    </div>
  );
}
