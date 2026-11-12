// Qwen3 -> cek angka -> retry sekali -> fallback templat
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import env from '../config/env.js';
import { buildInput } from './input.js';
import { chat, pingOllama } from './client.js';
import { checkNarrative } from './validator.js';
import { templateSummary } from './template.js';
import { toPlainText, checkPlainText } from './plaintext.js';

const promptPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  `prompts/${env.promptVersion}.txt`
);

export function buildPrompt(input) {
  const tpl = fs.readFileSync(promptPath, 'utf8');
  return tpl.replace('{{data}}', JSON.stringify(input, null, 2));
}

export async function generateNarrative(
  result,
  { useLlm = process.env.USE_OLLAMA !== 'false', chatFn = chat, pingFn = pingOllama } = {}
) {
  const input = buildInput(result);
  const fallback = templateSummary(input);

  if (!useLlm) {
    return fallback;
  }

  const status = await pingFn();
  if (status !== 'ok') {
    return fallback;
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { response, model } = await chatFn(buildPrompt(input));
      const text = toPlainText(response);
      const format = checkPlainText(text);
      const check = checkNarrative(text, input);
      if (format.ok && check.ok) {
        return {
          source: 'llm',
          label: 'Ringkasan AI · Qwen3 lokal',
          text,
          checks_passed: true,
          model,
          prompt_version: env.promptVersion,
        };
      }
      console.warn(
        `[narrator] attempt ${attempt + 1} rejected (${input?.ticker || 'UNKNOWN'}):`,
        { formatProblems: format.problems, checkReason: check.reason, unmatched: check.unmatched }
      );
    } catch {
      break;
    }
  }
  return fallback;
}
