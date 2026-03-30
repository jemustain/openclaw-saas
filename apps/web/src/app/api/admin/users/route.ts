import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin/auth';
import { apiError, ERR, handleApiError } from '@/lib/errors';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return apiError(ERR.UNAUTHORIZED, 401);
    }
    if (!isAdmin(session.email)) {
      return apiError(ERR.FORBIDDEN, 403);
    }

    const supabase = createClient();
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') ?? '1', 10);
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20', 10), 100);
    const search = url.searchParams.get('search') ?? '';
    const offset = (page - 1) * limit;

    let query = supabase
      .from('profiles')
      .select('id, email, name, plan, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%`);
    }

    const { data: users, count, error } = await query;

    if (error) {
      console.error('Admin users query error:', error);
      return NextResponse.json({ error: 'Query failed' }, { status: 500 });
    }

    const userIds = (users ?? []).map((u: any) => u.id);
    const { data: assistants } = await supabase
      .from('assistants')
      .select('user_id, status')
      .in('user_id', userIds)
      .neq('status', 'destroyed');

    const assistantMap: Record<string, string> = {};
    for (const a of (assistants ?? []) as any[]) {
      assistantMap[a.user_id] = a.status;
    }

    const enriched = (users ?? []).map((u: any) => ({
      ...u,
      assistant_status: assistantMap[u.id] ?? null,
    }));

    return NextResponse.json({
      users: enriched,
      total: count ?? 0,
      page,
      limit,
    });
  } catch (err) {
    console.error('Admin users error:', err);
    return apiError(ERR.INTERNAL, 500);
  }
}
