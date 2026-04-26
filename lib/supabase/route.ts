import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { requireEnv } from '../env';

// Cookie-aware server-side Supabase client. Uses the user's session
// (anonymous or full), so RLS policies fire as that user.
export async function supabaseRoute() {
  const cookieStore = await cookies();
  return createServerClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(items) {
          for (const { name, value, options } of items) {
            try {
              cookieStore.set(name, value, options);
            } catch {
              // Called from a server component — cookie writes are deferred
              // to a route handler / server action. Safe to ignore.
            }
          }
        },
      },
    },
  );
}
