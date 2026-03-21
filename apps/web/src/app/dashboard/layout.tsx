import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardNav } from '@/components/nav/dashboard-nav';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/signin?redirect=/dashboard');
  }

  const userName = user.user_metadata?.name ?? user.email?.split('@')[0] ?? 'User';
  const plan = user.user_metadata?.plan ?? 'Free';

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row">
      <DashboardNav userName={userName} plan={plan} />
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
