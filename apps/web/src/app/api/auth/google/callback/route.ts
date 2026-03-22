import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens, getGoogleUserInfo } from '@/lib/auth/google';
import { createSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state') ?? '/dashboard';
  const error = searchParams.get('error');

  if (error) {
    const errorParam = error === 'access_denied' ? 'access_denied' : 'auth_callback_failed';
    return NextResponse.redirect(`${origin}/auth/signin?error=${errorParam}`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/signin?error=auth_callback_failed`);
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const googleUser = await getGoogleUserInfo(tokens.access_token);

    const supabase: any = createClient();

    // Upsert user in the users table
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .or(`google_id.eq.${googleUser.id},email.eq.${googleUser.email}`)
      .limit(1)
      .single();

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
      await supabase
        .from('users')
        .update({
          name: googleUser.name,
          avatar_url: googleUser.picture,
          google_id: googleUser.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);
    } else {
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          email: googleUser.email,
          name: googleUser.name,
          google_id: googleUser.id,
          avatar_url: googleUser.picture,
          plan: 'free',
        })
        .select('id')
        .single();

      if (insertError || !newUser) {
        console.error('User insert failed:', insertError);
        return NextResponse.redirect(`${origin}/auth/signin?error=auth_callback_failed`);
      }
      userId = newUser.id;
    }

    await createSession({
      userId,
      email: googleUser.email,
      name: googleUser.name,
    });

    return NextResponse.redirect(`${origin}${state}`);
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    return NextResponse.redirect(`${origin}/auth/signin?error=auth_callback_failed`);
  }
}
