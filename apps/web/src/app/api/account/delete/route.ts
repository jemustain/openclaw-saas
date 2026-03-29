import { NextResponse } from 'next/server';
import { getSession, destroySession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { destroyAssistant } from '@/lib/vm/lifecycle';
import { stripe } from '@/lib/stripe/client';

/**
 * POST /api/account/delete
 *
 * Permanently deletes a user's account and all associated data:
 * 1. Destroys active/suspended VMs
 * 2. Cancels Stripe subscription immediately
 * 3. Deletes all DB records (assistants, subscriptions, provider_tokens, usage_logs, telegram_pairings, users, waitlist)
 * 4. Destroys the session
 */
export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.userId;
    const userEmail = session.email;
    const supabase: any = createClient();

    console.log(`Account deletion started: user=${userId} email=${userEmail}`);

    // 1. Destroy any active/suspended assistants (VMs)
    const { data: assistants } = await supabase
      .from('assistants')
      .select('id, status')
      .eq('user_id', userId)
      .in('status', ['active', 'suspended', 'provisioning']);

    for (const assistant of assistants ?? []) {
      try {
        await destroyAssistant(assistant.id);
        console.log(`Destroyed assistant ${assistant.id} during account deletion`);
      } catch (err) {
        console.error(`Failed to destroy assistant ${assistant.id}:`, err);
        // Continue with deletion even if VM destroy fails
      }
    }

    // 2. Cancel Stripe subscription immediately (no grace period)
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id, stripe_customer_id')
      .eq('user_id', userId)
      .single();

    if (subscription?.stripe_subscription_id) {
      try {
        await stripe.subscriptions.cancel(subscription.stripe_subscription_id);
        console.log(`Cancelled Stripe subscription ${subscription.stripe_subscription_id}`);
      } catch (err) {
        console.error(`Failed to cancel Stripe subscription:`, err);
        // Continue - subscription may already be cancelled
      }
    }

    // 3. Delete all user data from DB (order matters for foreign keys)
    const tables = [
      'telegram_pairings',
      'usage_logs',
      'assistants',
      'subscriptions',
      'provider_tokens',
    ];

    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error(`Failed to delete from ${table}:`, error.message);
        // Continue with other tables
      }
    }

    // Delete waitlist entry by email
    if (userEmail) {
      await supabase
        .from('waitlist')
        .delete()
        .eq('email', userEmail.toLowerCase());
    }

    // Delete the user record last
    const { error: userDeleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (userDeleteError) {
      console.error(`Failed to delete user record:`, userDeleteError.message);
    }

    console.log(`Account deletion complete: user=${userId}`);

    // 4. Destroy the session
    await destroySession();

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Account deletion failed:', err);
    return NextResponse.json(
      { error: 'Account deletion failed. Please contact support.' },
      { status: 500 },
    );
  }
}
