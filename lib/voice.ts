import { replicate } from './replicate';
import type { Branch } from './types';

// XTTS-v2 (Coqui) on Replicate. Pinned to a known-good version.
// Bump this string when the model is updated upstream.
const XTTS_V2 =
  'lucataco/xtts-v2:684bc3855b37866c0c65add2ff39c78f3dea3f4ff103a436465326e0f438d55e';

// XTTS doesn't expose stability/style knobs, so we lean on text shaping
// to give each branch a distinct cadence. The aging effect is applied in
// the browser at playback time (Web Audio pitch-down + lowpass).
const BRANCH_TEXT_SHAPING: Record<Branch, (line: string) => string> = {
  flowing:  (s) => s,                                   // unchanged — gentle, even
  realized: (s) => s,                                   // unchanged — steady
  drifting: (s) => s.replace(/\.+/g, '...').replace(/,/g, '... '), // drawn-out, drifting
};

function extractAudioUrl(out: unknown): string {
  if (typeof out === 'string') return out;
  if (Array.isArray(out) && typeof out[0] === 'string') return out[0];
  const maybe = out as { url?: () => string | URL } | null;
  if (maybe && typeof maybe.url === 'function') return String(maybe.url());
  throw new Error('The voice never developed.');
}

export async function synthesizeFutureLine(opts: {
  referenceAudioUrl: string;     // signed URL Replicate can fetch from
  text: string;
  branch: Branch;
}): Promise<ArrayBuffer> {
  const shaped = BRANCH_TEXT_SHAPING[opts.branch](opts.text);

  const out = await replicate().run(XTTS_V2, {
    input: {
      text: shaped,
      speaker: opts.referenceAudioUrl,
      language: 'en',
      cleanup_voice: false,
    },
  });

  const url = extractAudioUrl(out);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`The voice failed in transit: ${res.status}`);
  return await res.arrayBuffer();
}
