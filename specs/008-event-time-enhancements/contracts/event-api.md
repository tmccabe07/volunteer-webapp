# API Contract: Event Endpoints

**Feature**: Enhanced Event Management - Time and Activity Details  
**Version**: 2.0 (backward compatible)  
**Date**: 2026-05-19  
**Related**: [data-model.md](../data-model.md)

## Overview

This document defines the API contract for Event endpoints with enhanced time fields (`endTime`, `fullDay`). All changes are backward compatible - existing clients can continue using only `eventTime`, and new fields are optional.

---

## Endpoints Modified

### 1. Create Event

**Endpoint**: `POST /api/events`  
**Auth**: Required (Tier: LEADER or ADMIN)

#### Request Body

```typescript
interface CreateEventRequest {
  title: string;                    // Required, max 255 chars
  description?: string;             // Optional
  eventDate: string;                // Required, ISO 8601 date (YYYY-MM-DD)
  eventTime?: string;               // Optional, HH:mm format (24hr), e.g., "14:30"
  endTime?: string;                 // NEW: Optional, HH:mm format (24hr)
  fullDay?: boolean;                // NEW: Optional, default false
  location?: string;                // Optional
  rankLevel?: RankLevel;            // Optional (LION|TIGER|WOLF|BEAR|WEBELOS|AOL|PACK_WIDE)
  isRecurring?: boolean;            // Optional, default false
  recurringEndDate?: string;        // Optional, ISO 8601 date
  activitySlots: CreateActivitySlotDto[]; // Required, at least 1
}
```

#### Validation Rules

**Time Fields**:
- If `fullDay = true`: `eventTime` and `endTime` must be `null` or omitted
- If `endTime` provided: `eventTime` is required
- If both `eventTime` and `endTime` provided: `endTime` must be after `eventTime` (exception: midnight-spanning events log warning but allow)
- Format: Both times must match `HH:mm` pattern (00:00 to 23:59)

**Example Valid Requests**:

```json
// 1. Timed event with end time
{
  "title": "Pack Meeting",
  "eventDate": "2026-06-15",
  "eventTime": "18:00",
  "endTime": "19:30",
  "fullDay": false,
  "location": "Scout Hall",
  "rankLevel": "PACK_WIDE",
  "activitySlots": [...]
}

// 2. Full-day event
{
  "title": "Summer Campout",
  "eventDate": "2026-07-20",
  "fullDay": true,
  "location": "Camp Wilderness",
  "activitySlots": [...]
}

// 3. Event with start time only (existing behavior)
{
  "title": "Service Project",
  "eventDate": "2026-06-10",
  "eventTime": "09:00",
  "location": "Community Center",
  "activitySlots": [...]
}
```

#### Response Body

**Status**: `201 Created`

```typescript
interface CreateEventResponse {
  id: string;
  title: string;
  description: string | null;
  eventDate: string;              // ISO 8601 date
  eventTime: string | null;       // HH:mm format
  endTime: string | null;         // NEW: HH:mm format
  fullDay: boolean;               // NEW: default false
  location: string | null;
  rankLevel: RankLevel | null;
  isRecurring: boolean;
  isComplete: boolean;
  recurringEndDate: string | null;
  activitySlots: ActivitySlotResponse[]; // Includes new fields
  createdById: string;
  createdAt: string;              // ISO 8601 timestamp
  updatedAt: string;
}
```

#### Error Responses

**400 Bad Request**:
```json
{
  "statusCode": 400,
  "message": [
    "End time must be after start time",
    "Full-day events cannot have start or end times",
    "Start time required when end time is provided",
    "Time must be in HH:mm format"
  ],
  "error": "Bad Request"
}
```

**401 Unauthorized**: Missing or invalid auth token  
**403 Forbidden**: User tier insufficient (requires LEADER or ADMIN)

---

### 2. Update Event

**Endpoint**: `PATCH /api/events/:id`  
**Auth**: Required (Tier: LEADER or ADMIN, or event creator)

#### Request Body

Same as Create Event, but all fields optional except those being updated.

**Partial Update Examples**:

```json
// Add end time to existing event
{
  "endTime": "17:00"
}

// Convert timed event to full-day
{
  "fullDay": true,
  "eventTime": null,
  "endTime": null
}

// Update time range
{
  "eventTime": "15:00",
  "endTime": "17:30"
}
```

#### Response Body

Same as Create Event response (full event object with updates applied).

#### Error Responses

Same as Create Event, plus:

**404 Not Found**:
```json
{
  "statusCode": 404,
  "message": "Event not found",
  "error": "Not Found"
}
```

---

### 3. Get Event by ID

**Endpoint**: `GET /api/events/:id`  
**Auth**: Required (any authenticated user)

#### Response Body

Same structure as Create Event response, includes all new fields.

**Example Response**:
```json
{
  "id": "clx1234567890",
  "title": "Pack Meeting",
  "description": "Monthly pack gathering with awards ceremony",
  "eventDate": "2026-06-15",
  "eventTime": "18:00",
  "endTime": "19:30",
  "fullDay": false,
  "location": "Scout Hall",
  "rankLevel": "PACK_WIDE",
  "isRecurring": false,
  "isComplete": false,
  "recurringEndDate": null,
  "activitySlots": [...],
  "createdById": "clv9876543210",
  "createdAt": "2026-05-19T10:00:00.000Z",
  "updatedAt": "2026-05-19T10:00:00.000Z"
}
```

---

### 4. List Events

**Endpoint**: `GET /api/events`  
**Auth**: Required (any authenticated user)

#### Query Parameters

- `upcoming`: `true` | `false` - Filter by future events (default: `true`)
- `rankLevel`: RankLevel - Filter by rank level
- `complete`: `true` | `false` - Filter by completion status

#### Response Body

**Status**: `200 OK`

```typescript
interface ListEventsResponse {
  events: EventListItem[];
  total: number;
}

interface EventListItem {
  id: string;
  title: string;
  eventDate: string;
  eventTime: string | null;
  endTime: string | null;         // NEW
  fullDay: boolean;               // NEW
  location: string | null;
  rankLevel: RankLevel | null;
  isComplete: boolean;
  activitySlots: ActivitySlotSummary[]; // Count, not full details
}
```

---

## Display Logic for Clients

### Time Display Recommendations

**Frontend Display Pattern**:

```typescript
function formatEventTime(event: Event): string {
  if (event.fullDay) {
    return 'All Day';
  }
  
  if (event.eventTime && event.endTime) {
    const start = formatTime12hr(event.eventTime); // "6:00 PM"
    const end = formatTime12hr(event.endTime);     // "7:30 PM"
    return `${start} - ${end}`;
  }
  
  if (event.eventTime) {
    return `Starts at ${formatTime12hr(event.eventTime)}`;
  }
  
  return 'Time TBD';
}

function formatTime12hr(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}
```

**Duration Calculation** (optional, for UI hints):

```typescript
function calculateDuration(startTime: string, endTime: string): string {
  const start = parseTime(startTime); // minutes since midnight
  const end = parseTime(endTime);
  const duration = end > start ? end - start : (1440 - start) + end; // Handle midnight span
  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;
  
  if (hours === 0) return `${minutes} minutes`;
  if (minutes === 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
  return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} min`;
}
```

---

## Backward Compatibility

### Existing Clients (No Code Changes)

**Behavior**:
- New fields (`endTime`, `fullDay`) appear in responses but are ignored by existing clients
- Existing clients continue to send only `eventTime` - works as before
- GET endpoints return new fields with `endTime: null`, `fullDay: false` for old events

**No Breaking Changes**:
- All new fields are optional or have defaults
- Existing validation rules unchanged (eventTime still optional)
- Response schema is additive only (no removed fields)

### New Clients (Full Feature Support)

**Recommended Implementation**:
1. Check `fullDay` first - if true, ignore time fields
2. Display time range if both `eventTime` and `endTime` exist
3. Fall back to "Starts at" format if only `eventTime` exists
4. Show "Time TBD" if no times provided

---

## Testing Contract

### Contract Test Cases (Backend)

**File**: `backend/tests/contract/event-api.spec.ts`

**Test Scenarios**:
1. ✅ Create event with start and end time (valid range)
2. ✅ Create full-day event (no times)
3. ✅ Create event with start time only (existing behavior)
4. ❌ Create event with end time but no start time (400 error)
5. ❌ Create event with end time before start time (400 error)
6. ❌ Create full-day event with times provided (400 error)
7. ✅ Update event to add end time
8. ✅ Update event to convert to full-day (clears times)
9. ✅ Update event to convert from full-day to timed
10. ✅ GET event returns new fields correctly
11. ✅ LIST events includes new fields

### Integration Test Cases (Frontend)

**File**: `frontend/tests/integration/event-creation.test.tsx`

**Test Scenarios**:
1. User creates timed event with end time
2. User creates full-day event
3. User edits event to add end time
4. User toggles full-day on/off (times preserved when toggling back)
5. User sees validation error for invalid time range
6. User views event details with all time formats

---

## Migration Notes

**Deployment Order**:
1. Deploy database migration (adds nullable columns, safe)
2. Deploy backend changes (handles new fields, validates)
3. Deploy frontend changes (uses new fields)

**No Downtime**: All changes are additive and backward compatible.

**Rollback**: Revert deployments in reverse order if critical issue found.

---

## Summary

**New Fields**:
- `endTime`: Optional string (HH:mm format)
- `fullDay`: Boolean (default false)

**Validation**: Server-side enforcement, clear error messages

**Backward Compatibility**: ✅ Existing clients unaffected

**Next**: See [activity-slot-api.md](./activity-slot-api.md) for activity slot enhancements.
