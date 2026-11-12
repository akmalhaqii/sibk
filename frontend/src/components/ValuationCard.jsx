// PER, PBV, P/S, Nilai Wajar Graham + harga & waktu ambil (FR-VLN, FR-MKT-03)
import { useState, useEffect } from 'react';
import { fmtRupiah, fmtNumber } from '../utils/format.js';

function parsePriceInput(raw) {
  const cleaned = String(raw ?? '')
    .trim()
    .replace(/^Rp\s*/i, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const num = Number(cleaned);
  return cleaned === '' || !Number.isFinite(num) || num <= 0 ? null : num;
}

function ValuationItem({ label, item, annualized = false }) {
  const hasVal = item && item.value != null && item.display && item.display !== '—';
  const isAnn = item?.annualized ?? annualized;

  return (
    <div className="valuation-item">
      <div className="valuation-item-label">
        <span>
          {label}
          {isAnn && <sup className="annualized-mark" title="Disetahunkan">*</sup>}
        </span>
        {isAnn && <small className="item-subnote">disetahunkan</small>}
      </div>
      <div className="valuation-item-value">
        {hasVal ? (
          <strong>{item.display}</strong>
        ) : (
          <span className="unavailable-reason">
            {item?.unavailable_reason || 'Tidak tersedia'}
          </span>
        )}
      </div>
    </div>
  );
}

const SOURCE_LABEL = { manual: 'input manual', 'yahoo-finance2': 'Yahoo Finance' };
const sourceLabel = (s) => SOURCE_LABEL[s] ?? s;

export default function ValuationCard({ valuation, market, isQuarterly, periodType, onApplyPrice, loading = false }) {
  const [priceText, setPriceText] = useState(
    market?.price != null ? fmtNumber(market.price, 0) : ''
  );
  const [priceError, setPriceError] = useState(null);

  useEffect(() => {
    if (market?.price != null) {
      setPriceText(fmtNumber(market.price, 0));
    }
  }, [market?.price]);

  function handleSubmit(e) {
    e.preventDefault();
    const parsed = parsePriceInput(priceText);
    if (parsed == null) {
      setPriceError('Masukkan harga saham positif (mis. 3000 atau 3.000)');
      return;
    }
    setPriceError(null);
    onApplyPrice?.(parsed);
  }

  const shares = valuation?.shares_outstanding;
  const fv = valuation?.fair_value;
  const pd = valuation?.premium_discount;
  const hasFv = fv && fv.value != null && fv.display && fv.display !== '—';
  const hasPd = pd && pd.value != null && pd.display && pd.display !== '—';

  return (
    <section className="ValuationCard card">
      <div className="section-header">
        <h2>Valuasi &amp; Harga Pasar</h2>
        {market?.source && <span className="meta-pill">Sumber: {sourceLabel(market.source)}</span>}
      </div>

      <div className="market-price-box">
        {market?.price != null ? (
          <div className="market-current">
            <div>
              <span className="market-label">Harga Saham</span>
              <div className="market-price-value">{fmtRupiah(market.price)}</div>
            </div>
            <div className="market-meta">
              <div>Sumber: <strong>{sourceLabel(market.source)}</strong></div>
              {market.fetched_at && (
                <div>Waktu: {new Date(market.fetched_at).toLocaleString('id-ID')}</div>
              )}
            </div>
          </div>
        ) : (
          <div className="market-missing-notice">
            Harga pasar online belum tersedia. Masukkan harga per saham untuk menghitung PER, PBV, P/S, dan diskon/premium Graham.
          </div>
        )}

        <form onSubmit={handleSubmit} className="manual-price-form">
          <label htmlFor="manual-price-input">Harga per saham (Rp)</label>
          <div className="manual-price-row">
            <input
              id="manual-price-input"
              type="text"
              inputMode="numeric"
              placeholder="Contoh: 3.000"
              value={priceText}
              onChange={(e) => setPriceText(e.target.value)}
              disabled={loading}
            />
            <button type="submit" className="btn-secondary" disabled={loading}>
              Pakai harga
            </button>
          </div>
          {priceError && <small className="text-danger">{priceError}</small>}
        </form>
      </div>

      <div className="valuation-list">
        <ValuationItem label="EPS" item={valuation?.eps} annualized={isQuarterly} />
        <ValuationItem label="BVPS" item={valuation?.bvps} />
        <ValuationItem label="PER" item={valuation?.per} annualized={isQuarterly} />
        <ValuationItem label="PBV" item={valuation?.pbv} />
        <ValuationItem label="P/S" item={valuation?.ps} annualized={isQuarterly} />
        <ValuationItem label="Kapitalisasi pasar" item={valuation?.market_cap} />
      </div>

      <div className="graham-box">
        <div className="graham-header">
          <span>Nilai Wajar Graham (konservatif)</span>
          <span className="meta-pill">√(22,5 × EPS × BVPS)</span>
        </div>
        <div className="graham-grid">
          <div>
            <small className="graham-sub">Estimasi nilai wajar Graham</small>
            <div className="graham-val">
              {hasFv ? (
                <strong>{fv.display}</strong>
              ) : (
                <span className="unavailable-reason">{fv?.unavailable_reason || 'Tidak tersedia'}</span>
              )}
            </div>
          </div>
          <div>
            <small className="graham-sub">
              Harga {market?.price != null ? fmtRupiah(market.price) : ''} vs nilai wajar
            </small>
            <div className="graham-val">
              {hasPd ? (
                <strong className={pd.value <= 0 ? 'text-success' : 'text-warning'}>
                  {pd.display}
                </strong>
              ) : (
                <span className="unavailable-reason">{pd?.unavailable_reason || 'Harga belum tersedia'}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* A-1: jelaskan dasar perhitungan agar tidak disamakan dengan target harga analis */}
      <div className="graham-explain">
        <p>
          Dihitung dari EPS {valuation?.eps?.display && valuation.eps.display !== '—' ? valuation.eps.display : '—'} dan BVPS{' '}
          {valuation?.bvps?.display && valuation.bvps.display !== '—' ? valuation.bvps.display : '—'}
          {isQuarterly ? `; EPS berasal dari laba ${periodType ?? 'kuartal'} yang disetahunkan (×4)` : ''}
          {market?.price != null ? `, dibandingkan dengan harga ${fmtRupiah(market.price)} (${sourceLabel(market.source)})` : ''}.
        </p>
        <p>
          Ini estimasi konservatif dari laporan keuangan, <strong>bukan target harga analis</strong>. Situs lain bisa memakai
          model berbeda (misalnya DCF atau konsensus analis) dan laba 12 bulan terakhir, sehingga hasilnya bisa berbeda.
        </p>
      </div>

      {shares && (
        <div className="shares-footnote">
          <div>
            Jumlah saham: <strong>{shares.display || '—'}</strong> lembar
          </div>
          {shares.unavailable_reason && (
            <small className="unavailable-reason">Catatan: {shares.unavailable_reason}</small>
          )}
        </div>
      )}
    </section>
  );
}
