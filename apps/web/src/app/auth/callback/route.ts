import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const redirect = searchParams.get('redirect') ?? '/dashboard';

  // Handle OAuth error responses (e.g. user denied consent)
  const oauthError = searchParams.get('error');
  if (oauthError) {
    const errorParam = oauthError === 'access_denied' ? 'access_denied' : 'auth_callback_failed';
    return NextResponse.redirect(`${origin}/auth/signin?error=${errorParam}`);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${redirect}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/signin?error=auth_callback_failed`);
}
