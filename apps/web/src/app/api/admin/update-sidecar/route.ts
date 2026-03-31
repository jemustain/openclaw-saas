import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';

export const maxDuration = 60;

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase: any = createClient();
  const { data: assistant } = await supabase
    .from('assistants')
    .select('ip_address, sidecar_token')
    .eq('user_id', session.userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!assistant?.ip_address || !assistant?.sidecar_token) {
    return NextResponse.json({ error: 'No active assistant' }, { status: 404 });
  }

  const ip = assistant.ip_address;
  const token = assistant.sidecar_token;
  const results: Record<string, any> = {};

  // Step 1: Fix any config issues on the current sidecar
  try {
    const res = await fetch(`http://${ip}:8788/admin/fix-config`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
    });
    results.fixConfig = await res.json();
  } catch (err: any) {
    results.fixConfig = { error: err.message };
  }

  // Step 2: Update the sidecar code from GitHub
  try {
    const res = await fetch(`http://${ip}:8788/admin/update-sidecar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(40000),
    });
    results.updateSidecar = await res.json();
  } catch (err: any) {
    // The sidecar restarts itself, so the connection may drop
    results.updateSidecar = { status: 'restarting', note: err.message };
  }

  return NextResponse.json(results);
}
