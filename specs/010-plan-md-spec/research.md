# Research: Den Advancement Operations Workspace

**Feature**: `010-plan-md-spec` | **Date**: 2026-05-22  
**Purpose**: Resolve technical unknowns and establish best practices before design phase

## Research Tasks

This document consolidates research findings for key technical decisions required by the Den Advancement Operations feature.

### 1. Den Membership History Pattern

**Question**: How should we model time-bounded child-to-den assignments with historical tracking?

**Research Needed**:
- Prisma patterns for temporal data (valid_from/valid_to vs separate history table)
- Query performance implications for "current members" vs "all historical members"
- Best practices for handling overlap prevention and gap detection

**Findings**:

**Decision**: Use **Temporal Columns Pattern** (valid_from/valid_to in single table)

**Rationale**:
- Single source of truth - all data in one table reduces complexity
- Efficient "current members" queries with `WHERE validTo IS NULL` + proper index
- Standard SQL temporal pattern (SQL:2011 standard), Prisma-native
- Direct foreign key relationships preserved
- Complete audit trail without triggers

**Schema Structure**:
```prisma
model DenMembership {
  id          String    @id @default(cuid())
  denId       String
  childRankId String
  validFrom   DateTime  @default(now())
  validTo     DateTime? // NULL = current membership
  assignedBy  String?   // audit trail
  reason      String?   // "Promotion", "New Scout", etc.
  
  @@index([childRankId, validTo]) // Optimize current membership queries
  @@index([denId, validTo])       // Optimize den roster queries
}
```

**Overlap Prevention**: Application-level validation in service layer - find existing `validTo IS NULL`, close it, then create new membership.

**Alternative Considered**: Separate history table - rejected due to data duplication, complexity, and lack of native Prisma trigger support.

**Reference**: See [docs/temporal-hierarchical-patterns-research.md](../../docs/temporal-hierarchical-patterns-research.md) for full details, query examples, and implementation checklist.

---

### 2. Parent-Child Linking Workflow

**Question**: What are best practices for approval-based parent-child linking with privacy controls?

**Research Needed**:
- Common patterns for request/approval workflows in web apps
- Security considerations for child record access
- Audit trail requirements for sensitive relationship data

**Findings**:

**Decision**: Junction table with status tracking and full audit trail

**Rationale**:
- Explicit state management (PENDING/APPROVED/REJECTED/REVOKED)
- Full audit trail (who requested, who approved, when)
- Supports multiple parents per child
- Unique constraint prevents duplicate pending requests
- Idempotent request handling (returns existing pending request)

**Schema Structure**:
```prisma
model ParentChildLink {
  id              String      @id @default(cuid())
  parentId        String
  childId         String
  status          LinkStatus  @default(PENDING)
  relationshipType String?    // "mother", "father", "guardian"
  requestedAt     DateTime    @default(now())
  requestedBy     String
  processedAt     DateTime?
  processedBy     String?
  rejectionReason String?
  
  @@unique([parentId, childId, status]) // Prevent duplicate pending
  @@index([status, requestedAt])
}

enum LinkStatus {
  PENDING
  APPROVED
  REJECTED
  REVOKED
}
```

**Authorization Pattern**: Guard checks for approved links before granting data access. Service method `hasAccessToChild(parentId, childId)` returns boolean.

**Workflow**: Parent requests → Leader receives notification → Leader approves/rejects → Parent receives confirmation → Access granted

**Reference**: See [docs/workflow-patterns-research.md](../../docs/workflow-patterns-research.md) for service methods, guards, and controller examples.

---

### 3. Scoutbook Reconciliation Tracking

**Question**: How should we track reconciliation state with external systems (Scoutbook)?

**Research Needed**:
- Patterns for "pending external action" vs "confirmed in external system" states
- Handling of stale/unresolved reconciliation items
- Best practices for manual reconciliation workflows without API integration

**Findings**:

**Decision**: Add reconciliation fields directly to affected records (awards, requirements)

**Rationale**:
- Keeps reconciliation state with the data it tracks (single source of truth)
- Simple queries for "unresolved items"
- No separate reconciliation table to keep in sync
- Supports reminder generation and dashboard views

**Schema Pattern**:
```prisma
model RequirementProgress {
  id                  String    @id @default(cuid())
  childRankId         String
  requirementId       String
  completedAt         DateTime
  // Reconciliation fields
  scoutbookStatus     ReconciliationStatus @default(PENDING)
  scoutbookEnteredAt  DateTime?
  scoutbookEnteredBy  String?
  scoutbookNotes      String?
  
  @@index([scoutbookStatus, completedAt])
}

enum ReconciliationStatus {
  PENDING    // Needs manual Scoutbook entry
  ENTERED    // Confirmed entered in Scoutbook
  VERIFIED   // Optional: Double-checked in Scoutbook
}
```

**Dashboard Queries**: 
- Unresolved items: `WHERE scoutbookStatus = 'PENDING'`
- Aging items: `WHERE scoutbookStatus = 'PENDING' AND completedAt < date_sub(now(), INTERVAL 7 DAY)`

**Automation**: Scheduled job generates reminders for items older than 7 days, escalation at 30 days

**Reference**: See [docs/workflow-patterns-research.md](../../docs/workflow-patterns-research.md) for complete patterns and service methods.

---

### 4. Multi-Scope Role Assignments

**Question**: What are best practices for pack/rank/den scoped role assignments?

**Research Needed**:
- Authorization patterns for hierarchical scopes (pack > rank > den)
- Supporting multiple simultaneous scope assignments per user
- Query patterns for "all children this user can access"

**Findings**:

**Decision**: Extend existing VolunteerRole model with scope type and den number

**Rationale**:
- Hierarchical scopes: PACK > RANK > DEN (higher scope inherits lower access)
- Explicit scope fields enable efficient queries without computed joins
- Supports multiple simultaneous role assignments (Den Leader for Den 3 AND Advancement Chair for pack)
- Standard RBAC pattern used by AWS IAM and Kubernetes

**Schema Changes**:
```prisma
model VolunteerRole {
  // ... existing fields
  scopeType       RoleScope   @default(DEN)
  // rankLevel already exists for rank-specific roles
}

enum RoleScope {
  PACK      // Can access all ranks and dens
  RANK      // Can access all dens within a rank
  DEN       // Can access specific den only
}

model VolunteerToRole {
  // ... existing fields
  denNumber       Int?  // Required if role.scopeType = DEN
  
  @@unique([volunteerId, roleId, denNumber])
}
```

**Authorization Service**:
- `getAccessScope(volunteerId)`: Returns { canAccessPack, accessibleRanks[], accessibleDens[] }
- `getAccessibleChildren(volunteerId)`: Builds WHERE clause based on scope
- `canAccessChild(volunteerId, childId)`: Boolean check for individual records

**Guard Implementation**: `ScopeGuard` with decorators `@RequirePackAccess()` and `@RequireChildAccess('childId')`

**Performance**: Request-scoped caching to avoid N+1 authorization queries

**Reference**: See [docs/advanced-patterns-research.md](../../docs/advanced-patterns-research.md) for complete authorization service and guard implementation.

---

### 5. Award Fulfillment State Machine

**Question**: What are best practices for modeling award fulfillment lifecycle states?

**Research Needed**:
- State machine patterns in Prisma/TypeScript
- State transition validation and audit trails
- Handling terminal states and rollback scenarios

**Findings**:

**Decision**: Enum-based states with separate history table for audit trail

**Rationale**:
- Fast indexed queries on current state
- Separate history table maintains complete audit trail without bloating main table
- TypeScript validation map enforces valid transitions
- Standard e-commerce fulfillment pattern (Shopify, Stripe)
- Supports batch operations and rollbacks

**Schema Structure**:
```prisma
model AwardItem {
  id              String      @id @default(cuid())
  childRankId     String
  adventureId     String?     // NULL for special awards
  specialAwardId  String?
  currentState    AwardState  @default(ELIGIBLE)
  quantityNeeded  Int         @default(1)
  
  history         AwardStateHistory[]
  
  @@index([currentState])
  @@index([childRankId, currentState])
}

model AwardStateHistory {
  id              String      @id @default(cuid())
  awardItemId     String
  fromState       AwardState?
  toState         AwardState
  changedBy       String      // volunteerId
  changedAt       DateTime    @default(now())
  notes           String?
  batchId         String?     // For batch operations
  
  @@index([awardItemId, changedAt])
}

enum AwardState {
  ELIGIBLE        // Meets requirements
  APPROVED        // Leader approved for purchase
  PURCHASED       // Item ordered/bought
  DISTRIBUTED     // Given to child
  RECONCILED      // Entered in Scoutbook
}
```

**State Transition Validation**:
```typescript
const VALID_TRANSITIONS: Record<AwardState, AwardState[]> = {
  ELIGIBLE: ['APPROVED'],
  APPROVED: ['PURCHASED', 'ELIGIBLE'],
  PURCHASED: ['DISTRIBUTED', 'APPROVED'],
  DISTRIBUTED: ['RECONCILED', 'PURCHASED'],
  RECONCILED: [], // Terminal state
};
```

**Service Methods**: `transitionState()` validates transitions, creates history record, updates current state in single transaction.

**Batch Operations**: Multiple awards share same `batchId` in history for mass purchases/distributions.

**Reference**: See [docs/advanced-patterns-research.md](../../docs/advanced-patterns-research.md) for complete service implementation and rollback patterns.

---

### 6. Adventure/Requirement Catalog Structure

**Question**: How should we model hierarchical adventure and requirement catalogs?

**Research Needed**:
- Patterns for rank → adventure → requirement hierarchy
- Supporting required/elective/special classifications
- Versioning catalogs across program years

**Findings**:

**Decision**: Three-table hierarchy with catalog year versioning

**Rationale**:
- Queryable at any level (all Wolf required adventures, all requirements for specific adventure)
- Type-safe with Prisma's generated types
- Efficient progress tracking via foreign keys
- Standard pattern for curriculum/education management systems
- Simple year-based versioning sufficient for BSA annual updates

**Schema Structure**:
```prisma
model Rank {
  id            String      @id @default(cuid())
  rankLevel     RankLevel   @unique
  displayName   String
  displayOrder  Int         @unique
  catalogYear   String      @default("2024")
  isActive      Boolean     @default(true)
  adventures    Adventure[]
  
  @@index([catalogYear, isActive])
}

model Adventure {
  id              String          @id @default(cuid())
  rankId          String
  name            String
  classification  AdventureType   // REQUIRED, ELECTIVE, SPECIAL_ELECTIVE
  displayOrder    Int
  catalogYear     String          @default("2024")
  isActive        Boolean         @default(true)
  requirements    Requirement[]
  
  @@unique([rankId, name, catalogYear])
  @@index([rankId, classification])
}

enum AdventureType {
  REQUIRED
  ELECTIVE
  SPECIAL_ELECTIVE
}

model Requirement {
  id              String      @id @default(cuid())
  adventureId     String
  displayOrder    Int
  requirementText String      @db.Text
  
  @@unique([adventureId, displayOrder])
  @@index([adventureId, displayOrder])
}
```

**Nested Creates**: Prisma supports creating entire hierarchy in single operation for seeding BSA requirements.

**Versioning**: `catalogYear` + `isActive` fields track annual BSA updates. Query by: `WHERE catalogYear = '2025' AND isActive = true`

**Performance**: Nested includes (Rank → Adventure → Requirement) efficient with proper indexes. Consider caching catalog data as it changes infrequently.

**Reference**: See [docs/temporal-hierarchical-patterns-research.md](../../docs/temporal-hierarchical-patterns-research.md) for query examples and progress tracking patterns.

---

### 7. Bulk CSV Import Patterns

**Question**: What are best practices for Scoutbook roster CSV import with error handling?

**Research Needed**:
- NestJS patterns for file upload and parsing
- Row-level error tracking and partial success handling
- Transaction management for bulk operations

**Findings**:

**Decision**: Streaming CSV parser with per-row transactions and detailed error tracking

**Rationale**:
- Streaming (`csv-parse` library) handles large files without memory issues
- Per-row transactions enable partial success (some succeed, others fail)
- Detailed error tracking provides actionable feedback to admins
- Idempotent imports (re-running same file updates existing records)
- Batch audit trail for compliance and debugging

**Schema Structure**:
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
  rowData         Json          // Original CSV row for debugging
  
  @@index([batchId, rowNumber])
}

enum ImportStatus {
  PROCESSING
  COMPLETED
  COMPLETED_WITH_ERRORS
  FAILED
}
```

**Implementation Pattern**:
```typescript
import { parse } from 'csv-parse';
import * as fs from 'fs';

async function processImport(file: Express.Multer.File, userId: string) {
  const batch = await createBatch(file.originalname, userId);
  
  const parser = fs.createReadStream(file.path)
    .pipe(parse({ columns: true, skip_empty_lines: true }));
  
  let rowNum = 1;
  for await (const row of parser) {
    try {
      await processRow(row, batch.id);  // Individual transaction
      batch.successRows++;
    } catch (error) {
      await recordError(batch.id, rowNum, error, row);
      batch.failedRows++;
    }
    rowNum++;
  }
  
  await updateBatchStatus(batch.id);
  return batch;
}
```

**Validation**: Zod schemas validate each row before database operations.

**Idempotency**: Use email or external ID as unique key - create if not exists, update if exists.

**Error Summary**: Admin sees summary ("82 of 100 rows imported, 18 errors") with downloadable error report.

**Reference**: See [docs/bulk-operations-research.md](../../docs/bulk-operations-research.md) for complete controller, service, and validation implementation.

---

### 8. Concurrent Update Conflict Resolution

**Question**: How should we implement first-write-wins for concurrent reconciliation updates?

**Research Needed**:
- Optimistic locking patterns in Prisma
- Version field or timestamp-based conflict detection
- User-friendly error messages for conflicts

**Findings**:

**Decision**: Optimistic locking with integer version field

**Rationale**:
- Simple and reliable - increments on each update
- Prisma-native - use version in WHERE clause
- Database-agnostic (works in SQLite and PostgreSQL)
- Client receives current state on conflict for resync
- Standard pattern for distributed systems

**Schema Addition**:
```prisma
model RequirementProgress {
  // ... existing fields
  version         Int         @default(1)  // Increments on each update
}
```

**Service Method Pattern**:
```typescript
async function markReconciled(
  progressId: string,
  expectedVersion: number,
  userId: string
) {
  const result = await prisma.requirementProgress.updateMany({
    where: {
      id: progressId,
      version: expectedVersion,  // Optimistic lock check
    },
    data: {
      scoutbookStatus: 'ENTERED',
      scoutbookEnteredBy: userId,
      scoutbookEnteredAt: new Date(),
      version: { increment: 1 },
    },
  });
  
  if (result.count === 0) {
    // Conflict! Fetch and return current state
    const current = await prisma.requirementProgress.findUnique({
      where: { id: progressId },
    });
    throw new ConflictException({
      message: 'Item already processed by another user',
      currentState: current,
    });
  }
  
  return result;
}
```

**Client Handling**: On 409 Conflict, display "Already processed" message with current state details.

**Testing**: Use `Promise.all()` to simulate true concurrent updates in integration tests.

**Reference**: See [docs/workflow-patterns-research.md](../../docs/workflow-patterns-research.md) for complete implementation and testing strategies.

---

### 9. Category-Specific Prompt System

**Question**: How should we implement configurable category-specific prompts (Camping/Hiking/Service)?

**Research Needed**:
- Template or strategy pattern for category-specific logic
- Configuration-driven vs hardcoded category handling
- Extensibility for future categories

**Findings**:

**Decision**: Strategy pattern with JSON field for flexible category data

**Rationale**:
- TypeScript strategy classes provide type safety for category-specific logic
- JSON field stores category-specific data without schema changes for each category
- Event templates provide defaults that leaders can override
- Easy to add new categories (add interface + strategy class, no migration)
- Separates concerns (category logic from prompt infrastructure)

**Schema Structure**:
```prisma
model ScoutbookPrompt {
  id              String        @id @default(cuid())
  childRankId     String
  eventId         String
  category        PromptCategory
  categoryData    Json          // { nights: 2, location: "Camp X" } for camping
  status          PromptStatus  @default(PENDING)
  sentAt          DateTime?
  acknowledgedAt  DateTime?
  
  @@index([childRankId, status])
  @@index([category, status])
}

enum PromptCategory {
  CAMPING
  HIKING
  SERVICE
}

enum PromptStatus {
  PENDING
  SENT
  ACKNOWLEDGED
  DISMISSED
}

model EventTemplate {
  id              String        @id @default(cuid())
  eventType       String
  promptDefaults  Json?         // { camping: { nights: 1 }, hiking: { miles: 3 } }
}
```

**Strategy Pattern**:
```typescript
interface PromptStrategy {
  validate(data: unknown): boolean;
  generateMessage(data: unknown, childName: string): string;
}

class CampingPromptStrategy implements PromptStrategy {
  validate(data: unknown): data is { nights: number; location?: string } {
    // Type guard
  }
  
  generateMessage(data: { nights: number }, childName: string) {
    return `Please log ${data.nights} camping nights for ${childName} in Scoutbook.`;
  }
}

const PROMPT_STRATEGIES: Record<PromptCategory, PromptStrategy> = {
  CAMPING: new CampingPromptStrategy(),
  HIKING: new HikingPromptStrategy(),
  SERVICE: new ServicePromptStrategy(),
};
```

**Workflow**: Event closeout → Leader reviews suggested values → Adjusts if needed → Prompts generated → Parents notified → Parents submit in Scoutbook → Mark acknowledged

**Extensibility**: Add new category by creating interface + strategy class, adding enum value, no database migration needed.

**Reference**: See [docs/advanced-patterns-research.md](../../docs/advanced-patterns-research.md) for complete strategy implementation and type guards.

---

### 10. Annual Rank Rollover

**Question**: What are best practices for bulk annual rank rollover with historical preservation?

**Research Needed**:
- Prisma transaction patterns for bulk updates
- Preserving historical data while advancing ranks
- Handling edge cases (transfers, inactive members)

**Findings**:

**Decision**: Per-child atomic transactions with full rollback capability

**Rationale**:
- Atomic per-child operations ensure consistency (all or nothing per child)
- Historical data preserved by marking old records inactive (never delete)
- Preview/dry-run capability lets admins verify before committing
- Comprehensive rollback mechanism for error recovery
- Handles rank progression rules (LION → TIGER ... → AOL → Graduated)

**Schema Structure**:
```prisma
model RolloverBatch {
  id              String          @id @default(cuid())
  executedBy      String
  executedAt      DateTime        @default(now())
  targetYear      String          // "2025"
  status          RolloverStatus  @default(PROCESSING)
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

**Rank Progression Logic**:
```typescript
const RANK_PROGRESSION: Record<RankLevel, RankLevel | 'GRADUATED'> = {
  LION: 'TIGER',
  TIGER: 'WOLF',
  WOLF: 'BEAR',
  BEAR: 'WEBELOS',
  WEBELOS: 'AOL',
  AOL: 'GRADUATED',  // Mark inactive
};
```

**Implementation Pattern**:
```typescript
async function executeRollover(isDryRun = false) {
  const batch = await createRolloverBatch();
  
  // Phase 1: Advance dens to next rank
  const dens = await getAllActiveDens();
  for (const den of dens) {
    const nextRank = RANK_PROGRESSION[den.rankLevel];
    if (nextRank !== 'GRADUATED') {
      await updateDenRank(den.id, nextRank);
    } else {
      // AOL den: Close out (no further rank advancement)
      await markDenInactive(den.id);
    }
  }
  
  // Phase 2: Advance children to next rank
  const children = await getAllActiveChildren();
  
  for (const child of children) {
    try {
      await prisma.$transaction(async (tx) => {
        // 1. Mark old rank advancement inactive
        await markAdvancementInactive(child.id, tx);
        
        // 2. Create new rank assignment
        const nextRank = RANK_PROGRESSION[child.rankLevel];
        if (nextRank === 'GRADUATED') {
          await markChildInactive(child.id, tx);
        } else {
          await createNewRankAssignment(child.id, nextRank, tx);
        }
        
        // 3. Preserve unfinished adventures (don't auto-award)
        // 4. Log rollover action
        
        if (isDryRun) throw new DryRunException();  // Rollback
      });
      
      batch.childrenProcessed++;
    } catch (error) {
      if (!(error instanceof DryRunException)) {
        await recordRolloverError(batch.id, child.id, error);
        batch.childrenFailed++;
      }
    }
  }
  
  return batch;
}
```

**Den Rank Advancement**: Den numbers are persistent pack-wide identifiers (e.g., "Den 8"). During rollover, the den's `rankLevel` field updates to reflect the next rank (TIGER → WOLF → BEAR → WEBELOS → AOL). AOL dens close out during rollover (marked inactive) as AOL is the final Cub Scout rank before crossing over to Scouts BSA. Den membership history (via DenMembership temporal columns) preserves which children were in "Den 8" during its Tiger year vs. Wolf year.

**Historical Preservation**: Never delete old records. Mark `isActive = false` on old advancement records. New rank starts fresh.

**Rollback**: If critical error occurs, use `RolloverBatch.id` to find all affected records and reverse changes.

**Testing**: Create test fixtures for each rank progression scenario. Verify historical data intact after rollover.

**Reference**: See [docs/bulk-operations-research.md](../../docs/bulk-operations-research.md) for complete service implementation, edge case handling, and rollback procedures.

---

## Summary

**Status**: Research Complete - All technical unknowns resolved

**Key Decisions Made**:

1. **Den Membership History**: Temporal columns pattern (validFrom/validTo) in single table for historical tracking
2. **Parent-Child Linking**: Junction table with approval workflow (PENDING/APPROVED/REJECTED/REVOKED states)
3. **Scoutbook Reconciliation**: Add reconciliation fields directly to affected records (awards, requirements)
4. **Multi-Scope Roles**: Extend VolunteerRole with scopeType enum (PACK/RANK/DEN) and denNumber field
5. **Award State Machine**: Enum-based states with separate AwardStateHistory table for audit trail
6. **Adventure Catalog**: Three-table hierarchy (Rank → Adventure → Requirement) with year-based versioning
7. **CSV Import**: Streaming parser with per-row transactions and detailed error tracking
8. **Conflict Resolution**: Optimistic locking with integer version field
9. **Category Prompts**: Strategy pattern with JSON field for flexible category-specific data
10. **Annual Rollover**: Per-child atomic transactions with preview/dry-run and rollback capability

**Alternatives Considered**:

- **Separate history tables** (for memberships) - Rejected: Data duplication, complexity, no native Prisma trigger support
- **Separate current/history tables** (for memberships) - Rejected: More complex queries spanning current + historical data
- **JSON/denormalized catalog** - Rejected: Cannot query/filter at adventure/requirement level, loses referential integrity
- **Timestamp-based conflict detection** - Rejected: Less reliable than version field, clock synchronization issues
- **Configuration-driven prompts** (vs strategy pattern) - Rejected: Less type-safe, harder to extend with complex logic
- **Batch transactions for rollover** - Rejected: All-or-nothing approach too risky for 100+ children, poor error recovery

**Risks Identified & Mitigations**:

1. **Risk**: Performance degradation with temporal queries on large datasets
   - **Mitigation**: Strategic indexes on (childRankId, validTo) and (denId, validTo); consider PostgreSQL partial indexes in production

2. **Risk**: Schema complexity with 40+ new tables could challenge maintainability
   - **Mitigation**: Comprehensive documentation, clear naming conventions, modular service layer organization

3. **Risk**: CSV import memory issues with very large files (1000+ rows)
   - **Mitigation**: Streaming parser (csv-parse) processes rows incrementally; batch size configurable

4. **Risk**: Concurrent updates despite optimistic locking if clients don't handle 409 conflicts
   - **Mitigation**: Client-side conflict resolution UI, comprehensive integration tests, version field validation

5. **Risk**: Annual rollover could corrupt data if interrupted mid-process
   - **Mitigation**: Per-child transactions (partial success), preview/dry-run capability, comprehensive rollback mechanism, audit logs

6. **Risk**: Authorization queries (getAccessibleChildren) could become N+1 performance bottlenecks
   - **Mitigation**: Request-scoped caching, eager loading with Prisma includes, consider materialized views for large datasets

**Technical Dependencies Validated**:
- ✅ NestJS 11.x supports all required patterns (guards, decorators, file upload)
- ✅ Prisma 7.5.0 supports temporal columns, optimistic locking, nested creates, JSON fields
- ✅ csv-parse library mature and maintained for streaming CSV parsing
- ✅ SQLite sufficient for development; PostgreSQL recommended for production scale
- ✅ Existing auth tier system (PARENT/LEADER/ADMIN) integrates cleanly with new scope-based authorization

**Phase 0 Complete** - Ready to proceed to Phase 1: Design & Contracts
