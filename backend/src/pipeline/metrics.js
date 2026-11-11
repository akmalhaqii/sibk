// FR-MET: rasio deterministik (decimal.js); rumus, arah, & ambang dari config/thresholds.json.
// Dipakai juga oleh scripts/build_features.js.
// R-04: setiap metrik menyertakan status ('sehat' | 'waspada' | 'lemah' | null) berdasarkan direction.
import Decimal from 'decimal.js';
import thresholds from '../../config/thresholds.json' with { type: 'json' };

export function evaluateStatus(value, cfg) {
  if (value == null || !cfg || cfg.low == null || cfg.high == null) return null;
  if (cfg.direction === 'lower_better') {
    if (value <= cfg.low) return 'sehat';
    if (value <= cfg.high) return 'waspada';
    return 'lemah';
  }
  // higher_better (default)
  if (value >= cfg.high) return 'sehat';
  if (value >= cfg.low) return 'waspada';
  return 'lemah';
}

export function computeMetrics(fields) {
  return {};
}
