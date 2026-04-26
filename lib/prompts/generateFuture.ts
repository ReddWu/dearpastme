import { ZAI_GENERATE_MODEL, ZAI_GENERATE_TIMEOUT_MS, ZAI_PARSE_MODEL } from '../env';
import { zaiChat } from '../zai';
import type { Branch, FutureContent, Profile } from '../types';
import { buildFuturePrompt } from './branches';

const RETRYABLE_TIMEOUT = /didn't answer in time|aborted|timeout/i;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generateFuture(
  profile: Profile,
  branch: Branch,
): Promise<FutureContent> {
  const { system, user } = buildFuturePrompt(profile, branch);

  let res;
  try {
    res = await zaiChat({
      model: ZAI_GENERATE_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.85,
      response_format: { type: 'json_object' },
    }, { timeoutMs: ZAI_GENERATE_TIMEOUT_MS });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!RETRYABLE_TIMEOUT.test(message)) throw error;

    await sleep(1200);
    res = await zaiChat({
      model: ZAI_PARSE_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    }, { timeoutMs: ZAI_GENERATE_TIMEOUT_MS });
  }

  const content = res.choices[0]?.message?.content?.trim();
  if (!content) throw new Error(`This future never took shape (${branch}).`);
  const parsed = JSON.parse(content) as Partial<FutureContent>;

  for (const k of ['image_prompt', 'life_description', 'letter', 'voice_message'] as const) {
    if (typeof parsed[k] !== 'string' || !parsed[k]) {
      throw new Error(`This future is missing a piece: ${branch}.${k}`);
    }
  }
  return parsed as FutureContent;
}
