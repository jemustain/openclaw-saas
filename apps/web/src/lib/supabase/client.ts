import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';

let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createClient() {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

  // During build/SSR without env vars, return a dummy that won't be called
  if (!url || !key) {
    if (typeof window === 'undefined') {
      // SSR prerender — return a proxy that throws on actual use
      return new Proxy({} as ReturnType<typeof createBrowserClient<Database>>, {
        get(_, prop) {
          if (prop === 'auth') {
            return new Proxy({}, {
              get() {
                return () => { throw new Error('Supabase not configured'); };
              },
            });
          }
          throw new Error('Supabase not configured');
        },
      });
    }
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }

  client = createBrowserClient<Database>(url, key);
  return client;
}
