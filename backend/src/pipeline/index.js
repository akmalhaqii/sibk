// Orkestrator: ingest -> parser -> mapper -> validator -> metrics -> tiering -> market -> valuation
// Sinkron dalam satu request untuk MVP. Hasil disimpan ke cache (data/cache).
// R-02: recompute SELALU menghitung ulang validate(fields), mengabaikan validation lama dari klien.
// R-03: entity.file_id dan entity.file_url diisi agar SourcePageLink bisa membuka /files/<file_id>#page=N.
import path from 'node:path';
import { ingest } from './ingest.js';
import { parse } from './parser.js';
import { mapFields } from './mapper.js';
import { validate } from './validator.js';
import { computeMetrics } from './metrics.js';
import { assignTier } from './tiering.js';
import { fetchPrice } from './market.js';
import { computeValuation } from './valuation.js';
import { setCache } from '../utils/cache.js';

export async function runPipeline({ file, ticker, shares }) {
  const pages = await ingest(file);
  const rows = await parse(pages);
  const extracted = mapFields(rows, { ticker });
  if (file?.filename) {
    const fileId = path.basename(file.filename, '.pdf');
    extracted.entity.file_id = fileId;
    extracted.entity.file_url = `/files/${file.filename}`;
  }
  const result = await recompute({ ...extracted, shares, ticker });
  if (extracted.entity.file_id) {
    await setCache(`analyze_${extracted.entity.ticker}_${extracted.entity.file_id}`, result).catch(() => {});
  }
  return result;
}

export async function recompute({ entity, fields, shares, ticker, price, market: prevMarket }) {
  const validation = validate(fields); // R-02: selalu hitung ulang validasi dari fields terkini
  const metrics = computeMetrics(fields, entity);
  const tiering = assignTier(metrics);
  const resolvedTicker = ticker ?? entity?.ticker;
  const market =
    price != null
      ? { price: Number(price), currency: 'IDR', fetched_at: new Date().toISOString(), source: 'manual' }
      : prevMarket !== undefined
        ? prevMarket
        : resolvedTicker
          ? await fetchPrice(resolvedTicker).catch(() => null)
          : null;
  const valuation = computeValuation({ fields, entity, market, shares });
  return { entity, fields, validation, metrics, tiering, market, valuation };
}
