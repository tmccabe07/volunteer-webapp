# API Contracts: Points & Leaderboard
## Endpoint Specifications

*Feature: 001-volunteer-management*

Points and gamification endpoints.

---

## GET `/api/points/me`

**Description**: Get current volunteer's point history

**Authorization**: Bearer token (Tier 1+)

**Query Parameters**:
```typescript
{
  page?: number;           // Default: 1
  limit?: number;          // Default: 50
  year?: number;           // Filter by specific year
}
```

**Success Response** (200 OK):
```typescript
{
  balance: {
    totalPoints: number;
    currentYearPoints: number;
    badgeTier: string | null;
    rank: number | null;
  };
  pointEvents: Array<{
    id: string;
    points: number;
    eventType: "EVENT_PARTICIPATION" | "TASK_COMPLETION" | "ROLE_ASSIGNMENT" | "ADMIN_REVOCATION";
    reason: string | null;
    activityType: {
      name: string;
      pointValue: number;
    } | null;
    createdBy: {
      id: string;
      name: string;
    };
    createdAt: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}
```

---

## GET `/api/points/volunteers/:volunteerId`

**Description**: Get specific volunteer's point history (admin/leader view)

**Authorization**: Bearer token (Tier 2+, or Tier 1 if :volunteerId matches current user)

**Query Parameters**: Same as `/api/points/me`

**Success Response**: Same as `/api/points/me`

**Error Responses**:
- `403 Forbidden`: Insufficient permissions to view this volunteer's points
- `404 Not Found`: Volunteer does not exist

---

## POST `/api/points/revoke/:pointEventId`

**Description**: Revoke a previously awarded point event

**Authorization**: Bearer token (Tier 2+)

**Request Body**:
```typescript
{
  reason: string; // Required, 10-500 characters explaining revocation
}
```

**Success Response** (201 Created):
```typescript
{
  revocationEvent: {
    id: string;
    volunteerId: string;
    points: number; // negative value
    eventType: "ADMIN_REVOCATION";
    reason: string;
    referenceId: string; // ID of original point event being revoked
    createdById: string;
    createdAt: string;
  };
  newBalance: {
    totalPoints: number;
    currentYearPoints: number;
    badgeTier: string | null;
  };
}
```

**Error Responses**:
- `400 Bad Request`: Missing or invalid reason
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Point event does not exist
- `409 Conflict`: Point event already revoked

**Side Effects**:
- Create new PointEvent with negative points (eventType=ADMIN_REVOCATION)
- Update VolunteerPointBalance
- Check for badge tier downgrade
- Send notification to affected volunteer
- Create AuditLog entry

---

## GET `/api/leaderboard`

**Description**: Get current leaderboard rankings

**Authorization**: Bearer token (Tier 1+)

**Query Parameters**:
```typescript
{
  page?: number;           // Default: 1
  limit?: number;          // Default: 50, max: 100
}
```

**Success Response** (200 OK):
```typescript
{
  leaderboard: Array<{
    rank: number;
    volunteer: {
      id: string;
      name: string;
    };
    totalPoints: number;
    badgeTier: string | null;
  }>;
  currentUser: {
    rank: number | null;  // null if opted out
    totalPoints: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number; // Total opted-in volunteers
  };
}
```

**Notes**:
- Only displays volunteers with `leaderboardOptIn = true`
- Cached results updated daily via background job
- `currentUser` shown even if opted out (but not in leaderboard array)

---

## GET `/api/badge-tiers`

**Description**: Get all badge tier definitions

**Authorization**: Bearer token (Tier 1+)

**Success Response** (200 OK):
```typescript
{
  tiers: Array<{
    tierName: string;
    minPoints: number;
    maxPoints: number | null;
    displayOrder: number;
    badgeColor: string; // hex color
    iconPath: string | null;
  }>;
}
```

**Notes**:
- Static configuration data
- Can be cached aggressively on client

---

## GET `/api/badge-tiers/me/history`

**Description**: Get current volunteer's badge tier progression history

**Authorization**: Bearer token (Tier 1+)

**Success Response** (200 OK):
```typescript
{
  currentTier: string | null;
  history: Array<{
    id: string;
    oldTier: string | null;
    newTier: string;
    pointsAtChange: number;
    achievedAt: string;
  }>;
}
```

---

## Validation Schemas

```typescript
// backend/src/utils/validation/points.schema.ts
import { z } from 'zod';

export const revokePointsSchema = z.object({
  reason: z.string().min(10).max(500)
});

export const listPointsSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  year: z.coerce.number().int().min(2020).max(2100).optional()
});

export const leaderboardSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional()
});
```
