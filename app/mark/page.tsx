import { redirect } from 'next/navigation';
import { requireUserId } from '@/lib/session';
import { supabaseRoute } from '@/lib/supabase/route';
import { Caption, Headline, Stage, Whisper } from '@/components/Stage';
import { MarkPicker } from '@/components/MarkPicker';
import { BRANCHES, type Branch } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function MarkPage() {
  const userId = await requireUserId().catch(() => null);
  if (!userId) redirect('/begin');

  const sb = await supabaseRoute();
  const { data } = await sb
    .from('futures')
    .select('id, branch, image_url, generation_round')
    .eq('user_id', userId)
    .order('generation_round', { ascending: false });
  if (!data?.length) redirect('/generating');

  const round = data[0].generation_round;
  const cards = BRANCHES
    .map((b) => data.find((d) => d.branch === b && d.generation_round === round))
    .filter((d): d is NonNullable<typeof d> => Boolean(d))
    .map((d) => ({ id: d.id, branch: d.branch as Branch, image_url: d.image_url ?? '' }));

  return (
    <Stage align="top" width="wide">
      <Caption>Step Six</Caption>
      <Headline>Which one do you want to become?</Headline>
      <Whisper>Which one are you afraid of? Pick both, or only one.</Whisper>
      <MarkPicker futures={cards} />
    </Stage>
  );
}
