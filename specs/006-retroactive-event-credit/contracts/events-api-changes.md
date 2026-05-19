# API Contract Changes: Retroactive Event Credit

**Feature**: 006-retroactive-event-credit  
**Date**: May 6, 2026  
**Status**: Complete

## Overview

This document specifies API contract changes for the retroactive event credit feature. The changes are **backward compatible** and extend existing event endpoints.

**Base Contract**: See `specs/001-volunteer-management/contracts/events-api.md` for full event API specification.

## Modified Endpoints

### POST `/api/events` - Create Event

**Change**: Remove "must be future date" validation to allow creating events with past dates.

**Authorization**: Bearer token (Tier 2+)

**Request Body** (unchanged structure, relaxed validation):
```typescript
{
  title: string;                      // 3-200 characters
  description?: string;
  eventDate: string;                  // ISO 8601, NOW ALLOWS PAST DATES ✅
  eventTime?: string;
  location?: string;
  rankLevel?: "LION" | "TIGER" | "WOLF" | "BEAR" | "WEBELOS" | "AOL";
  isRecurring?: boolean;
  activitySlots: Array<{
    activityTypeId: string;
    capacity?: number | null;
  }>;
}
```

**Updated Validation**:
```typescript
// OLD (feature 001):
eventDate: z.string().datetime().refine(
  (date) => new Date(date) > new Date(),
  'Event date must be in the future'  // ❌ Removed
)

// NEW (feature 006):
eventDate: z.string().datetime()      // ✅ Accepts past dates
```

**Success Response** (201 Created) - **unchanged**:
```typescript
{
  id: string;
  title: string;
  eventDate: string;
  // ... all other fields same as before
  createdAt: string;  // Used to compute isRetroactive
}
```

**Error Responses**:
- `400 Bad Request`: Invalid input (invalid ISO 8601, invalid rankLevel, invalid activityTypeId)
  - **No longer** returns 400 for past dates ✅
- `403 Forbidden`: Insufficient permissions (Tier 1 cannot create events)

**Backward Compatibility**: ✅ This change is backward compatible. Existing clients that send future dates continue to work. New functionality (past dates) requires no client changes except removing client-side validation if present.

---

### GET `/api/events` - List Events

**Change**: Add computed `isRetroactive` field to each event in the response.

**Authorization**: Bearer token (Tier 1+)

**Query Parameters** (unchanged):
```typescript
{
  page?: number;
  limit?: number;
  rankLevel?: string;
  upcoming?: boolean;      // Default: true
  mySignups?: boolean;
}
```

**Success Response** (200 OK) - **added isRetroactive field**:
```typescript
{
  events: Array<{
    id: string;
    title: string;
    description: string | null;
    eventDate: string;
    eventTime: string | null;
    location: string | null;
    rankLevel: string | null;
    isRecurring: boolean;
    isComplete: boolean;
    isRetroactive: boolean;  // ✅ NEW: true if createdAt > eventDate
    activitySlots: Array<{
      // ... unchanged
    }>;
    createdBy: {
      id: string;
      name: string;
    };
    createdAt: string;  // Used to compute isRetroactive
  }>;
  pagination: {
    // ... unchanged
  };
}
```

**Computed Field Logic**:
```typescript
isRetroactive = event.createdAt > event.eventDate
```

**Backward Compatibility**: ✅ This change is backward compatible. Existing clients will receive an additional field but existing fields remain unchanged. Clients that don't handle `isRetroactive` can safely ignore it.

---

### GET `/api/events/:id` - Get Event Details

**Change**: Add computed `isRetroactive` field to the response.

**Authorization**: Bearer token (Tier 1+)

**Success Response** (200 OK) - **added isRetroactive field**:
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
  isRetroactive: boolean;  // ✅ NEW: true if createdAt > eventDate
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
      createdAt: string;  // Shows when signup was created (may be after event for manual volunteers)
    }>;
  }>;
  createdBy: {
    id: string;
    name: string;
  };
  createdAt: string;  // Used to compute isRetroactive
  updatedAt: string;
}
```

**Backward Compatibility**: ✅ This change is backward compatible. Additional field doesn't break existing clients.

---

## Unchanged Endpoints

The following endpoints have **no contract changes** but work correctly with retroactive events:

### POST `/api/events/:id/complete` - Mark Event Complete

**No changes required**. This endpoint already supports `manualVolunteers` which is the mechanism for adding volunteers who didn't sign up in advance. Works identically for retroactive and regular events.

**Existing Contract** (unchanged):
```typescript
// Request
{
  manualVolunteers?: Array<{
    volunteerId: string;
    activitySlotId: string;
  }>;
}

// Response
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

**Behavior with Retroactive Events**:
- Manual volunteers are added the same way
- Points are awarded the same way
- Point event records include "(manual)" in reason field
- Signup records have `createdAt` timestamp showing when they were added (may be after event date)

### POST `/api/events/:eventId/slots/:slotId/signup` - Sign Up

**No changes**. Existing validation prevents signups for events in the past. This remains correct behavior.

**Note**: Retroactive participation is handled via `manualVolunteers` during event completion, not through the signup endpoint.

### PUT `/api/events/:id` - Update Event

**No changes**. Existing validation prevents updating completed events. Past event dates are now allowed in creation, so they should be allowed in updates too (if event not yet complete).

### DELETE `/api/events/:id` - Delete Event

**No changes**. Soft delete logic remains the same for retroactive and regular events.

---

## Updated Validation Schemas

### Create Event Schema

**File**: `backend/src/utils/validation/event.schema.ts`

**Before**:
```typescript
export const createEventSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().optional(),
  eventDate: z.string().datetime().refine(
    (date) => new Date(date) > new Date(),
    'Event date must be in the future'
  ),
  // ... rest unchanged
});
```

**After**:
```typescript
export const createEventSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().optional(),
  eventDate: z.string().datetime(),  // ✅ Removed .refine() - now accepts past dates
  // ... rest unchanged
});
```

### Service-Level Validation (Optional Warning)

**File**: `backend/src/services/event.service.ts`

**Recommended Addition** (not required for MVP):
```typescript
async createEvent(data: CreateEventInput, createdById: string) {
  const eventDate = new Date(data.eventDate);
  
  // Optional: Warn if date is before current scouting year
  const packConfig = await prisma.packConfig.findFirst();
  if (packConfig && eventDate < packConfig.yearStartDate) {
    // Log warning or return informational message
    // Don't throw error - allow creation
    console.warn(`Event created with date before scouting year: ${data.title}`);
  }
  
  // ... rest of method unchanged
}
```

---

## Query Implementation: Computing isRetroactive

### Backend Controller/Service

**Add computed field to queries**:

```typescript
// In event.service.ts or events.controller.ts

// For single event
const event = await prisma.event.findUnique({
  where: { id: eventId },
  include: { /* ... */ }
});

return {
  ...event,
  isRetroactive: event.createdAt > event.eventDate,
};

// For event list
const events = await prisma.event.findMany({ /* ... */ });

return events.map(event => ({
  ...event,
  isRetroactive: event.createdAt > event.eventDate,
}));
```

**Alternative: Raw SQL/Prisma Extensions** (for better performance at scale):

```typescript
const events = await prisma.$queryRaw`
  SELECT 
    *,
    (createdAt > eventDate) AS isRetroactive
  FROM Event
  WHERE deletedAt IS NULL
  ORDER BY eventDate DESC
`;
```

**Recommendation**: Start with computed field in JavaScript. Only optimize with raw SQL if performance becomes an issue.

---

## Frontend Client Updates

### Event Service

**File**: `frontend/src/services/events.service.ts`

**Add isRetroactive to type definitions**:

```typescript
export interface Event {
  id: string;
  title: string;
  eventDate: string;
  isComplete: boolean;
  isRetroactive: boolean;  // ✅ Add this field
  // ... rest of fields
  createdAt: string;
}
```

**No changes to methods**. The API automatically returns `isRetroactive` in responses.

### UI Components

**Display retroactive badge when isRetroactive === true**:

```typescript
// In event list or detail components
import { Badge } from '@/components/ui/badge';

{event.isRetroactive && (
  <Badge variant="secondary" className="ml-2">
    Retroactive
  </Badge>
)}
```

---

## Contract Testing

### Test Cases for POST `/api/events`

**Test 1: Create event with future date (existing behavior)**
```typescript
const response = await request(app)
  .post('/api/events')
  .send({
    title: 'Future Event',
    eventDate: new Date('2026-12-01').toISOString(),
    activitySlots: [{ activityTypeId: 'activity-1' }]
  });

expect(response.status).toBe(201);
expect(response.body.eventDate).toBe('2026-12-01T00:00:00.000Z');
```

**Test 2: Create event with past date (NEW behavior)**
```typescript
const response = await request(app)
  .post('/api/events')
  .send({
    title: 'Past Event',
    eventDate: new Date('2026-04-01').toISOString(),  // Past date
    activitySlots: [{ activityTypeId: 'activity-1' }]
  });

expect(response.status).toBe(201);  // ✅ Now succeeds instead of 400
expect(response.body.eventDate).toBe('2026-04-01T00:00:00.000Z');
```

**Test 3: Verify isRetroactive is NOT returned in create response**
```typescript
const response = await request(app)
  .post('/api/events')
  .send({ /* ... past date ... */ });

expect(response.body.isRetroactive).toBeUndefined();
// isRetroactive is computed in GET endpoints, not returned in POST
```

### Test Cases for GET `/api/events`

**Test 4: List includes isRetroactive field**
```typescript
// Create a retroactive event
await createEvent({ eventDate: pastDate });

// Fetch event list
const response = await request(app).get('/api/events?upcoming=false');

expect(response.status).toBe(200);
expect(response.body.events[0]).toHaveProperty('isRetroactive');
expect(response.body.events[0].isRetroactive).toBe(true);
```

**Test 5: Future events have isRetroactive = false**
```typescript
await createEvent({ eventDate: futureDate });

const response = await request(app).get('/api/events');

const futureEvent = response.body.events.find(e => new Date(e.eventDate) > new Date());
expect(futureEvent.isRetroactive).toBe(false);
```

### Test Cases for GET `/api/events/:id`

**Test 6: Event detail includes isRetroactive**
```typescript
const event = await createEvent({ eventDate: pastDate });

const response = await request(app).get(`/api/events/${event.id}`);

expect(response.status).toBe(200);
expect(response.body.isRetroactive).toBe(true);
expect(new Date(response.body.createdAt) > new Date(response.body.eventDate)).toBe(true);
```

### Test Cases for POST `/api/events/:id/complete`

**Test 7: Complete retroactive event with manual volunteers**
```typescript
const event = await createEvent({ eventDate: pastDate });

const response = await request(app)
  .post(`/api/events/${event.id}/complete`)
  .send({
    manualVolunteers: [
      { volunteerId: 'vol-1', activitySlotId: 'slot-1' }
    ]
  });

expect(response.status).toBe(200);
expect(response.body.pointsAwarded).toHaveLength(1);
expect(response.body.pointsAwarded[0].volunteerId).toBe('vol-1');

// Verify point event reason includes "manual"
const pointEvent = await prisma.pointEvent.findFirst({
  where: { volunteerId: 'vol-1', referenceId: event.id }
});
expect(pointEvent.reason).toContain('manual');
```

---

## Migration Strategy

### Phase 1: Backend Changes

1. **Update validation schema** - Remove date refine
2. **Add isRetroactive to queries** - Compute in service layer
3. **Update tests** - Add retroactive test cases

### Phase 2: Frontend Changes

1. **Update type definitions** - Add isRetroactive field
2. **Add UI indicators** - Display badges for retroactive events
3. **Update tests** - Verify badges appear correctly

### Phase 3: Verification

1. **Contract tests pass** - All new test cases pass
2. **E2E tests pass** - Full workflow works
3. **No regressions** - Existing event functionality unaffected

**Rollback Plan**: Redeploy previous versions of backend and frontend. No database migration to undo.

---

## Breaking Changes

**None**. All changes are backward compatible additions or relaxed validations.

### Clients Unaffected

- Clients sending future event dates continue to work
- Clients that ignore `isRetroactive` field continue to work
- Existing event list, detail, and completion flows unchanged

### Clients That Benefit

- Clients can now send past event dates (previously returned 400)
- Clients can display retroactive indicators using `isRetroactive` field
- No client-side changes required to benefit from backend changes

---

## Summary

### Changed Endpoints

| Endpoint | Change | Impact |
|----------|--------|--------|
| `POST /api/events` | Remove "future date" validation | **Relaxed** - now accepts past dates |
| `GET /api/events` | Add `isRetroactive` field | **Additive** - backward compatible |
| `GET /api/events/:id` | Add `isRetroactive` field | **Additive** - backward compatible |

### Unchanged Endpoints

| Endpoint | Status | Notes |
|----------|--------|-------|
| `POST /api/events/:id/complete` | ✅ No changes | Already supports manual volunteers |
| `PUT /api/events/:id` | ✅ No changes | Inherits relaxed date validation |
| `DELETE /api/events/:id` | ✅ No changes | Works same for retroactive events |
| `POST /api/events/:id/slots/:id/signup` | ✅ No changes | Correctly prevents past event signups |

### Validation Changes

| Schema | Before | After |
|--------|--------|-------|
| `createEventSchema.eventDate` | Must be future | Can be past or future |
| `completeEventSchema` | No changes | No changes |

### Constitution Compliance

✅ **BDD First**: Contract tests define expected behavior before implementation  
✅ **Clean Code**: API contracts are clearly documented with examples  
✅ **DRY**: Reuses existing event endpoints and schemas without duplication
