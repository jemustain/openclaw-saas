import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { envRequired } from '../env';

/**
 * Server-side Supabase client for database queries.
 * Uses the service role key for full access (server-only).
 */
export function createClient() {
  return createSupabaseClient<Database>(
    envRequired('NEXT_PUBLIC_SUPABASE_URL'),
    envRequired('SUPABASE_SERVICE_ROLE_KEY'),
  );
}
