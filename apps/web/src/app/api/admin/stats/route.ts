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

    // Total users
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Active assistants
    const { count: activeAssistants } = await supabase
      .from('assistants')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'running');

    // Total VMs (not destroyed)
    const { count: totalVMs } = await supabase
      .from('assistants')
      .select('*', { count: 'exact', head: true })
      .neq('status', 'destroyed');

    // Users by plan
    const { data: planData } = await supabase
      .from('profiles')
      .select('plan');

    const usersByPlan: Record<string, number> = {};
    for (const row of planData ?? []) {
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
