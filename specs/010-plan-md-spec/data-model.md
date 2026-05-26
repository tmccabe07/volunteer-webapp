# Data Model: Den Advancement Operations Workspace

**Feature**: `010-plan-md-spec` | **Date**: 2026-05-22  
**Status**: Phase 1 Design

## Overview

This document defines the complete data model for den advancement operations, including entities, relationships, validations, and state transitions. All entities follow established Prisma patterns from the existing codebase.

**Key Architectural Pattern**: Den numbers are persistent pack-wide identifiers (e.g., "Den 8") that remain constant over years. The den's rank level changes annually during rollover (Tigers → Wolves → Bears → Webelos → AOL). Historical den membership and rank can be queried via DenMembership temporal columns.

## Entity Diagram

```
Den ----< DenMembership >---- ChildScout
 |                              |
 |                              +----< ParentChildLink >---- Volunteer (Parent)
 |                              |
 |                              +----< ChildAttendance ----< Event
 |                              |
 |                              +---- RequirementProgress ----< Requirement ----< Adventure ----< Rank
 |                              |
 |                              +---- AwardItem
 |                              |
 |                              +---- ScoutbookPrompt
 |
 +----< DenChiefAssignment >---- DenChief (Youth Leader)
```

## Core Entities

### 1. ChildScout

Youth record for attendance, advancement tracking, and award fulfillment.

**Fields**:
```prisma
model ChildScout {
  id              String      @id @default(cuid())
  firstName       String
  lastName        String
  currentRank     RankLevel
  isActive        Boolean     @default(true)
  
  // External system references
  scoutbookId     String?     // External BSA system ID
  
  // Relationships
  denMemberships  DenMembership[]
  parentLinks     ParentChildLink[]
  attendance      ChildAttendance[]
  requirements    RequirementProgress[]
  awards          AwardItem[]
  prompts         ScoutbookPrompt[]
  
  // Audit
  createdAt       DateTime    @default(now())
  createdBy       String      // Admin who created record
  updatedAt       DateTime    @updatedAt
  deletedAt       DateTime?   // Soft delete
  
  @@index([currentRank, isActive])
  @@index([lastName, firstName])
  @@index([deletedAt])
}
```

**Validation Rules**:
- firstName, lastName: Required, 1-50 characters
- currentRank: Must progress through valid rank sequence

**State Transitions**:
- New → Active (on creation)
- Active → Inactive (graduation, transfer out, annual rollover for AOL)
- Rank advances annually during rollover (LION → TIGER → WOLF → BEAR → WEBELOS → AOL)

---

### 2. Den

Persistent group of Cub Scouts that advances through ranks over years. Den numbers are pack-wide unique identifiers (e.g., "Den 8") that remain constant while the rank level changes annually.

**Fields**:
```prisma
model Den {
  id              String      @id @default(cuid())
  name            String      // "Den 8" or "Den 8 - Tigers"
  denNumber       Int         // 1, 2, 3, etc. - unique within pack, persists across years
  rankLevel       RankLevel   // Current rank level (changes during annual rollover)
  isActive        Boolean     @default(true)
  
  // Relationships
  members         DenMembership[]
  events          Event[]     // Den-scoped events
  leaderRoles     VolunteerToRole[] // Den leaders assigned to this den
  denChiefAssignments DenChiefAssignment[]  // Youth leaders assigned to help with this den
  
  // Audit
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  deletedAt       DateTime?
  
  @@unique([denNumber, deletedAt])  // Den number unique pack-wide
  @@index([rankLevel, isActive])
  @@index([denNumber])
}
```

**Validation Rules**:
- name: Required, 1-100 characters
- denNumber: Positive integer, unique among active dens (can be reused after den is deleted)
- rankLevel: Cannot be PACK_WIDE; represents current rank and advances during annual rollover

**Temporal Behavior**:
- **Den numbers persist**: Den 8 created as Tigers remains "Den 8" when it becomes Wolves
- **Rank advances annually**: During rollover, Den 8 advances from TIGER → WOLF → BEAR → WEBELOS → AOL
- **AOL dens close out**: AOL is the final Cub Scout rank; AOL dens are marked inactive during rollover (no further rank advancement)
- **Den number reuse**: After closing a den (e.g., AOL Den 2), the number becomes available for reuse. Common pattern: AOL dens 2 & 3 close in spring, numbers reassigned to new Lion dens in fall.
- **Uniqueness constraint**: Only one *active* den can have a given number; historical/deleted dens preserve their numbers via `@@unique([denNumber, deletedAt])`
- **Den splits**: New dens can be created mid-year; children transferred with `reason: "Den Split"`
- **Den consolidation**: Dens can be soft-deleted (marked inactive) after transferring all children to another den; historical data preserved
- **Historical queries**: Use DenMembership temporal data to determine "What rank was Den 8 in 2024?" or "Who was in Den 10 before it closed?"

---

### 3. DenMembership

Time-bounded child-to-den assignment history.

**Fields**:
```prisma
model DenMembership {
  id              String      @id @default(cuid())
  denId           String
  den             Den         @relation(fields: [denId], references: [id], onDelete: Cascade)
  childScoutId    String
  childScout      ChildScout  @relation(fields: [childScoutId], references: [id], onDelete: Cascade)
  
  // Temporal tracking
  validFrom       DateTime    @default(now())
  validTo         DateTime?   // NULL = current membership
  
  // Audit trail
  assignedBy      String?     // volunteerId who made assignment
  reason          String?     // "Promotion", "New Scout", "Den Restructure", "Transfer"
  
  createdAt       DateTime    @default(now())
  
  @@index([childScoutId, validTo])  // Optimize "current membership" queries
  @@index([denId, validTo])         // Optimize "current den roster" queries
  @@index([validFrom, validTo])     // Range queries
}
```

**Validation Rules**:
- validFrom: Cannot be in future
- validTo: If set, must be after validFrom
- Overlap prevention: Only one current membership (validTo = NULL) per child at any time

**Business Logic**:
- When assigning child to new den, close current membership (set validTo = now) before creating new record
- Annual rollover creates new membership records with rank-appropriate den

---

### 4. ParentChildLink

Approval-based relationship between parent volunteer accounts and child records.

**Fields**:
```prisma
model ParentChildLink {
  id                String      @id @default(cuid())
  parentId          String
  parent            Volunteer   @relation("ParentLinks", fields: [parentId], references: [id], onDelete: Cascade)
  childScoutId      String
  childScout        ChildScout  @relation(fields: [childScoutId], references: [id], onDelete: Cascade)
  status            LinkStatus  @default(PENDING)
  relationshipType  String?     // "mother", "father", "guardian", etc.
  
  // Audit trail
  requestedAt       DateTime    @default(now())
  requestedBy       String      // Usually same as parentId
  processedAt       DateTime?
  processedBy       String?     // volunteerId who approved/rejected
  processor         Volunteer?  @relation("LinkApprovals", fields: [processedBy], references: [id])
  rejectionReason   String?
  
  @@unique([parentId, childScoutId, status])  // Prevent duplicate pending
  @@index([status, requestedAt])
  @@index([childScoutId])
  @@index([parentId])
}

enum LinkStatus {
  PENDING     // Awaiting leader approval
  APPROVED    // Parent has access to child record
  REJECTED    // Request denied
  REVOKED     // Previously approved link removed
}
```

**Validation Rules**:
- relationshipType: Optional, max 50 characters
- rejectionReason: Required when status = REJECTED
- processedBy, processedAt: Required when status != PENDING

**State Transitions**:
- PENDING → APPROVED (leader approves)
- PENDING → REJECTED (leader rejects with reason)
- APPROVED → REVOKED (admin revokes with reason, e.g., child transfers out)

**Business Logic**:
- Multiple parents can link to same child (mom and dad)
- Parent can only access child data after status = APPROVED
- Notifications sent on state transitions

---

### 5. ChildAttendance

Per-event per-child attendance tracking (separate from volunteer signups).

**Fields**:
```prisma
model ChildAttendance {
  id              String          @id @default(cuid())
  eventId         String
  event           Event           @relation(fields: [eventId], references: [id], onDelete: Cascade)
  childScoutId    String
  childScout      ChildScout      @relation(fields: [childScoutId], references: [id], onDelete: Cascade)
  attendanceStatus AttendanceStatus @default(PRESENT)
  
  // Covered requirements (marked during event)
  coveredRequirements Requirement[] // Many-to-many via implicit join table
  
  // Audit
  recordedAt      DateTime        @default(now())
  recordedBy      String          // volunteerId who took attendance
  notes           String?
  
  @@unique([eventId, childScoutId])
  @@index([childScoutId, attendanceStatus])
  @@index([eventId])
}

enum AttendanceStatus {
  PRESENT
  ABSENT
  EXCUSED
  LATE
}
```

**Validation Rules**:
- Must have valid event and child references
- notes: Max 500 characters
- recordedBy: Must be LEADER or ADMIN tier

**Business Logic**:
- Attendance does NOT award volunteer points (separate from volunteer signups)
- coveredRequirements: Requirements introduced/worked on during event (not completion, just coverage)
- Parent notifications sent after attendance recorded (if enabled for event)

---

## Advancement Catalog Entities

### 6. Rank

Top-level catalog entry for Cub Scout ranks.

**Fields**:
```prisma
model Rank {
  id              String      @id @default(cuid())
  rankLevel       RankLevel   @unique
  displayName     String      // "Tiger", "Wolf", etc.
  displayOrder    Int         @unique
  description     String?
  
  // Catalog versioning
  catalogYear     String      @default("2024")
  isActive        Boolean     @default(true)
  
  // Requirements
  requiredAdventureCount Int   // e.g., 6 required adventures for Wolf
  electiveAdventureCount Int   // e.g., 1 elective adventure minimum
  
  // Relationships
  adventures      Adventure[]
  
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  
  @@index([catalogYear, isActive])
  @@index([displayOrder])
}
```

---

### 7. Adventure

Mid-level catalog entry under ranks.

**Fields**:
```prisma
model Adventure {
  id              String          @id @default(cuid())
  rankId          String
  rank            Rank            @relation(fields: [rankId], references: [id], onDelete: Cascade)
  name            String          // "Call of the Wild", "Paws on the Path"
  description     String?
  classification  AdventureType   // REQUIRED, ELECTIVE, SPECIAL_ELECTIVE
  displayOrder    Int             // Within the rank
  
  // Catalog versioning
  catalogYear     String          @default("2024")
  isActive        Boolean         @default(true)
  
  // Relationships
  requirements    Requirement[]
  progress        RequirementProgress[] // Child-specific progress
  
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  
  @@unique([rankId, name, catalogYear])
  @@index([rankId, classification])
  @@index([catalogYear, isActive])
}

enum AdventureType {
  REQUIRED
  ELECTIVE
  SPECIAL_ELECTIVE
}
```

---

### 8. Requirement

Individual requirement within adventures.

**Fields**:
```prisma
model Requirement {
  id              String      @id @default(cuid())
  adventureId     String
  adventure       Adventure   @relation(fields: [adventureId], references: [id], onDelete: Cascade)
  displayOrder    Int         // 1, 2, 3, ... within adventure
  requirementText String      @db.Text
  
  // Relationships
  progress        RequirementProgress[]
  coveredInEvents ChildAttendance[] // Many-to-many: which events covered this
  
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  
  @@unique([adventureId, displayOrder])
  @@index([adventureId, displayOrder])
}
```

---

## Advancement Tracking Entities

### 9. RequirementProgress

Child-specific requirement completion and approval tracking.

**Fields**:
```prisma
model RequirementProgress {
  id              String                  @id @default(cuid())
  childScoutId    String
  childScout      ChildScout              @relation(fields: [childScoutId], references: [id], onDelete: Cascade)
  requirementId   String
  requirement     Requirement             @relation(fields: [requirementId], references: [id], onDelete: Restrict)
  
  // Completion tracking
  completedAt     DateTime                @default(now())
  completedBy     String                  // volunteerId or parentId
  completionType  CompletionType          @default(MEETING)
  notes           String?                 // Optional context/evidence
  
  // Scoutbook reconciliation
  scoutbookStatus ReconciliationStatus    @default(PENDING)
  scoutbookEnteredAt DateTime?
  scoutbookEnteredBy String?
  scoutbookNotes  String?
  
  // Conflict resolution
  version         Int                     @default(1)  // Optimistic locking
  
  @@unique([childScoutId, requirementId])
  @@index([childScoutId])
  @@index([requirementId])
  @@index([scoutbookStatus, completedAt])
}

enum CompletionType {
  MEETING         // Completed during den meeting
  PARENT_SUBMIT   // Parent marked complete outside meeting
  LEADER_AWARD    // Leader awarded directly
}

enum ReconciliationStatus {
  PENDING         // Needs manual Scoutbook entry
  ENTERED         // Confirmed entered in Scoutbook
  VERIFIED        // Optional: Double-checked in Scoutbook
}
```

**Validation Rules**:
- notes: Max 1000 characters
- scoutbookEnteredBy, scoutbookEnteredAt: Required when scoutbookStatus = ENTERED or VERIFIED

**State Transitions**:
- (none) → PENDING (on completion)
- PENDING → ENTERED (leader marks reconciled in Scoutbook)
- ENTERED → VERIFIED (optional double-check)

**Conflict Resolution**:
- version field increments on each update
- updateMany with version in WHERE clause
- On conflict (count = 0), fetch current state and return 409 error

---

## Award Fulfillment Entities

### 10. AwardItem

Child-specific award fulfillment tracking from eligibility through distribution.

**Fields**:
```prisma
model AwardItem {
  id              String          @id @default(cuid())
  childScoutId    String
  childScout      ChildScout      @relation(fields: [childScoutId], references: [id], onDelete: Cascade)
  adventureId     String?
  adventure       Adventure?      @relation(fields: [adventureId], references: [id], onDelete: Restrict)
  specialAwardId  String?
  specialAward    SpecialAward?   @relation(fields: [specialAwardId], references: [id], onDelete: Restrict)
  currentState    AwardState      @default(ELIGIBLE)
  quantityNeeded  Int             @default(1)
  
  // Relationships
  history         AwardStateHistory[]
  
  // Audit
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  
  @@index([currentState])
  @@index([childScoutId, currentState])
  @@index([adventureId])
  @@index([specialAwardId])
}

enum AwardState {
  ELIGIBLE        // Meets requirements
  APPROVED        // Leader approved for purchase
  PURCHASED       // Item ordered/bought
  DISTRIBUTED     // Given to child
  RECONCILED      // Entered in Scoutbook
}
```

**State Transitions**:
```
ELIGIBLE → APPROVED → PURCHASED → DISTRIBUTED → RECONCILED
         ↓           ↓           ↓
      (rollback)  (rollback)  (rollback)
```

**Validation Rules**:
- Exactly one of adventureId or specialAwardId must be set (XOR constraint)
- Valid transitions enforced by service layer

---

### 11. AwardStateHistory

Audit trail for award state transitions.

**Fields**:
```prisma
model AwardStateHistory {
  id              String      @id @default(cuid())
  awardItemId     String
  awardItem       AwardItem   @relation(fields: [awardItemId], references: [id], onDelete: Cascade)
  fromState       AwardState?
  toState         AwardState
  changedBy       String      // volunteerId
  changedAt       DateTime    @default(now())
  notes           String?     // Why transition occurred
  batchId         String?     // For batch operations (mass purchases)
  
  @@index([awardItemId, changedAt])
  @@index([batchId])
}
```

---

### 12. SpecialAward

Catalog of non-standard awards (not tied to adventure completion).

**Fields**:
```prisma
model SpecialAward {
  id              String      @id @default(cuid())
  name            String      @unique
  description     String?
  category        String      // "Character", "Scouting Skills", "Community Service"
  requiresNomination Boolean  @default(false)
  
  // Relationships
  awardItems      AwardItem[]
  
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  deletedAt       DateTime?
  
  @@index([category])
}
```

---

### 13. InventoryItem

Stock tracking by rank and award name.

**Fields**:
```prisma
model InventoryItem {
  id              String      @id @default(cuid())
  itemName        String      // "Tiger Badge", "Wolf Belt Loop"
  rankLevel       RankLevel?  // NULL for rank-agnostic items
  onHandQuantity  Int         @default(0)
  reorderPoint    Int?        // Trigger reorder alert
  unitCost        Decimal?    @db.Decimal(8, 2)
  
  // Relationships
  adjustments     InventoryAdjustment[]
  
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  deletedAt       DateTime?
  
  @@unique([itemName, rankLevel])
  @@index([onHandQuantity, reorderPoint])
}

model InventoryAdjustment {
  id              String          @id @default(cuid())
  inventoryItemId String
  inventoryItem   InventoryItem   @relation(fields: [inventoryItemId], references: [id])
  quantityChange  Int             // Positive = addition, negative = consumption
  reason          String          // "Purchase", "Distribution", "Correction", "Loss"
  adjustedBy      String          // volunteerId
  adjustedAt      DateTime        @default(now())
  notes           String?
  linkedBatchId   String?         // Link to AwardStateHistory batchId
  
  @@index([inventoryItemId, adjustedAt])
}
```

---

## Supporting Entities

### 14. ScoutbookPrompt

Category-specific prompts for parent Scoutbook hour entry.

**Fields**:
```prisma
model ScoutbookPrompt {
  id              String          @id @default(cuid())
  childScoutId    String
  childScout      ChildScout      @relation(fields: [childScoutId], references: [id], onDelete: Cascade)
  eventId         String
  event           Event           @relation(fields: [eventId], references: [id], onDelete: Cascade)
  category        PromptCategory
  categoryData    Json            // { nights: 2, location: "Camp X" } for CAMPING
  status          PromptStatus    @default(PENDING)
  
  // Lifecycle tracking
  generatedAt     DateTime        @default(now())
  sentAt          DateTime?
  acknowledgedAt  DateTime?
  dismissedAt     DateTime?
  reminderSentAt  DateTime?
  
  @@index([childScoutId, status])
  @@index([category, status])
  @@index([eventId])
}

enum PromptCategory {
  CAMPING
  HIKING
  SERVICE
}

enum PromptStatus {
  PENDING         // Generated but not yet sent
  SENT            // Notification sent to parent
  ACKNOWLEDGED    // Parent marked as submitted in Scoutbook
  DISMISSED       // Parent dismissed prompt
}
```

**Category Data Schemas** (TypeScript):
```typescript
interface CampingData {
  nights: number;
  location?: string;
  dates?: { start: string; end: string };
}

interface HikingData {
  miles: number;
  location?: string;
  date?: string;
}

interface ServiceData {
  hours: number;
  project?: string;
  date?: string;
}
```

---

### 15. Event (Extensions)

Extensions to existing Event model for child attendance support.

**New Fields**:
```prisma
model Event {
  // ... existing fields
  
  // Child attendance
  childAttendance     ChildAttendance[]
  scoutbookPrompts    ScoutbookPrompt[]
  
  // Post-meeting notifications
  sendPostMeetingNotification Boolean @default(true)  // Override den default
  
  // Hours prompt defaults (for event closeout)
  hourPromptDefaults  Json?  // { camping: { nights: 1 }, hiking: { miles: 3 } }
}
```

---

### 16. VolunteerRole & VolunteerToRole (Extensions)

Extensions for multi-scope role assignments.

**New Fields**:
```prisma
model VolunteerRole {
  // ... existing fields
  
  scopeType       RoleScope   @default(DEN)  // NEW: Authorization scope level
  
  @@index([scopeType, rankLevel])
}

enum RoleScope {
  PACK            // Can access all ranks and dens
  RANK            // Can access all dens within a rank (requires rankLevel)
  DEN             // Can access specific den only (requires rankLevel + denNumber)
}

model VolunteerToRole {
  // ... existing fields
  
  denNumber       Int?        // NEW: Required if role.scopeType = DEN
  
  @@unique([volunteerId, roleId, denNumber])  // UPDATED: Allow same role, different dens
  @@index([denNumber])
}
```

---

### 17. Bulk Operation Entities

Tracking for import and rollover batch operations.

**CSV Import**:
```prisma
model ImportBatch {
  id              String        @id @default(cuid())
  fileName        String
  uploadedBy      String
  uploadedAt      DateTime      @default(now())
  status          ImportStatus  @default(PROCESSING)
  totalRows       Int           @default(0)
  successRows     Int           @default(0)
  failedRows      Int           @default(0)
  errors          ImportError[]
  
  @@index([uploadedAt, status])
}

model ImportError {
  id              String        @id @default(cuid())
  batchId         String
  batch           ImportBatch   @relation(fields: [batchId], references: [id])
  rowNumber       Int
  fieldName       String?
  errorMessage    String
  rowData         Json          // Original CSV row
  
  @@index([batchId, rowNumber])
}

enum ImportStatus {
  PROCESSING
  COMPLETED
  COMPLETED_WITH_ERRORS
  FAILED
}
```

**Annual Rollover**:
```prisma
model RolloverBatch {
  id              String          @id @default(cuid())
  executedBy      String
  executedAt      DateTime        @default(now())
  targetYear      String          // "2025"
  status          RolloverStatus  @default(PROCESSING)
  densProcessed   Int             @default(0)  // Count of dens advanced to next rank
  childrenProcessed Int           @default(0)
  childrenFailed    Int           @default(0)
  isDryRun        Boolean         @default(false)
  errors          RolloverError[]
  
  @@index([targetYear, status])
}

model RolloverError {
  id              String        @id @default(cuid())
  batchId         String
  childRankId     String
  errorMessage    String
  
  @@index([batchId])
}

enum RolloverStatus {
  PROCESSING
  COMPLETED
  COMPLETED_WITH_ERRORS
  ROLLED_BACK
}
```

---

### 18. Den Chief Support

Den Chief entities for Scouting America youth leadership assignments.

**DenChief** (youth leader profile):
```prisma
model DenChief {
  id              String      @id @default(cuid())
  email           String      @unique
  firstName       String
  lastName        String
  passwordHash    String
  authTier        AuthTier    @default(DEN_CHIEF)
  isActive        Boolean     @default(true)
  
  // External system references
  scoutbookId     String?     @unique
  
  // Relationships
  denAssignments  DenChiefAssignment[]
  eventVolunteering EventVolunteerSignup[]  // Can volunteer at events
  
  // Timestamps
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  deletedAt       DateTime?   // Soft delete
  
  @@index([email])
  @@index([scoutbookId])
  @@index([isActive])
}
```

**DenChiefAssignment** (time-bounded assignment to dens):
```prisma
model DenChiefAssignment {
  id              String      @id @default(cuid())
  denChiefId      String
  denChief        DenChief    @relation(fields: [denChiefId], references: [id])
  denId           String
  den             Den         @relation(fields: [denId], references: [id])
  
  // Temporal tracking
  validFrom       DateTime    @default(now())
  validTo         DateTime?   // NULL = currently assigned
  
  // Audit trail
  assignedBy      String      // volunteerId (admin or den leader)
  notes           String?
  
  createdAt       DateTime    @default(now())
  
  @@index([denChiefId, validTo])  // Optimize "current assignments" queries
  @@index([denId, validTo])       // Optimize "den's current chiefs" queries
  @@index([validFrom, validTo])   // Range queries
}
```

**AuthTier Extension**:
```prisma
enum AuthTier {
  PARENT          // Tier 1: Parent/guardian volunteer
  LEADER          // Tier 2: Den leader or committee role
  ADMIN           // Tier 3: Site admin
  DEN_CHIEF       // Tier 4: Youth leader (Scouts BSA youth assigned to help with den)
}
```

**Validation Rules**:
- DenChief email: Must be unique across all DenChief records
- validFrom: Cannot be in future
- validTo: If set, must be after validFrom
- Overlap prevention: One den chief can have multiple concurrent den assignments
- One den can have multiple concurrent den chiefs

**Permissions (DEN_CHIEF tier)**:
- **CAN**: View den roster, view den events, volunteer for den/pack events, receive event notifications
- **CANNOT**: Mark attendance, enter advancement progress, manage roster, edit events

**Business Logic**:
- When ending assignment, set validTo = now
- Assignment typically lasts 6 months or full scout year
- Pack admins and den leaders can assign den chiefs
- Historical assignments preserved for reporting

---

## Indexes & Performance

**Critical Indexes** (beyond those shown in individual entities):

```prisma
// RequirementProgress: unresolved items dashboard
@@index([scoutbookStatus, completedAt])

// AwardItem: fulfillment workflow queries
@@index([currentState, updatedAt])

// ChildAttendance: event rosters
@@index([eventId, attendanceStatus])

// DenMembership: current roster queries
@@index([denId, validTo])  // WHERE validTo IS NULL = current members
```

**Query Optimization Notes**:
- `WHERE validTo IS NULL` highly efficient with proper index
- Use `include` strategically to avoid N+1 queries
- Consider request-scoped caching for authorization checks
- Catalog data (Rank/Adventure/Requirement) should be cached as it changes infrequently

---

## Data Integrity Constraints

1. **Child can have only one current den membership** (validTo = NULL unique per child)
2. **Adventure award OR special award, not both** (XOR constraint on AwardItem)
3. **RequirementProgress unique per child + requirement** (prevents duplicates)
4. **Version field conflict resolution** (optimistic locking)
5. **Temporal data integrity**: validTo >= validFrom
6. **Soft deletes**: Use deletedAt, never hard delete child or audit records

---

## Migration Strategy

**Phase 1**: Core entities (ChildScout, Den, DenMembership, ParentChildLink)  
**Phase 2**: Catalog entities (Rank, Adventure, Requirement) + seed data  
**Phase 3**: Tracking entities (RequirementProgress, ChildAttendance)  
**Phase 4**: Award fulfillment (AwardItem, AwardStateHistory, SpecialAward, InventoryItem)  
**Phase 5**: Supporting features (ScoutbookPrompt, bulk operation tracking)  
**Phase 6**: Den Chief support (DenChief, DenChiefAssignment)

Each phase delivers independently testable functionality.
