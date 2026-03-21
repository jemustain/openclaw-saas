import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { generateToken } from '@/lib/waitlist-token';

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('waitlist').insert({ email: trimmed });

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ message: "You're already on the list!" });
      }
      console.error('Waitlist insert error:', error);
      return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
    }

    // Send welcome email
    try {
      const token = await generateToken(trimmed);
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://claw4all-app.vercel.app';
      const unsubscribeUrl = `${baseUrl}/api/waitlist/unsubscribe?email=${encodeURIComponent(trimmed)}&token=${token}`;

      await getResend().emails.send({
        from: 'HandsOff <onboarding@resend.dev>',
        to: trimmed,
        subject: "You're on the HandsOff waitlist! 🎉",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
            <h1 style="font-size: 24px; color: #1a1a2e; margin-bottom: 16px;">Welcome to the waitlist!</h1>
            <p style="font-size: 16px; color: #444; line-height: 1.6;">
              Thanks for signing up for <strong>HandsOff</strong> — your personal AI assistant that actually does things.
            </p>
            <p style="font-size: 16px; color: #444; line-height: 1.6;">
              We're putting the finishing touches on the platform. When it's ready, you'll be among the first to get access.
            </p>
            <p style="font-size: 16px; color: #444; line-height: 1.6;">
              In the meantime, here's what HandsOff will do for you:
            </p>
            <ul style="font-size: 15px; color: #444; line-height: 1.8;">
              <li>📧 Read and manage your email</li>
              <li>📅 Handle your calendar</li>
              <li>🔍 Research anything you ask</li>
              <li>💬 Available 24/7 via WhatsApp, Telegram, or Signal</li>
            </ul>
            <p style="font-size: 16px; color: #444; line-height: 1.6;">
              We'll email you once when it's time. No spam, ever.
            </p>
            <p style="font-size: 14px; color: #999; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px;">
              Don't want to hear from us? <a href="${unsubscribeUrl}" style="color: #7c3aed;">Remove me from the waitlist</a>
            </p>
          </div>
        `,
      });
    } catch (emailError) {
      // Don't fail the signup if email fails — they're still on the list
      console.error('Welcome email failed:', emailError);
    }

    return NextResponse.json({ message: "You're on the list!" });
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
