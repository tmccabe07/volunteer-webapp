/**
 * Next.js Middleware
 * 
 * Route protection and tier-based authorization
 * per research.md Decision 2.2
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Public routes that don't require authentication
 */
const publicPaths = [
  '/auth/login',
  '/auth/register',
  '/auth/reset-password',
  '/auth/change-password',
  '/unauthorized',
];

/**
 * Tier-based path access control
 * 
 * Tier 1 (PARENT): Basic volunteer access
 * Tier 2 (LEADER): Den leaders, committee members
 * Tier 3 (ADMIN): Site administrators
 */
const tierPaths: Record<number, string[]> = {
  1: ['/events', '/tasks', '/leaderboard', '/profile'],
  2: [
    '/events',
    '/tasks',
    '/leaderboard',
    '/profile',
    '/reports',
    '/volunteers',
    '/admin-tasks',
  ],
  3: [
    '/events',
    '/tasks',
    '/leaderboard',
    '/profile',
    '/reports',
    '/volunteers',
    '/admin-tasks',
    '/admin',
  ],
};

/**
 * Verify JWT token and extract tier
 * 
 * Note: This is a simplified check. For production, consider using
 * a library like jose for proper JWT verification in Edge Runtime.
 * 
 * @param token Access token from cookie
 * @returns User tier or null if invalid
 */
function verifyToken(token: string): number | null {
  try {
    // Simple base64 decode of JWT payload (not cryptographically verified)
    // This is acceptable for client-side access control since the backend
    // will verify the token on actual API calls
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64').toString()
    );
    
    // Check if token is expired
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return null;
    }
    
    return payload.tier || null;
  } catch {
    return null;
  }
}

/**
 * Middleware function
 * 
 * Runs on every request to protected routes
 * 
 * NOTE: In development with separate frontend/backend ports, cookies
 * set by the backend (localhost:3001) are not accessible here (localhost:3000).
 * The AuthContext client-side will handle actual authentication verification.
 * In production with same-origin deployment, this middleware provides SSR protection.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Allow static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // In development mode, allow all routes to proceed
  // The client-side AuthContext will handle authentication
  // Once the page loads, useRequireAuth() will redirect if needed
  if (process.env.NODE_ENV !== 'production') {
    return NextResponse.next();
  }

  // Production mode - check cookies for SSR protection
  const token = request.cookies.get('access_token')?.value;

  if (!token) {
    // No token - redirect to login
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verify token and get tier
  const userTier = verifyToken(token);

  if (!userTier) {
    // Invalid or expired token - redirect to login
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check tier-based access
  const allowedPaths = Object.entries(tierPaths)
    .filter(([tier]) => parseInt(tier) <= userTier)
    .flatMap(([, paths]) => paths);

  const hasAccess = allowedPaths.some((path) => pathname.startsWith(path));

  if (!hasAccess) {
    // Insufficient permissions - redirect to unauthorized
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }

  // Allow request to proceed
  return NextResponse.next();
}

/**
 * Matcher configuration
 * 
 * Defines which routes the middleware should run on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
