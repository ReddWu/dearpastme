'use server';

import { revalidatePath } from 'next/cache';
import { requireUserId } from '@/lib/session';
import { supabaseRoute } from '@/lib/supabase/route';

const RECIPIENTS = ['flowing', 'realized', 'drifting', 'all'] as const;
const WEATHERS = ['clear', 'overcast', 'rain', 'fog', 'night'] as const;
const MOODS = ['calm', 'restless', 'tired', 'hopeful', 'brittle'] as const;

function isRecipient(value: string): value is (typeof RECIPIENTS)[number] {
  return RECIPIENTS.includes(value as (typeof RECIPIENTS)[number]);
}

function normalizeChip<T extends readonly string[]>(allowed: T, raw: string): T[number] | null {
  const v = raw.trim().toLowerCase() as T[number];
  return (allowed as readonly string[]).includes(v) ? v : null;
}

export async function createJournalEntry(formData: FormData) {
  const userId = await requireUserId();

  const content = String(formData.get('content') ?? '').trim();
  const recipient = String(formData.get('recipient') ?? 'all').trim();
  const weather = normalizeChip(WEATHERS, String(formData.get('weather') ?? ''));
  const mood = normalizeChip(MOODS, String(formData.get('mood') ?? ''));

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
    weather,
    mood,
  } as never);

  if (error) {
    throw new Error(`Couldn't keep this page: ${error.message}`);
  }

  // Refresh the page in place — we don't want a redirect to bounce the
  // composer's scroll position. revalidate refetches the entries list.
  revalidatePath('/journal');
}
