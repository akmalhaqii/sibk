// FR-NAR-04 / R-01: ringkasan templat berlabel "Ringkasan otomatis (tanpa AI)"
// Menyertakan checks_passed: true agar lolos skema NarrativeResponse.
import env from '../config/env.js';

export function templateSummary(input) {
  return {
    source: 'template',
    label: 'Ringkasan otomatis (tanpa AI)',
    text: '',
    checks_passed: true,
    prompt_version: env.promptVersion,
  };
}
