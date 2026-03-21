import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin/auth';

export async function GET(request: Request) {
  try {
    const supabase: any = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdmin(user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(request.url);
    const status = url.searchParams.get('status');

    let query = supabase
      .from('assistants')
      .select('id, user_id, status, ip_address, created_at, server_id, plan')
      .neq('status', 'destroyed')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: assistants, error } = await query;

    if (error) {
      console.error('Admin assistants query error:', error);
      return NextResponse.json({ error: 'Query failed' }, { status: 500 });
    }

    // Get user emails for each assistant
    const userIds = [...new Set((assistants ?? []).map((a: any) => a.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email')
      .in('id', userIds);

    const emailMap: Record<string, string> = {};
    for (const p of profiles ?? []) {
      emailMap[p.id] = p.email;
    }

    const enriched = (assistants ?? []).map((a: any) => ({
      ...a,
      user_email: emailMap[a.user_id] ?? 'unknown',
    }));

    return NextResponse.json({ assistants: enriched });
  } catch (err) {
    console.error('Admin assistants error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
