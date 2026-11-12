// Kontrak data antar tahap & respons API (zod) — SATU sumber kebenaran (v1.1).
// Mock frontend (frontend/src/mock/*.json) divalidasi terhadap skema ini oleh
// tests/contract.mock.test.js. Kontrak berubah -> perbarui mock, atau tes gagal.
import { z } from 'zod';

const nullableNumber = z.number().nullable();

// ---------- parser + mapper ----------
export const FieldValue = z.object({
  value: nullableNumber,
  prior: nullableNumber.optional(),
  page: z.number().int().nullable(),
  label: z.string(),
  confidence: z.number().min(0).max(1),
  corrected: z.boolean().optional(), // true bila dikoreksi pengguna (FR-UI-04)
});

export const PeriodType = z.enum(['Q1', 'Q2', 'Q3', 'FY']);

export const Entity = z.object({
  ticker: z.string(),
  period_end: z.string().optional(),
  period_type: PeriodType.optional(), // baru (R-06)
  unit: z.string().optional(),
  currency: z.enum(['IDR', 'USD']).optional(), // Tahap 4-C
  locale: z.enum(['id-dot', 'en-comma']).optional(),
  source: z.enum(['company_pdf', 'bei_pdf']).optional(),
  file_id: z.string().optional(),     // baru (R-03)
  file_url: z.string().optional(),
});

export const Extracted = z.object({
  entity: Entity,
  fields: z.record(FieldValue),
  unmapped: z.array(z.object({ label: z.string(), page: z.number().int().nullable() })).optional(),
});

// ---------- validator ----------
export const ValidationCheck = z.object({
  name: z.string(),
  lhs: nullableNumber,
  rhs: nullableNumber,
  terms: z.array(z.string()),
  pass: z.boolean(),
});
export const Validation = z.object({
  checks: z.array(ValidationCheck),
  needs_review: z.boolean(),
});

// ---------- metrics / tiering / market / valuation ----------
export const MetricStatus = z.enum(['sehat', 'waspada', 'lemah']);
export const Metric = z.object({
  value: nullableNumber,
  display: z.string().nullable(), // baru (v1.1)
  status: MetricStatus.nullable(), // baru (R-04)
  formula: z.string(),
  inputs: z.array(z.string()),
});

export const Tier = z.enum(['low', 'mid', 'high']);
export const Tiering = z.object({
  tier: Tier.nullable(),
  cluster: z.number().int().nullable(),
  distance_to_centroid: nullableNumber,
  features: z.array(z.string()),
  model_version: z.string().nullable(), // tampil di UI (FR-TIER-02)
  reason: z.string().optional(),
});

export const Market = z.object({
  price: nullableNumber,
  currency: z.string(),
  fetched_at: z.string(),
  source: z.string(), // 'yahoo-finance2' | 'manual'
});

export const ValuationItem = z.object({
  value: nullableNumber,
  display: z.string().nullable().optional(), // baru (v1.1)
  inputs: z.array(z.string()),
  annualized: z.boolean().optional(),
  unavailable_reason: z.string().optional(), // mis. jumlah saham tidak tersedia (FR-MKT-04)
});

// ---------- respons API ----------
// POST /api/analyze dan POST /api/recompute
export const AnalyzeResponse = Extracted.extend({
  validation: Validation,
  metrics: z.record(Metric),
  tiering: Tiering,
  market: Market.nullable(),
  valuation: z.record(ValuationItem),
});

// REV-05: body POST /api/narrative dan POST /api/report minimal berupa hasil analisis
export const AnalysisInput = z
  .object({
    entity: z.object({ ticker: z.string().min(1) }).passthrough(),
    metrics: z.record(z.object({ value: nullableNumber, display: z.string().nullable().optional() }).passthrough()),
  })
  .passthrough();

// POST /api/narrative
export const NarrativeResponse = z.object({
  source: z.enum(['llm', 'template']),
  label: z.string(), // "Ringkasan otomatis (tanpa AI)" bila template
  text: z.string(),
  checks_passed: z.boolean(),
  model: z.string().optional(), // NFR-08: nama model + versi prompt dicatat
  prompt_version: z.string().optional(),
  repairs: z.object({}).passthrough().optional(), // REV-06: kalimat yang dibuang & topik yang dilengkapi
  llm_error: z.string().optional(),
});

// ---------- berkas model klaster (dihasilkan ai-model, dibaca backend) ----------
// Harus selaras dengan REQUIRED_KEYS di ai-model/training/export_model.py
export const TierModel = z.object({
  model_version: z.string(), // mis. "tier_kmeans_v1"
  created_at: z.string(),
  algorithm: z.literal('kmeans'),
  period_end: z.string(),
  n_samples: z.number().int().positive(),
  features: z.array(z.string()).min(1),
  winsor: z.object({ lower: z.array(z.number()), upper: z.array(z.number()) }),
  scaler: z.object({ mean: z.array(z.number()), scale: z.array(z.number()) }),
  centroids: z.array(z.array(z.number())).length(3),
  tier_by_cluster: z.array(Tier).length(3), // indeks = nomor klaster
  evaluation: z.object({ silhouette: z.number(), davies_bouldin: z.number() }).partial().optional(),
});

// ---------- chatbot (C2) ----------
export const ChatSessionCreate = z.union([
  z.object({
    result: AnalysisInput,
    mode: z.literal('analysis').optional(),
    origin: z.string().optional(),
  }),
  z.object({
    mode: z.enum(['glossary_only', 'free']),
    origin: z.string().optional(),
  }),
]);

export const ChatSessionPatch = z
  .object({
    result: AnalysisInput.optional(),
    title: z.string().trim().min(1).max(80).optional(),
  })
  .refine((v) => v.result !== undefined || v.title !== undefined, {
    message: 'Sertakan result atau title untuk memperbarui sesi.',
  });

export const ChatMessageCreate = z.object({
  content: z.string().trim().min(1).max(500),
});
