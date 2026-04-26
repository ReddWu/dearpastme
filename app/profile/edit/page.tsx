import { redirect } from 'next/navigation';
import { requireUserId } from '@/lib/session';
import { supabaseRoute } from '@/lib/supabase/route';
import { Caption, Headline, Stage, Whisper } from '@/components/Stage';
import { ProfileEditor } from '@/components/ProfileEditor';
import type { Profile } from '@/lib/types';

export default async function ProfileEditPage() {
  const userId = await requireUserId().catch(() => null);
  if (!userId) redirect('/begin');

  const sb = await supabaseRoute();
  const { data } = await sb.from('profiles').select('*').eq('user_id', userId).single();
  if (!data) redirect('/profile/import');

  const profile: Profile = {
    current_self: data.current_self ?? '',
    inertia: data.inertia ?? '',
    the_thing: data.the_thing ?? '',
    passive_mode: data.passive_mode ?? '',
    late_night_scene: data.late_night_scene ?? '',
    unspoken_desire: data.unspoken_desire ?? '',
    interests: data.interests ?? '',
  };

  return (
    <Stage align="top" width="wide">
      <Caption>Step Four</Caption>
      <Headline>Is this you?</Headline>
      <Whisper>If a line doesn&apos;t fit, change it. The three futures grow from these seven.</Whisper>
      <ProfileEditor initial={profile} />
    </Stage>
  );
}
