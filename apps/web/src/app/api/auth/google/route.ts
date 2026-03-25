import { NextRequest, NextResponse } from 'next/server';
import { getGoogleAuthURL } from '@/lib/auth/google';

export async function GET(request: NextRequest) {
  const redirect = request.nextUrl.searchParams.get('redirect') ?? '/dashboard';
  const url = getGoogleAuthURL(redirect);
  return NextResponse.redirect(url);
}
