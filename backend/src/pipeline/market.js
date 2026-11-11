// FR-MKT: harga saat inferensi via yahoo-finance2 (TICKER.JK); catat sumber & timestamp.
import yahooFinance from 'yahoo-finance2';

try {
  yahooFinance.suppressNotices?.(['yahooSurvey']);
} catch {}

export async function fetchPrice(ticker) {
  if (!ticker) throw new Error('ticker kosong');
  const clean = String(ticker).trim().toUpperCase().replace(/\.JK$/i, '');
  const symbol = `${clean}.JK`;

  const q = await Promise.race([
    yahooFinance.quote(symbol),
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000)),
  ]);

  if (!q?.regularMarketPrice) throw new Error('harga tidak tersedia');

  const rawTime = q.regularMarketTime;
  const fetchedAt =
    rawTime instanceof Date
      ? rawTime.toISOString()
      : typeof rawTime === 'number'
        ? new Date(rawTime * 1000).toISOString()
        : new Date().toISOString();

  return {
    price: Number(q.regularMarketPrice),
    currency: q.currency ?? 'IDR',
    fetched_at: fetchedAt,
    source: 'yahoo-finance2',
  };
}
