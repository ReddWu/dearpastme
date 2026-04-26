import { zaiChat, ZAI_MODEL } from '../zai';
import type { Branch, FutureContent, Profile } from '../types';
import { buildFuturePrompt } from './branches';

export async function generateFuture(
  profile: Profile,
  branch: Branch,
): Promise<FutureContent> {
  const { system, user } = buildFuturePrompt(profile, branch);

  const res = await zaiChat({
    model: ZAI_MODEL,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.85,
    response_format: { type: 'json_object' },
  });

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
