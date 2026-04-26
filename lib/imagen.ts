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

// Each scene is a DIFFERENT life domain — body / skill / friendship / solitude
// / partnership / travel / craft. No two scenes across the seven moments
// repeat an activity, an emotional beat, or a setting.
const MOMENT_SCENES: Record<Branch, string[]> = {
  flowing: [
    // domain: solitude / quiet domestic life
    'the same person at home on a weeknight, standing at the kitchen counter with a worn cookbook propped open and a glass of wine half full, soft overhead light, focused on chopping vegetables, calmly content, the small contented look of someone who eats alone often and is fine with it',
    // domain: friendship / kept ties
    'the same person on a sidewalk café patio in early autumn, leaning across a small table mid-laugh with one old friend, two coffee cups between them, the friend partially out of frame, late-afternoon sunlight, the easy face of a friendship that survived the decade',
  ],
  realized: [
    // domain: skill / public craft mastery
    'the same person standing in front of a small attentive audience in a modern bright workspace, mid-sentence with one hand gesturing, a screen behind them showing their own work, fully in their element, alive and lit-up — the look of someone presenting something they actually built',
    // domain: deepened romantic partnership
    'the same person at a sunlit kitchen counter in the morning, leaning shoulder-to-shoulder with a partner, both reading something together on a tablet, two mugs of coffee, an unspectacular intimacy, a small private smile — the look of a relationship that grew up alongside them',
    // domain: tangible accomplishment / finished work
    'the same person sitting on a low couch in a softly lit apartment, holding a finished physical artifact of their work — a printed book with their name on the spine, or a framed product page — looking down at it with a quiet pride, no audience, no celebration, just the moment of seeing their own thing as a real object',
  ],
  drifting: [
    // domain: travel / displacement / transit
    'the same person on a long-distance train at dusk, head tilted against the window, one earbud in, watching unfamiliar fields pass by, a takeout bag and a phone face-down on the tray table, neutral expression — not unhappy, not present',
    // domain: night-walking through an unfamiliar city
    'the same person walking at night down an unfamiliar residential street in a city that is not their own, hands in pockets, looking up at the lit windows of apartment buildings above, streetlight catching their face, a quiet curiosity that is not quite envy',
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
  interests: string;
  momentIndex: number;
}): Promise<AgedPortraitAsset> {
  const scene = MOMENT_SCENES[opts.branch][opts.momentIndex];
  if (!scene) {
    throw new Error(`Missing moment scene for ${opts.branch}.${opts.momentIndex}`);
  }

  // Drop a small interest-flavored detail into the frame so each user's
  // moments feel personal: a specific cookbook on the counter, the band
  // poster on the wall, the kind of dog at their feet, the city they
  // actually love. Only weave in details that fit the scene naturally —
  // never crowbar in everything from the list.
  const interestsLine = opts.interests
    ? `Where it fits naturally, weave in ONE small specific detail from this person's actual world: ${opts.interests}. Do not crowd the frame; pick whatever quietly fits this scene.`
    : '';

  const prompt =
    `Use the provided input photo as the subject reference. ` +
    `Create a photorealistic candid life moment of the exact same person ten years older. ` +
    `Preserve facial identity, bone structure, skin tone, and overall likeness. ` +
    `Keep the result grounded in realistic photography. ` +
    `Scene: ${scene}. ` +
    `This future life also contains this emotional context: ${opts.lifeDescription}. ` +
    `${interestsLine} ` +
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
