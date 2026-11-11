// FR-MKT: harga saat inferensi via yahoo-finance2 (TICKER.JK); catat sumber & timestamp
export async function fetchPrice(ticker) {
  return { price: null, currency: 'IDR', fetched_at: new Date().toISOString(), source: 'yahoo-finance2' };
}
