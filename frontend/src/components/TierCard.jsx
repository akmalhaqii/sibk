// Tier low/mid/high + jarak ke centroid + versi model (FR-TIER-02)
import { fmtNumber } from '../utils/format.js';

const TIER_TITLES = {
  high: 'HIGH — Kesehatan Kuat',
  mid: 'MID — Kesehatan Menengah',
  low: 'LOW — Kesehatan Lemah',
};

export default function TierCard({ tiering }) {
  const tier = tiering?.tier ?? null;
  const modelVersion = tiering?.model_version ?? '—';
  const distance = tiering?.distance_to_centroid;

  return (
    <section className="TierCard card">
      <div className="section-header">
        <h2>Tier Performa Klaster</h2>
        {modelVersion && <span className="meta-pill">{modelVersion}</span>}
      </div>

      {tier ? (
        <div className={`tier-banner tier-${tier}`}>
          <div className="tier-badge-large">{tier.toUpperCase()}</div>
          <div className="tier-details">
            <div className="tier-title">{TIER_TITLES[tier] ?? `Tier ${tier}`}</div>
            {distance != null && (
              <div className="tier-distance">
                Jarak ke pusat klaster (centroid): <strong>{fmtNumber(distance, 4)}</strong>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="tier-banner tier-unavailable">
          <div className="tier-badge-large">—</div>
          <div className="tier-details">
            <div className="tier-title">{tiering?.reason || 'Model belum tersedia / rasio belum lengkap'}</div>
          </div>
        </div>
      )}

      <p className="tier-footnote">
        Relatif terhadap emiten non-keuangan BEI periode Q1 2025. Bukan rekomendasi investasi.
      </p>
    </section>
  );
}
