import { createClient } from '@/lib/supabase/server';
import { generateToken } from '@/lib/waitlist-token';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');
  const token = searchParams.get('token');

  if (!email || !token) {
    return NextResponse.redirect(new URL('/unsubscribe?status=invalid', request.url));
  }

  const expectedToken = await generateToken(email);
  if (token !== expectedToken) {
    return NextResponse.redirect(new URL('/unsubscribe?status=invalid', request.url));
  }

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('waitlist').delete().eq('email', email.trim().toLowerCase());

  if (error) {
    console.error('Waitlist unsubscribe error:', error);
    return NextResponse.redirect(new URL('/unsubscribe?status=error', request.url));
  }

  return NextResponse.redirect(new URL('/unsubscribe?status=success', request.url));
}
