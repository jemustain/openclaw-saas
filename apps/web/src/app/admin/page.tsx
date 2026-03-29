import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin/auth';

export default async function AdminDashboard() {
  const session = await getSession();

  if (!session) redirect('/auth/signin?redirect=/admin');
  if (!isAdmin(session.email)) redirect('/dashboard');

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

  const { data: recentUsers } = await supabase
    .from('profiles')
    .select('id, email, name, plan, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  const { data: activeVMs } = await supabase
    .from('assistants')
    .select('id, user_id, status, ip_address, created_at')
    .neq('status', 'destroyed')
    .order('created_at', { ascending: false })
    .limit(20);

  const userIds = [...new Set((activeVMs ?? []).map((v: any) => v.user_id))];
  const { data: vmProfiles } = userIds.length
    ? await supabase.from('profiles').select('id, email').in('id', userIds)
    : { data: [] as any[] };
  const emailMap: Record<string, string> = {};
  for (const p of (vmProfiles ?? []) as any[]) emailMap[p.id] = p.email;

  const stats = [
    { label: 'Total Users', value: totalUsers ?? 0, icon: '' },
    { label: 'Active Assistants', value: activeAssistants ?? 0, icon: '' },
    { label: 'Revenue', value: '$0', icon: '' },
    { label: 'VMs Running', value: totalVMs ?? 0, icon: '' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 lg:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <a href="/admin/users" className="text-sm text-blue-400 hover:text-blue-300 underline">
            Manage Users →
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-sm text-slate-400">{s.label}</div>
            </div>
          ))}
        </div>

        <section>
          <h2 className="text-xl font-semibold mb-3">Recent Signups</h2>
          <div className="overflow-x-auto bg-slate-900 border border-slate-800 rounded-xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="text-left p-3">Email</th>
                  <th className="text-left p-3">Name</th>
                  <th className="text-left p-3">Plan</th>
                  <th className="text-left p-3">Joined</th>
                </tr>
              </thead>
              <tbody>
                {(recentUsers ?? []).map((u: any) => (
                  <tr key={u.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="p-3 font-mono text-xs">{u.email}</td>
                    <td className="p-3">{u.name ?? '—'}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-xs bg-slate-800">
                        {u.plan ?? 'free'}
                      </span>
                    </td>
                    <td className="p-3 text-slate-400">{new Date(u.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {!(recentUsers ?? []).length && (
                  <tr><td colSpan={4} className="p-6 text-center text-slate-500">No users yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Active VMs</h2>
          <div className="overflow-x-auto bg-slate-900 border border-slate-800 rounded-xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="text-left p-3">Assistant ID</th>
                  <th className="text-left p-3">User</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">IP</th>
                  <th className="text-left p-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {(activeVMs ?? []).map((v: any) => (
                  <tr key={v.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="p-3 font-mono text-xs">{v.id}</td>
                    <td className="p-3 font-mono text-xs">{emailMap[v.user_id] ?? v.user_id}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        v.status === 'running' ? 'bg-green-900/50 text-green-400' :
                        v.status === 'suspended' ? 'bg-yellow-900/50 text-yellow-400' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {v.status}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-xs">{v.ip_address ?? '—'}</td>
                    <td className="p-3 text-slate-400">{new Date(v.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {!(activeVMs ?? []).length && (
                  <tr><td colSpan={5} className="p-6 text-center text-slate-500">No active VMs</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
