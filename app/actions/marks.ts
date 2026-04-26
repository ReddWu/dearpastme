'use server';

import { redirect } from 'next/navigation';
import { requireUserId } from '@/lib/session';
import { supabaseRoute } from '@/lib/supabase/route';

type MarkKind = 'want_to_become' | 'afraid_of';

export async function setMarks(input: {
  want_to_become?: string;
  afraid_of?: string;
  // Optional: when the user revised the description for the picked
  // want_to_become future inline on /mark, save it as the initial vision
  // alongside the marks. Empty string is treated as "no edit".
  vision_text?: string;
}) {
  const userId = await requireUserId();
  const sb = await supabaseRoute();

  await sb.from('future_marks').delete().eq('user_id', userId);

  const rows: { user_id: string; future_id: string; mark: MarkKind }[] = [];
  if (input.want_to_become) {
    rows.push({ user_id: userId, future_id: input.want_to_become, mark: 'want_to_become' });
  }
  if (input.afraid_of) {
    rows.push({ user_id: userId, future_id: input.afraid_of, mark: 'afraid_of' });
  }

  if (rows.length) {
    const { error } = await sb.from('future_marks').insert(rows as never);
    if (error) throw new Error(`Couldn't accept your choice: ${error.message}`);
  }

  const visionText = input.vision_text?.trim();
  if (input.want_to_become && visionText && visionText.length >= 12) {
    const { error } = await sb
      .from('futures')
      .update({ vision: visionText, vision_updated_at: new Date().toISOString() } as never)
      .eq('id', input.want_to_become)
      .eq('user_id', userId);
    if (error) throw new Error(`Couldn't keep your vision: ${error.message}`);
  }

  redirect('/journal');
}
