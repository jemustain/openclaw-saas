import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import OnboardingWizard from './wizard';

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session) {
    redirect('/auth/signin?redirect=/onboarding');
  }

  return <OnboardingWizard />;
}
