export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`The future isn't ready to speak — ${name} is missing.`);
  }
  return value;
}

export const ZAI_BASE_URL = process.env.ZAI_BASE_URL ?? 'https://api.z.ai/api/paas/v4';
export const ZAI_MODEL = process.env.ZAI_MODEL ?? 'glm-4.6';
// Lighter, faster model used only for structured extraction (parseProfile).
// Falls back to ZAI_MODEL when unset so a single-key setup still works.
export const ZAI_PARSE_MODEL = process.env.ZAI_PARSE_MODEL ?? ZAI_MODEL;
export const ZAI_GENERATE_MODEL = process.env.ZAI_GENERATE_MODEL ?? ZAI_PARSE_MODEL ?? ZAI_MODEL;
export const ZAI_GENERATE_TIMEOUT_MS = Number(process.env.ZAI_GENERATE_TIMEOUT_MS ?? 120_000);
