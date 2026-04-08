# Next.js 14 App Router Authentication Research
## JWT Authentication with Express Backend

**Project**: Volunteer Management Application  
**Date**: March 12, 2026  
**Requirements**: Three-tier authorization (parent/guardian, den leader/committee, site admin)

---

## Decision 1: JWT Session Management with HttpOnly Cookies

**Rationale**: For a Next.js 14 App Router application consuming JWT tokens from a separate Express.js backend, **stateless sessions stored in HttpOnly cookies** provide the best security and UX balance. This approach:

- Prevents XSS attacks by making tokens inaccessible to client-side JavaScript
- Enables automatic token transmission with each request
- Supports "remember me" functionality via cookie expiration
- Works seamlessly with Next.js middleware for route protection
- Compatible with both Server and Client Components

**Implementation**:

### 1. Backend JWT Structure
```typescript
// Express.js backend - JWT payload structure
interface JWTPayload {
  userId: string;
  email: string;
  role: 'parent' | 'den_leader' | 'site_admin'; // Three-tier authorization
  tier: 1 | 2 | 3; // 1=parent, 2=den_leader/committee, 3=site_admin
  exp: number; // Expiration timestamp
  iat: number; // Issued at
}

// Backend generates two tokens
interface AuthTokens {
  accessToken: string;  // Short-lived: 15 minutes
  refreshToken: string; // Long-lived: 7 days (or 30 for "remember me")
}
```

### 2. Next.js Session Management Layer
```typescript
// app/lib/session.ts
import 'server-only';
import { cookies } from 'next/headers';

export interface SessionData {
  userId: string;
  email: string;
  role: 'parent' | 'den_leader' | 'site_admin';
  tier: 1 | 2 | 3;
  expiresAt: Date;
}

export async function createSession(tokens: {
  accessToken: string;
  refreshToken: string;
  rememberMe?: boolean;
}) {
  const cookieStore = await cookies();
  
  // Set access token cookie
  cookieStore.set('access_token', tokens.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 15, // 15 minutes
    path: '/',
  });

  // Set refresh token cookie with longer expiration
  const refreshMaxAge = tokens.rememberMe 
    ? 60 * 60 * 24 * 30  // 30 days
    : 60 * 60 * 24 * 7;  // 7 days

  cookieStore.set('refresh_token', tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: refreshMaxAge,
    path: '/',
  });
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('access_token')?.value;

  if (!accessToken) return null;

  try {
    // Decode JWT (without verification - backend already verified)
    const payload = JSON.parse(
      Buffer.from(accessToken.split('.')[1], 'base64').toString()
    ) as JWTPayload;

    return {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      tier: payload.tier,
      expiresAt: new Date(payload.exp * 1000),
    };
  } catch {
    return null;
  }
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete('access_token');
  cookieStore.delete('refresh_token');
}
```

### 3. Server Actions for Login/Logout
```typescript
// app/actions/auth.ts
'use server';

import { redirect } from 'next/navigation';
import { createSession, deleteSession } from '@/app/lib/session';

export async function login(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const rememberMe = formData.get('rememberMe') === 'on';

  // Call Express.js backend API
  const response = await fetch(`${process.env.BACKEND_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    return { error: 'Invalid credentials' };
  }

  const { accessToken, refreshToken } = await response.json();

  // Create session with tokens
  await createSession({ accessToken, refreshToken, rememberMe });

  redirect('/dashboard');
}

export async function logout() {
  await deleteSession();
  redirect('/login');
}
```

**Alternatives Considered**:
- **localStorage for JWT**: Rejected due to XSS vulnerability - tokens accessible to JavaScript
- **SessionStorage**: Rejected - doesn't persist across tabs and lost on browser close
- **Database sessions**: Rejected - adds unnecessary complexity for stateless JWT architecture

---

## Decision 2: Next.js Middleware for Protected Routes & Token Refresh

**Rationale**: Next.js middleware (proxy.ts) is the **optimal location for authentication checks and automatic token refresh** because it:

- Runs on every request before rendering
- Can intercept and redirect unauthenticated users
- Performs optimistic auth checks from cookies (no DB lookup needed)
- Can refresh expired access tokens transparently
- Supports role-based route protection

**Implementation**:

### 1. Middleware for Route Protection
```typescript
// proxy.ts (Next.js 16+ uses proxy instead of middleware)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define route access tiers
const ROUTE_TIERS: Record<string, number> = {
  '/dashboard': 1,           // All authenticated users
  '/events': 1,              // All users can view
  '/events/create': 2,       // Den leader/committee only
  '/volunteer-points': 2,    // Den leader/committee can manage
  '/admin': 3,               // Site admin only
  '/admin/settings': 3,      // Site admin only
};

const PUBLIC_ROUTES = ['/login', '/register', '/reset-password', '/'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Get tokens from cookies
  const accessToken = request.cookies.get('access_token')?.value;
  const refreshToken = request.cookies.get('refresh_token')?.value;

  // No tokens - redirect to login
  if (!accessToken && !refreshToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Decode access token to check expiration and role
  let session: { userId: string; tier: number; exp: number } | null = null;

  if (accessToken) {
    try {
      const payload = JSON.parse(
        Buffer.from(accessToken.split('.')[1], 'base64').toString()
      );
      
      const now = Math.floor(Date.now() / 1000);
      
      // Token still valid
      if (payload.exp > now) {
        session = {
          userId: payload.userId,
          tier: payload.tier,
          exp: payload.exp,
        };
      }
    } catch {
      // Invalid token format
    }
  }

  // Access token expired but have refresh token - attempt refresh
  if (!session && refreshToken) {
    try {
      const response = await fetch(`${process.env.BACKEND_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const { accessToken: newAccessToken } = await response.json();
        
        // Parse new token
        const payload = JSON.parse(
          Buffer.from(newAccessToken.split('.')[1], 'base64').toString()
        );

        session = {
          userId: payload.userId,
          tier: payload.tier,
          exp: payload.exp,
        };

        // Create response with new token cookie
        const res = NextResponse.next();
        res.cookies.set('access_token', newAccessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 15,
          path: '/',
        });

        return res;
      }
    } catch {
      // Refresh failed - redirect to login
    }
  }

  // No valid session - redirect to login
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Check route tier authorization
  const requiredTier = ROUTE_TIERS[pathname] || 
    Object.keys(ROUTE_TIERS).find(route => pathname.startsWith(route))
      ? ROUTE_TIERS[Object.keys(ROUTE_TIERS).find(route => pathname.startsWith(route))!]
      : 1;

  if (session.tier < requiredTier) {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)',
  ],
};
```

### 2. Route Groups for Tier-Based Access
```
app/
├── (auth)/
│   ├── login/
│   │   └── page.tsx
│   ├── register/
│   │   └── page.tsx
│   └── layout.tsx
├── (tier1)/               # Parent/Guardian routes
│   ├── dashboard/
│   │   └── page.tsx
│   ├── profile/
│   │   └── page.tsx
│   └── layout.tsx
├── (tier2)/               # Den Leader/Committee routes
│   ├── events/
│   │   ├── create/
│   │   │   └── page.tsx
│   │   └── [id]/
│   │       └── edit/
│   │           └── page.tsx
│   ├── volunteer-points/
│   │   └── page.tsx
│   └── layout.tsx
└── (tier3)/               # Site Admin routes
    ├── admin/
    │   ├── settings/
    │   │   └── page.tsx
    │   └── users/
    │       └── page.tsx
    └── layout.tsx
```

**Alternatives Considered**:
- **Client-side route protection only**: Rejected - insecure, easily bypassed
- **Server Component checks only**: Rejected - layout doesn't re-render on navigation, can leak data
- **Per-page authentication**: Rejected - repetitive, error-prone, inconsistent

---

## Decision 3: Data Access Layer (DAL) for Secure Authorization

**Rationale**: A **centralized Data Access Layer provides server-side authorization enforcement** that:

- Ensures all data requests verify user permissions
- Prevents data leakage even if route protection fails
- Centralizes authorization logic for consistency
- Works with React Server Components caching
- Provides type-safe user context

**Implementation**:

### 1. Data Access Layer with Authorization
```typescript
// app/lib/dal.ts
import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'parent' | 'den_leader' | 'site_admin';
  tier: 1 | 2 | 3;
}

// Cached session verification
export const verifySession = cache(async (): Promise<User> => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('access_token')?.value;

  if (!accessToken) {
    redirect('/login');
  }

  try {
    const payload = JSON.parse(
      Buffer.from(accessToken.split('.')[1], 'base64').toString()
    );

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now) {
      redirect('/login');
    }

    return {
      id: payload.userId,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      tier: payload.tier,
    };
  } catch {
    redirect('/login');
  }
});

// Authorization helpers
export async function requireTier(minTier: number) {
  const user = await verifySession();
  if (user.tier < minTier) {
    redirect('/unauthorized');
  }
  return user;
}

export async function requireRole(
  allowedRoles: Array<'parent' | 'den_leader' | 'site_admin'>
) {
  const user = await verifySession();
  if (!allowedRoles.includes(user.role)) {
    redirect('/unauthorized');
  }
  return user;
}

// Data fetching with authorization
export const getUserEvents = cache(async () => {
  const user = await verifySession();

  const response = await fetch(
    `${process.env.BACKEND_URL}/api/events?userId=${user.id}`,
    {
      headers: {
        'Cookie': `access_token=${(await cookies()).get('access_token')?.value}`,
      },
    }
  );

  if (!response.ok) throw new Error('Failed to fetch events');
  return response.json();
});

export const createEvent = cache(async (eventData: any) => {
  // Only tier 2+ can create events
  const user = await requireTier(2);

  const response = await fetch(
    `${process.env.BACKEND_URL}/api/events`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `access_token=${(await cookies()).get('access_token')?.value}`,
      },
      body: JSON.stringify({ ...eventData, createdBy: user.id }),
    }
  );

  if (!response.ok) throw new Error('Failed to create event');
  return response.json();
});
```

### 2. Using DAL in Server Components
```typescript
// app/(tier1)/dashboard/page.tsx
import { verifySession, getUserEvents } from '@/app/lib/dal';

export default async function DashboardPage() {
  const user = await verifySession();
  const events = await getUserEvents();

  return (
    <div>
      <h1>Welcome, {user.name}</h1>
      <p>Role: {user.role}</p>
      {/* Render events */}
    </div>
  );
}
```

### 3. Using DAL in Server Actions
```typescript
// app/actions/events.ts
'use server';

import { requireTier } from '@/app/lib/dal';
import { revalidatePath } from 'next/cache';

export async function createEventAction(formData: FormData) {
  const user = await requireTier(2);

  const eventData = {
    title: formData.get('title'),
    date: formData.get('date'),
    rankLevel: formData.get('rankLevel'),
    createdBy: user.id,
  };

  const response = await fetch(
    `${process.env.BACKEND_URL}/api/events`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData),
    }
  );

  if (!response.ok) {
    return { error: 'Failed to create event' };
  }

  revalidatePath('/events');
  return { success: true };
}
```

**Alternatives Considered**:
- **Direct API calls in components**: Rejected - authorization scattered, inconsistent
- **Context providers for auth**: Rejected - only works in Client Components, can't enforce server-side
- **Per-route authorization checks**: Rejected - easily forgotten, no centralized control

---

## Decision 4: Axios Interceptors for API Client with Token Management

**Rationale**: For Client Components that need to call the backend API, **Axios with interceptors provides automatic token injection and refresh handling**:

- Automatically attaches JWT tokens to requests
- Handles 401 responses with token refresh
- Retries failed requests after refresh
- Centralizes API configuration
- Works seamlessly with React Query/SWR

**Implementation**:

### 1. API Client with Interceptors
```typescript
// app/lib/api-client.ts
'use client';

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL,
  withCredentials: true, // Send cookies with requests
});

// Request interceptor - not needed since cookies are auto-sent
// But useful for logging or adding other headers
apiClient.interceptors.request.use(
  (config) => {
    // Headers for CSRF protection if needed
    // config.headers['X-CSRF-Token'] = getCsrfToken();
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle token refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // 401 Unauthorized - try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue requests while refreshing
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Attempt token refresh
        await apiClient.post('/api/auth/refresh', {}, {
          withCredentials: true, // Send refresh_token cookie
        });

        // Refresh succeeded, process queued requests
        processQueue(null);
        isRefreshing = false;

        // Retry original request
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed - redirect to login
        processQueue(refreshError as AxiosError, null);
        isRefreshing = false;

        // Redirect to login
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // 403 Forbidden - authorization issue
    if (error.response?.status === 403) {
      window.location.href = '/unauthorized';
    }

    return Promise.reject(error);
  }
);

export default apiClient;
```

### 2. Using API Client in Client Components
```typescript
// app/components/EventList.tsx
'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/app/lib/api-client';

interface Event {
  id: string;
  title: string;
  date: string;
}

export function EventList() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const response = await apiClient.get<Event[]>('/api/events');
        setEvents(response.data);
      } catch (error) {
        console.error('Failed to fetch events:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <ul>
      {events.map((event) => (
        <li key={event.id}>{event.title} - {event.date}</li>
      ))}
    </ul>
  );
}
```

### 3. Integration with React Query (Recommended)
```typescript
// app/lib/queries/events.ts
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/app/lib/api-client';

export function useEvents() {
  return useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const response = await apiClient.get('/api/events');
      return response.data;
    },
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventData: any) => {
      const response = await apiClient.post('/api/events', eventData);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate and refetch events
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}
```

**Alternatives Considered**:
- **Fetch API with manual token handling**: Rejected - requires manual refresh logic everywhere
- **Server Actions for all API calls**: Rejected - doesn't work for real-time updates, streaming
- **Separate tokens in headers**: Rejected - cookies are more secure and automatic

---

## Summary: Recommended Architecture

### Tech Stack
- **Frontend**: Next.js 14 App Router
- **Backend**: Express.js with JWT authentication
- **HTTP Client**: Axios with interceptors
- **State Management**: React Query (TanStack Query)
- **Form Handling**: Server Actions + React Hook Form
- **Validation**: Zod (shared between client and server)

### Security Best Practices
1. ✅ Store JWTs in HttpOnly cookies (not localStorage)
2. ✅ Use short-lived access tokens (15 min)
3. ✅ Implement refresh token rotation
4. ✅ Enforce CSRF protection via SameSite cookies
5. ✅ Validate all inputs on server (Zod schemas)
6. ✅ Use Data Access Layer for authorization
7. ✅ Never trust client-side checks alone
8. ✅ Implement rate limiting on auth endpoints
9. ✅ Log security events (failed logins, etc.)
10. ✅ Use HTTPS in production

### File Structure
```
app/
├── (auth)/                   # Public authentication routes
│   ├── login/
│   ├── register/
│   └── reset-password/
├── (tier1)/                  # Parent/Guardian routes
├── (tier2)/                  # Den Leader/Committee routes
├── (tier3)/                  # Site Admin routes
├── actions/                  # Server Actions
│   ├── auth.ts
│   └── events.ts
├── lib/
│   ├── session.ts           # Session management
│   ├── dal.ts               # Data Access Layer
│   ├── api-client.ts        # Axios client
│   └── validations.ts       # Zod schemas
├── components/              # Shared components
└── api/                     # Route handlers (if needed)

proxy.ts                     # Route protection middleware
```

### Next Steps
1. Implement password reset flow using email tokens
2. Add email verification on registration
3. Implement session timeout warnings
4. Add activity logging for audit trails
5. Set up form validation with Zod
6. Configure CORS on Express backend
7. Add rate limiting to auth endpoints
8. Implement CSRF protection
9. Set up monitoring for failed auth attempts
10. Create comprehensive error pages (unauthorized, forbidden, etc.)

---

## Additional Resources

- [Next.js Authentication Docs](https://nextjs.org/docs/app/guides/authentication)
- [Next.js Middleware (Proxy) Docs](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [React Server Components Security](https://nextjs.org/blog/security-nextjs-server-components-actions)
- [The Copenhagen Book](https://thecopenhagenbook.com/) - Auth security patterns
