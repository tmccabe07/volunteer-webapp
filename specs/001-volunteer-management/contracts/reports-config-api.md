# API Contracts: Reports & Pack Configuration
## Endpoint Specifications

*Feature: 001-volunteer-management*

Reporting and pack configuration endpoints.

---

## REPORTS

### GET `/api/reports/participation`

**Description**: Generate volunteer participation report

**Authorization**: Bearer token (Tier 2+)

**Query Parameters**:
```typescript
{
  startDate?: string;               // ISO 8601, default: current year start
  endDate?: string;                 // ISO 8601, default: current year end
  rankLevel?: "LION" | "TIGER" | "WOLF" | "BEAR" | "WEBELOS" | "AOL" | "PACK_WIDE";
  format?: "summary" | "detailed"; // Default: "summary"
}
```

**Success Response** (200 OK):

**Summary Format**:
```typescript
{
  period: {
    startDate: string;
    endDate: string;
  };
  stats: {
    totalVolunteers: number;
    totalEvents: number;
    totalSignups: number;
    averageSignupsPerEvent: number;
    uniqueVolunteersParticipated: number;
  };
  topVolunteers: Array<{            // Top 10 by points earned
    volunteer: {
      id: string;
      name: string;
    };
    eventsParticipated: number;
    pointsEarned: number;
  }>;
  participationByRank: Array<{
    rankLevel: string;
    eventsHeld: number;
    totalSignups: number;
  }>;
}
```

**Detailed Format**:
```typescript
{
  period: {
    startDate: string;
    endDate: string;
  };
  volunteers: Array<{
    volunteer: {
      id: string;
      name: string;
      email: string;
      roles: Array<{ name: string }>;
    };
    eventsParticipated: number;
    pointsEarned: number;
    activities: Array<{
      event: {
        id: string;
        title: string;
        eventDate: string;
      };
      activityType: string;
      points: number;
    }>;
  }>;
}
```

**Error Responses**:
- `400 Bad Request`: Invalid date range
- `403 Forbidden`: Insufficient permissions

---

### GET `/api/reports/administrative-tasks`

**Description**: Generate administrative task completion report

**Authorization**: Bearer token (Tier 2+)

**Query Parameters**:
```typescript
{
  startDate?: string;               // ISO 8601, default: current year start
  endDate?: string;                 // ISO 8601, default: current year end
  status?: "complete" | "incomplete" | "overdue";
  taskId?: string;                  // Filter by specific task
  format?: "summary" | "detailed"; // Default: "summary"
}
```

**Success Response** (200 OK):

**Summary Format**:
```typescript
{
  period: {
    startDate: string;
    endDate: string;
  };
  stats: {
    totalTasks: number;
    totalCompletions: number;
    overallCompletionRate: number;  // Percentage
    overdueTasks: number;
  };
  taskBreakdown: Array<{
    task: {
      id: string;
      name: string;
      dueDate: string;
    };
    assignedCount: number;
    completedCount: number;
    completionRate: number;
    isOverdue: boolean;
  }>;
}
```

**Detailed Format**:
```typescript
{
  period: {
    startDate: string;
    endDate: string;
  };
  tasks: Array<{
    task: {
      id: string;
      name: string;
      description: string | null;
      dueDate: string;
      isOverdue: boolean;
    };
    assignedVolunteers: Array<{
      volunteer: {
        id: string;
        name: string;
        email: string;
        roles: Array<{ name: string }>;
      };
      completedAt: string | null;
      isComplete: boolean;
    }>;
    stats: {
      assignedCount: number;
      completedCount: number;
      completionRate: number;
    };
  }>;
}
```

**Error Responses**:
- `400 Bad Request`: Invalid date range
- `403 Forbidden`: Insufficient permissions

---

## PACK CONFIGURATION

### GET `/api/pack-config`

**Description**: Get current pack configuration

**Authorization**: Bearer token (Tier 1+)

**Success Response** (200 OK):
```typescript
{
  id: string;
  packName: string;
  packNumber: string;
  yearStartDate: string; // ISO 8601
  yearEndDate: string;   // ISO 8601
  activeRanks: Array<"LION" | "TIGER" | "WOLF" | "BEAR" | "WEBELOS" | "AOL">;
  createdAt: string;
  updatedAt: string;
}
```

**Notes**:
- Publicly readable by all authenticated users
- Only one PackConfig record should exist

---

### PUT `/api/pack-config`

**Description**: Update pack configuration

**Authorization**: Bearer token (Tier 3 only)

**Request Body**:
```typescript
{
  packName?: string;                // 1-100 characters
  packNumber?: string;              // 1-20 characters
  yearStartDate?: string;           // ISO 8601
  yearEndDate?: string;             // ISO 8601
  activeRanks?: Array<"LION" | "TIGER" | "WOLF" | "BEAR" | "WEBELOS" | "AOL">;
}
```

**Success Response** (200 OK): Same as GET response

**Error Responses**:
- `400 Bad Request`: Invalid input (yearStartDate >= yearEndDate)
- `403 Forbidden`: Insufficient permissions

**Side Effects**:
- If yearEndDate changed → update recurringEndDate for all recurring events/tasks
- Create AuditLog entry

---

### GET `/api/pack-config/activity-types`

**Description**: Get all activity types (point values)

**Authorization**: Bearer token (Tier 1+)

**Success Response** (200 OK):
```typescript
{
  activityTypes: Array<{
    id: string;
    name: string;
    pointValue: number;
    category: "LOW" | "MEDIUM" | "HIGH" | "SPECIAL";
    description: string | null;
  }>;
}
```

**Notes**:
- Only active (non-deleted) activity types returned
- Can be cached aggressively

---

### POST `/api/pack-config/activity-types`

**Description**: Add a new activity type

**Authorization**: Bearer token (Tier 3 only)

**Request Body**:
```typescript
{
  name: string;                     // Unique, 1-100 characters
  pointValue: number;               // Positive integer
  category: "LOW" | "MEDIUM" | "HIGH" | "SPECIAL";
  description?: string;
}
```

**Success Response** (201 Created):
```typescript
{
  id: string;
  name: string;
  pointValue: number;
  category: string;
  description: string | null;
  createdAt: string;
}
```

**Error Responses**:
- `400 Bad Request`: Invalid input (pointValue doesn't match category range)
- `403 Forbidden`: Insufficient permissions
- `409 Conflict`: Activity type with this name already exists

**Side Effects**:
- Create AuditLog entry

---

### PUT `/api/pack-config/activity-types/:id`

**Description**: Update an existing activity type

**Authorization**: Bearer token (Tier 3 only)

**Request Body**: Same as POST (all fields optional)

**Success Response** (200 OK): Same as POST response

**Error Responses**:
- `400 Bad Request`: Invalid input
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Activity type does not exist
- `409 Conflict`: Name conflicts with existing activity type

**Side Effects**:
- Preserves historical point awards (doesn't retroactively change past events)
- Create AuditLog entry

---

### DELETE `/api/pack-config/activity-types/:id`

**Description**: Delete an activity type (soft delete)

**Authorization**: Bearer token (Tier 3 only)

**Success Response** (204 No Content)

**Error Responses**:
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Activity type does not exist
- `409 Conflict`: Activity type is in use (referenced by future events)

**Side Effects**:
- Soft delete ActivityType (set deletedAt)
- Cannot delete if referenced by activity slots in future events (onDelete: Restrict)
- Historical events/points preserve reference
- Create AuditLog entry

---

### GET `/api/pack-config/volunteer-roles`

**Description**: Get all volunteer roles

**Authorization**: Bearer token (Tier 1+)

**Success Response** (200 OK):
```typescript
{
  roles: Array<{
    id: string;
    name: string;
    description: string | null;
    roleType: "PARENT_GUARDIAN" | "COMMITTEE" | "DEN_LEADER" | "ASSISTANT_DEN_LEADER" | "ASSISTANT_CUB_MASTER" | "LION_GUIDE" | "SCOUTER_RESERVE";
    specialty: string | null;
    rankLevel: string | null;
    grantsTier: "PARENT" | "LEADER" | "ADMIN";
  }>;
}
```

---

### POST `/api/pack-config/volunteer-roles`

**Description**: Add a new volunteer role

**Authorization**: Bearer token (Tier 3 only)

**Request Body**:
```typescript
{
  name: string;                     // Unique, 1-100 characters
  description?: string;
  roleType: "PARENT_GUARDIAN" | "COMMITTEE" | "DEN_LEADER" | "ASSISTANT_DEN_LEADER" | "ASSISTANT_CUB_MASTER" | "LION_GUIDE" | "SCOUTER_RESERVE";
  specialty?: string;               // Required for COMMITTEE
  rankLevel?: "LION" | "TIGER" | "WOLF" | "BEAR" | "WEBELOS" | "AOL"; // Required for DEN_LEADER
  grantsTier?: "PARENT" | "LEADER" | "ADMIN"; // Default based on roleType
}
```

**Success Response** (201 Created):
```typescript
{
  id: string;
  name: string;
  description: string | null;
  roleType: string;
  specialty: string | null;
  rankLevel: string | null;
  grantsTier: string;
  createdAt: string;
}
```

**Error Responses**:
- `400 Bad Request`: Invalid input (COMMITTEE without specialty, etc.)
- `403 Forbidden`: Insufficient permissions
- `409 Conflict`: Role with this name already exists

---

### PUT `/api/pack-config/volunteer-roles/:id`

**Description**: Update volunteer role configuration

**Authorization**: Bearer token (Tier 3 only)

**Request Body**:
```typescript
{
  name?: string;              // Role display name (1-100 chars)
  description?: string;       // Optional role description
  roleType?: 'PARENT_GUARDIAN' | 'COMMITTEE' | 'DEN_LEADER' | 'ASSISTANT_DEN_LEADER' | 'ASSISTANT_CUB_MASTER' | 'LION_GUIDE' | 'SCOUTER_RESERVE';
  specialty?: string;         // Required if roleType is COMMITTEE (e.g., "Treasurer")
  rankLevel?: 'LION' | 'TIGER' | 'WOLF' | 'BEAR' | 'WEBELOS' | 'AOL';  // Required if roleType is DEN_LEADER
  grantsTier?: 'PARENT' | 'LEADER' | 'ADMIN';  // Override default tier assignment
}
```

**Important Notes**:
- All fields are optional in the update request
- Changing `grantsTier` immediately affects authorization for all volunteers with this role
- Changing `roleType` may require corresponding changes to `specialty` or `rankLevel`
- The response includes `assignmentCount` showing how many volunteers currently have this role

**Success Response** (200 OK): Same as POST response with additional `assignmentCount` field

**Error Responses**:
- `400 Bad Request`: Invalid input
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Role does not exist
- `409 Conflict`: Name conflicts with existing role

---

### DELETE `/api/pack-config/volunteer-roles/:id`

**Description**: Delete a volunteer role

**Authorization**: Bearer token (Tier 3 only)

**Success Response** (204 No Content)

**Error Responses**:
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Role does not exist
- `409 Conflict`: Role is assigned to volunteers for future events
  ```typescript
  { error: "Cannot delete role currently assigned to volunteers for future events" }
  ```

**Side Effects**:
- Soft delete VolunteerRole (set deletedAt)
- Cannot delete if assigned to volunteers (onDelete: Restrict on VolunteerToRole)
- Historical assignments preserved for records/reporting
- Create AuditLog entry

---

## Validation Schemas

```typescript
// backend/src/utils/validation/reports.schema.ts
import { z } from 'zod';

export const participationReportSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  rankLevel: z.enum(['LION', 'TIGER', 'WOLF', 'BEAR', 'WEBELOS', 'AOL', 'PACK_WIDE']).optional(),
  format: z.enum(['summary', 'detailed']).optional()
});

export const adminTaskReportSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  status: z.enum(['complete', 'incomplete', 'overdue']).optional(),
  taskId: z.string().cuid().optional(),
  format: z.enum(['summary', 'detailed']).optional()
});

// backend/src/utils/validation/pack-config.schema.ts
export const updatePackConfigSchema = z.object({
  packName: z.string().min(1).max(100).optional(),
  packNumber: z.string().min(1).max(20).optional(),
  yearStartDate: z.string().datetime().optional(),
  yearEndDate: z.string().datetime().optional(),
  activeRanks: z.array(z.enum(['LION', 'TIGER', 'WOLF', 'BEAR', 'WEBELOS', 'AOL'])).optional()
}).refine(
  (data) => !data.yearStartDate || !data.yearEndDate || new Date(data.yearStartDate) < new Date(data.yearEndDate),
  'yearStartDate must be before yearEndDate'
);

export const createActivityTypeSchema = z.object({
  name: z.string().min(1).max(100),
  pointValue: z.number().int().positive(),
  category: z.enum(['LOW', 'MEDIUM', 'HIGH', 'SPECIAL']),
  description: z.string().optional()
}).refine((data) => {
  const ranges = { LOW: [2, 3], MEDIUM: [5, 8], HIGH: [10, 15], SPECIAL: [20, 25] };
  const [min, max] = ranges[data.category];
  return data.pointValue >= min && data.pointValue <= max;
}, 'pointValue must match category range');

export const createVolunteerRoleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  roleType: z.enum(['PARENT_GUARDIAN', 'COMMITTEE', 'DEN_LEADER', 'ASSISTANT_DEN_LEADER', 'ASSISTANT_CUB_MASTER', 'LION_GUIDE', 'SCOUTER_RESERVE']),
  specialty: z.string().optional(),
  rankLevel: z.enum(['LION', 'TIGER', 'WOLF', 'BEAR', 'WEBELOS', 'AOL']).optional(),
  grantsTier: z.enum(['PARENT', 'LEADER', 'ADMIN']).optional()
}).refine(
  (data) => data.roleType !== 'COMMITTEE' || data.specialty,
  'COMMITTEE role type requires specialty'
).refine(
  (data) => data.roleType !== 'DEN_LEADER' || data.rankLevel,
  'DEN_LEADER role type requires rankLevel'
);
```
