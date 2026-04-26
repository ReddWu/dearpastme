import { replicate } from './replicate';
import type { Branch } from './types';

const BRANCH_STYLE: Record<Branch, string> = {
  flowing:  'soft window light, muted earth tones, faintly tired eyes, mid-30s, candid documentary photograph, shallow film grain',
  realized: 'high contrast lighting, alert clear-eyed gaze, mid-30s, hint of a study or workspace behind, restrained but sharp, photographic',
  drifting: 'overcast cool palette, gaze drifting off-frame, mid-30s, slight slouch, blurred background, melancholy 35mm portrait',
};

const NEGATIVE = 'cartoon, anime, illustration, painting, cgi, plastic skin, harsh saturation, smile teeth, logo, watermark, text';

// FLUX Kontext: image-to-image w/ identity preservation. Returns a URL.
export async function generateAgedPortrait(opts: {
  selfieUrl: string;
  branch: Branch;
  imagePrompt: string;
}): Promise<string> {
  const styled = `${opts.imagePrompt}, ${BRANCH_STYLE[opts.branch]}, age the same person ten years older, preserve facial identity, photorealistic`;

  const out = await replicate().run(
    'black-forest-labs/flux-kontext-pro',
    {
      input: {
        prompt: styled,
        input_image: opts.selfieUrl,
        aspect_ratio: '3:4',
        output_format: 'webp',
        safety_tolerance: 2,
        prompt_upsampling: false,
        negative_prompt: NEGATIVE,
      },
    },
  );

  if (typeof out === 'string') return out;
  if (Array.isArray(out) && typeof out[0] === 'string') return out[0];
  // Some Replicate outputs are FileOutput-like with a url() method
  const maybe = out as { url?: () => string | URL };
  if (typeof maybe?.url === 'function') return String(maybe.url());
  throw new Error('This future face never developed.');
}
