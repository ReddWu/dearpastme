import { createClient } from '@supabase/supabase-js';
import { requireEnv } from '../env';

let client: ReturnType<typeof createClient> | null = null;

export function supabaseServer() {
  if (client) return client;
  client = createClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  return client;
}
