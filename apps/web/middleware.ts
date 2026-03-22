import { NextResponse, type NextRequest } from 'next/server';
import { verifySessionToken } from '@/lib/auth/session';

const publicPaths = ['/', '/auth/callback'];
const authPaths = ['/auth/signin', '/auth/signup'];
const protectedPrefixes = ['/dashboard', '/onboarding', '/api/launch', '/api/assistant'];

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('session')?.value;
  const session = token ? await verifySessionToken(token) : null;

  const { pathname } = request.nextUrl;

  // Public paths — always accessible
  if (publicPaths.some((p) => pathname === p)) {
    return NextResponse.next();
  }

  // API auth routes — always accessible
  if (pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  // Auth pages — redirect to dashboard if already logged in
  if (authPaths.some((p) => pathname === p || pathname.startsWith(p))) {
    if (session) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      url.search = '';
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Protected routes — require auth
  const isProtected = protectedPrefixes.some((p) => pathname === p || pathname.startsWith(p + '/'));
  if (isProtected && !session) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/signin';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // Everything else that isn't explicitly public — require auth
  if (!session && !pathname.startsWith('/auth/')) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/signin';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
