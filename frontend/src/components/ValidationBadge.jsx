// Hasil cek identitas akuntansi / needs_review (FR-VAL)
import { fmtNumber } from '../utils/format.js';

const CHECK_LABELS = {
  balance_identity: 'balance_identity (Aset = Liabilitas + Ekuitas)',
  assets_split: 'assets_split (Aset Lancar + Tidak Lancar)',
  liabilities_split: 'liabilities_split (Liabilitas Jangka Pendek + Panjang)',
  gross_profit: 'gross_profit (Laba Kotor)',
};

export default function ValidationBadge({ validation }) {
  if (!validation) return null;
  const checks = validation.checks ?? [];
  const total = checks.length || 4;
  const passed = checks.filter((c) => c.pass).length;
  const failed = checks.filter((c) => !c.pass);

  if (!validation.needs_review) {
    return (
      <div className="ValidationBadge badge-valid" role="status">
        <span className="badge-icon">✓</span>
        <span>Angka lolos validasi ({passed}/{total} cek)</span>
      </div>
    );
  }

  const failedDesc =
    failed.length > 0
      ? failed
          .map((c) => {
            const label = CHECK_LABELS[c.name] ?? c.name;
            const diff =
              c.lhs != null && c.rhs != null ? ` [selisih ${fmtNumber(Math.abs(c.lhs - c.rhs))}]` : '';
            return `${label}${diff}`;
          })
          .join('; ')
      : 'Pos wajib belum lengkap';

  return (
    <div className="ValidationBadge badge-warning" role="alert">
      <span className="badge-icon">⚠</span>
      <span>Perlu diperiksa — cek gagal: {failedDesc}</span>
    </div>
  );
}
