// FR-VAL: aset = liabilitas + syirkah temporer + ekuitas, subtotal neraca & laba kotor -> needs_review.
// Toleransi diambil dari config/thresholds.json -> balance_tolerance (1 juta Rupiah, untuk pembulatan).
import thresholds from '../../config/thresholds.json' with { type: 'json' };

const REQUIRED_FIELDS = [
  'total_assets',
  'total_liabilities',
  'total_equity',
  'revenue',
  'net_income_parent',
];

const val = (fields, key) => {
  const v = fields?.[key]?.value;
  return v != null && Number.isFinite(v) ? v : null;
};

export function validate(fields = {}) {
  const tol = thresholds.balance_tolerance ?? 1;
  const checks = [];

  // 1. balance_identity: total_assets = total_liabilities + temporary_syirkah + total_equity
  const ta = val(fields, 'total_assets');
  const tl = val(fields, 'total_liabilities');
  const ts = val(fields, 'temporary_syirkah') ?? 0; // jika tidak ada dianggap 0
  const te = val(fields, 'total_equity');
  if (ta != null && tl != null && te != null) {
    const rhs = tl + ts + te;
    checks.push({
      name: 'balance_identity',
      lhs: ta,
      rhs,
      terms: ['total_liabilities', 'temporary_syirkah', 'total_equity'],
      pass: Math.abs(ta - rhs) <= tol,
    });
  }

  // 2. assets_split: current_assets + non_current_assets = total_assets
  const ca = val(fields, 'current_assets');
  const nca = val(fields, 'non_current_assets');
  if (ca != null && nca != null && ta != null) {
    const lhs = ca + nca;
    checks.push({
      name: 'assets_split',
      lhs,
      rhs: ta,
      terms: ['current_assets', 'non_current_assets'],
      pass: Math.abs(lhs - ta) <= tol,
    });
  }

  // 3. liabilities_split: current_liabilities + non_current_liabilities = total_liabilities
  const cl = val(fields, 'current_liabilities');
  const ncl = val(fields, 'non_current_liabilities');
  if (cl != null && ncl != null && tl != null) {
    const lhs = cl + ncl;
    checks.push({
      name: 'liabilities_split',
      lhs,
      rhs: tl,
      terms: ['current_liabilities', 'non_current_liabilities'],
      pass: Math.abs(lhs - tl) <= tol,
    });
  }

  // 4. gross_profit: revenue + cost_of_revenue = gross_profit (cost_of_revenue bertanda negatif di PDF, atau positif di beberapa sumber)
  const rev = val(fields, 'revenue');
  const cor = val(fields, 'cost_of_revenue');
  const gp = val(fields, 'gross_profit');
  if (rev != null && cor != null && gp != null) {
    const signedCor = cor > 0 && rev > gp ? -cor : cor;
    const lhs = rev + signedCor;
    checks.push({
      name: 'gross_profit',
      lhs,
      rhs: gp,
      terms: ['revenue', 'cost_of_revenue'],
      pass: Math.abs(lhs - gp) <= tol,
    });
  }

  const missingRequired = REQUIRED_FIELDS.some((k) => val(fields, k) == null);
  const anyFailed = checks.some((c) => !c.pass);

  return {
    checks,
    needs_review: anyFailed || missingRequired,
  };
}
