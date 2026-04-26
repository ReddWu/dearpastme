'use server';

import { redirect } from 'next/navigation';
import { requireUserId } from '@/lib/session';
import { supabaseRoute } from '@/lib/supabase/route';

const RECIPIENTS = ['flowing', 'realized', 'drifting', 'all'] as const;

function isRecipient(value: string): value is (typeof RECIPIENTS)[number] {
  return RECIPIENTS.includes(value as (typeof RECIPIENTS)[number]);
}

export async function createJournalEntry(formData: FormData) {
  const userId = await requireUserId();

  const content = String(formData.get('content') ?? '').trim();
  const recipient = String(formData.get('recipient') ?? 'all').trim();

  if (!isRecipient(recipient)) {
    throw new Error('That addressee does not exist here.');
  }

  if (content.length < 12) {
    throw new Error('Write a little more before you leave it here.');
  }

  const sb = await supabaseRoute();
  const { error } = await sb.from('journal_entries').insert({
    user_id: userId,
    content,
    recipient,
  } as never);

  if (error) {
    throw new Error(`Couldn't keep this page: ${error.message}`);
  }

  redirect('/journal');
}
