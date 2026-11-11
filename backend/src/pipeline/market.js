// FR-MKT: harga saat inferensi via yahoo-finance2 (TICKER.JK); catat sumber & timestamp.
import yahooFinance from 'yahoo-finance2';

try {
  yahooFinance.suppressNotices?.(['yahooSurvey']);
} catch {}

let cooldownUntil = 0;

export async function fetchPrice(ticker) {
  if (!ticker) throw new Error('ticker kosong');
  if (Date.now() < cooldownUntil) {
    throw new Error('harga pasar sedang tidak tersedia (cooldown)');
  }
  const clean = String(ticker).trim().toUpperCase().replace(/\.JK$/i, '');
  const symbol = `${clean}.JK`;

  let timer;
  const quotePromise = yahooFinance.quote(symbol);
  // Cegah unhandled rejection jika timeout lebih dulu selesai
  quotePromise.catch(() => {});

  let q;
  try {
    q = await Promise.race([
      quotePromise,
      new Promise((_, rej) => {
        timer = setTimeout(() => rej(new Error('timeout')), 5000);
      }),
    ]);
  } catch (err) {
    cooldownUntil = Date.now() + 60_000;
    throw err;
  } finally {
    clearTimeout(timer);
  }

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
