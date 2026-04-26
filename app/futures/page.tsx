import { redirect } from 'next/navigation';
import { requireUserId } from '@/lib/session';
import { supabaseRoute } from '@/lib/supabase/route';
import { supabaseServer } from '@/lib/supabase/server';
import { Caption, Headline, Stage, Whisper } from '@/components/Stage';
import { FutureGallery, type FutureCard } from '@/components/FutureGallery';
import { BRANCHES, type Branch, type FutureMoment } from '@/lib/types';

export const dynamic = 'force-dynamic';

async function listMomentImages(userId: string): Promise<FutureMoment[]> {
  const storage = supabaseServer().storage.from('futures');
  const all = await Promise.all(
    BRANCHES.map(async (branch) => {
      const { data } = await storage.list(`${userId}/${branch}`, { limit: 20 });
      return (data ?? [])
        .filter((file) => file.name.startsWith('moment-'))
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((file) => ({
          id: `${branch}-${file.name}`,
          branch,
          image_url: storage.getPublicUrl(`${userId}/${branch}/${file.name}`).data.publicUrl,
        }));
    }),
  );

  return all.flat();
}

export default async function FuturesPage() {
  const userId = await requireUserId().catch(() => null);
  if (!userId) redirect('/begin');

  const sb = await supabaseRoute();
  const [{ data }, { data: marks }] = await Promise.all([
    sb
      .from('futures')
      .select('id, branch, image_url, life_description, letter, voice_message_text, voice_message_url, vision, generation_round')
      .eq('user_id', userId)
      .order('generation_round', { ascending: false }),
    sb
      .from('future_marks')
      .select('future_id, mark')
      .eq('user_id', userId)
      .eq('mark', 'want_to_become'),
  ]);

  if (!data?.length) redirect('/generating');

  const wantId = marks?.[0]?.future_id ?? null;

  const latestRound = data[0].generation_round;
  const cards: FutureCard[] = BRANCHES
    .map((b) => data.find((d) => d.branch === b && d.generation_round === latestRound))
    .filter((d): d is NonNullable<typeof d> => Boolean(d))
    .map((d) => ({
      id: d.id,
      branch: d.branch as Branch,
      image_url: d.image_url ?? '',
      life_description: d.life_description ?? '',
      letter: d.letter ?? '',
      voice_message_text: d.voice_message_text ?? '',
      voice_message_url: d.voice_message_url ?? '',
      // The user's edited vision (if any) and whether THIS card is the one
      // they marked want_to_become — both are needed to surface the hidden
      // click-to-edit affordance only on the chosen future.
      vision: (d.vision as string | null) ?? null,
      is_chosen_vision: d.id === wantId,
    }));
  const moments = await listMomentImages(userId);

  return (
    <Stage align="top" width="wide">
      <Caption>Ten Glimpses</Caption>
      <Headline>Three futures speak. Seven more pass in flashes.</Headline>
      <Whisper>The three in the center hold the voice and the story. The others are only glimpses.</Whisper>
      <FutureGallery futures={cards} moments={moments} />
    </Stage>
  );
}
