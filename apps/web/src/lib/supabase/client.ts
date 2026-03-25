import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

let client: ReturnType<typeof createSupabaseClient<Database>> | null = null;

/**
 * Browser-side Supabase client for database queries (anon key, RLS applies).
 */
export function createClient() {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

  if (!url || !key) {
    if (typeof window === 'undefined') {
      return new Proxy({} as ReturnType<typeof createSupabaseClient<Database>>, {
        get() {
          throw new Error('Supabase not configured');
        },
      });
    }
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }

  client = createSupabaseClient<Database>(url, key);
  return client;
}
