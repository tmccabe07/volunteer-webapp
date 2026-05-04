# Data Model: Dashboard Profile Edit Navigation

**Feature**: 002-edit-profile-button  
**Date**: 2026-05-04  
**Status**: N/A - No Data Changes

## Overview

This feature does not introduce new data entities, modify existing database schemas, or change API response structures. It is a **frontend-only UI enhancement** that adds navigation functionality to an existing page.

## Existing Data Dependencies

The feature relies on existing data structures but does not modify them:

### User/Volunteer Entity (Existing)

**Source**: Defined in `backend/prisma/schema.prisma`, exposed via profile edit page

**Relevant Fields** (read-only for this feature):
- `id`: User identifier
- `name`: User's display name
- `email`: User's email address
- `phone`: User's phone number (optional)
- `authTier`: User's permission level (displayed on dashboard)

**Usage in This Feature**:
- Dashboard already displays this data in "Your Profile" card
- Feature adds navigation button adjacent to this existing display
- No mutations, transformations, or new queries required

### Authentication Context (Existing)

**Source**: `frontend/src/lib/auth-context.tsx`

**Relevant Data**:
```typescript
interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  authTier: string;
}
```

**Usage in This Feature**:
- `useRequireAuth()` hook already provides authenticated user data to dashboard
- Button visibility is implicitly controlled by page-level authentication
- No changes to auth context or user session data

## State Management

### Component State (Frontend)

**Location**: `frontend/src/app/dashboard/page.tsx`

**Existing State** (unchanged by this feature):
- `user`: Authenticated user object from `useRequireAuth()`
- `isLoading`: Loading state for authentication check
- `upcomingEvents`: Array of upcoming events (unrelated to profile edit)

**New State**: None - button uses existing router instance and user data

### Navigation State

**Mechanism**: Next.js App Router (`useRouter` from `next/navigation`)

**Behavior**:
```tsx
const router = useRouter();
// On button click:
router.push('/profile/edit');
```

**State Transitions**:
1. User on dashboard (`/dashboard`)
2. User clicks "Edit Profile" button
3. Client-side route transition to profile edit page (`/profile/edit`)
4. Profile edit page loads with user's current profile data (existing behavior)

**No server state changes**: Navigation is client-side only

## Data Flow Diagram

```
┌─────────────────────────────────────────────┐
│  Dashboard Page (/dashboard)                │
│  ┌───────────────────────────────────────┐  │
│  │  Your Profile Card                    │  │
│  │  ┌─────────────────────────────────┐  │  │
│  │  │  User Data (read from context)  │  │  │
│  │  │  - Name: {user.name}            │  │  │
│  │  │  - Email: {user.email}          │  │  │
│  │  │  - Phone: {user.phone}          │  │  │
│  │  │  - Tier: {user.authTier}        │  │  │
│  │  └─────────────────────────────────┘  │  │
│  │                                         │  │
│  │  [Edit Profile Button]  ← NEW          │  │
│  │    onClick={() => router.push(...)}    │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
                     │
                     │ Client-side navigation
                     │ (no data fetch)
                     ▼
┌─────────────────────────────────────────────┐
│  Profile Edit Page (/profile/edit)          │
│  - Loads user's profile (existing flow)     │
│  - Allows editing (existing functionality)  │
└─────────────────────────────────────────────┘
```

## Validation Rules

**N/A** - No data validation required for this feature.

- Button click does not submit or modify data
- Navigation target (`/profile/edit`) already has its own validation for profile updates
- Authentication is enforced at page level (inherited behavior)

## Database Schema Changes

**None** - No database migrations, schema updates, or Prisma model changes.

## API Contract Changes

**None** - No new API endpoints, no modifications to existing endpoints.

Existing endpoints used by related pages (unchanged):
- `GET /api/volunteers/me` - Fetches current user's profile (used by profile edit page)
- `PATCH /api/volunteers/me` - Updates current user's profile (used by profile edit page)

## Relationships & Constraints

**N/A** - This feature does not introduce or modify entity relationships.

## Conclusion

This feature has **no data model impact**. It is a pure UI/UX enhancement that adds a navigation affordance to an existing page. All data structures, validation rules, and API contracts remain unchanged. The feature operates entirely within the presentation layer using existing data and routing mechanisms.
