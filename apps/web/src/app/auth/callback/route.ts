import { NextResponse } from 'next/server';

// Legacy callback — redirect to sign-in
export async function GET() {
  return NextResponse.redirect(new URL('/auth/signin', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'));
}
