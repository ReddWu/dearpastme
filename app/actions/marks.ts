'use server';

import { redirect } from 'next/navigation';
import { requireUserId } from '@/lib/session';
import { supabaseRoute } from '@/lib/supabase/route';

type MarkKind = 'want_to_become' | 'afraid_of';

export async function setMarks(input: {
  want_to_become?: string;
  afraid_of?: string;
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
  redirect('/journal');
}
