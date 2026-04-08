# API Contracts: Events
## Endpoint Specifications

*Feature: 001-volunteer-management*

Event management for volunteer opportunities.

---

## GET `/api/events`

**Description**: List upcoming volunteer events

**Authorization**: Bearer token (Tier 1+)

**Query Parameters**:
```typescript
{
  page?: number;           // Default: 1
  limit?: number;          // Default: 20, max: 100
  rankLevel?: "LION" | "TIGER" | "WOLF" | "BEAR" | "WEBELOS" | "AOL" | "PACK_WIDE";
  upcoming?: boolean;      // Default: true (only future events)
  mySignups?: boolean;     // Default: false (filter to events user signed up for)
}
```

**Success Response** (200 OK):
```typescript
{
  events: Array<{
    id: string;
    title: string;
    description: string | null;
    eventDate: string; // ISO 8601
    eventTime: string | null;
    location: string | null;
    rankLevel: string | null; // null = PACK_WIDE
    isRecurring: boolean;
    isComplete: boolean;
    activitySlots: Array<{
      id: string;
      activityType: {
        id: string;
        name: string;
        pointValue: number;
        category: string;
      };
      capacity: number | null;
      signedUpCount: number;
      currentUserSignup: {
        id: string;
        withdrawn: boolean;
      } | null;
    }>;
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
    totalPages: number;
  };
}
```

**Notes**:
- If `rankLevel` not specified → returns events for user's children's ranks + PACK_WIDE
- `signedUpCount` calculated as: `COUNT(*) WHERE withdrawn = false`
- `currentUserSignup` populated if current user has signup for that slot

---

## GET `/api/events/:id`

**Description**: Get single event details

**Authorization**: Bearer token (Tier 1+)

**Success Response** (200 OK):
```typescript
{
  id: string;
  title: string;
  description: string | null;
  eventDate: string;
  eventTime: string | null;
  location: string | null;
  rankLevel: string | null;
  isRecurring: boolean;
  isComplete: boolean;
  recurringEndDate: string | null;
  activitySlots: Array<{
    id: string;
    activityType: {
      id: string;
      name: string;
      pointValue: number;
      category: string;
    };
    capacity: number | null;
    signups: Array<{
      id: string;
      volunteer: {
        id: string;
        name: string;
      };
      withdrawn: boolean;
      createdAt: string;
    }>;
  }>;
  createdBy: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}
```

**Error Responses**:
- `404 Not Found`: Event does not exist

---

## POST `/api/events`

**Description**: Create a new volunteer event

**Authorization**: Bearer token (Tier 2+)

**Request Body**:
```typescript
{
  title: string;                      // 3-200 characters
  description?: string;
  eventDate: string;                  // ISO 8601, must be future date
  eventTime?: string;                 // e.g., "6:00 PM"
  location?: string;
  rankLevel?: "LION" | "TIGER" | "WOLF" | "BEAR" | "WEBELOS" | "AOL"; // null = PACK_WIDE
  isRecurring?: boolean;              // Default: false
  activitySlots: Array<{
    activityTypeId: string;
    capacity?: number | null;         // null = unlimited
  }>;
}
```

**Success Response** (201 Created):
```typescript
{
  id: string;
  title: string;
  description: string | null;
  eventDate: string;
  eventTime: string | null;
  location: string | null;
  rankLevel: string | null;
  isRecurring: boolean;
  recurringEndDate: string | null; // Auto-set from PackConfig if isRecurring=true
  activitySlots: Array<{
    id: string;
    activityTypeId: string;
    capacity: number | null;
  }>;
  createdById: string;
  createdAt: string;
}
```

**Error Responses**:
- `400 Bad Request`: Invalid input (past date, invalid rankLevel, invalid activityTypeId)
- `403 Forbidden`: Insufficient permissions (Tier 1 cannot create events)

**Side Effects**:
- If `isRecurring = true` → set `recurringEndDate` to PackConfig.yearEndDate
- Create AuditLog entry

---

## PUT `/api/events/:id`

**Description**: Update an existing event

**Authorization**: Bearer token (Tier 2+)

**Request Body**: Same as POST (all fields optional)

**Success Response** (200 OK): Same as POST response

**Error Responses**:
- `400 Bad Request`: Invalid input
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Event does not exist
- `409 Conflict`: Cannot modify completed events

---

## POST `/api/events/:id/complete`

**Description**: Mark event as complete and award points

**Authorization**: Bearer token (Tier 2+)

**Request Body**:
```typescript
{
  manualVolunteers?: Array<{
    volunteerId: string;
    activitySlotId: string;
  }>; // Optional: Add volunteers who participated but didn't sign up
}
```

**Success Response** (200 OK):
```typescript
{
  id: string;
  isComplete: true;
  pointsAwarded: Array<{
    volunteerId: string;
    volunteerName: string;
    points: number;
    activityType: string;
  }>;
}
```

**Error Responses**:
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Event does not exist
- `409 Conflict`: Event already marked complete

**Side Effects**:
- Set `isComplete = true`
- For each non-withdrawn signup → create PointEvent (eventType=EVENT_PARTICIPATION)
- For each manualVolunteer → create Signup + PointEvent
- Update VolunteerPointBalance for affected volunteers
- Trigger badge tier check for affected volunteers
- Create AuditLog entry

---

## POST `/api/events/:eventId/slots/:slotId/signup`

**Description**: Sign up for an activity slot

**Authorization**: Bearer token (Tier 1+)

**Request Body**: None

**Success Response** (201 Created):
```typescript
{
  id: string;
  volunteerId: string;
  activitySlotId: string;
  withdrawn: false;
  createdAt: string;
}
```

**Error Responses**:
- `400 Bad Request`: Event is in the past or slot is at capacity
- `404 Not Found`: Event or activity slot does not exist
- `409 Conflict`: Already signed up for this slot

**Side Effects**:
- Check capacity: `COUNT(*) WHERE activitySlotId = ? AND withdrawn = false`
- If over capacity → return 400
- Create Signup record

---

## DELETE `/api/events/:eventId/slots/:slotId/signup`

**Description**: Withdraw from an activity slot

**Authorization**: Bearer token (Tier 1+, must be own signup)

**Success Response** (200 OK):
```typescript
{
  id: string;
  withdrawn: true;
  withdrawnAt: string;
}
```

**Error Responses**:
- `404 Not Found`: Signup does not exist or not owned by current user
- `409 Conflict`: Already withdrawn

**Side Effects**:
- Set `withdrawn = true`, `withdrawnAt = now()`
- Cannot be undone

---

## DELETE `/api/events/:id`

**Description**: Delete an event (soft delete)

**Authorization**: Bearer token (Tier 2+)

**Success Response** (204 No Content)

**Error Responses**:
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Event does not exist
- `409 Conflict`: Cannot delete completed events (business rule)

**Side Effects**:
- Soft delete Event (set deletedAt)
- Cascade soft delete to ActivitySlots (via onDelete: Cascade)
- Withdraw all signups
- Create AuditLog entry

---

## Validation Schemas

```typescript
// backend/src/utils/validation/event.schema.ts
import { z } from 'zod';
import { RankLevel } from '@prisma/client';

export const createEventSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().optional(),
  eventDate: z.string().datetime().refine(
    (date) => new Date(date) > new Date(),
    'Event date must be in the future'
  ),
  eventTime: z.string().max(20).optional(),
  location: z.string().max(200).optional(),
  rankLevel: z.nativeEnum(RankLevel).optional(),
  isRecurring: z.boolean().optional(),
  activitySlots: z.array(z.object({
    activityTypeId: z.string().cuid(),
    capacity: z.number().int().positive().nullable().optional()
  })).min(1, 'Must have at least one activity slot')
});

export const updateEventSchema = createEventSchema.partial();

export const completeEventSchema = z.object({
  manualVolunteers: z.array(z.object({
    volunteerId: z.string().cuid(),
    activitySlotId: z.string().cuid()
  })).optional()
});

export const listEventsSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  rankLevel: z.nativeEnum(RankLevel).optional(),
  upcoming: z.coerce.boolean().optional(),
  mySignups: z.coerce.boolean().optional()
});
```
