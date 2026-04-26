import { zaiChat, ZAI_PARSE_MODEL } from '../zai';
import type { Profile } from '../types';

const SYSTEM = `You parse a free-form profile of a person into strict JSON.
The user will paste a passage in English about themselves. You must output
exactly one JSON object and nothing else. The required keys, all strings:
- current_self
- inertia
- the_thing
- passive_mode
- late_night_scene
- unspoken_desire
- interests

Rules:
1. Output JSON only. No markdown fences, no commentary, no extra characters.
2. If a section is missing in the source, infer from the strongest available
   signal and append " (inferred)" to that field.
3. Preserve the original tone and concrete detail (names, places, images).
   Do not generalize.
4. All fields must be in English.`;

export async function parseProfile(rawText: string): Promise<Profile> {
  const res = await zaiChat({
    model: ZAI_PARSE_MODEL,
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: rawText },
    ],
    temperature: 0.2,
    response_format: { type: 'json_object' },
  });

  const content = res.choices[0]?.message?.content?.trim();
  if (!content) throw new Error('The parser got lost — try again.');
  const parsed = JSON.parse(content) as Partial<Profile>;

  const required: (keyof Profile)[] = [
    'current_self', 'inertia', 'the_thing',
    'passive_mode', 'late_night_scene', 'unspoken_desire',
    'interests',
  ];
  for (const k of required) {
    if (typeof parsed[k] !== 'string' || !parsed[k]) {
      throw new Error(`The parser dropped a field: ${k}`);
    }
  }
  return parsed as Profile;
}
