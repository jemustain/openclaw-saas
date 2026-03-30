import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin/auth';
import { apiError, ERR, handleApiError } from '@/lib/errors';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return apiError(ERR.UNAUTHORIZED, 401);
    }
    if (!isAdmin(session.email)) {
      return apiError(ERR.FORBIDDEN, 403);
    }

    const supabase = createClient();

    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    const { count: activeAssistants } = await supabase
      .from('assistants')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    const { count: totalVMs } = await supabase
      .from('assistants')
      .select('*', { count: 'exact', head: true })
      .neq('status', 'destroyed');

    const { data: planData } = await supabase
      .from('profiles')
      .select('plan');

    const usersByPlan: Record<string, number> = {};
    for (const row of (planData ?? []) as any[]) {
      const plan = row.plan ?? 'free';
      usersByPlan[plan] = (usersByPlan[plan] ?? 0) + 1;
    }

    return NextResponse.json({
      total_users: totalUsers ?? 0,
      active_assistants: activeAssistants ?? 0,
      total_vms: totalVMs ?? 0,
      users_by_plan: usersByPlan,
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    return apiError(ERR.INTERNAL, 500);
  }
}
