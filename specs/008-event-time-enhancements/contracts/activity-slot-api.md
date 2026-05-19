# API Contract: Activity Slot Endpoints

**Feature**: Enhanced Event Management - Time and Activity Details  
**Version**: 2.0 (backward compatible)  
**Date**: 2026-05-19  
**Related**: [data-model.md](../data-model.md) | [event-api.md](./event-api.md)

## Overview

This document defines the API contract for Activity Slot enhancements: custom descriptions and optional numbered steps. Activity slots are created/updated as part of Event operations (nested within event payload) and can also be managed via dedicated endpoints.

---

## Data Transfer Objects

### ActivitySlotDto (Request)

```typescript
interface CreateActivitySlotDto {
  activityTypeId: string;           // Required, references ActivityType
  capacity?: number;                // Optional, null = unlimited
  description?: string;             // NEW: Optional, max 500 chars
  steps?: CreateActivitySlotStepDto[]; // NEW: Optional, max 20 steps
}

interface CreateActivitySlotStepDto {
  stepText: string;                 // Required, max 200 chars, cannot be empty
  // orderIndex is auto-assigned by backend (1, 2, 3...)
}
```

### ActivitySlotResponse (Response)

```typescript
interface ActivitySlotResponse {
  id: string;
  eventId: string;
  activityType: ActivityTypeResponse;
  capacity: number | null;
  description: string | null;       // NEW: Custom description
  steps: ActivitySlotStepResponse[]; // NEW: Ordered steps
  signups: SignupResponse[];        // Active signups (withdrawn = false)
  createdAt: string;
}

interface ActivitySlotStepResponse {
  id: string;
  orderIndex: number;               // Sequential: 1, 2, 3...
  stepText: string;
  createdAt: string;
}

interface ActivityTypeResponse {
  id: string;
  name: string;                     // e.g., "Event Volunteer"
  pointValue: number;
  category: ActivityCategory;
}
```

---

## Endpoints

### 1. Create/Update Activity Slots (via Event Endpoints)

Activity slots are typically managed as nested entities within Event create/update operations.

**Endpoint**: `POST /api/events` or `PATCH /api/events/:id`

**Request Example** (nested in event payload):

```json
{
  "title": "Spring Campout",
  "eventDate": "2026-05-25",
  "fullDay": true,
  "activitySlots": [
    {
      "activityTypeId": "clx-activity-type-001",
      "capacity": 5,
      "description": "Run Lion station for safety",
      "steps": [
        { "stepText": "Gather the lions in a circle" },
        { "stepText": "Hand out the role placards" },
        { "stepText": "Explain the game which is to go to the right role based on the scenario" }
      ]
    },
    {
      "activityTypeId": "clx-activity-type-002",
      "capacity": 3,
      "description": "Lead campfire songs and stories"
      // No steps provided - optional
    },
    {
      "activityTypeId": "clx-activity-type-003",
      "capacity": null
      // No description or steps - uses activity type name only
    }
  ]
}
```

**Response** (full event object includes activity slots with steps):

```json
{
  "id": "clx-event-123",
  "title": "Spring Campout",
  "eventDate": "2026-05-25",
  "fullDay": true,
  "activitySlots": [
    {
      "id": "clx-slot-001",
      "eventId": "clx-event-123",
      "activityType": {
        "id": "clx-activity-type-001",
        "name": "Event Volunteer",
        "pointValue": 5,
        "category": "MEDIUM"
      },
      "capacity": 5,
      "description": "Run Lion station for safety",
      "steps": [
        {
          "id": "clx-step-001",
          "orderIndex": 1,
          "stepText": "Gather the lions in a circle",
          "createdAt": "2026-05-19T10:00:00.000Z"
        },
        {
          "id": "clx-step-002",
          "orderIndex": 2,
          "stepText": "Hand out the role placards",
          "createdAt": "2026-05-19T10:00:01.000Z"
        },
        {
          "id": "clx-step-003",
          "orderIndex": 3,
          "stepText": "Explain the game which is to go to the right role based on the scenario",
          "createdAt": "2026-05-19T10:00:02.000Z"
        }
      ],
      "signups": [],
      "createdAt": "2026-05-19T10:00:00.000Z"
    },
    {
      "id": "clx-slot-002",
      "eventId": "clx-event-123",
      "activityType": {
        "id": "clx-activity-type-002",
        "name": "Entertainment Coordinator",
        "pointValue": 8,
        "category": "MEDIUM"
      },
      "capacity": 3,
      "description": "Lead campfire songs and stories",
      "steps": [],
      "signups": [],
      "createdAt": "2026-05-19T10:00:00.000Z"
    }
  ],
  "createdAt": "2026-05-19T10:00:00.000Z",
  "updatedAt": "2026-05-19T10:00:00.000Z"
}
```

---

### 2. Get Activity Slot by ID (Detailed View)

**Endpoint**: `GET /api/activity-slots/:id`  
**Auth**: Required (any authenticated user)

**Response**:

```json
{
  "id": "clx-slot-001",
  "eventId": "clx-event-123",
  "activityType": {
    "id": "clx-activity-type-001",
    "name": "Event Volunteer",
    "pointValue": 5,
    "category": "MEDIUM",
    "description": "General volunteer support for pack events"
  },
  "capacity": 5,
  "description": "Run Lion station for safety",
  "steps": [
    {
      "id": "clx-step-001",
      "orderIndex": 1,
      "stepText": "Gather the lions in a circle",
      "createdAt": "2026-05-19T10:00:00.000Z"
    },
    {
      "id": "clx-step-002",
      "orderIndex": 2,
      "stepText": "Hand out the role placards",
      "createdAt": "2026-05-19T10:00:01.000Z"
    },
    {
      "id": "clx-step-003",
      "orderIndex": 3,
      "stepText": "Explain the game which is to go to the right role based on the scenario",
      "createdAt": "2026-05-19T10:00:02.000Z"
    }
  ],
  "signups": [
    {
      "id": "clx-signup-001",
      "volunteerId": "clx-volunteer-001",
      "volunteer": {
        "id": "clx-volunteer-001",
        "name": "Jane Doe"
      },
      "withdrawn": false,
      "createdAt": "2026-05-19T11:00:00.000Z"
    }
  ],
  "createdAt": "2026-05-19T10:00:00.000Z"
}
```

**Error Responses**:
- `404 Not Found`: Activity slot does not exist
- `401 Unauthorized`: Missing auth token

---

### 3. Update Activity Slot (Standalone Endpoint)

**Endpoint**: `PATCH /api/activity-slots/:id`  
**Auth**: Required (Tier: LEADER or ADMIN, or event creator)

**Request Body** (partial update):

```json
{
  "description": "Updated: Run Lion station for safety and track participation",
  "steps": [
    { "stepText": "Gather the lions in a circle" },
    { "stepText": "Hand out the role placards" },
    { "stepText": "Explain the game rules" },
    { "stepText": "Record participant names for awards" }
  ]
}
```

**Behavior**:
- If `steps` array provided: **Replaces** all existing steps (delete old, create new with provided order)
- If `description` provided: Updates description (can set to `null` to clear)
- Capacity update also supported (not shown in example)

**Response**: Full ActivitySlotResponse with updates applied

**Error Responses**:
- `400 Bad Request`: Validation errors (e.g., > 20 steps, empty stepText)
- `404 Not Found`: Activity slot not found
- `403 Forbidden`: User lacks permission to edit

---

### 4. Add Step to Activity Slot

**Endpoint**: `POST /api/activity-slots/:id/steps`  
**Auth**: Required (Tier: LEADER or ADMIN, or event creator)

**Request Body**:

```json
{
  "stepText": "Clean up station area before leaving"
}
```

**Response**:

```json
{
  "id": "clx-step-004",
  "activitySlotId": "clx-slot-001",
  "orderIndex": 4,
  "stepText": "Clean up station area before leaving",
  "createdAt": "2026-05-19T12:00:00.000Z"
}
```

**Behavior**:
- Appends step to end of list (auto-increments orderIndex)
- Validates max 20 steps per slot

**Error Responses**:
- `400 Bad Request`: Max steps exceeded, empty text, text > 200 chars
- `404 Not Found`: Activity slot not found

---

### 5. Remove Step from Activity Slot

**Endpoint**: `DELETE /api/activity-slots/:slotId/steps/:stepId`  
**Auth**: Required (Tier: LEADER or ADMIN, or event creator)

**Response**:

```json
{
  "message": "Step removed successfully"
}
```

**Behavior**:
- Deletes step and renumbers remaining steps (orderIndex auto-adjusted)
- Example: Delete step 2 → steps 3, 4, 5 become 2, 3, 4

**Error Responses**:
- `404 Not Found`: Step or activity slot not found
- `403 Forbidden`: User lacks permission

---

### 6. Reorder Steps

**Endpoint**: `PATCH /api/activity-slots/:id/steps/reorder`  
**Auth**: Required (Tier: LEADER or ADMIN, or event creator)

**Request Body**:

```json
{
  "stepIds": [
    "clx-step-003",
    "clx-step-001",
    "clx-step-002"
  ]
}
```

**Behavior**:
- Reorders steps to match provided array (first item becomes orderIndex 1, etc.)
- All existing step IDs must be included (validates completeness)

**Response**:

```json
{
  "message": "Steps reordered successfully",
  "steps": [
    {
      "id": "clx-step-003",
      "orderIndex": 1,
      "stepText": "Explain the game rules"
    },
    {
      "id": "clx-step-001",
      "orderIndex": 2,
      "stepText": "Gather the lions in a circle"
    },
    {
      "id": "clx-step-002",
      "orderIndex": 3,
      "stepText": "Hand out the role placards"
    }
  ]
}
```

**Error Responses**:
- `400 Bad Request`: Missing step IDs, extra step IDs, duplicate IDs
- `404 Not Found`: Activity slot not found

---

## Validation Rules

### ActivitySlot Validation

| Field         | Type      | Required | Rules                                                             |
|---------------|-----------|----------|-------------------------------------------------------------------|
| `activityTypeId` | String | Yes      | Must reference existing ActivityType                              |
| `capacity`    | Number    | No       | Positive integer or `null` (unlimited)                            |
| `description` | String    | No       | Max 500 characters. Can be `null`.                                |
| `steps`       | Array     | No       | Max 20 steps. Each step validated per ActivitySlotStep rules.    |

### ActivitySlotStep Validation

| Field      | Type   | Required | Rules                                                               |
|------------|--------|----------|---------------------------------------------------------------------|
| `stepText` | String | Yes      | Max 200 characters. Cannot be empty or whitespace-only (trimmed).  |
| `orderIndex` | Number | Auto | Managed by backend. Sequential starting at 1.                      |

---

## Display Logic for Clients

### Activity Slot Name Display

```typescript
function formatActivitySlotName(slot: ActivitySlot): string {
  if (slot.description) {
    return `${slot.activityType.name} - ${slot.description}`;
  }
  return slot.activityType.name;
}
```

**Examples**:
- Activity Type: "Event Volunteer", Description: "Run Lion station" → Display: **"Event Volunteer - Run Lion station"**
- Activity Type: "Setup Crew", Description: null → Display: **"Setup Crew"**

### Step Display Pattern

```typescript
function renderSteps(steps: ActivitySlotStep[]): ReactNode {
  if (steps.length === 0) return null;
  
  return (
    <ol className="steps-list">
      {steps.map(step => (
        <li key={step.id}>
          <span className="step-number">{step.orderIndex}.</span>
          <span className="step-text">{step.stepText}</span>
        </li>
      ))}
    </ol>
  );
}
```

**UI Recommendation**: Use `<ol>` (ordered list) for automatic numbering consistency.

---

## Backward Compatibility

### Existing Clients (No Code Changes)

**Behavior**:
- New fields (`description`, `steps`) appear in responses but are ignored
- Existing clients see activity type name only (as before)
- Creating slots without description/steps works as before

**No Breaking Changes**:
- All new fields are optional
- Existing response structure preserved (additive only)

### New Clients (Full Feature Support)

**Recommended Implementation**:
1. Display activity type name + description (if exists)
2. Show steps list (if exists) below slot name
3. Allow editing description and steps in event creation/edit forms
4. Use step manager UI component for add/remove/reorder operations

---

## Testing Contract

### Contract Test Cases (Backend)

**File**: `backend/tests/contract/activity-slot-api.spec.ts`

**Test Scenarios**:
1. ✅ Create activity slot with description (no steps)
2. ✅ Create activity slot with description and steps (< 20)
3. ✅ Create activity slot without description or steps (existing behavior)
4. ❌ Create activity slot with > 20 steps (400 error)
5. ❌ Create activity slot with empty stepText (400 error)
6. ❌ Create activity slot with stepText > 200 chars (400 error)
7. ❌ Create activity slot with description > 500 chars (400 error)
8. ✅ Update activity slot description
9. ✅ Update activity slot steps (replace all)
10. ✅ Add step to activity slot (POST /steps)
11. ✅ Remove step and verify renumbering
12. ✅ Reorder steps with valid stepIds array
13. ❌ Reorder steps with missing stepIds (400 error)
14. ✅ GET activity slot includes steps in correct order

### Integration Test Cases (Frontend)

**File**: `frontend/tests/integration/activity-slot-management.test.tsx`

**Test Scenarios**:
1. User creates activity slot with custom description
2. User adds multiple steps to activity slot
3. User removes step and sees renumbering
4. User reorders steps (drag-drop or buttons)
5. User sees character counter for description/steps
6. User sees validation error for max steps exceeded
7. User views activity slot with steps on event details page

---

## Migration Notes

**Deployment Order** (same as Event API):
1. Deploy database migration (adds `description` column, `ActivitySlotStep` table)
2. Deploy backend changes (handles new fields, validates)
3. Deploy frontend changes (uses new fields)

**No Downtime**: All changes additive and backward compatible.

---

## Summary

**New Features**:
- `description`: Optional custom text for activity slots (max 500 chars)
- `steps`: Optional ordered list of instructions (max 20 steps, 200 chars each)

**Endpoints**:
- Activity slots managed via Event endpoints (nested)
- Dedicated endpoints for step CRUD: Add, Remove, Reorder

**Validation**: Server-side enforcement, clear error messages

**Backward Compatibility**: ✅ Existing clients unaffected

**Related**: See [event-api.md](./event-api.md) for event timing enhancements.
