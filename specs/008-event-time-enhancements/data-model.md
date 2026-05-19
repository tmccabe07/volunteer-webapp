# Data Model: Enhanced Event Management - Time and Activity Details

**Phase**: Phase 1 - Data Model Design  
**Date**: 2026-05-19  
**Feature**: [spec.md](spec.md) | [plan.md](plan.md) | [research.md](research.md)

## Overview

This document defines database schema changes, entity relationships, and data validation rules for event timing enhancements and activity slot customization. Changes are backward compatible and follow existing patterns.

---

## Schema Changes

### 1. Event Model Modifications

**File**: `backend/prisma/schema.prisma`

**Changes**:
```prisma
model Event {
  id              String        @id @default(cuid())
  title           String
  description     String?
  eventDate       DateTime
  eventTime       String?       // EXISTING: Start time in HH:mm format (24hr)
  endTime         String?       // NEW: End time in HH:mm format (24hr), optional
  fullDay         Boolean       @default(false) // NEW: If true, times are ignored
  location        String?
  rankLevel       RankLevel?    // null = pack-wide
  isRecurring     Boolean       @default(false)
  isComplete      Boolean       @default(false)
  recurringEndDate DateTime?
  
  activitySlots   ActivitySlot[]
  createdById     String
  createdBy       Volunteer     @relation(fields: [createdById], references: [id])
  
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  deletedAt       DateTime?
  
  @@index([eventDate, deletedAt])
  @@index([rankLevel, eventDate])
  @@index([isComplete, eventDate])
  @@index([createdById])
}
```

**New Fields**:
- `endTime String?` - Optional end time for events with defined duration
- `fullDay Boolean @default(false)` - Flag indicating all-day event (no specific times)

**Validation Rules** (enforced in DTO/service layer):
1. If `fullDay = true`, both `eventTime` and `endTime` must be `null`
2. If `endTime` is provided, `eventTime` must also be provided
3. If both times provided, `endTime` must be chronologically after `eventTime` (accounting for midnight-spanning events)
4. Time format: `HH:mm` (24-hour format, e.g., "14:30" for 2:30 PM)

**Migration Notes**:
- Existing events automatically have `fullDay = false` and `endTime = null`
- No data backfill required
- Backward compatible: Queries handle null `endTime` gracefully

---

### 2. ActivitySlot Model Modifications

**File**: `backend/prisma/schema.prisma`

**Changes**:
```prisma
model ActivitySlot {
  id              String        @id @default(cuid())
  eventId         String
  event           Event         @relation(fields: [eventId], references: [id], onDelete: Cascade)
  activityTypeId  String
  activityType    ActivityType  @relation(fields: [activityTypeId], references: [id], onDelete: Restrict)
  capacity        Int?          // null = unlimited
  description     String?       // NEW: Custom event-specific description (max 500 chars)
  
  signups         Signup[]
  steps           ActivitySlotStep[] // NEW: Relationship to steps
  
  createdAt       DateTime      @default(now())
  
  @@index([eventId])
  @@index([activityTypeId])
}
```

**New Fields**:
- `description String?` - Optional custom description for this specific activity slot (e.g., "Run Lion station for safety")
- `steps ActivitySlotStep[]` - Relationship to step-by-step instructions

**Validation Rules**:
- `description` max length: 500 characters (enforced in DTO)
- `description` is optional; if null, display only `activityType.name`

**Display Logic**:
- If `description` exists: Show both activity type name and custom description
- If `description` is null: Show only activity type name

---

### 3. NEW: ActivitySlotStep Model

**File**: `backend/prisma/schema.prisma`

**New Entity**:
```prisma
model ActivitySlotStep {
  id              String        @id @default(cuid())
  activitySlotId  String
  activitySlot    ActivitySlot  @relation(fields: [activitySlotId], references: [id], onDelete: Cascade)
  orderIndex      Int           // Sequential ordering: 1, 2, 3...
  stepText        String        // Step instruction (max 200 chars)
  
  createdAt       DateTime      @default(now())
  
  @@index([activitySlotId, orderIndex])
  @@unique([activitySlotId, orderIndex]) // Prevent duplicate ordering
}
```

**Purpose**: Store ordered step-by-step instructions for activity slots

**Relationships**:
- `activitySlot` - Many-to-one: Each step belongs to one activity slot
- Cascade delete: When activity slot is deleted, all steps are deleted

**Validation Rules**:
- `orderIndex` starts at 1, increments sequentially
- `stepText` max length: 200 characters (enforced in DTO)
- `stepText` cannot be empty/whitespace (trimmed and validated)
- Max 20 steps per activity slot (enforced in service layer)

**Ordering**:
- Always query with `orderBy: { orderIndex: 'asc' }`
- When step deleted, remaining steps renumbered (service method handles)
- When reordered, `orderIndex` values updated in batch transaction

---

## Entity Relationships

### Updated ERD (relevant entities)

```text
Event (1) ──────< (M) ActivitySlot (1) ──────< (M) ActivitySlotStep
  │                      │
  │                      │
  │                      └──────> (1) ActivityType
  │
  └──────> (1) Volunteer (createdBy)


Relationships:
- Event → ActivitySlot: One-to-many (an event has multiple activity slots)
- ActivitySlot → ActivitySlotStep: One-to-many (a slot has multiple ordered steps)
- ActivitySlot → ActivityType: Many-to-one (slots reference pre-configured types)
- Event → Volunteer: Many-to-one (events created by volunteers)
```

### Cascade Behavior

**Event Deletion**:
- Deletes all related ActivitySlots (existing behavior, onDelete: Cascade)
- Cascades to ActivitySlotSteps (via ActivitySlot cascade)

**ActivitySlot Deletion**:
- Deletes all related ActivitySlotSteps (onDelete: Cascade)
- Preserves ActivityType (onDelete: Restrict prevents deletion of types in use)

**ActivityType Deletion**:
- Blocked if any ActivitySlots reference it (onDelete: Restrict)
- Soft delete pattern (deletedAt) allows historical preservation

---

## Data Validation Rules (Comprehensive)

### Event Validation

| Field      | Type      | Required | Validation Rules                                                                 |
|------------|-----------|----------|----------------------------------------------------------------------------------|
| `eventTime`| String?   | No*      | Required if `fullDay = false` and `endTime` provided. Format: `HH:mm` (24hr)   |
| `endTime`  | String?   | No       | Optional. Requires `eventTime` if provided. Must be after `eventTime`.         |
| `fullDay`  | Boolean   | Yes      | Default `false`. If `true`, `eventTime` and `endTime` must be `null`.          |

*Existing behavior: `eventTime` is optional, but recommended to provide if event has specific time

### ActivitySlot Validation

| Field         | Type      | Required | Validation Rules                                                       |
|---------------|-----------|----------|------------------------------------------------------------------------|
| `description` | String?   | No       | Max 500 characters. Optional custom description for the slot.         |

### ActivitySlotStep Validation

| Field          | Type      | Required | Validation Rules                                                        |
|----------------|-----------|----------|-------------------------------------------------------------------------|
| `orderIndex`   | Int       | Yes      | Sequential starting at 1. Auto-managed by service layer.               |
| `stepText`     | String    | Yes      | Max 200 characters. Cannot be empty/whitespace. Required field.        |
| **(per slot)** | -         | -        | Max 20 steps per activity slot. Enforced in service layer.             |

---

## Migration Strategy

### Migration File (Prisma)

**File**: `backend/prisma/migrations/YYYYMMDDHHMMSS_add_event_time_enhancements/migration.sql`

**SQL** (SQLite example, Prisma generates):
```sql
-- Add new fields to Event table
ALTER TABLE "Event" ADD COLUMN "endTime" TEXT;
ALTER TABLE "Event" ADD COLUMN "fullDay" BOOLEAN NOT NULL DEFAULT false;

-- Add new field to ActivitySlot table
ALTER TABLE "ActivitySlot" ADD COLUMN "description" TEXT;

-- Create new ActivitySlotStep table
CREATE TABLE "ActivitySlotStep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "activitySlotId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "stepText" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivitySlotStep_activitySlotId_fkey" FOREIGN KEY ("activitySlotId") REFERENCES "ActivitySlot" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes for ActivitySlotStep
CREATE INDEX "ActivitySlotStep_activitySlotId_orderIndex_idx" ON "ActivitySlotStep"("activitySlotId", "orderIndex");
CREATE UNIQUE INDEX "ActivitySlotStep_activitySlotId_orderIndex_key" ON "ActivitySlotStep"("activitySlotId", "orderIndex");
```

**Rollback Strategy**:
```sql
-- Drop new table
DROP TABLE IF EXISTS "ActivitySlotStep";

-- Remove new columns
ALTER TABLE "ActivitySlot" DROP COLUMN "description";
ALTER TABLE "Event" DROP COLUMN "fullDay";
ALTER TABLE "Event" DROP COLUMN "endTime";
```

**Safety Checks**:
1. Run migration in development first
2. Verify existing events/slots remain unchanged
3. Test backward compatibility (queries with null values)
4. Perform on staging before production

---

## Service Layer Patterns

### ActivitySlotStepService (NEW)

**Responsibility**: Manage CRUD operations for activity slot steps with automatic ordering

**Key Methods**:

```typescript
class ActivitySlotStepService {
  // Create: Add step to end of list
  async addStep(activitySlotId: string, stepText: string): Promise<ActivitySlotStep> {
    const count = await this.countSteps(activitySlotId);
    if (count >= 20) throw new BadRequestException('Maximum 20 steps per activity slot');
    const orderIndex = count + 1;
    return this.prisma.activitySlotStep.create({
      data: { activitySlotId, stepText, orderIndex }
    });
  }

  // Delete: Remove step and renumber remaining
  async removeStep(stepId: string): Promise<void> {
    const step = await this.findStepOrFail(stepId);
    await this.prisma.$transaction(async (tx) => {
      await tx.activitySlotStep.delete({ where: { id: stepId } });
      await tx.activitySlotStep.updateMany({
        where: { activitySlotId: step.activitySlotId, orderIndex: { gt: step.orderIndex } },
        data: { orderIndex: { decrement: 1 } }
      });
    });
  }

  // Reorder: Batch update orderIndex values
  async reorderSteps(activitySlotId: string, stepIds: string[]): Promise<void> {
    await this.prisma.$transaction(
      stepIds.map((id, index) =>
        this.prisma.activitySlotStep.update({
          where: { id },
          data: { orderIndex: index + 1 }
        })
      )
    );
  }

  // Read: Get all steps for an activity slot (ordered)
  async getStepsBySlot(activitySlotId: string): Promise<ActivitySlotStep[]> {
    return this.prisma.activitySlotStep.findMany({
      where: { activitySlotId },
      orderBy: { orderIndex: 'asc' }
    });
  }
}
```

### Event Service Updates (MODIFIED)

**Add Validation Method**:
```typescript
class EventService {
  validateEventTimes(eventTime: string | null, endTime: string | null, fullDay: boolean): void {
    if (fullDay) {
      if (eventTime || endTime) {
        throw new BadRequestException('Full-day events cannot have start or end times');
      }
      return;
    }
    
    if (endTime && !eventTime) {
      throw new BadRequestException('Start time required when end time is provided');
    }
    
    if (eventTime && endTime) {
      const start = this.parseTime(eventTime);
      const end = this.parseTime(endTime);
      if (end <= start) {
        // Allow but log warning (could be midnight-spanning event)
        this.logger.warn(`End time (${endTime}) is not after start time (${eventTime})`);
      }
    }
  }

  private parseTime(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes; // Convert to minutes since midnight
  }
}
```

---

## Query Patterns

### Fetch Event with All Details (Activity Slots + Steps)

```typescript
const event = await prisma.event.findUnique({
  where: { id: eventId },
  include: {
    activitySlots: {
      include: {
        activityType: true,
        steps: {
          orderBy: { orderIndex: 'asc' }
        },
        signups: {
          where: { withdrawn: false },
          include: { volunteer: true }
        }
      }
    },
    createdBy: true
  }
});
```

**Performance**: Single query with joins, optimized by existing indexes

### Check Step Count Before Adding

```typescript
const stepCount = await prisma.activitySlotStep.count({
  where: { activitySlotId }
});
if (stepCount >= 20) {
  throw new BadRequestException('Maximum 20 steps per activity slot');
}
```

---

## Summary

**Schema Changes**:
- Event: `+endTime`, `+fullDay`
- ActivitySlot: `+description`
- ActivitySlotStep: New entity with `activitySlotId`, `orderIndex`, `stepText`

**Key Principles**:
- Backward compatible (nullable fields, defaults)
- Data integrity (foreign keys, unique constraints, validation)
- Performance (indexed queries, single transactions for multi-step operations)
- Maintainability (clear relationships, service layer abstractions)

**Migration**: Safe to deploy incrementally (schema → backend → frontend)

**Next Step**: Define API contracts in `contracts/` directory.
