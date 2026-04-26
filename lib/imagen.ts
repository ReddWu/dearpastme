import { replicate } from './replicate';
import type { Branch } from './types';

const BRANCH_STYLE: Record<Branch, string> = {
  flowing:  'soft window light, muted earth tones, mid-30s, candid documentary photograph, shallow film grain, emotionally open face, grounded warmth, a small real smile or calm contentment',
  realized: 'high contrast lighting, alert clear-eyed gaze, mid-30s, restrained but sharp photographic realism, visible relief after hard work, alive eyes, earned happiness, not stoic blankness',
  drifting: 'overcast cool palette, gaze drifting off-frame, mid-30s, slight slouch, blurred background, wistful 35mm portrait, subdued but human expression',
};

const COVER_EMOTION: Record<Branch, string> = {
  flowing: 'Show a life that is gentle and quietly good. The face should feel softer, lighter, and more at ease than worried.',
  realized: 'Show unmistakable signs of aliveness, earned joy, and self-possession. Do not make the face cold, severe, or joyless.',
  drifting: 'Keep the drifting branch reflective, but avoid making it purely bleak or dead-eyed.',
};

const NANO_BANANA = 'google/nano-banana';
const OUTPUT_FORMAT = 'jpg';

export type AgedPortraitAsset = {
  contentType: 'image/jpeg';
  remoteUrl: string;
  storagePath: string;
};

const MOMENT_SCENES: Record<Branch, string[]> = {
  flowing: [
    'the same person lighter and healthier after sustained weight loss, smiling alone after an early-morning run beside a quiet neighborhood street, flushed cheeks, visible pride, loose shoulders',
    'the same person on a mountain summit at sunrise, wind in their jacket, laughing in disbelief, breathing hard, looking proud and newly awake',
  ],
  realized: [
    'the same person finishing a hard hike at sunrise above the clouds, cheeks flushed, hands on knees, laughing in disbelief, visibly happy to be alive',
    'the same person in a gym mirror after finally changing their body, sweat-damp hair, visible progress, private satisfaction, a real smile breaking through',
    'the same person at a small dinner celebration with close friends, candlelight, lifted glass, mid-laughter, the look of someone who finished what once scared them',
  ],
  drifting: [
    'the same person on a ferry deck at golden hour, unexpected happiness, hair moving in the wind, the city far behind them, a surprised spontaneous smile',
    'the same person sitting cross-legged on a cabin porch after sunrise, warm tea in hand, relaxed shoulders, a rare unguarded smile',
  ],
};

function extractImageUrl(out: unknown): string {
  if (typeof out === 'string') return out;
  if (Array.isArray(out)) {
    const first = out[0] as unknown;
    if (typeof first === 'string') return first;
    const nested = extractImageUrl(first);
    if (nested) return nested;
  }
  if (out && typeof out === 'object') {
    const record = out as {
      url?: (() => string | URL) | string | URL;
      output?: unknown;
      data?: unknown;
    };
    if (typeof record.url === 'function') return String(record.url());
    if (typeof record.url === 'string') return record.url;
    if (record.url instanceof URL) return String(record.url);
    if (record.output) return extractImageUrl(record.output);
    if (record.data) return extractImageUrl(record.data);
  }
  throw new Error('This future face never developed.');
}

// Nano Banana is materially faster than GPT Image 2 for our edit-style
// portrait generation, which matters more than absolute fidelity here.
export async function generateAgedPortrait(opts: {
  selfieUrl: string;
  branch: Branch;
  imagePrompt: string;
}): Promise<AgedPortraitAsset> {
  const styled =
    `Use the provided input photo as the subject reference. ` +
    `Create a photorealistic portrait of the exact same person ten years older. ` +
    `Preserve facial identity, bone structure, skin tone, and overall likeness. ` +
    `Do not turn this into illustration, CGI, or stylized art. ` +
    `Keep the result grounded in realistic photography. ` +
    `Avoid blank, severe, dead-eyed expressions unless the prompt explicitly requires them. ` +
    `${COVER_EMOTION[opts.branch]} ` +
    `${opts.imagePrompt}. ${BRANCH_STYLE[opts.branch]}.`;

  const out = await replicate().run(
    NANO_BANANA,
    {
      input: {
        prompt: styled,
        image_input: [opts.selfieUrl],
        aspect_ratio: '2:3',
        output_format: OUTPUT_FORMAT,
      },
    },
  );

  return {
    remoteUrl: extractImageUrl(out),
    contentType: 'image/jpeg',
    storagePath: `${opts.branch}/portrait.${OUTPUT_FORMAT}`,
  };
}

export function momentCount(branch: Branch): number {
  return MOMENT_SCENES[branch].length;
}

export async function generateFutureMomentAsset(opts: {
  selfieUrl: string;
  branch: Branch;
  lifeDescription: string;
  momentIndex: number;
}): Promise<AgedPortraitAsset> {
  const scene = MOMENT_SCENES[opts.branch][opts.momentIndex];
  if (!scene) {
    throw new Error(`Missing moment scene for ${opts.branch}.${opts.momentIndex}`);
  }

  const prompt =
    `Use the provided input photo as the subject reference. ` +
    `Create a photorealistic candid life moment of the exact same person ten years older. ` +
    `Preserve facial identity, bone structure, skin tone, and overall likeness. ` +
    `Keep the result grounded in realistic photography. ` +
    `Scene: ${scene}. ` +
    `This future life also contains this emotional context: ${opts.lifeDescription}. ` +
    `${BRANCH_STYLE[opts.branch]}.`;

  const out = await replicate().run(
    NANO_BANANA,
    {
      input: {
        prompt,
        image_input: [opts.selfieUrl],
        aspect_ratio: '2:3',
        output_format: OUTPUT_FORMAT,
      },
    },
  );

  return {
    remoteUrl: extractImageUrl(out),
    contentType: 'image/jpeg',
    storagePath: `${opts.branch}/moment-${String(opts.momentIndex + 1).padStart(2, '0')}.${OUTPUT_FORMAT}`,
  };
}
