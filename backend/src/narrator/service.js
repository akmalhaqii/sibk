// Qwen3 -> cek angka -> retry sekali -> fallback templat
import { buildInput } from './input.js';
import { chat } from './client.js';
import { checkNarrative } from './validator.js';
import { templateSummary } from './template.js';

export async function generateNarrative(result) {
  const input = buildInput(result);
  return templateSummary(input);
}