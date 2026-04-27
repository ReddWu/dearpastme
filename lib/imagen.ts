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
    // domain: body / sustained training transformation
    // Contains a {ACTIVITY} placeholder. generateFutureMomentAsset substitutes
    // a specific activity sentence here — pulled from the user's stated
    // interests if they named a sport, otherwise the default park run.
    // Without this hard substitution Nano Banana wandered (would render a
    // post-shower or selfie shot) — so the activity is now deterministic.
    'the same person {ACTIVITY}, looking visibly fitter than the input photo: clearer healthier skin, leaner or stronger body composition built from years of sustained training, mid-30s. Documentary realism, natural light, slightly tired but quietly satisfied expression. NOT a selfie, NOT flexing, NOT a mirror pose, NOT glossy Instagram fitspo or fitness-ad aesthetic — the unposed candid moment of someone who became this kind of person.',
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

// Sport keyword matchers, ordered by specificity. The first hit wins.
// Each entry is the prose phrase Nano Banana receives — already shaped to
// land as a candid documentary moment (mid- or post-activity, not a pose).
const FITNESS_ACTIVITIES: { match: RegExp; phrase: string }[] = [
  { match: /\b(climb(ing)?|boulder(ing)?|crag)\b/i,
    phrase: 'rock climbing on a sun-warmed cliff face mid-route, hands chalked, eyes focused on the next hold' },
  { match: /\b(cycl(e|ing)?|biking|gravel|peloton|road bike)\b/i,
    phrase: 'cycling on a quiet tree-lined road at golden hour, hands light on the bars, breathing steady' },
  { match: /\b(swim(ming)?|laps?|open water|pool)\b/i,
    phrase: 'just stepping out of a clean morning lap pool, water still on the shoulders, towel folded over one arm' },
  { match: /\b(surf(ing)?)\b/i,
    phrase: 'walking back up the beach at dawn after a session, board under one arm, wet hair, salt on the skin' },
  { match: /\b(lift(ing)?|powerlift|barbell|deadlift|squat|bench)\b/i,
    phrase: 'finishing a clean barbell set in a no-frills sunlit gym, chalk on the hands, calm exhale, no mirror in frame' },
  { match: /\b(yoga|pilates|mobility)\b/i,
    phrase: 'mid-flow on a yoga mat in a sunlit room, breath visible, calm shoulders' },
  { match: /\b(box(ing)?|martial|jiu[-\s]?jitsu|bjj|muay\s?thai|kickbox)\b/i,
    phrase: 'wrapping their hands in a quiet boxing gym before a session, focused, calm' },
  { match: /\b(ski(ing)?|snowboard(ing)?)\b/i,
    phrase: 'pausing on a quiet ski slope at first chair, breath visible in cold morning air' },
  { match: /\b(hik(e|ing)|trail|backpack)\b/i,
    phrase: 'partway up a quiet forest trail at golden hour, walking poles in hand, easy breathing' },
  { match: /\b(tennis|pickleball|badminton)\b/i,
    phrase: 'mid-rally on an outdoor court in late-afternoon sunlight, racquet across the body, focused' },
  { match: /\b(basketball|hoops|pickup game)\b/i,
    phrase: 'mid-game on an outdoor court at sunset, dribbling once before a drive, focused' },
  { match: /\b(soccer|football|fútbol|futsal)\b/i,
    phrase: 'mid-stride chasing the ball on a city pitch under floodlights, shirt loose, focused' },
  { match: /\b(row(ing)?|crew|erg)\b/i,
    phrase: 'rowing a single scull on a glassy river at sunrise, steady catch, calm face' },
  { match: /\b(dance|dancing|ballet|hip[-\s]?hop|salsa)\b/i,
    phrase: 'mid-movement in a sunlit dance studio, in their own body, alive' },
  { match: /\b(run(ning)?|jog(ging)?|marathon|5k|10k|trail run)\b/i,
    phrase: 'running on a sunlit park path at sunrise, easy stride, healthy color in the cheeks' },
];

// Default = the user's request: a good-looking shot of them running in the park.
const DEFAULT_FITNESS_ACTIVITY =
  'running on a sunlit park path at sunrise, easy stride, healthy color in the cheeks, the look of someone who runs three or four times a week';

function pickFitnessActivity(interests: string): string {
  if (!interests) return DEFAULT_FITNESS_ACTIVITY;
  for (const { match, phrase } of FITNESS_ACTIVITIES) {
    if (match.test(interests)) return phrase;
  }
  return DEFAULT_FITNESS_ACTIVITY;
}

export async function generateFutureMomentAsset(opts: {
  selfieUrl: string;
  branch: Branch;
  lifeDescription: string;
  interests: string;
  momentIndex: number;
}): Promise<AgedPortraitAsset> {
  const rawScene = MOMENT_SCENES[opts.branch][opts.momentIndex];
  if (!rawScene) {
    throw new Error(`Missing moment scene for ${opts.branch}.${opts.momentIndex}`);
  }

  // Resolve the {ACTIVITY} placeholder used by the fitness slot. Once the
  // activity is locked in, the generic "weave in interests" line gets
  // suppressed so Nano Banana doesn't drag in an unrelated interest from
  // the list and dilute the exercise framing.
  const isFitnessSlot = rawScene.includes('{ACTIVITY}');
  const scene = isFitnessSlot
    ? rawScene.replace('{ACTIVITY}', pickFitnessActivity(opts.interests))
    : rawScene;

  // Drop a small interest-flavored detail into the frame so each user's
  // moments feel personal: a specific cookbook on the counter, the band
  // poster on the wall, the kind of dog at their feet, the city they
  // actually love. Only weave in details that fit the scene naturally —
  // never crowbar in everything from the list. Skip on the fitness slot
  // (the activity is already chosen specifically).
  const interestsLine = !isFitnessSlot && opts.interests
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
