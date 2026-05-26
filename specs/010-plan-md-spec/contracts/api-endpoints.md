# API Endpoint Contracts

**Feature**: Den Advancement Operations Workspace  
**Version**: 1.0  
**Base Path**: `/api/v1`

## Overview

This document defines all REST API endpoints for the den advancement operations feature. All endpoints follow NestJS conventions with:
- JWT authentication required (except where noted)
- Role-based authorization via guards
- Standard error responses (400, 401, 403, 404, 409, 500)
- Zod validation for request bodies
- OpenAPI/Swagger documentation

## Authentication & Authorization

**Authorization Tiers**:
- `PARENT`: Can access linked children only
- `LEADER`: Can access assigned den(s) or rank(s)
- `ADMIN`: Can access all pack data

**Scopes** (for LEADER tier):
- `PACK`: Access all children pack-wide
- `RANK`: Access all children in assigned rank(s)
- `DEN`: Access children in assigned den(s) only

---

## Child Scout Management

### POST /child-scouts
**Create child record (Admin only)**

**Authorization**: `ADMIN`

**Request Body**:
```typescript
{
  firstName: string;        // 1-50 chars
  lastName: string;         // 1-50 chars
  currentRank: RankLevel;   // LION, TIGER, WOLF, BEAR, WEBELOS, AOL
  scoutbookId?: string;     // Optional external ID
}
```

**Response**: `201 Created`
```typescript
{
  id: string;
  firstName: string;
  lastName: string;
  currentRank: RankLevel;
  isActive: true;
  createdAt: string;
  createdBy: string;
}
```

**Errors**:
- `400`: Invalid request body (validation errors)
- `401`: Not authenticated
- `403`: Not admin tier

---

### GET /child-scouts
**List accessible child scouts**

**Authorization**: `PARENT` (linked children), `LEADER` (scoped), `ADMIN` (all)

**Query Parameters**:
```typescript
{
  rankLevel?: RankLevel;    // Filter by rank
  denId?: string;           // Filter by current den
  isActive?: boolean;       // Default: true
  page?: number;            // Default: 1
  limit?: number;           // Default: 50, max: 100
}
```

**Response**: `200 OK`
```typescript
{
  data: Array<{
    id: string;
    firstName: string;
    lastName: string;
    currentRank: RankLevel;
    isActive: boolean;
    currentDen?: {
      id: string;
      name: string;
      denNumber: number;
    };
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

### GET /child-scouts/:id
**Get child scout details**

**Authorization**: Access check (parent must be linked, leader must have scope)

**Response**: `200 OK`
```typescript
{
  id: string;
  firstName: string;
  lastName: string;
  currentRank: RankLevel;
  isActive: boolean;
  scoutbookId?: string;
  currentDen?: {
    id: string;
    name: string;
    denNumber: number;
    rankLevel: RankLevel;
  };
  parentLinks: Array<{
    id: string;
    parentName: string;
    parentEmail: string;
    relationshipType: string;
    status: LinkStatus;
  }>;
  createdAt: string;
  updatedAt: string;
}
```

**Errors**:
- `403`: No access to this child
- `404`: Child not found

---

### PATCH /child-scouts/:id
**Update child scout (Admin or parent with link)**

**Authorization**: `ADMIN` or parent with approved link

**Request Body** (all fields optional):
```typescript
{
  firstName?: string;
  lastName?: string;
  currentRank?: RankLevel;
}
```

**Response**: `200 OK` (same as GET /child-scouts/:id)

---

### GET /child-scouts/:id/advancement-progress
**Get child's advancement progress for current rank**

**Authorization**: Access check

**Response**: `200 OK`
```typescript
{
  childScout: {
    id: string;
    name: string;
    currentRank: RankLevel;
  };
  rankProgress: {
    rankLevel: RankLevel;
    requiredAdventuresNeeded: number;
    requiredAdventuresCompleted: number;
    electiveAdventuresNeeded: number;
    electiveAdventuresCompleted: number;
    isRankEligible: boolean;
  };
  adventures: Array<{
    id: string;
    name: string;
    classification: AdventureType;
    totalRequirements: number;
    completedRequirements: number;
    percentComplete: number;
    isComplete: boolean;
    requirements: Array<{
      id: string;
      displayOrder: number;
      requirementText: string;
      isCompleted: boolean;
      completedAt?: string;
      completedBy?: string;
      completionType?: CompletionType;
      scoutbookStatus?: ReconciliationStatus;
    }>;
  }>;
}
```

---

## Den Management

### GET /dens
**List dens**

**Authorization**: `LEADER` or `ADMIN`

**Query Parameters**:
```typescript
{
  rankLevel?: RankLevel;
  isActive?: boolean;
}
```

**Response**: `200 OK`
```typescript
{
  data: Array<{
    id: string;
    name: string;
    denNumber: number;
    rankLevel: RankLevel;
    isActive: boolean;
    currentMemberCount: number;
    leaders: Array<{
      id: string;
      name: string;
      role: string;
    }>;
  }>;
}
```

---

### POST /dens
**Create den (Admin only)**

**Authorization**: `ADMIN`

**Request Body**:
```typescript
{
  name: string;           // "Den 3 - Tigers"
  denNumber: number;      // 1, 2, 3, etc.
  rankLevel: RankLevel;   // Cannot be PACK_WIDE
}
```

**Response**: `201 Created`
```typescript
{
  id: string;
  name: string;
  denNumber: number;
  rankLevel: RankLevel;
  isActive: true;
  createdAt: string;
}
```

**Errors**:
- `400`: Invalid request body
- `409`: Den number already in use by an active den

**Note**: Den numbers can be reused after a den is deleted. Common pattern: AOL Den 2 closes in spring, number becomes available for new Lion Den 2 in fall.

---

### DELETE /dens/:id
**Mark den as inactive (soft delete)**

**Description**: Marks a den as inactive. Used after consolidating dens or when a den is no longer needed. All historical data and membership records are preserved.

**Authorization**: `ADMIN`

**Response**: `200 OK`
```typescript
{
  id: string;
  name: string;
  denNumber: number;
  rankLevel: RankLevel;
  isActive: false;
  deletedAt: string;
}
```

**Errors**:
- `400`: Den still has active members (must transfer all children first)
- `404`: Den not found

**Note**: To prevent accidental data loss, dens with active members cannot be deleted. Transfer children to another den first using `POST /dens/batch-assign`. After deletion, the den number becomes available for reuse (e.g., AOL Den 2 closes, number can be assigned to new Lion Den 2).

---

### GET /dens/:id/roster
**Get current den roster**

**Authorization**: Leader with scope or Admin

**Response**: `200 OK`
```typescript
{
  den: {
    id: string;
    name: string;
    denNumber: number;
    rankLevel: RankLevel;
  };
  members: Array<{
    id: string;
    firstName: string;
    lastName: string;
    memberSince: string;  // validFrom date
    parents: Array<{
      name: string;
      email: string;
      relationshipType: string;
    }>;
  }>;
}
```

---

### POST /dens/:id/members
**Assign child to den**

**Authorization**: Leader with scope or Admin

**Request Body**:
```typescript
{
  childScoutId: string;
  effectiveDate?: string;  // ISO 8601, default: now
  reason?: string;         // "Promotion", "New Scout", etc.
}
```

**Response**: `201 Created`
```typescript
{
  id: string;
  denId: string;
  childScoutId: string;
  validFrom: string;
  validTo: null;
  assignedBy: string;
  reason: string;
}
```

**Errors**:
- `409`: Child already assigned to another current den

---

### DELETE /dens/:id/members/:childScoutId
**Remove child from den (close membership)**

**Authorization**: Leader with scope or Admin

**Response**: `200 OK`
```typescript
{
  id: string;
  validFrom: string;
  validTo: string;  // Set to current time
  reason: string;
}
```

---

### POST /dens/transfer-child
**Transfer child from one den to another (atomic operation)**

**Description**: Closes membership in current den and assigns to new den in single transaction. Useful for den restructures and splits.

**Authorization**: Admin

**Request Body**:
```typescript
{
  childScoutId: string;
  fromDenId: string;      // Current den
  toDenId: string;        // New den
  effectiveDate?: string; // ISO 8601, default: now
  reason: string;         // Required: "Den Split", "Den Restructure", "Balancing", etc.
}
```

**Response**: `200 OK`
```typescript
{
  oldMembership: {
    id: string;
    denId: string;
    validFrom: string;
    validTo: string;  // Closed at effectiveDate
  };
  newMembership: {
    id: string;
    denId: string;
    validFrom: string;
    validTo: null;
    reason: string;
  };
}
```

**Errors**:
- `400`: Child not currently in fromDenId
- `409`: Child already in toDenId

---

### POST /dens/batch-assign
**Assign multiple children to dens (bulk operation for den splits)**

**Description**: Efficiently handles den splits by reassigning multiple children in single transaction.

**Authorization**: Admin

**Request Body**:
```typescript
{
  assignments: Array<{
    childScoutId: string;
    fromDenId: string;  // Current den (or null for new scouts)
    toDenId: string;    // New den
  }>;
  effectiveDate?: string; // ISO 8601, default: now
  reason: string;         // "Den Split", "Den Restructure", etc.
}
```

**Response**: `200 OK`
```typescript
{
  successful: number;
  failed: number;
  results: Array<{
    childScoutId: string;
    status: "success" | "error";
    error?: string;
    oldMembership?: { denId: string; validTo: string; };
    newMembership?: { denId: string; validFrom: string; };
  }>;
}
```

---

## Parent-Child Linking

### POST /parent-child-links/request
**Parent requests link to child**

**Authorization**: `PARENT` tier

**Request Body**:
```typescript
{
  childScoutId: string;
  relationshipType?: string;  // "mother", "father", "guardian"
}
```

**Response**: `201 Created` (or `200 OK` if pending request already exists - idempotent)
```typescript
{
  id: string;
  parentId: string;
  childScoutId: string;
  status: "PENDING";
  relationshipType: string;
  requestedAt: string;
}
```

**Errors**:
- `404`: Child not found
- `409`: Link already approved

---

### GET /parent-child-links/pending
**Get pending link requests (Leader/Admin dashboard)**

**Authorization**: `LEADER` or `ADMIN`

**Query Parameters**:
```typescript
{
  denId?: string;  // Filter by den
}
```

**Response**: `200 OK`
```typescript
{
  data: Array<{
    id: string;
    parent: {
      id: string;
      name: string;
      email: string;
    };
    childScout: {
      id: string;
      firstName: string;
      lastName: string;
      currentRank: RankLevel;
      denId?: string;
      denName?: string;
    };
    relationshipType: string;
    requestedAt: string;
  }>;
}
```

---

### POST /parent-child-links/:id/approve
**Approve link request**

**Authorization**: `LEADER` with scope or `ADMIN`

**Response**: `200 OK`
```typescript
{
  id: string;
  status: "APPROVED";
  processedAt: string;
  processedBy: string;
}
```

**Errors**:
- `404`: Link request not found
- `409`: Link already processed

---

### POST /parent-child-links/:id/reject
**Reject link request**

**Authorization**: `LEADER` with scope or `ADMIN`

**Request Body**:
```typescript
{
  reason: string;  // Required explanation
}
```

**Response**: `200 OK`
```typescript
{
  id: string;
  status: "REJECTED";
  rejectionReason: string;
  processedAt: string;
  processedBy: string;
}
```

---

## Event & Attendance

### PATCH /events/:id/child-attendance
**Record child attendance for event**

**Authorization**: `LEADER` with scope or `ADMIN`

**Request Body**:
```typescript
{
  attendance: Array<{
    childScoutId: string;
    attendanceStatus: AttendanceStatus;  // PRESENT, ABSENT, EXCUSED, LATE
    notes?: string;
    coveredRequirementIds?: string[];    // Requirements introduced during event
  }>;
}
```

**Response**: `200 OK`
```typescript
{
  eventId: string;
  recordedAt: string;
  recordedBy: string;
  attendanceRecords: Array<{
    childScoutId: string;
    attendanceStatus: AttendanceStatus;
    coveredRequirements: number;
  }>;
}
```

---

### GET /events/:id/child-attendance
**Get child attendance for event**

**Authorization**: `LEADER` with scope or `ADMIN`

**Response**: `200 OK`
```typescript
{
  event: {
    id: string;
    title: string;
    eventDate: string;
    rankLevel: RankLevel;
  };
  attendance: Array<{
    childScout: {
      id: string;
      firstName: string;
      lastName: string;
    };
    attendanceStatus: AttendanceStatus;
    coveredRequirements: Array<{
      id: string;
      adventureName: string;
      requirementText: string;
    }>;
    recordedAt: string;
    recordedBy: string;
  }>;
}
```

---

## Advancement & Requirements

### POST /requirements/:id/complete
**Mark requirement complete (Parent or Leader)**

**Authorization**: `PARENT` (for linked child) or `LEADER` with scope

**Request Body**:
```typescript
{
  childScoutId: string;
  completionType: CompletionType;  // MEETING, PARENT_SUBMIT, LEADER_AWARD
  notes?: string;
}
```

**Response**: `201 Created`
```typescript
{
  id: string;
  requirementId: string;
  childScoutId: string;
  completedAt: string;
  completedBy: string;
  completionType: CompletionType;
  scoutbookStatus: "PENDING";
  version: 1;
}
```

---

### GET /requirements/pending-reconciliation
**Get requirements pending Scoutbook entry (Leader dashboard)**

**Authorization**: `LEADER` or `ADMIN`

**Query Parameters**:
```typescript
{
  denId?: string;
  olderThanDays?: number;  // e.g., 7 for items older than 1 week
  completionType?: CompletionType;
}
```

**Response**: `200 OK`
```typescript
{
  data: Array<{
    id: string;
    childScout: {
      id: string;
      name: string;
      currentRank: RankLevel;
      denName: string;
    };
    requirement: {
      id: string;
      adventureName: string;
      requirementText: string;
    };
    completedAt: string;
    completionType: CompletionType;
    daysSinceCompletion: number;
  }>;
}
```

---

### PATCH /requirement-progress/:id/reconcile
**Mark requirement entered in Scoutbook**

**Authorization**: `LEADER` with scope or `ADMIN`

**Request Body**:
```typescript
{
  notes?: string;
  version: number;  // Optimistic locking
}
```

**Response**: `200 OK`
```typescript
{
  id: string;
  scoutbookStatus: "ENTERED";
  scoutbookEnteredAt: string;
  scoutbookEnteredBy: string;
  version: number;  // Incremented
}
```

**Errors**:
- `409`: Conflict (already processed) with current state in response body

---

## Awards & Fulfillment

### GET /awards
**List award items by state**

**Authorization**: `LEADER` or `ADMIN`

**Query Parameters**:
```typescript
{
  state?: AwardState;           // ELIGIBLE, APPROVED, PURCHASED, DISTRIBUTED, RECONCILED
  childScoutId?: string;
  adventureId?: string;
  denId?: string;
}
```

**Response**: `200 OK`
```typescript
{
  data: Array<{
    id: string;
    childScout: {
      id: string;
      name: string;
      currentRank: RankLevel;
    };
    award: {
      type: "ADVENTURE" | "SPECIAL";
      name: string;
    };
    currentState: AwardState;
    quantityNeeded: number;
    createdAt: string;
    updatedAt: string;
  }>;
}
```

---

### POST /awards/:id/transition
**Transition award to next state**

**Authorization**: `LEADER` with scope or `ADMIN`

**Request Body**:
```typescript
{
  toState: AwardState;  // Must be valid transition
  notes?: string;
  batchId?: string;     // For batch operations
}
```

**Response**: `200 OK`
```typescript
{
  id: string;
  currentState: AwardState;
  history: Array<{
    fromState: AwardState;
    toState: AwardState;
    changedAt: string;
    changedBy: string;
    notes: string;
  }>;
}
```

**Errors**:
- `400`: Invalid state transition

---

### POST /awards/batch-transition
**Transition multiple awards at once**

**Authorization**: `LEADER` or `ADMIN`

**Request Body**:
```typescript
{
  awardIds: string[];
  toState: AwardState;
  notes?: string;
}
```

**Response**: `200 OK`
```typescript
{
  batchId: string;
  successCount: number;
  failedCount: number;
  results: Array<{
    awardId: string;
    success: boolean;
    error?: string;
  }>;
}
```

---

## Scoutbook Hours Prompts

### POST /events/:id/generate-prompts
**Generate hours prompts after event closeout**

**Authorization**: `LEADER` with scope or `ADMIN`

**Request Body**:
```typescript
{
  categoryPrompts: Array<{
    category: PromptCategory;  // CAMPING, HIKING, SERVICE
    categoryData: CampingData | HikingData | ServiceData;
    childScoutIds: string[];   // Which attendees get this prompt
  }>;
}
```

**Response**: `201 Created`
```typescript
{
  eventId: string;
  promptsGenerated: number;
  prompts: Array<{
    id: string;
    childScoutId: string;
    category: PromptCategory;
    categoryData: any;
    status: "PENDING";
  }>;
}
```

---

### GET /scoutbook-prompts
**Get prompts for parent**

**Authorization**: `PARENT` (own children) or `LEADER`/`ADMIN`

**Query Parameters**:
```typescript
{
  childScoutId?: string;
  status?: PromptStatus;
  category?: PromptCategory;
}
```

**Response**: `200 OK`
```typescript
{
  data: Array<{
    id: string;
    childScout: {
      id: string;
      name: string;
    };
    event: {
      id: string;
      title: string;
      eventDate: string;
    };
    category: PromptCategory;
    categoryData: any;
    message: string;  // Generated from strategy
    status: PromptStatus;
    generatedAt: string;
    sentAt?: string;
  }>;
}
```

---

### PATCH /scoutbook-prompts/:id/acknowledge
**Parent acknowledges prompt (marked as submitted in Scoutbook)**

**Authorization**: `PARENT` (for linked child)

**Response**: `200 OK`
```typescript
{
  id: string;
  status: "ACKNOWLEDGED";
  acknowledgedAt: string;
}
```

---

## Bulk Operations

### POST /child-scouts/import
**Import child records from CSV (Admin only)**

**Authorization**: `ADMIN`

**Request**: `multipart/form-data`
```typescript
{
  file: File;  // CSV file
}
```

**Response**: `202 Accepted`
```typescript
{
  batchId: string;
  message: "Import processing started";
}
```

---

### GET /imports/:batchId
**Get import batch status**

**Authorization**: `ADMIN`

**Response**: `200 OK`
```typescript
{
  id: string;
  fileName: string;
  status: ImportStatus;
  uploadedAt: string;
  uploadedBy: string;
  totalRows: number;
  successRows: number;
  failedRows: number;
  errors: Array<{
    rowNumber: number;
    fieldName: string;
    errorMessage: string;
    rowData: any;
  }>;
}
```

---

### POST /rollover/preview
**Preview annual rank rollover (dry run)**

**Description**: Shows what will happen during rollover, including den rank promotions and child rank advancements.

**Authorization**: `ADMIN`

**Request Body**:
```typescript
{
  targetYear: string;  // "2025"
}
```

**Response**: `200 OK`
```typescript
{
  previewSummary: {
    totalDens: number;
    denChanges: Array<{
      denNumber: number;
      denName: string;
      currentRank: RankLevel;
      nextRank: RankLevel | "CLOSED";  // AOL dens close out (no further advancement)
    }>;
    totalChildren: number;
    byRank: Array<{
      currentRank: RankLevel;
      count: number;
      nextRank: RankLevel | "GRADUATED";
    }>;
    graduatingScouts: number;
  };
}
```

---

### POST /rollover/execute
**Execute annual rank rollover**

**Description**: Advances all active dens to next rank level, then advances all children to next rank. Den numbers persist (e.g., "Den 8" remains "Den 8" as it advances from Tigers → Wolves).

**Authorization**: `ADMIN`

**Request Body**:
```typescript
{
  targetYear: string;
  isDryRun?: boolean;  // If true, rollback all transactions
}
```

**Response**: `202 Accepted`
```typescript
{
  batchId: string;
  message: "Rollover processing started";
}
```

---

### GET /rollover/:batchId
**Get rollover batch status**

**Authorization**: `ADMIN`

**Response**: `200 OK`
```typescript
{
  id: string;
  targetYear: string;
  status: RolloverStatus;
  executedAt: string;
  executedBy: string;
  densProcessed: number;
  childrenProcessed: number;
  childrenFailed: number;
  errors: Array<{
    childRankId: string;
    childName: string;
    errorMessage: string;
  }>;
}
```

---

## Den Chief Management

### POST /den-chiefs
**Create Den Chief profile (Admin only)**

**Authorization**: `ADMIN`

**Request Body**:
```typescript
{
  email: string;
  firstName: string;        // 1-50 chars
  lastName: string;         // 1-50 chars
  password: string;         // Initial password (must change on first login)
  scoutbookId?: string;     // Optional external ID
}
```

**Response**: `201 Created`
```typescript
{
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  scoutbookId?: string;
  isActive: true;
  authTier: "DEN_CHIEF";
  createdAt: string;
}
```

**Errors**:
- `400`: Invalid request body
- `409`: Email already in use

---

### GET /den-chiefs
**List all Den Chiefs**

**Authorization**: `LEADER` (scoped), `ADMIN` (all)

**Query Parameters**:
```typescript
{
  isActive?: boolean;       // Default: true
  denId?: string;           // Filter by currently assigned den
  page?: number;            // Default: 1
  limit?: number;           // Default: 50
}
```

**Response**: `200 OK`
```typescript
{
  data: Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    scoutbookId?: string;
    isActive: boolean;
    currentAssignments: Array<{
      denId: string;
      denName: string;
      denNumber: number;
      rankLevel: RankLevel;
      assignedSince: string;
    }>;
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

### GET /den-chiefs/:id
**Get Den Chief details**

**Authorization**: `DEN_CHIEF` (self), `LEADER` (scoped), `ADMIN`

**Response**: `200 OK`
```typescript
{
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  scoutbookId?: string;
  isActive: boolean;
  authTier: "DEN_CHIEF";
  currentAssignments: Array<{
    assignmentId: string;
    denId: string;
    denName: string;
    denNumber: number;
    rankLevel: RankLevel;
    validFrom: string;
    notes?: string;
  }>;
  assignmentHistory: Array<{
    assignmentId: string;
    denName: string;
    denNumber: number;
    rankLevel: RankLevel;
    validFrom: string;
    validTo: string;
  }>;
  createdAt: string;
}
```

---

### PATCH /den-chiefs/:id
**Update Den Chief profile**

**Authorization**: `DEN_CHIEF` (self, email only), `ADMIN` (all fields)

**Request Body**:
```typescript
{
  email?: string;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;       // Admin only
}
```

**Response**: `200 OK`
```typescript
{
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  updatedAt: string;
}
```

---

### POST /den-chiefs/:id/assignments
**Assign Den Chief to a den**

**Authorization**: `LEADER` (for assigned dens), `ADMIN`

**Request Body**:
```typescript
{
  denId: string;
  validFrom?: string;       // ISO date, default: now
  notes?: string;           // "Assisting with Tigers for spring semester"
}
```

**Response**: `201 Created`
```typescript
{
  assignmentId: string;
  denChiefId: string;
  denId: string;
  denName: string;
  denNumber: number;
  rankLevel: RankLevel;
  validFrom: string;
  validTo: null;
  notes?: string;
  createdAt: string;
}
```

**Errors**:
- `404`: Den Chief or Den not found
- `400`: Den Chief already assigned to this den (has active assignment)

---

### PATCH /den-chief-assignments/:id/end
**End a Den Chief assignment**

**Authorization**: `LEADER` (for assigned dens), `ADMIN`

**Request Body**:
```typescript
{
  validTo?: string;         // ISO date, default: now
}
```

**Response**: `200 OK`
```typescript
{
  assignmentId: string;
  denChiefId: string;
  denId: string;
  validFrom: string;
  validTo: string;
  notes?: string;
}
```

---

### GET /dens/:id/den-chiefs
**Get Den Chiefs currently assigned to a den**

**Authorization**: `DEN_CHIEF` (assigned dens), `LEADER` (scoped), `ADMIN`

**Response**: `200 OK`
```typescript
{
  denId: string;
  denName: string;
  denNumber: number;
  rankLevel: RankLevel;
  denChiefs: Array<{
    denChiefId: string;
    firstName: string;
    lastName: string;
    email: string;
    scoutbookId?: string;
    assignedSince: string;
    notes?: string;
  }>;
}
```

---

## Standard Error Responses

### 400 Bad Request
```typescript
{
  statusCode: 400;
  message: string | string[];  // Validation errors
  error: "Bad Request";
}
```

### 401 Unauthorized
```typescript
{
  statusCode: 401;
  message: "Unauthorized";
}
```

### 403 Forbidden
```typescript
{
  statusCode: 403;
  message: "Forbidden" | "No access to this resource";
}
```

### 404 Not Found
```typescript
{
  statusCode: 404;
  message: "Resource not found";
}
```

### 409 Conflict
```typescript
{
  statusCode: 409;
  message: "Conflict message";
  currentState?: any;  // For optimistic locking conflicts
}
```

### 500 Internal Server Error
```typescript
{
  statusCode: 500;
  message: "Internal server error";
}
```

---

## Contract Testing Requirements

**All endpoints MUST have**:
1. OpenAPI/Swagger documentation
2. Zod request validation schemas
3. Contract tests verifying request/response shapes
4. Integration tests for happy paths and error cases
5. Authorization tests for each tier/scope combination

**BDD Test Format**:
```typescript
describe('POST /child-scouts', () => {
  it('should create child scout when admin authenticated', async () => {
    // Given: admin user authenticated
    // When: POST with valid body
    // Then: 201 Created with child scout data
  });
  
  it('should return 403 when non-admin attempts creation', async () => {
    // Given: PARENT tier user authenticated
    // When: POST with valid body
    // Then: 403 Forbidden
  });
});
```

---

## Total Endpoint Count

**By Domain**:
- Child Scout Management: 5 endpoints
- Den Management: 6 endpoints
- Parent-Child Linking: 4 endpoints
- Event & Attendance: 2 endpoints
- Advancement & Requirements: 3 endpoints
- Awards & Fulfillment: 3 endpoints
- Scoutbook Prompts: 3 endpoints
- Bulk Operations: 5 endpoints

**Total**: ~31 new endpoints (+ extensions to existing /events endpoints)
