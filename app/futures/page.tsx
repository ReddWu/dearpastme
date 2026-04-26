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
  const moments = await listMomentImages(userId);

  return (
    <Stage align="top" width="wide">
      <Caption>Ten Glimpses</Caption>
      <Headline>Ten scenes from the lives ahead.</Headline>
      <Whisper>Three of them speak. The other seven only flash past.</Whisper>
      <FutureGallery futures={cards} moments={moments} />
    </Stage>
  );
}
