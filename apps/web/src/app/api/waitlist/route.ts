import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { generateToken } from '@/lib/waitlist-token';
import { waitlistWelcomeEmail } from '@/lib/emails/waitlist-welcome';
import { apiError, ERR, handleApiError } from '@/lib/errors';

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
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://shiftworker.ai';
      const unsubscribeUrl = `${baseUrl}/api/waitlist/unsubscribe?email=${encodeURIComponent(trimmed)}&token=${token}`;

      const welcomeEmail = waitlistWelcomeEmail({ unsubscribeUrl });
      await getResend().emails.send({
        from: 'ShiftWorker <hello@shiftworker.ai>',
        to: trimmed,
        subject: welcomeEmail.subject,
        html: welcomeEmail.html,
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
