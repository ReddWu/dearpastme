'use server';

import { revalidatePath } from 'next/cache';
import { requireUserId } from '@/lib/session';
import { supabaseRoute } from '@/lib/supabase/route';

const REQUIRED_DAYS_PER_MONTH = 15;

export type VisionEligibility =
  | { ok: true; reason: 'first_edit' | 'monthly_unlock' }
  | { ok: false; reason: 'edited_this_month'; nextEditableOn: string }
  | { ok: false; reason: 'not_enough_days'; daysSoFar: number; needed: number }
  | { ok: false; reason: 'not_chosen' }
  | { ok: false; reason: 'not_owner' };

function startOfThisMonthIso(now = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

function startOfNextMonthIso(now = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
}

// Distinct calendar days (UTC) the user wrote a journal entry this month.
// Two entries on the same day count once.
async function distinctJournalDaysThisMonth(userId: string): Promise<number> {
  const sb = await supabaseRoute();
  const monthStart = startOfThisMonthIso();
  const monthEnd = startOfNextMonthIso();
  const { data, error } = await sb
    .from('journal_entries')
    .select('created_at')
    .eq('user_id', userId)
    .gte('created_at', monthStart)
    .lt('created_at', monthEnd);
  if (error || !data) return 0;
  const days = new Set(data.map((r) => String(r.created_at).slice(0, 10)));
  return days.size;
}

async function loadVisionContext(userId: string, futureId: string) {
  const sb = await supabaseRoute();
  const [{ data: future }, { data: mark }] = await Promise.all([
    sb.from('futures')
      .select('id, user_id, vision, vision_updated_at')
      .eq('id', futureId)
      .single(),
    sb.from('future_marks')
      .select('future_id, mark')
      .eq('user_id', userId)
      .eq('future_id', futureId)
      .eq('mark', 'want_to_become')
      .maybeSingle(),
  ]);
  return { future, mark };
}

export async function checkVisionEligibility(futureId: string): Promise<VisionEligibility> {
  const userId = await requireUserId();
  const { future, mark } = await loadVisionContext(userId, futureId);
  if (!future || future.user_id !== userId) return { ok: false, reason: 'not_owner' };
  if (!mark) return { ok: false, reason: 'not_chosen' };

  if (!future.vision_updated_at) return { ok: true, reason: 'first_edit' };

  const lastEdit = new Date(future.vision_updated_at as string);
  const monthStart = new Date(startOfThisMonthIso());
  const editedThisMonth = lastEdit >= monthStart;
  if (editedThisMonth) {
    return { ok: false, reason: 'edited_this_month', nextEditableOn: startOfNextMonthIso() };
  }

  const days = await distinctJournalDaysThisMonth(userId);
  if (days < REQUIRED_DAYS_PER_MONTH) {
    return { ok: false, reason: 'not_enough_days', daysSoFar: days, needed: REQUIRED_DAYS_PER_MONTH };
  }
  return { ok: true, reason: 'monthly_unlock' };
}

export async function saveFutureVision(input: {
  futureId: string;
  text: string;
}): Promise<VisionEligibility> {
  const userId = await requireUserId();
  const text = input.text.trim();
  if (text.length < 12) {
    throw new Error('Write a little more before you keep this vision.');
  }

  const eligibility = await checkVisionEligibility(input.futureId);
  if (!eligibility.ok) return eligibility;

  const sb = await supabaseRoute();
  const { error } = await sb
    .from('futures')
    .update({ vision: text, vision_updated_at: new Date().toISOString() } as never)
    .eq('id', input.futureId)
    .eq('user_id', userId);
  if (error) throw new Error(`Couldn't keep this vision: ${error.message}`);

  revalidatePath('/futures');
  revalidatePath('/journal');
  return eligibility;
}
