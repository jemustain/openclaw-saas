import { createClient } from '@/lib/supabase/server';
import { sendEmail } from './send';
import {
  welcomeEmail,
  assistantReadyEmail,
  paymentFailedEmail,
  subscriptionCancelledEmail,
  usageLimitEmail,
} from './templates';

async function getUserEmail(userId: string): Promise<{ email: string; name: string } | null> {
  const supabase: any = createClient();
  const { data } = await supabase
    .from('users')
    .select('email, name')
    .eq('id', userId)
    .single();
  if (!data?.email) return null;
  return { email: data.email, name: data.name || data.email.split('@')[0] };
}

export async function onUserSignup(userId: string) {
  const user = await getUserEmail(userId);
  if (!user) return;
  await sendEmail(user.email, 'Welcome to ShiftWorker! 🎉', welcomeEmail(user.name));
}

export async function onAssistantReady(userId: string) {
  const user = await getUserEmail(userId);
  if (!user) return;
  await sendEmail(user.email, 'Your Assistant is Ready!', assistantReadyEmail(user.name));
}

export async function onPaymentFailed(userId: string) {
  const user = await getUserEmail(userId);
  if (!user) return;
  await sendEmail(user.email, 'Payment Issue — Action Needed', paymentFailedEmail(user.name));
}

export async function onSubscriptionCancelled(userId: string) {
  const user = await getUserEmail(userId);
  if (!user) return;
  await sendEmail(user.email, 'Your Subscription Has Been Cancelled', subscriptionCancelledEmail(user.name));
}

export async function onUsageLimitReached(userId: string) {
  const user = await getUserEmail(userId);
  if (!user) return;
  await sendEmail(user.email, "You've Hit Your Daily Limit", usageLimitEmail(user.name));
}
