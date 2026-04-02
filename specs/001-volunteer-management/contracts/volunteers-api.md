# API Contracts: Volunteers
## Endpoint Specifications

*Feature: 001-volunteer-management*

All volunteer endpoints require authentication. Tier restrictions noted per endpoint.

---

## GET `/api/volunteers/me/profile`

**Description**: Get current volunteer's full profile

**Authorization**: Bearer token (Tier 1+)

**Request Body**: None

**Success Response** (200 OK):
```typescript
{
  id: string;
  email: string;
  name: string;
  phone: string | null;
  authTier: "PARENT" | "LEADER" | "ADMIN";
  leaderboardOptIn: boolean;
  roles: Array<{
    id: string;
    roleId: string;
    roleName: string;
    roleType: string;
    specialty: string | null;
    rankLevel: string | null;
    assignedAt: string; // ISO 8601
  }>;
  childrenRanks: Array<{
    id: string;
    rankLevel: "LION" | "TIGER" | "WOLF" | "BEAR" | "WEBELOS" | "AOL";
  }>;
  pointBalance: {
    totalPoints: number;
    currentYearPoints: number;
    badgeTier: string | null;
    rank: number | null;
  };
  createdAt: string; // ISO 8601
}
```

---

## PUT `/api/volunteers/me/profile`

**Description**: Update current volunteer's profile

**Authorization**: Bearer token (Tier 1+)

**Request Body**:
```typescript
{
  name?: string;              // 1-100 characters
  phone?: string | null;      // Valid phone format or null
  leaderboardOptIn?: boolean;
  childrenRanks?: Array<"LION" | "TIGER" | "WOLF" | "BEAR" | "WEBELOS" | "AOL">;
}
```

**Success Response** (200 OK):
```typescript
{
  id: string;
  email: string; // Cannot be changed via this endpoint
  name: string;
  phone: string | null;
  leaderboardOptIn: boolean;
  childrenRanks: Array<{ rankLevel: string }>;
}
```

**Error Responses**:
- `400 Bad Request`: Invalid input
- `409 Conflict`: Duplicate children rank

---

## POST `/api/volunteers/me/roles`

**Description**: Self-assign a volunteer role

**Authorization**: Bearer token (Tier 1+)

**Request Body**:
```typescript
{
  roleId: string; // Must be valid, non-deleted VolunteerRole
}
```

**Success Response** (201 Created):
```typescript
{
  id: string; // VolunteerToRole ID
  roleId: string;
  roleName: string;
  assignedAt: string; // ISO 8601
}
```

**Error Responses**:
- `400 Bad Request`: Invalid roleId
- `404 Not Found`: Role does not exist or is deleted
- `409 Conflict`: Role already assigned to volunteer

**Side Effects**:
- If role grants LEADER tier and volunteer doesn't have LEADER roles → upgrade authTier to LEADER
- If role is COMMITTEE or DEN_LEADER → award 100 points (create PointEvent with eventType=ROLE_ASSIGNMENT)
- Create AuditLog entry

---

## DELETE `/api/volunteers/me/roles/:roleAssignmentId`

**Description**: Remove a self-assigned role

**Authorization**: Bearer token (Tier 1+)

**Success Response** (204 No Content)

**Error Responses**:
- `404 Not Found`: Role assignment does not exist or not owned by current user

**Side Effects**:
- Soft delete VolunteerToRole (set removedAt timestamp)
- If removing last LEADER-tier role → downgrade authTier to PARENT
- Create AuditLog entry

---

## GET `/api/volunteers`

**Description**: List all volunteers (admin/leader view)

**Authorization**: Bearer token (Tier 2+)

**Query Parameters**:
```typescript
{
  page?: number;           // Default: 1
  limit?: number;          // Default: 50, max: 100
  search?: string;         // Search by name or email
  tier?: "PARENT" | "LEADER" | "ADMIN";
  roleId?: string;         // Filter by specific role
}
```

**Success Response** (200 OK):
```typescript
{
  volunteers: Array<{
    id: string;
    email: string;
    name: string;
    authTier: string;
    roles: Array<{ roleName: string }>;
    pointBalance: {
      totalPoints: number;
      currentYearPoints: number;
    };
    createdAt: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

---

## GET `/api/volunteers/:id`

**Description**: Get specific volunteer details

**Authorization**: Bearer token (Tier 2+, or Tier 1 if :id matches current user)

**Success Response** (200 OK):
```typescript
{
  id: string;
  email: string;
  name: string;
  phone: string | null;
  authTier: string;
  leaderboardOptIn: boolean;
  roles: Array<{
    id: string;
    roleName: string;
    roleType: string;
    assignedAt: string;
  }>;
  childrenRanks: Array<{ rankLevel: string }>;
  pointBalance: {
    totalPoints: number;
    currentYearPoints: number;
    badgeTier: string | null;
    rank: number | null;
  };
  pointHistory: Array<{
    id: string;
    points: number;
    eventType: string;
    reason: string | null;
    createdAt: string;
    activityType: { name: string } | null;
  }>;
  createdAt: string;
}
```

**Error Responses**:
- `403 Forbidden`: Insufficient permissions to view this volunteer
- `404 Not Found`: Volunteer does not exist

---

## DELETE `/api/volunteers/:id`

**Description**: Delete a volunteer account (site admin only)

**Authorization**: Bearer token (Tier 3 only)

**Success Response** (204 No Content)

**Error Responses**:
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Volunteer does not exist

**Side Effects**:
- Soft delete Volunteer (set deletedAt)
- Withdraw all future signups
- Invalidate all sessions
- Create AuditLog entry

---

## GET `/api/admin/volunteers`

**Description**: List all volunteers for admin management (includes search)

**Authorization**: Bearer token (Tier 2+ - LEADER or ADMIN)

**Query Parameters**:
```typescript
{
  search?: string;         // Search by name or email
}
```

**Success Response** (200 OK):
```typescript
{
  volunteers: Array<{
    id: string;
    email: string;
    name: string;
    authTier: "PARENT" | "LEADER" | "ADMIN";
    mustChangePassword: boolean;
    createdAt: string; // ISO 8601
  }>;
}
```

---

## POST `/api/admin/volunteers/:id/reset-password`

**Description**: Reset a volunteer's password and generate a temporary password

**Authorization**: Bearer token (Tier 2+ - LEADER or ADMIN)

**Request Body**: None

**Success Response** (200 OK):
```typescript
{
  temporaryPassword: string;  // Format: word-word-1234 (readable temporary password)
  message: "Password reset successfully. Share this temporary password with the volunteer."
}
```

**Error Responses**:
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Volunteer does not exist

**Side Effects**:
- Generates a readable temporary password (format: word-word-number)
- Updates volunteer's passwordHash with hashed temporary password
- Sets mustChangePassword to true
- Invalidates all existing sessions for that user
- Creates AuditLog entry

**Notes**:
- Temporary password format: Two random words from a word list + 4 random digits (e.g., "blue-tiger-4729")
- User must change password on next login
- Admin should share temporary password securely (in-person, phone, text)

---

## Validation Schemas

```typescript
// backend/src/utils/validation/volunteer.schema.ts
import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).nullable().optional(),
  leaderboardOptIn: z.boolean().optional(),
  childrenRanks: z.array(z.enum(['LION', 'TIGER', 'WOLF', 'BEAR', 'WEBELOS', 'AOL'])).optional()
});

export const assignRoleSchema = z.object({
  roleId: z.string().cuid()
});

export const listVolunteersSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().max(100).optional(),
  tier: z.enum(['PARENT', 'LEADER', 'ADMIN']).optional(),
  roleId: z.string().cuid().optional()
});

export const adminListVolunteersSchema = z.object({
  search: z.string().max(100).optional()
});
```
