# Research: Volunteer Management System
## Phase 0 - Technical Research & Best Practices

*Generated: 2026-03-12*  
*Feature: 001-volunteer-management*

This document consolidates research on technology stack patterns, best practices, and architectural decisions for the volunteer management system.

---

## 1. Prisma Schema Design Patterns

### Decision 1.1: Soft Deletes with `deletedAt` Timestamp

**Rationale**: Spec requires preserving historical data for achievements, audit trails, and participation reports. The `deletedAt` timestamp pattern provides superior auditability, supports temporal queries, and enables data recovery.

**Implementation**:
```prisma
model VolunteerRole {
  id          String    @id @default(cuid())
  name        String
  description String?
  tier        Int       @default(1)
  
  volunteers  Volunteer[]
  
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime? // null = active, timestamp = soft deleted
  
  @@index([deletedAt])
}
```

**Patterns**:
- Default queries filter `deletedAt: null` for active records
- Middleware enforces soft delete globally
- Index on `deletedAt` for query performance

**Alternatives Considered**:
- `isDeleted: Boolean` - Simpler but loses deletion timestamp, harder to audit
- Hard deletes - Violates requirement to preserve historical data

---

### Decision 1.2: CUID Primary Keys

**Rationale**: CUIDs provide globally unique identifiers that are URL-safe, sortable by creation time, and don't expose record counts. Prevents enumeration attacks on volunteer data.

**Implementation**:
```prisma
model Volunteer {
  id                String    @id @default(cuid())
  email             String    @unique
  name              String
  phone             String?
  passwordHash      String
  authTier          AuthTier  @default(PARENT)
  leaderboardOptIn  Boolean   @default(true)
  
  roles             VolunteerToRole[]
  signups           Signup[]
  pointAwards       PointAward[]
  taskCompletions   TaskCompletion[]
  
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  deletedAt         DateTime?
  
  @@index([email])
  @@index([deletedAt])
}

enum AuthTier {
  PARENT    // Tier 1
  LEADER    // Tier 2 (den leader, committee)
  ADMIN     // Tier 3 (site admin)
}
```

**Alternatives Considered**:
- Auto-increment integers - Exposes record counts, not globally unique
- UUIDs - Longer (36 chars), not sortable, less compact for SQLite

---

### Decision 1.3: Strategic Index Placement for SQLite

**Rationale**: SQLite benefits from targeted indexes on foreign keys, filter columns, and composite queries. App frequently filters by rank, date ranges, authorization tier, and active/deleted status.

**Implementation**:
```prisma
model Event {
  id              String        @id @default(cuid())
  title           String
  description     String?
  eventDate       DateTime
  rankLevel       RankLevel?    // null = pack-wide
  isRecurring     Boolean       @default(false)
  isComplete      Boolean       @default(false)
  
  activitySlots   ActivitySlot[]
  createdById     String
  createdBy       Volunteer     @relation(fields: [createdById], references: [id])
  
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  deletedAt       DateTime?
  
  @@index([eventDate, deletedAt])        // "Show upcoming active events"
  @@index([rankLevel, eventDate])        // "Events for my rank"
  @@index([isComplete, eventDate])       // "Mark complete workflow"
  @@index([createdById])                 // Foreign key lookup
}

model Signup {
  id              String      @id @default(cuid())
  volunteerId     String
  volunteer       Volunteer   @relation(fields: [volunteerId], references: [id])
  activitySlotId  String
  activitySlot    ActivitySlot @relation(fields: [activitySlotId], references: [id], onDelete: Cascade)
  
  withdrawn       Boolean     @default(false)
  withdrawnAt     DateTime?
  
  createdAt       DateTime    @default(now())
  deletedAt       DateTime?
  
  @@unique([volunteerId, activitySlotId]) // Prevent double signup
  @@index([volunteerId, withdrawn])       // "My active signups"
  @@index([activitySlotId, withdrawn])    // Check capacity
}
```

**Patterns**:
- Composite indexes for multi-column WHERE clauses
- `@@unique` constraints double as indexes
- Foreign key columns always indexed
- Most selective column first in composite indexes

**Alternatives Considered**:
- Index every column - Wastes space, slows writes
- No indexes - Catastrophic performance for filtering

---

### Decision 1.4: Cascade vs Restrict Delete

**Rationale**: Balance data integrity with operational needs. Events/slots cascade (when event deleted, slots go too), but ActivityTypes restrict to prevent deletion if in use per spec requirement.

**Implementation**:
```prisma
model ActivityType {
  id              String        @id @default(cuid())
  name            String        @unique
  pointValue      Int
  category        String
  
  activitySlots   ActivitySlot[]
  pointAwards     PointAward[]
  
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  deletedAt       DateTime?
}

model ActivitySlot {
  eventId         String
  event           Event       @relation(fields: [eventId], references: [id], onDelete: Cascade)
  activityTypeId  String
  activityType    ActivityType @relation(fields: [activityTypeId], references: [id], onDelete: Restrict)
}
```

**Patterns**:
- `onDelete: Cascade` for parent-child relationships (Event → ActivitySlot → Signup)
- `onDelete: Restrict` for reference data (ActivityType, VolunteerRole)
- Soft delete checked in application layer before Restrict violations

---

## 2. Next.js 14 Authentication Patterns

### Decision 2.1: JWT Session Management with HttpOnly Cookies

**Rationale**: Store JWT tokens from Express backend in HttpOnly, secure cookies. More secure than localStorage (XSS protection), supports SSR, enables automatic token refresh.

**Implementation**:
```typescript
// lib/session.ts
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'

interface SessionData {
  userId: string
  email: string
  tier: number
  exp: number
}

export async function getSession(): Promise<SessionData | null> {
  const token = cookies().get('access_token')?.value
  
  if (!token) return null
  
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.JWT_SECRET!)
    )
    return payload as SessionData
  } catch {
    return null
  }
}

export async function setSession(accessToken: string, refreshToken: string, rememberMe: boolean) {
  const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60 // 30 days : 7 days
  
  cookies().set('access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60 // 15 minutes
  })
  
  cookies().set('refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge
  })
}
```

**Alternatives Considered**:
- localStorage - Vulnerable to XSS attacks, doesn't work with SSR
- Session cookies only - Requires backend session store, less scalable

---

### Decision 2.2: Next.js Middleware for Protected Routes

**Rationale**: Use middleware.ts for route protection and automatic token refresh. Provides centralized authentication, prevents unauthorized access, handles tier-based routing.

**Implementation**:
```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const publicPaths = ['/auth/login', '/auth/register', '/auth/reset-password']
const tierPaths = {
  1: ['/events', '/tasks', '/leaderboard', '/profile'],
  2: ['/events', '/tasks', '/leaderboard', '/profile', '/reports', '/admin-tasks'],
  3: ['/events', '/tasks', '/leaderboard', '/profile', '/reports', '/admin-tasks', '/admin/roles', '/admin/config']
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Allow public paths
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next()
  }
  
  // Verify access token
  const token = request.cookies.get('access_token')?.value
  
  if (!token) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }
  
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.JWT_SECRET!)
    )
    
    // Check tier access
    const userTier = payload.tier as number
    const allowedPaths = Object.entries(tierPaths)
      .filter(([tier]) => parseInt(tier) <= userTier)
      .flatMap(([_, paths]) => paths)
    
    if (!allowedPaths.some(path => pathname.startsWith(path))) {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }
    
    return NextResponse.next()
  } catch {
    // Token expired, attempt refresh
    const refreshToken = request.cookies.get('refresh_token')?.value
    
    if (!refreshToken) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
    
    // Call backend to refresh token
    // (Implementation in backend section)
    
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
}
```

**Alternatives Considered**:
- Client-side route guards - Can be bypassed, bad UX (flash of content)
- Server Component checks only - Doesn't prevent direct URL access

---

### Decision 2.3: Axios Interceptors for Client-Side API Calls

**Rationale**: Automatic JWT injection via cookies, intelligent token refresh with request queuing, handles 401/403 responses gracefully.

**Implementation**:
```typescript
// lib/axios.ts
import axios from 'axios'

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true // Send cookies with requests
})

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Cookies sent automatically with withCredentials: true
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor
let isRefreshing = false
let refreshSubscribers: ((token: string) => void)[] = []

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue request until refresh completes
        return new Promise((resolve) => {
          refreshSubscribers.push((token: string) => {
            resolve(apiClient(originalRequest))
          })
        })
      }
      
      originalRequest._retry = true
      isRefreshing = true
      
      try {
        await apiClient.post('/auth/refresh')
        isRefreshing = false
        refreshSubscribers.forEach(cb => cb(''))
        refreshSubscribers = []
        return apiClient(originalRequest)
      } catch {
        isRefreshing = false
        window.location.href = '/auth/login'
        return Promise.reject(error)
      }
    }
    
    return Promise.reject(error)
  }
)

export default apiClient
```

**Alternatives Considered**:
- fetch with manual token handling - More code duplication, no interceptors
- React Query only - Still needs Axios or fetch wrapper for token logic

---

## 3. Express.js Authentication & RBAC

### Decision 3.1: JWT Middleware with Tier-Based Authorization

**Rationale**: Express middleware pattern for JWT verification and role-based access control. Clean separation of concerns, reusable across routes, type-safe with TypeScript.

**Implementation**:
```typescript
// middleware/auth.ts
import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { z } from 'zod'

interface JWTPayload {
  userId: string
  email: string
  tier: number
}

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload
    }
  }
}

export const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies.access_token
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' })
  }
  
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload
    req.user = payload
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export const requireTier = (minTier: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }
    
    if (req.user.tier < minTier) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    
    next()
  }
}

// Usage in routes:
// router.get('/reports', authenticateJWT, requireTier(2), getReports)
// router.post('/admin/roles', authenticateJWT, requireTier(3), createRole)
```

**Alternatives Considered**:
- Passport.js - Heavier dependency, overkill for simple JWT auth
- Custom decorators - Requires experimental TypeScript features

---

### Decision 3.2: bcrypt Async Hashing (12 Salt Rounds)

**Rationale**: 12 salt rounds provides ~150-300ms hashing time (balance of security vs performance). Always use async methods to avoid blocking event loop.

**Implementation**:
```typescript
// services/auth.service.ts
import bcrypt from 'bcrypt'

const SALT_ROUNDS = 12

export class AuthService {
  async hashPassword(plainPassword: string): Promise<string> {
    return bcrypt.hash(plainPassword, SALT_ROUNDS)
  }
  
  async validatePassword(plainPassword: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hash)
  }
  
  async shouldRehash(hash: string): Promise<boolean> {
    const rounds = bcrypt.getRounds(hash)
    return rounds < SALT_ROUNDS
  }
}

// Usage in registration:
// const passwordHash = await authService.hashPassword(password)
// await prisma.volunteer.create({ data: { email, passwordHash, ... } })
```

**Patterns**:
- Never log passwords
- Automatic rehashing when salt rounds increase
- Timing attack protection via constant-time comparison

**Alternatives Considered**:
- Argon2 - Better security but requires native dependencies
- PBKDF2 - Standard but slower and less secure than bcrypt

---

### Decision 3.3: Cryptographically Secure Password Reset

**Rationale**: Use `crypto.randomBytes(32)` for 256-bit entropy. Tokens hashed with SHA-256 before database storage. 1-hour expiration, single-use tokens.

**Implementation**:
```typescript
// services/password-reset.service.ts
import crypto from 'crypto'
import { addHours } from 'date-fns'

export class PasswordResetService {
  async createResetToken(email: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex')
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex')
    const expiresAt = addHours(new Date(), 1)
    
    await prisma.passwordReset.create({
      data: {
        email,
        token: hashedToken,
        expiresAt,
        used: false
      }
    })
    
    // Return unhashed token for email (never stored)
    return token
  }
  
  async validateResetToken(token: string): Promise<string | null> {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex')
    
    const reset = await prisma.passwordReset.findFirst({
      where: {
        token: hashedToken,
        used: false,
        expiresAt: { gte: new Date() }
      }
    })
    
    if (!reset) return null
    
    // Mark as used
    await prisma.passwordReset.update({
      where: { id: reset.id },
      data: { used: true }
    })
    
    return reset.email
  }
}
```

**Patterns**:
- Email enumeration protection (always return success)
- Rate limiting on reset requests (3 per hour per email)
- Invalidate all sessions on password change

---

### Decision 3.4: Defense in Depth Security

**Rationale**: Layer multiple security mechanisms: rate limiting, security headers, CORS, and input validation.

**Implementation**:
```typescript
// server.ts
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import cookieParser from 'cookie-parser'

const app = express()

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"]
    }
  }
}))

// CORS restricted to frontend domain
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}))

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many login attempts, please try again later'
})

app.use('/api/auth/login', authLimiter)

const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per window
  message: 'Too many password reset requests'
})

app.use('/api/auth/reset-password', resetLimiter)

// Body parsing with size limits
app.use(express.json({ limit: '10kb' }))
app.use(express.urlencoded({ extended: true, limit: '10kb' }))
app.use(cookieParser())

// Validation with Zod
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  rememberMe: z.boolean().optional()
})

app.post('/api/auth/login', (req, res) => {
  try {
    const validated = loginSchema.parse(req.body)
    // proceed with authentication
  } catch (error) {
    return res.status(400).json({ error: 'Invalid input' })
  }
})
```

**Patterns**:
- Helmet for XSS, clickjacking protection
- CORS restricted to known frontend origin
- Rate limiting per endpoint based on sensitivity
- Zod for compile-time + runtime type safety

---

## 4. Gamification & Points System

### Decision 4.1: Immutable Event Sourcing for Points

**Rationale**: Append-only events table maintains complete audit trail by design. Every point award/revocation is an immutable event. Enables historical analysis and admin revocations with reasoning.

**Implementation**:
```prisma
model PointEvent {
  id              String      @id @default(cuid())
  volunteerId     String
  volunteer       Volunteer   @relation(fields: [volunteerId], references: [id])
  points          Int         // positive for awards, negative for revocations
  eventType       String      // 'event_participation', 'task_completion', 'admin_revocation'
  referenceId     String?     // links to event/task that triggered points
  reason          String?     // required for revocations
  createdById     String
  createdBy       Volunteer   @relation("PointEventCreator", fields: [createdById], references: [id])
  createdAt       DateTime    @default(now())
  metadata        Json?       // flexible storage for activity-specific data
  
  @@index([volunteerId, createdAt])
  @@index([eventType])
}

model VolunteerPointBalance {
  volunteerId     String      @id
  volunteer       Volunteer   @relation(fields: [volunteerId], references: [id])
  totalPoints     Int         @default(0)
  lastUpdatedAt   DateTime    @updatedAt
  lastEventId     String?
  lastEvent       PointEvent? @relation(fields: [lastEventId], references: [id])
  
  @@index([totalPoints])
}

model ActivityPointValue {
  activityType    String      @id
  points          Int
  description     String?
}
```

**Patterns**:
- Update materialized balance in same transaction as event insert
- Periodic reconciliation job compares `SUM(point_events)` with cached balance
- Query events table directly for historical reports

**Alternatives Considered**:
- Direct balance updates - Faster writes but loses audit trail
- Pure event sourcing (no cache) - Perfect audit but slow leaderboard queries

---

### Decision 4.2: Cached Leaderboard with Incremental Updates

**Rationale**: Real-time calculation doesn't scale. Incremental updates on point events provide near-real-time accuracy. Allows filtering/ranking by time period without expensive aggregations.

**Implementation**:
```prisma
model LeaderboardCache {
  volunteerId     String      @id
  volunteer       Volunteer   @relation(fields: [volunteerId], references: [id])
  rank            Int?
  totalPoints     Int
  badgeTier       String?
  lastUpdatedAt   DateTime    @updatedAt
  
  @@index([rank])
  @@index([totalPoints])
}

model LeaderboardSnapshot {
  id              String      @id @default(cuid())
  snapshotDate    DateTime
  volunteerId     String
  volunteer       Volunteer   @relation(fields: [volunteerId], references: [id])
  rank            Int?
  totalPoints     Int
  badgeTier       String?
  
  @@index([snapshotDate, volunteerId])
}
```

**Calculation Strategy** (background job):
```typescript
// jobs/update-leaderboard.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function updateLeaderboard() {
  // Recalculate all ranks daily
  const volunteers = await prisma.volunteerPointBalance.findMany({
    orderBy: { totalPoints: 'desc' }
  })
  
  await prisma.$transaction(
    volunteers.map((vol, index) =>
      prisma.leaderboardCache.upsert({
        where: { volunteerId: vol.volunteerId },
        create: {
          volunteerId: vol.volunteerId,
          rank: index + 1,
          totalPoints: vol.totalPoints,
          badgeTier: getBadgeTier(vol.totalPoints)
        },
        update: {
          rank: index + 1,
          totalPoints: vol.totalPoints,
          badgeTier: getBadgeTier(vol.totalPoints)
        }
      })
    )
  )
}
```

**Alternatives Considered**:
- Redis sorted sets - Excellent performance but adds infrastructure complexity
- Real-time calculation only - Unacceptable performance at scale

---

### Decision 4.3: Threshold-Based Badge Tier System

**Rationale**: Simple, predictable rules (Bronze: 0-99, Silver: 100-499, Gold: 500+). Tier changes tracked separately for notifications. Historical tier data supports recognition.

**Implementation**:
```prisma
model BadgeTier {
  tierName        String      @id
  minPoints       Int
  maxPoints       Int?        // NULL for highest tier
  displayOrder    Int
  badgeColor      String      // hex color for UI
  iconPath        String?
  
  tierHistory     BadgeTierHistory[]
}

model BadgeTierHistory {
  id              String      @id @default(cuid())
  volunteerId     String
  volunteer       Volunteer   @relation(fields: [volunteerId], references: [id])
  oldTier         String?     // NULL for first tier
  newTier         String
  newTierRef      BadgeTier   @relation(fields: [newTier], references: [tierName])
  pointsAtChange  Int
  achievedAt      DateTime    @default(now())
  
  @@index([volunteerId, achievedAt])
}
```

**Tier Calculation**:
```typescript
// utils/badge-tier.ts
export function getBadgeTier(totalPoints: number): string {
  if (totalPoints >= 500) return 'GOLD'
  if (totalPoints >= 100) return 'SILVER'
  return 'BRONZE'
}

export async function checkTierChange(volunteerId: string, newPoints: number) {
  const current = await prisma.leaderboardCache.findUnique({
    where: { volunteerId },
    select: { badgeTier: true }
  })
  
  const newTier = getBadgeTier(newPoints)
  
  if (current?.badgeTier !== newTier) {
    await prisma.badgeTierHistory.create({
      data: {
        volunteerId,
        oldTier: current?.badgeTier,
        newTier,
        pointsAtChange: newPoints
      }
    })
    
    // Trigger notification
    await notificationService.sendTierChange(volunteerId, newTier)
  }
}
```

**Alternatives Considered**:
- Complex tier formula - Over-engineered, harder to explain to users
- Time-based tiers - Penalizes quality over quantity

---

## Summary

### Technology Decisions

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **Backend Framework** | Node.js 20.x + Express.js | Mature, lightweight, extensive middleware ecosystem |
| **Database ORM** | Prisma 5.x | Type-safe queries, excellent migration tooling, SQLite support |
| **Database** | SQLite | Simple deployment, sufficient scale (< 1000 volunteers), zero ops |
| **Frontend Framework** | Next.js 14 (App Router) | SSR, file-based routing, React Server Components |
| **API Client** | Axios | Interceptor support, familiar API, automatic JSON parsing |
| **Authentication** | JWT (jsonwebtoken) | Stateless, scales horizontally, works with separate frontend/backend |
| **Password Hashing** | bcrypt (12 rounds) | Industry standard, automatic salting, proven security |
| **Validation** | Zod | Type-safe, composable schemas, excellent TypeScript integration |
| **Testing** | Jest, Vitest, Playwright, Supertest | Comprehensive coverage of unit, integration, contract, E2E tests |

### Key Architectural Patterns

1. **Event Sourcing for Points**: Immutable audit trail with materialized balances for performance
2. **Soft Deletes**: Preserve historical data with `deletedAt` timestamps
3. **RBAC Middleware**: Tier-based authorization (1=parent, 2=leader, 3=admin)
4. **Cached Leaderboards**: Daily batch updates with incremental point events
5. **Defense in Depth**: Rate limiting, security headers, CORS, input validation
6. **Type Safety**: Shared types from Prisma, Zod validation, TypeScript throughout

### Next Steps

**Phase 1 will produce**:
- **data-model.md**: Complete Prisma schema with all 13 entities
- **contracts/**: API endpoint specifications (OpenAPI/Swagger)
- **quickstart.md**: Setup instructions and first API call examples

These artifacts will translate the research decisions above into concrete, implementation-ready specifications.
