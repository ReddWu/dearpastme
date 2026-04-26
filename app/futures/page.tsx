import { redirect } from 'next/navigation';
import { requireUserId } from '@/lib/session';
import { supabaseRoute } from '@/lib/supabase/route';
import { Caption, Headline, Stage, Whisper } from '@/components/Stage';
import { FutureGallery, type FutureCard } from '@/components/FutureGallery';
import { BRANCHES, type Branch } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function FuturesPage() {
  const userId = await requireUserId().catch(() => null);
  if (!userId) redirect('/begin');

  const sb = await supabaseRoute();
  const { data } = await sb
    .from('futures')
    .select('id, branch, image_url, life_description, letter, voice_message_text, voice_message_url, generation_round')
    .eq('user_id', userId)
    .order('generation_round', { ascending: false });

  if (!data?.length) redirect('/generating');

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
    }));

  return (
    <Stage align="top" width="wide">
      <Caption>Three Futures</Caption>
      <Headline>They are waiting to be seen.</Headline>
      <Whisper>Open any face. They will speak to you in your own voice.</Whisper>
      <FutureGallery futures={cards} />
    </Stage>
  );
}
