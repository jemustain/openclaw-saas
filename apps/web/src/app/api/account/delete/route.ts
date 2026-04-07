import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { destroyAssistant } from '@/lib/vm/lifecycle';
import { stripe } from '@/lib/stripe/client';
import { apiError, handleApiError, ERR } from '@/lib/errors';
import { sendEmail } from '@/lib/email/send';

/**
 * POST /api/account/delete
 *
 * Permanently deletes a user's account and all associated data.
 */
export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return apiError(ERR.UNAUTHORIZED, 401);
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
      }
    }

    // 2. Cancel Stripe subscription immediately
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
      }
    }

    // 3. Send goodbye email (before deleting user record)
    if (userEmail) {
      try {
        await sendEmail(
          userEmail,
          'We\'re sorry to see you go',
          `<div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #1a1a1a;">Goodbye from ShiftWorker</h2>
            <p>Hi there,</p>
            <p>Your ShiftWorker account has been deleted and all associated data has been permanently removed.</p>
            <p>Thank you for giving us a try — we truly appreciate it. If things change down the road, we'd love to have you back. Just sign up again anytime at <a href="https://shiftworker.ai">shiftworker.ai</a>.</p>
            <p>If you have any feedback on how we could improve, feel free to reply to this email. We read every response.</p>
            <p style="margin-top: 24px;">All the best,<br/>The ShiftWorker Team</p>
          </div>`,
        );
        console.log(`Sent goodbye email to ${userEmail}`);
      } catch (err) {
        console.error(`Failed to send goodbye email:`, err);
        // Non-blocking — don't fail the deletion over an email
      }
    }

    // 4. Delete all user data from DB
    const tables = [
      'telegram_pairings',
      'usage_logs',
      'assistants',
      'subscriptions',
      'provider_tokens',
    ];

    for (const table of tables) {
      const { error } = await supabase.from(table).delete().eq('user_id', userId);
      if (error) {
        console.error(`Failed to delete from ${table}:`, error.message);
      }
    }

    if (userEmail) {
      await supabase.from('waitlist').delete().eq('email', userEmail.toLowerCase());
    }

    const { error: userDeleteError } = await supabase.from('users').delete().eq('id', userId);
    if (userDeleteError) {
      console.error(`Failed to delete user record:`, userDeleteError.message);
    }

    console.log(`Account deletion complete: user=${userId}`);

    // 5. Destroy the session
    const { destroySession } = await import('@/lib/auth/session');
    await destroySession();

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[account/delete]', err);
    return apiError('Account deletion failed. Please contact support.', 500);
  }
}
