import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { DashboardNav } from '@/components/nav/dashboard-nav';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) {
    redirect('/auth/signin?redirect=/dashboard');
  }

  const supabase: any = createClient();
  const { data: profile } = await supabase
    .from('users')
    .select('name, plan')
    .eq('id', session.userId)
    .single();

  const userName = profile?.name ?? session.email.split('@')[0] ?? 'User';
  const plan = profile?.plan ?? 'free';

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row">
      <DashboardNav userName={userName} plan={plan} />
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
