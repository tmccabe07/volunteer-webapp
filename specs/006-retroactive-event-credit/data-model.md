# Data Model: Retroactive Event Credit

**Feature**: 006-retroactive-event-credit  
**Date**: May 6, 2026  
**Status**: Complete

## Overview

This feature **requires NO schema changes**. All necessary data structures already exist in the database. The retroactive event capability is achieved by:

1. Removing validation that prevents past event dates
2. Computing retroactive status from existing `createdAt` and `eventDate` timestamps
3. Using existing `manualVolunteers` feature during event completion

## Entity Relationship Diagram

```
┌─────────────────┐
│   Volunteer     │
│  (existing)     │
└────────┬────────┘
         │ createdBy
         │
         ▼
┌─────────────────┐       ┌──────────────────┐
│     Event       │──────▶│  ActivitySlot    │
│  (no changes)   │       │  (no changes)    │
│                 │       │                  │
│ • id            │       │ • id             │
│ • title         │       │ • eventId        │
│ • eventDate     │◀──┐   │ • activityTypeId │
│ • createdAt     │   │   │ • capacity       │
│ • createdById   │   │   └────────┬─────────┘
│ • isComplete    │   │            │
└─────────────────┘   │            │
         │            │            │ activitySlot
         │            │            ▼
         │            │   ┌──────────────────┐
         │ event      │   │     Signup       │
         │            │   │  (no changes)    │
         │            │   │                  │
         │            │   │ • id             │
         │            └───│ • volunteerId    │
         │                │ • activitySlotId │
         │                │ • createdAt      │
         │                └──────────────────┘
         │
         │ reference
         ▼
┌─────────────────────────┐
│     PointEvent          │
│  (reason field used)    │
│                         │
│ • id                    │
│ • volunteerId           │
│ • points                │
│ • eventType             │
│ • referenceId (eventId) │
│ • reason                │──── "Event participation (manual): ..." for retroactive
│ • activityTypeId        │
│ • createdById           │
│ • createdAt             │
└─────────────────────────┘
```

## Existing Entities

### Event (No Changes)

**Location**: `backend/prisma/schema.prisma`

**Purpose**: Represents a volunteer event. Already has all fields needed for retroactive events.

**Key Fields**:

| Field | Type | Description | Retroactive Usage |
|-------|------|-------------|-------------------|
| `id` | String (CUID) | Primary key | Standard |
| `eventDate` | DateTime | When the event occurs/occurred | Can be in the past |
| `createdAt` | DateTime | When record was created | **Compare to eventDate to detect retroactive** |
| `createdById` | String | Who created the event | Audit trail for retroactive events |
| `isComplete` | Boolean | Whether event is complete and points awarded | Standard completion workflow |
| `title`, `description`, etc. | Various | Event metadata | Standard |

**Computed Field** (not stored, calculated at query time):

```typescript
isRetroactive = createdAt > eventDate
```

**No Migration Needed**: All fields already exist.

### ActivitySlot (No Changes)

**Location**: `backend/prisma/schema.prisma`

**Purpose**: Defines volunteer activities available at an event (e.g., "Setup", "Cleanup").

**Key Fields**:

| Field | Type | Description | Retroactive Usage |
|-------|------|-------------|-------------------|
| `id` | String (CUID) | Primary key | Standard |
| `eventId` | String | Foreign key to Event | Standard |
| `activityTypeId` | String | Foreign key to ActivityType (defines point value) | Standard |
| `capacity` | Int? | Max volunteers for this slot | Standard |

**Retroactive Behavior**: No special handling needed. Works identically for past and future events.

### Signup (No Changes)

**Location**: `backend/prisma/schema.prisma`

**Purpose**: Records a volunteer's signup for a specific activity slot. Can be created:
- In advance (volunteer signs up before event)
- Retroactively via `manualVolunteers` during event completion

**Key Fields**:

| Field | Type | Description | Retroactive Usage |
|-------|------|-------------|-------------------|
| `id` | String (CUID) | Primary key | Standard |
| `volunteerId` | String | Foreign key to Volunteer | Standard |
| `activitySlotId` | String | Foreign key to ActivitySlot | Standard |
| `createdAt` | DateTime | When signup was created | Shows when manual volunteer was added |
| `withdrawn` | Boolean | Whether signup was cancelled | Standard |

**Retroactive Behavior**: Created during event completion when `manualVolunteers` array is provided. The `createdAt` timestamp shows when the manual signup was recorded, which may be after the event occurred.

### PointEvent (Reason Field Updated)

**Location**: `backend/prisma/schema.prisma`

**Purpose**: Records point transactions. The `reason` field will include "Retroactive" or "manual" indicator for audit clarity.

**Key Fields**:

| Field | Type | Description | Retroactive Usage |
|-------|------|-------------|-------------------|
| `id` | String (CUID) | Primary key | Standard |
| `volunteerId` | String | Who received points | Standard |
| `points` | Int | Point value | Standard |
| `eventType` | Enum | Type of point event (EVENT_PARTICIPATION) | Standard |
| `referenceId` | String | Foreign key to Event | Links back to retroactive event |
| `reason` | String | **Human-readable description** | **Includes "(manual)" or "(retroactive)" indicator** |
| `activityTypeId` | String | Foreign key to ActivityType | Standard |
| `createdById` | String | Who awarded points | Shows who marked event complete |
| `createdAt` | DateTime | When points were awarded | May be after event occurred (retroactive) |

**Reason Field Format**:

```typescript
// Regular signup (advance planned):
reason = `Event participation: ${eventTitle} - ${activityName}`

// Manual volunteer (could be future or retroactive):
reason = `Event participation (manual): ${eventTitle} - ${activityName}`
```

**Recommendation**: Update reason to explicitly include "Retroactive" when event is retroactive:

```typescript
if (isRetroactiveEvent(event)) {
  reason = `Event participation (manual, retroactive): ${eventTitle} - ${activityName}`;
}
```

**No Schema Change**: This is a convention change in how the `reason` field is populated, not a database structure change.

### VolunteerPointBalance (No Changes)

**Location**: `backend/prisma/schema.prisma`

**Purpose**: Tracks current point balance for each volunteer. Updated when retroactive points are awarded.

**Key Fields**:

| Field | Type | Description | Retroactive Usage |
|-------|------|-------------|-------------------|
| `volunteerId` | String | Primary key, foreign key to Volunteer | Standard |
| `currentBalance` | Int | Total points | **Updated when retroactive event completes** |
| `updatedAt` | DateTime | Last balance change | Shows when retroactive points were added |

**Retroactive Behavior**: Balance is updated when retroactive event is completed, same as regular events. Historical leaderboard snapshots remain unchanged per FR-009.

## Data Flow for Retroactive Events

### Scenario 1: Create Retroactive Event

```
1. Leader creates event with eventDate in past
   ├─▶ Backend validates fields (title, slots, etc.)
   ├─▶ Backend NO LONGER validates "eventDate must be future" ❌
   └─▶ Event record created with:
       • eventDate = [past date]
       • createdAt = [current timestamp]
       • createdById = [leader's volunteer ID]

2. System computes isRetroactive at query time:
   └─▶ if (createdAt > eventDate) → isRetroactive = true
```

**Database Operations**:
- `INSERT INTO Event (id, eventDate, createdAt, createdById, ...)`
- `INSERT INTO ActivitySlot (eventId, activityTypeId, capacity)`

**No New Tables or Columns**.

### Scenario 2: Complete Retroactive Event with Manual Volunteers

```
1. Leader navigates to event detail page
2. Leader clicks "Mark Complete"
3. Leader adds manual volunteers:
   • Select volunteer → Select activity slot → Add
4. Leader submits completion form

Backend processing:
├─▶ For each existing signup:
│   ├─▶ Create PointEvent with reason "Event participation: ..."
│   └─▶ Update VolunteerPointBalance
│
└─▶ For each manual volunteer:
    ├─▶ Create Signup record (with current timestamp)
    ├─▶ Create PointEvent with reason "Event participation (manual): ..."
    └─▶ Update VolunteerPointBalance
```

**Database Operations**:
- `UPDATE Event SET isComplete = true WHERE id = ?`
- `INSERT INTO Signup (volunteerId, activitySlotId, createdAt, withdrawn)`
- `INSERT INTO PointEvent (volunteerId, points, reason, referenceId, createdById, createdAt)`
- `UPDATE VolunteerPointBalance SET currentBalance = currentBalance + ? WHERE volunteerId = ?`

**No New Tables or Columns**.

### Scenario 3: View Retroactive Event in List

```
1. User requests event list
2. Backend queries events with:
   SELECT
     id, title, eventDate, createdAt,
     (createdAt > eventDate) AS isRetroactive,
     ...
   FROM Event
   WHERE deletedAt IS NULL
   ORDER BY eventDate DESC

3. Frontend receives event list with computed isRetroactive flag
4. Frontend displays badge if isRetroactive = true:
   <Badge variant="secondary">Retroactive</Badge>
```

**No Database Changes**. Computed field at query time.

## Validation Rules

### Event Creation

**Current Rules** (remain unchanged except date validation):
- ✅ Title required (3-200 characters)
- ✅ EventDate required (ISO 8601 format)
- ❌ ~~EventDate must be in future~~ **REMOVED**
- ✅ At least one activity slot required
- ✅ Activity types must exist and not be deleted

**New Rule**:
- ⚠️ **Soft warning** if eventDate is before current scouting year start date (from PackConfig)
- ✅ **Allow** event creation regardless (don't block)

### Event Completion

**Current Rules** (remain unchanged):
- ✅ Event must not already be complete
- ✅ Manual volunteers must reference valid volunteer IDs
- ✅ Manual volunteers must reference valid activity slot IDs
- ✅ Prevent duplicate manual volunteer assignments (same volunteer + same slot)

**No Changes Needed**: These rules already work correctly for retroactive events.

## State Transitions

### Event Lifecycle

```
┌──────────────┐
│   Created    │
│ isComplete=F │
└──────┬───────┘
       │
       │ (can be created with past eventDate)
       │
       ▼
┌──────────────┐      Volunteers sign up
│   Pending    │◀──── (advance signups)
│ isComplete=F │
└──────┬───────┘
       │
       │ Leader clicks "Mark Complete"
       │ (can add manual volunteers at this step)
       │
       ▼
┌──────────────┐
│  Completed   │
│ isComplete=T │──────▶ Points awarded to all participants
└──────────────┘       (both advance signups and manual volunteers)
```

**Retroactive vs. Regular Events**: The state machine is **identical**. The only difference is when `createdAt > eventDate`, the event is labeled "Retroactive" in the UI.

## Indexes and Performance

**Existing Indexes** (no changes):

```prisma
@@index([eventDate, deletedAt])        // "Show upcoming active events"
@@index([rankLevel, eventDate])        // "Events for my rank"
@@index([isComplete, eventDate])       // "Mark complete workflow"
@@index([createdById])                 // Audit queries
```

**Performance Considerations**:

1. **Computing `isRetroactive`**: Calculated at query time. For large datasets, could materialize as a generated column in the future, but not needed for current scale (50-200 volunteers, 10-30 events/month).

2. **Filtering retroactive events**: Can use `WHERE createdAt > eventDate` in queries. Existing indexes on `eventDate` should help, but not optimized for this specific query. Monitor performance and add composite index if needed:

   ```prisma
   @@index([createdAt, eventDate])  // Optional if retroactive filtering is slow
   ```

**Recommendation**: Start without new indexes. Add only if query performance becomes an issue.

## Migration Plan

**No migrations required**. This feature uses existing schema.

**Deployment Steps**:
1. Deploy backend code changes (remove date validation)
2. Deploy frontend code changes (add retroactive badges)
3. No database downtime or migration scripts needed

**Rollback**: Simply redeploy previous backend version. No data cleanup needed since schema hasn't changed.

## Testing Data Model

### Test Scenarios

**1. Past Event with Advance Signups**

```typescript
// Create event with past date
const event = await prisma.event.create({
  data: {
    title: 'Past Den Meeting',
    eventDate: new Date('2026-04-01'),  // Past date
    createdAt: new Date('2026-05-06'),  // Current date (after eventDate)
    createdById: leaderId,
    // ...
  }
});

// Verify isRetroactive computed correctly
expect(event.createdAt > event.eventDate).toBe(true);
```

**2. Retroactive Event with Manual Volunteers**

```typescript
// Complete event with manual volunteers
const result = await eventService.markComplete(event.id, {
  manualVolunteers: [
    { volunteerId: 'vol1', activitySlotId: 'slot1' },
    { volunteerId: 'vol2', activitySlotId: 'slot2' },
  ]
}, leaderId);

// Verify signups created
const signups = await prisma.signup.findMany({
  where: { activitySlot: { eventId: event.id } }
});
expect(signups.length).toBe(2);

// Verify points awarded with correct reason
const pointEvents = await prisma.pointEvent.findMany({
  where: { referenceId: event.id }
});
expect(pointEvents[0].reason).toContain('manual');
```

**3. Historical Leaderboard Integrity**

```typescript
// Create leaderboard snapshot before retroactive event
const snapshotBefore = await prisma.leaderboardSnapshot.create({
  data: { volunteerId: 'vol1', points: 100, rank: 5, /* ... */ }
});

// Complete retroactive event (awards 50 points to vol1)
await eventService.markComplete(retroactiveEvent.id, {
  manualVolunteers: [{ volunteerId: 'vol1', activitySlotId: 'slot1' }]
}, leaderId);

// Verify current balance updated
const balance = await prisma.volunteerPointBalance.findUnique({
  where: { volunteerId: 'vol1' }
});
expect(balance.currentBalance).toBe(150);

// Verify historical snapshot UNCHANGED
const snapshotAfter = await prisma.leaderboardSnapshot.findUnique({
  where: { id: snapshotBefore.id }
});
expect(snapshotAfter.points).toBe(100);  // Still 100, not 150
```

## Summary

### Schema Changes Required

**None.** All data structures already exist.

### Computed Fields

- `isRetroactive`: Boolean computed as `createdAt > eventDate` (not stored in database)

### Convention Changes

- **PointEvent.reason**: Include "(manual)" or "(manual, retroactive)" indicator for audit clarity

### Advantages of This Approach

✅ **No migration risk**: Zero schema changes means zero migration downtime  
✅ **Leverages existing code**: Manual volunteers feature already handles the hard parts  
✅ **Clean audit trail**: Separate timestamps naturally show when event occurred vs. when it was created  
✅ **Rollback-friendly**: Can revert changes without data cleanup  
✅ **Constitution compliant**: DRY principle - reuses existing models and workflows
