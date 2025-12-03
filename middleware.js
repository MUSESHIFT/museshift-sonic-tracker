import { NextResponse } from 'next/server';

export function middleware(request) {
  const url = request.nextUrl;
  const hostname = request.headers.get('host') || '';

  // Extract subdomain
  // Works for: nca.museshift.com, nca.localhost:3000
  const subdomain = hostname.split('.')[0];

  // Handle nca subdomain
  if (subdomain === 'nca') {
    // Rewrite to /nca path internally
    // This makes nca.museshift.com show the /nca page
    url.pathname = `/nca${url.pathname === '/' ? '' : url.pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files and API routes
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
