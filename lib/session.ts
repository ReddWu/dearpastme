import { supabaseRoute } from './supabase/route';

// Idempotently ensure the visitor has a Supabase anonymous session.
// Returns the user_id. Safe to call from server actions / route handlers
// (where cookies can be written). For server components prefer requireUserId.
export async function ensureAnonUser(): Promise<string> {
  const sb = await supabaseRoute();
  const { data: existing } = await sb.auth.getUser();
  if (existing.user) return existing.user.id;

  const { data, error } = await sb.auth.signInAnonymously();
  if (error || !data.user) {
    throw new Error(`Couldn't open this door for you — ${error?.message ?? 'unknown auth error'}.`);
  }
  return data.user.id;
}

export async function requireUserId(): Promise<string> {
  const sb = await supabaseRoute();
  const { data } = await sb.auth.getUser();
  if (!data.user) throw new Error('This door hasn\'t opened for you yet.');
  return data.user.id;
}
