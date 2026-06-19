# Tasks: Den Advancement Operations Workspace

**Feature Branch**: `010-plan-md-spec`  
**Generated**: 2026-05-23

**Input**: Design documents from [spec.md](spec.md), [plan.md](plan.md), [data-model.md](data-model.md), [contracts/](contracts/)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure for den advancement operations

- [X] T001 Review existing codebase patterns in backend/src/ and frontend/src/
- [X] T002 [P] Add new Prisma enums to backend/prisma/schema.prisma (RankLevel, LinkStatus, AttendanceStatus, AdventureType, CompletionType, ReconciliationStatus, AwardState, PromptCategory, PromptStatus, RoleScope, ImportStatus, RolloverStatus)
- [X] T003 [P] Create backend module structure: backend/src/modules/den/, backend/src/modules/child-scout/, backend/src/modules/advancement/, backend/src/modules/awards/
- [X] T004 [P] Create backend service directories: backend/src/services/den/, backend/src/services/child-scout/, backend/src/services/advancement/, backend/src/services/awards/, backend/src/services/hours-prompt/, backend/src/services/role-scope/
- [X] T005 [P] Create frontend component directories: frontend/src/components/den/, frontend/src/components/child/, frontend/src/components/advancement/, frontend/src/components/awards/, frontend/src/components/parent/
- [X] T006 [P] Create frontend page structure: frontend/src/app/dens/, frontend/src/app/children/, frontend/src/app/advancement/, frontend/src/app/awards/, frontend/src/app/parent/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Database Schema & Migrations

- [X] T007 Create ChildScout model in backend/prisma/schema.prisma with all fields from data-model.md
- [X] T008 Create Den model with denNumber uniqueness constraint and temporal support in backend/prisma/schema.prisma
- [X] T009 Create DenMembership model with temporal tracking (validFrom, validTo) in backend/prisma/schema.prisma
- [X] T010 [P] Create DenChief model with auth support in backend/prisma/schema.prisma
- [X] T011 [P] Create DenChiefAssignment model with temporal tracking in backend/prisma/schema.prisma
- [X] T012 [P] Create ParentChildLink model with approval workflow in backend/prisma/schema.prisma
- [X] T013 [P] Create Rank model for catalog versioning in backend/prisma/schema.prisma
- [X] T014 [P] Create Adventure model with classification types in backend/prisma/schema.prisma
- [X] T015 [P] Create Requirement model with display order in backend/prisma/schema.prisma
- [X] T016 Create RequirementProgress model with optimistic locking (version field) in backend/prisma/schema.prisma
- [X] T017 Create ChildAttendance model with many-to-many requirement coverage in backend/prisma/schema.prisma
- [X] T018 [P] Create AwardItem model with state machine tracking in backend/prisma/schema.prisma
- [X] T019 [P] Create AwardStateHistory model for audit trail in backend/prisma/schema.prisma
- [X] T020 [P] Create SpecialAward catalog model in backend/prisma/schema.prisma
- [X] T021 [P] Create InventoryItem and InventoryAdjustment models in backend/prisma/schema.prisma
- [X] T022 [P] Create ScoutbookPrompt model with category-specific JSON data in backend/prisma/schema.prisma
- [X] T023 [P] Create ImportBatch and ImportError models in backend/prisma/schema.prisma
- [X] T024 [P] Create RolloverBatch and RolloverError models in backend/prisma/schema.prisma
- [X] T025 Extend Event model with childAttendance relation and sendPostMeetingNotification field in backend/prisma/schema.prisma
- [X] T026 Extend VolunteerRole model with scopeType (RoleScope enum) in backend/prisma/schema.prisma
- [X] T027 Extend VolunteerToRole model with denNumber field and updated unique constraint in backend/prisma/schema.prisma
- [X] T028 Add all database indexes specified in contracts/db-constraints.md to backend/prisma/schema.prisma
- [X] T029 Create Prisma migration for all new models: npx prisma migrate dev --name add-den-advancement-schema
- [X] T030 Create seed data script for Rank/Adventure/Requirement catalog in backend/prisma/seed.ts

### Core Authorization & Scoping

- [X] T031 Create ScopeGuard base class in backend/src/middleware/scope.guard.ts with role-based access logic
- [X] T032 [P] Create ParentScopeGuard in backend/src/middleware/parent-scope.guard.ts (access to linked children only)
- [X] T033 [P] Create DenLeaderScopeGuard in backend/src/middleware/den-leader-scope.guard.ts (access to assigned dens)
- [X] T034 [P] Create RankScopeGuard in backend/src/middleware/rank-scope.guard.ts (access to assigned rank)
- [X] T035 Create AuthorizationService in backend/src/services/role-scope/authorization.service.ts with scope validation methods
- [X] T036 Add scope validation unit tests in backend/src/services/role-scope/authorization.service.spec.ts

### Shared Services & DTOs

- [X] T037 [P] Create base audit fields Zod schema in backend/src/models/common/audit.dto.ts (completedBy, completedAt, etc.)
- [X] T038 [P] Create ReconciliationStatusDto in backend/src/models/common/reconciliation.dto.ts
- [X] T039 [P] Create StateTransitionValidator utility in backend/src/utils/state-transition.validator.ts
- [X] T040 Create NotificationService extensions for child attendance and advancement events in backend/src/services/notifications/notification.service.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Record Den Meeting Outcomes (Priority: P1) 🎯 MVP

**Goal**: Den leaders can create den-scoped meetings, take Cub Scout attendance, and mark covered requirements for accurate operational records

**Independent Test**: Create a den meeting, mark attendance for multiple Cub Scouts, record covered requirements, and verify child records update without affecting volunteer point credit logic

### Contract Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T041 [P] [US1] Contract test for POST /child-scouts in backend/test/child-scouts.e2e-spec.ts
- [X] T042 [P] [US1] Contract test for GET /child-scouts in backend/test/child-scouts.e2e-spec.ts
- [X] T043 [P] [US1] Contract test for GET /child-scouts/:id in backend/test/child-scouts.e2e-spec.ts
- [X] T044 [P] [US1] Contract test for POST /dens in backend/test/dens.e2e-spec.ts
- [X] T045 [P] [US1] Contract test for GET /dens in backend/test/dens.e2e-spec.ts
- [X] T046 [P] [US1] Contract test for POST /dens/:id/members in backend/test/dens.e2e-spec.ts
- [X] T047 [P] [US1] Contract test for GET /dens/:id/roster in backend/test/dens.e2e-spec.ts
- [X] T048 [P] [US1] Contract test for PATCH /events/:id/child-attendance in backend/test/child-attendance.e2e-spec.ts
- [X] T049 [P] [US1] Contract test for GET /events/:id/child-attendance in backend/test/child-attendance.e2e-spec.ts

### Backend Implementation for User Story 1

#### Child Scout Management

- [X] T050 [P] [US1] Create CreateChildScoutDto in backend/src/models/child-scout/create-child-scout.dto.ts with Zod validation
- [X] T051 [P] [US1] Create ChildScoutResponseDto in backend/src/models/child-scout/child-scout-response.dto.ts
- [X] T052 [P] [US1] Create UpdateChildScoutDto in backend/src/models/child-scout/update-child-scout.dto.ts
- [X] T053 [US1] Create ChildScoutService in backend/src/services/child-scout/child-scout.service.ts with CRUD operations
- [X] T054 [US1] Create ChildScoutController in backend/src/api/child-scout.controller.ts with POST, GET, PATCH endpoints
- [X] T055 [US1] Create ChildScoutModule in backend/src/modules/child-scout.module.ts with DI configuration
- [ ] T056 [US1] Add ChildScoutService unit tests in backend/src/services/child-scout/child-scout.service.spec.ts

#### Den Management

- [X] T057 [P] [US1] Create CreateDenDto in backend/src/models/den/create-den.dto.ts with denNumber validation
- [X] T058 [P] [US1] Create DenResponseDto in backend/src/models/den/den-response.dto.ts
- [X] T059 [P] [US1] Create AssignDenMemberDto in backend/src/models/den/assign-member.dto.ts
- [X] T060 [US1] Create DenService in backend/src/services/den/den.service.ts with den CRUD and membership management
- [X] T061 [US1] Implement den number uniqueness validation in DenService (only one active den per number)
- [X] T062 [US1] Implement temporal membership logic in DenService (close current, create new with validFrom/validTo)
- [X] T063 [US1] Create DenController in backend/src/api/den.controller.ts with POST /dens, GET /dens, POST /dens/:id/members, GET /dens/:id/roster
- [X] T064 [US1] Create DenModule in backend/src/modules/den.module.ts
- [ ] T065 [US1] Add DenService unit tests in backend/src/services/den/den.service.spec.ts

#### Child Attendance

- [X] T066 [P] [US1] Create RecordAttendanceDto in backend/src/models/attendance/record-attendance.dto.ts with attendanceStatus enum
- [X] T067 [P] [US1] Create ChildAttendanceResponseDto in backend/src/models/attendance/attendance-response.dto.ts
- [X] T068 [US1] Create ChildAttendanceService in backend/src/services/child-scout/child-attendance.service.ts
- [X] T069 [US1] Implement covered requirements tracking in ChildAttendanceService (many-to-many with Requirement)
- [X] T070 [US1] Create AttendanceController methods in backend/src/api/child-scout.controller.ts (PATCH /events/:id/child-attendance, GET /events/:id/child-attendance)
- [ ] T071 [US1] Add ChildAttendanceService unit tests in backend/src/services/child-scout/child-attendance.service.spec.ts

#### Integration & Events

- [X] T072 [US1] Extend EventService to support den-scoped events in backend/src/services/events/event.service.ts
- [X] T073 [US1] Add post-meeting notification trigger after attendance recorded in backend/src/services/notifications/notification.service.ts
- [X] T074 [US1] Verify volunteer point logic remains separate from child attendance in backend/src/services/points/points.service.ts

### Frontend Implementation for User Story 1

#### Child Scout Pages & Components

- [X] T075 [P] [US1] Create ChildScoutList component in frontend/src/components/child/ChildScoutList.tsx with filtering by rank/den
- [X] T076 [P] [US1] Create ChildScoutProfile component in frontend/src/components/child/ChildScoutProfile.tsx
- [X] T077 [P] [US1] Create CreateChildScoutForm component in frontend/src/components/child/CreateChildScoutForm.tsx (admin only)
- [X] T078 [US1] Create children list page in frontend/src/app/children/page.tsx
- [X] T079 [US1] Create child detail page in frontend/src/app/children/[id]/page.tsx
- [X] T080 [US1] Create childScoutService API client in frontend/src/services/childScoutService.ts

#### Den Pages & Components

- [X] T081 [P] [US1] Create DenList component in frontend/src/components/den/DenList.tsx
- [X] T082 [P] [US1] Create DenRoster component in frontend/src/components/den/DenRoster.tsx
- [X] T083 [P] [US1] Create CreateDenForm component in frontend/src/components/den/CreateDenForm.tsx (admin only)
- [X] T084 [P] [US1] Create AssignDenMemberForm component in frontend/src/components/den/AssignDenMemberForm.tsx
- [X] T085 [US1] Create dens list page in frontend/src/app/dens/page.tsx
- [X] T086 [US1] Create den roster page in frontend/src/app/dens/[id]/roster/page.tsx
- [X] T087 [US1] Create denService API client in frontend/src/services/denService.ts

#### Attendance Components

- [X] T088 [P] [US1] Create AttendanceForm component in frontend/src/components/den/AttendanceForm.tsx with bulk attendance entry
- [X] T089 [P] [US1] Create CoveredRequirementsSelector component in frontend/src/components/advancement/CoveredRequirementsSelector.tsx
- [X] T090 [US1] Create event attendance page in frontend/src/app/events/[id]/attendance/page.tsx
- [X] T091 [US1] Add attendance recording to event completion flow in frontend/src/app/events/[id]/page.tsx and frontend/src/components/forms/events/CompleteEventDialog.tsx

#### Tests

- [X] T092 [P] [US1] Unit test for ChildScoutList component in frontend/src/components/child/ChildScoutList.test.tsx
- [X] T093 [P] [US1] Unit test for DenRoster component in frontend/src/components/den/DenRoster.test.tsx
- [X] T094 [P] [US1] Unit test for AttendanceForm component in frontend/src/components/den/AttendanceForm.test.tsx
- [X] T095 [US1] Integration test for den meeting flow in frontend/src/test/integration/den-meeting-flow.test.tsx

**Checkpoint**: At this point, User Story 1 should be fully functional - den leaders can create meetings, record attendance, and mark covered requirements

---

## Phase 4: User Story 2 - Parent Completion and Leader Approval (Priority: P2)

**Goal**: Parents can mark requirements completed outside meetings, and leaders can reconcile Scoutbook approvals using reminder queues

**Independent Test**: Link parent-child accounts, submit parent-completed requirements with notes, generate leader reminder items, and record Scoutbook reconciliation outcomes

### Contract Tests for User Story 2

- [X] T096 [P] [US2] Contract test for POST /parent-child-links/request in backend/test/parent-links.e2e-spec.ts
- [X] T097 [P] [US2] Contract test for GET /parent-child-links/pending in backend/test/parent-links.e2e-spec.ts
- [X] T098 [P] [US2] Contract test for POST /parent-child-links/:id/approve in backend/test/parent-links.e2e-spec.ts
- [X] T099 [P] [US2] Contract test for POST /parent-child-links/:id/reject in backend/test/parent-links.e2e-spec.ts
- [X] T100 [P] [US2] Contract test for POST /requirements/:id/complete in backend/test/advancement.e2e-spec.ts
- [X] T101 [P] [US2] Contract test for GET /requirements/pending-reconciliation in backend/test/advancement.e2e-spec.ts
- [X] T102 [P] [US2] Contract test for PATCH /requirement-progress/:id/reconcile in backend/test/advancement.e2e-spec.ts
- [X] T103 [P] [US2] Contract test for GET /child-scouts/:id/advancement-progress in backend/test/advancement.e2e-spec.ts

### Backend Implementation for User Story 2

#### Parent-Child Linking

- [X] T104 [P] [US2] Create RequestLinkDto in backend/src/models/parent-link/request-link.dto.ts
- [X] T105 [P] [US2] Create ParentChildLinkResponseDto in backend/src/models/parent-link/link-response.dto.ts
- [X] T106 [P] [US2] Create ProcessLinkDto in backend/src/models/parent-link/process-link.dto.ts
- [X] T107 [US2] Create ParentChildLinkService in backend/src/services/child-scout/parent-child-link.service.ts with approval workflow
- [X] T108 [US2] Implement duplicate link prevention logic in ParentChildLinkService (unique constraint check)
- [X] T109 [US2] Create ParentChildLinkController in backend/src/api/parent-child-link.controller.ts with POST /request, GET /pending, POST /:id/approve, POST /:id/reject
- [X] T110 [US2] Add ParentChildLinkService unit tests in backend/src/services/child-scout/parent-child-link.service.spec.ts

#### Advancement Catalog

- [X] T111 [P] [US2] Create RankResponseDto in backend/src/models/advancement/rank-response.dto.ts
- [X] T112 [P] [US2] Create AdventureResponseDto in backend/src/models/advancement/adventure-response.dto.ts
- [X] T113 [P] [US2] Create RequirementResponseDto in backend/src/models/advancement/requirement-response.dto.ts
- [X] T114 [US2] Create AdvancementCatalogService in backend/src/services/advancement/catalog.service.ts with rank/adventure/requirement lookups
- [X] T115 [US2] Add catalog caching strategy to AdvancementCatalogService for performance
- [X] T116 [US2] Create AdvancementCatalogController in backend/src/api/advancement-catalog.controller.ts with GET /ranks, GET /adventures, GET /requirements

#### Requirement Progress & Reconciliation

- [X] T117 [P] [US2] Create CompleteRequirementDto in backend/src/models/advancement/complete-requirement.dto.ts with completionType
- [X] T118 [P] [US2] Create RequirementProgressResponseDto in backend/src/models/advancement/progress-response.dto.ts
- [X] T119 [P] [US2] Create ReconcileRequirementDto in backend/src/models/advancement/reconcile-requirement.dto.ts with version field
- [X] T120 [US2] Create RequirementProgressService in backend/src/services/advancement/requirement-progress.service.ts
- [X] T121 [US2] Implement optimistic locking conflict detection in RequirementProgressService using version field
- [X] T122 [US2] Implement first-write-wins logic: updateMany with version in WHERE, check count, return 409 with current state if conflict
- [X] T123 [US2] Create reconciliation queue query in RequirementProgressService (filter by scoutbookStatus=PENDING, denId, age)
- [X] T124 [US2] Create AdvancementProgressService in backend/src/services/advancement/advancement-progress.service.ts for child progress aggregation
- [X] T125 [US2] Implement adventure completion calculation (all requirements completed) in AdvancementProgressService
- [X] T126 [US2] Implement rank eligibility calculation (required + elective thresholds) in AdvancementProgressService
- [X] T127 [US2] Create AdvancementController in backend/src/api/advancement.controller.ts with POST /requirements/:id/complete, GET /pending-reconciliation, PATCH /requirement-progress/:id/reconcile, GET /child-scouts/:id/advancement-progress
- [X] T128 [US2] Create AdvancementModule in backend/src/modules/advancement.module.ts
- [X] T129 [US2] Add RequirementProgressService unit tests in backend/src/services/advancement/requirement-progress.service.spec.ts
- [X] T130 [US2] Add optimistic locking unit tests in backend/src/services/advancement/requirement-progress.service.spec.ts

### Frontend Implementation for User Story 2

#### Parent-Child Linking

- [X] T131 [P] [US2] Create RequestChildLinkForm component in frontend/src/components/parent/RequestChildLinkForm.tsx
- [X] T132 [P] [US2] Create PendingLinksQueue component in frontend/src/components/parent/PendingLinksQueue.tsx (leader view)
- [X] T133 [P] [US2] Create LinkApprovalDialog component in frontend/src/components/parent/LinkApprovalDialog.tsx
- [X] T134 [US2] Create parent-child links page in frontend/src/app/parent/links/page.tsx
- [X] T135 [US2] Create parentLinkService API client in frontend/src/services/parentLinkService.ts

#### Advancement Progress

- [X] T136 [P] [US2] Create AdvancementProgress component in frontend/src/components/advancement/AdvancementProgress.tsx showing rank progress
- [X] T137 [P] [US2] Create AdventureCard component in frontend/src/components/advancement/AdventureCard.tsx with requirement checklist
- [X] T138 [P] [US2] Create CompleteRequirementButton component in frontend/src/components/advancement/CompleteRequirementButton.tsx
- [X] T139 [US2] Create child advancement page in frontend/src/app/children/[id]/advancement/page.tsx
- [X] T140 [US2] Create advancementService API client in frontend/src/services/advancementService.ts

#### Reconciliation Queue

- [X] T141 [P] [US2] Create ReconciliationQueue component in frontend/src/components/advancement/ReconciliationQueue.tsx
- [X] T142 [P] [US2] Create ReconcileRequirementDialog component in frontend/src/components/advancement/ReconcileRequirementDialog.tsx
- [X] T143 [US2] Create leader reconciliation dashboard in frontend/src/app/advancement/reconciliation/page.tsx
- [X] T144 [US2] Add conflict resolution error handling in frontend (show current state from 409 response)

#### Tests

- [X] T145 [P] [US2] Unit test for AdvancementProgress component in frontend/src/components/advancement/AdvancementProgress.test.tsx
- [X] T146 [P] [US2] Unit test for ReconciliationQueue component in frontend/src/components/advancement/ReconciliationQueue.test.tsx
- [X] T147 [US2] Integration test for parent completion flow in frontend/src/test/integration/parent-completion-flow.test.tsx

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - parents can submit completions and leaders can reconcile

---

## Phase 5: User Story 3 - Fulfill and Reconcile Awards (Priority: P3)

**Goal**: Advancement leaders can track approved awards through purchase and distribution, including special awards, with Scoutbook reconciliation

**Independent Test**: Progress award items through approved, purchased, and distributed states, view inventory impact, and mark reconciliation status for Scoutbook entry

### Contract Tests for User Story 3

- [X] T148 [P] [US3] Contract test for GET /awards in backend/test/awards.e2e-spec.ts
- [X] T149 [P] [US3] Contract test for POST /awards/:id/transition in backend/test/awards.e2e-spec.ts
- [X] T150 [P] [US3] Contract test for POST /awards/batch-transition in backend/test/awards.e2e-spec.ts
- [X] T151 [P] [US3] Contract test for GET /inventory in backend/test/awards.e2e-spec.ts
- [X] T152 [P] [US3] Contract test for POST /inventory/adjust in backend/test/awards.e2e-spec.ts
- [X] T153 [P] [US3] Contract test for POST /special-awards in backend/test/awards.e2e-spec.ts

### Backend Implementation for User Story 3

#### Award Fulfillment

- [X] T154 [P] [US3] Create AwardItemResponseDto in backend/src/models/awards/award-item-response.dto.ts
- [X] T155 [P] [US3] Create TransitionAwardDto in backend/src/models/awards/transition-award.dto.ts
- [X] T156 [P] [US3] Create BatchTransitionDto in backend/src/models/awards/batch-transition.dto.ts
- [X] T157 [US3] Create AwardStateTransitionValidator in backend/src/utils/award-state-transition.validator.ts with valid transition map
- [X] T158 [US3] Create AwardFulfillmentService in backend/src/services/awards/award-fulfillment.service.ts
- [X] T159 [US3] Implement award eligibility evaluation in AwardFulfillmentService (check adventure completion + reconciliation status)
- [X] T160 [US3] Implement state transition validation using AwardStateTransitionValidator
- [X] T161 [US3] Implement batch transition operations in AwardFulfillmentService with transaction support
- [X] T162 [US3] Create AwardStateHistory records for audit trail in AwardFulfillmentService
- [X] T163 [US3] Add AwardFulfillmentService unit tests in backend/src/services/awards/award-fulfillment.service.spec.ts

#### Special Awards

- [X] T164 [P] [US3] Create CreateSpecialAwardDto in backend/src/models/awards/create-special-award.dto.ts
- [X] T165 [P] [US3] Create SpecialAwardResponseDto in backend/src/models/awards/special-award-response.dto.ts
- [X] T166 [US3] Create SpecialAwardService in backend/src/services/awards/special-award.service.ts
- [X] T167 [US3] Add SpecialAwardService unit tests in backend/src/services/awards/special-award.service.spec.ts

#### Inventory Management

- [X] T168 [P] [US3] Create InventoryItemResponseDto in backend/src/models/awards/inventory-response.dto.ts
- [X] T169 [P] [US3] Create AdjustInventoryDto in backend/src/models/awards/adjust-inventory.dto.ts
- [X] T170 [US3] Create InventoryService in backend/src/services/awards/inventory.service.ts
- [X] T171 [US3] Implement inventory adjustment with reason tracking in InventoryService
- [X] T172 [US3] Implement reorder point alerting in InventoryService
- [X] T173 [US3] Add InventoryService unit tests in backend/src/services/awards/inventory.service.spec.ts

#### Award Controller & Module

- [X] T174 [US3] Create AwardController in backend/src/api/award.controller.ts with GET /awards, POST /awards/:id/transition, POST /awards/batch-transition, GET /inventory, POST /inventory/adjust, POST /special-awards
- [X] T175 [US3] Add reimbursement form reminder to purchase transition in AwardController
- [X] T176 [US3] Create AwardModule in backend/src/modules/award.module.ts

### Frontend Implementation for User Story 3

#### Award Fulfillment Dashboard

- [X] T177 [P] [US3] Create AwardQueue component in frontend/src/components/awards/AwardQueue.tsx with state filtering
- [X] T178 [P] [US3] Create AwardItemCard component in frontend/src/components/awards/AwardItemCard.tsx
- [X] T179 [P] [US3] Create TransitionAwardDialog component in frontend/src/components/awards/TransitionAwardDialog.tsx
- [X] T180 [P] [US3] Create BatchTransitionDialog component in frontend/src/components/awards/BatchTransitionDialog.tsx
- [X] T181 [US3] Create award fulfillment dashboard in frontend/src/app/awards/page.tsx
- [X] T182 [US3] Create award history page in frontend/src/app/awards/[id]/history/page.tsx
- [X] T183 [US3] Create awardService API client in frontend/src/services/awardService.ts

#### Special Awards

- [X] T184 [P] [US3] Create CreateSpecialAwardForm component in frontend/src/components/awards/CreateSpecialAwardForm.tsx
- [X] T185 [P] [US3] Create SpecialAwardsList component in frontend/src/components/awards/SpecialAwardsList.tsx
- [X] T186 [US3] Create special awards page in frontend/src/app/awards/special/page.tsx

#### Inventory Management

- [X] T187 [P] [US3] Create InventoryList component in frontend/src/components/awards/InventoryList.tsx
- [X] T188 [P] [US3] Create AdjustInventoryDialog component in frontend/src/components/awards/AdjustInventoryDialog.tsx
- [X] T189 [P] [US3] Create ReorderAlerts component in frontend/src/components/awards/ReorderAlerts.tsx
- [X] T190 [US3] Create inventory page in frontend/src/app/awards/inventory/page.tsx

#### Reimbursement Integration

- [X] T191 [US3] Add reimbursement form link reminder when transitioning to PURCHASED state in frontend/src/components/awards/TransitionAwardDialog.tsx

#### Tests

- [X] T192 [P] [US3] Unit test for AwardQueue component in frontend/src/components/awards/AwardQueue.test.tsx
- [X] T193 [P] [US3] Unit test for InventoryList component in frontend/src/components/awards/InventoryList.test.tsx
- [X] T194 [US3] Integration test for award fulfillment flow in frontend/src/test/integration/award-fulfillment-flow.test.tsx

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should all work independently - awards can be tracked through full lifecycle

---

## Phase 6: User Story 5 - Prompt Scoutbook Hour Entry (Priority: P3)

**Goal**: Parents receive category-specific suggested values after events so they can submit official Camping, Hiking, and Service hours in Scoutbook

**Independent Test**: Mark event attendance for a child, trigger category-specific prompts, and verify no authoritative in-app hour totals are created

### Contract Tests for User Story 5

- [X] T195 [P] [US5] Contract test for POST /events/:id/generate-prompts in backend/test/scoutbook-prompts.e2e-spec.ts
- [X] T196 [P] [US5] Contract test for GET /scoutbook-prompts in backend/test/scoutbook-prompts.e2e-spec.ts
- [X] T197 [P] [US5] Contract test for PATCH /scoutbook-prompts/:id/acknowledge in backend/test/scoutbook-prompts.e2e-spec.ts
- [X] T198 [P] [US5] Contract test for PATCH /scoutbook-prompts/:id/dismiss in backend/test/scoutbook-prompts.e2e-spec.ts

### Backend Implementation for User Story 5

#### Hours Prompt Generation

- [X] T199 [P] [US5] Create GeneratePromptsDto in backend/src/models/hours-prompt/generate-prompts.dto.ts with category-specific data schemas
- [X] T200 [P] [US5] Create ScoutbookPromptResponseDto in backend/src/models/hours-prompt/prompt-response.dto.ts
- [X] T201 [P] [US5] Create UpdatePromptDto in backend/src/models/hours-prompt/update-prompt.dto.ts
- [X] T202 [US5] Create ScoutbookPromptService in backend/src/services/hours-prompt/scoutbook-prompt.service.ts
- [X] T203 [US5] Implement category-specific prompt generation using strategy pattern in ScoutbookPromptService
- [X] T204 [US5] Implement event-type default value prefill logic in ScoutbookPromptService
- [X] T205 [US5] Implement reminder notification scheduling in ScoutbookPromptService for unacknowledged prompts
- [X] T206 [US5] Create ScoutbookPromptController in backend/src/api/scoutbook-prompt.controller.ts with POST /events/:id/generate-prompts, GET /scoutbook-prompts, PATCH /:id/acknowledge, PATCH /:id/dismiss
- [X] T207 [US5] Add ScoutbookPromptService unit tests in backend/src/services/hours-prompt/scoutbook-prompt.service.spec.ts

### Frontend Implementation for User Story 5

#### Event Closeout with Prompts

- [X] T208 [P] [US5] Create HoursPromptConfig component in frontend/src/components/den/HoursPromptConfig.tsx for leader event closeout
- [X] T209 [P] [US5] Create CategoryPromptForm component in frontend/src/components/den/CategoryPromptForm.tsx for Camping/Hiking/Service
- [X] T210 [US5] Extend event closeout page with hours prompt configuration in frontend/src/app/events/[id]/closeout/page.tsx

#### Parent Prompt Dashboard

- [X] T211 [P] [US5] Create ParentPromptsList component in frontend/src/components/parent/ParentPromptsList.tsx
- [X] T212 [P] [US5] Create PromptDetailCard component in frontend/src/components/parent/PromptDetailCard.tsx with suggested values
- [X] T213 [P] [US5] Create AcknowledgePromptDialog component in frontend/src/components/parent/AcknowledgePromptDialog.tsx
- [X] T214 [US5] Create parent prompts page in frontend/src/app/parent/scoutbook-prompts/page.tsx
- [X] T215 [US5] Create hoursPromptService API client in frontend/src/services/hoursPromptService.ts

#### Tests

- [X] T216 [P] [US5] Unit test for HoursPromptConfig component in frontend/src/components/den/HoursPromptConfig.test.tsx
- [X] T217 [P] [US5] Unit test for ParentPromptsList component in frontend/src/components/parent/ParentPromptsList.test.tsx
- [X] T218 [US5] Integration test for hours prompt flow in frontend/src/test/integration/hours-prompt-flow.test.tsx

**Checkpoint**: At this point, User Stories 1, 2, 3, AND 5 should all work independently - parents receive category-specific prompts after events

---

## Phase 7: User Story 4 - Role Scope and Privacy Control (Priority: P3)

**Goal**: Pack administrators can manage registered and standing roles with den scope so users can do assigned work without excessive permissions, including Den Chief youth leaders

**Independent Test**: Assign scoped roles, verify access for parent/den leader/pack-level roles, confirm unauthorized records/actions are blocked, and verify Den Chief access patterns

### Contract Tests for User Story 4

- [X] T219 [P] [US4] Contract test for POST /roles/assign-scoped in backend/test/roles.e2e-spec.ts
- [X] T220 [P] [US4] Contract test for GET /roles/assignments in backend/test/roles.e2e-spec.ts
- [X] T221 [P] [US4] Contract test for DELETE /roles/assignments/:id in backend/test/roles.e2e-spec.ts
- [X] T222 [P] [US4] Contract test for POST /den-chiefs in backend/test/den-chiefs.e2e-spec.ts
- [X] T223 [P] [US4] Contract test for GET /den-chiefs in backend/test/den-chiefs.e2e-spec.ts
- [X] T224 [P] [US4] Contract test for POST /den-chiefs/:id/assign-den in backend/test/den-chiefs.e2e-spec.ts
- [X] T225 [P] [US4] Contract test for DELETE /den-chiefs/:id/assignments/:assignmentId in backend/test/den-chiefs.e2e-spec.ts

### Backend Implementation for User Story 4

#### Role Scoping

- [X] T226 [P] [US4] Create AssignScopedRoleDto in backend/src/models/roles/assign-scoped-role.dto.ts with scopeType and denNumber
- [X] T227 [P] [US4] Create ScopedRoleAssignmentResponseDto in backend/src/models/roles/scoped-role-response.dto.ts
- [X] T228 [US4] Extend RoleService to support multi-den assignments in backend/src/services/roles/role.service.ts
- [X] T229 [US4] Implement scopeType validation logic in RoleService (DEN requires denNumber, RANK requires rankLevel, PACK has no restrictions)
- [X] T230 [US4] Update role assignment uniqueness to allow same role on different dens in RoleService
- [ ] T231 [US4] Add scoped role assignment unit tests in backend/src/services/roles/role.service.spec.ts

#### Den Chief Support

- [X] T232 [P] [US4] Create CreateDenChiefDto in backend/src/models/den-chief/create-den-chief.dto.ts
- [X] T233 [P] [US4] Create DenChiefResponseDto in backend/src/models/den-chief/den-chief-response.dto.ts
- [X] T234 [P] [US4] Create AssignDenChiefDto in backend/src/models/den-chief/assign-den-chief.dto.ts with time bounds
- [X] T235 [US4] Create DenChiefService in backend/src/services/den/den-chief.service.ts
- [ ] T236 [US4] Implement DenChief authentication in AuthService (support DEN_CHIEF auth tier) in backend/src/services/auth/auth.service.ts
- [X] T237 [US4] Implement time-bounded assignment logic in DenChiefService (validFrom, validTo)
- [X] T238 [US4] Implement multi-den assignment support in DenChiefService (one Den Chief → many dens)
- [X] T239 [US4] Create DenChiefController in backend/src/api/den-chief.controller.ts with POST /den-chiefs, GET /den-chiefs, POST /:id/assign-den, DELETE /:id/assignments/:assignmentId
- [ ] T240 [US4] Add DenChiefService unit tests in backend/src/services/den/den-chief.service.spec.ts

#### Authorization Guards

- [X] T241 [US4] Update ScopeGuard to include Den Chief scoping logic in backend/src/middleware/scope.guard.ts
- [ ] T242 [US4] Add integration tests for scoped access in backend/test/role-scoping.e2e-spec.ts (parent, den leader, pack admin, Den Chief)
- [ ] T243 [US4] Verify parent can only access linked children in backend/test/role-scoping.e2e-spec.ts
- [ ] T244 [US4] Verify den leader can access assigned dens only in backend/test/role-scoping.e2e-spec.ts
- [ ] T245 [US4] Verify Cubmaster/Committee Chair has pack-wide access in backend/test/role-scoping.e2e-spec.ts
- [ ] T246 [US4] Verify Den Chief has view-only access to assigned dens in backend/test/role-scoping.e2e-spec.ts

### Frontend Implementation for User Story 4

#### Role Management

- [X] T247 [P] [US4] Create ScopedRoleAssignmentForm component in frontend/src/components/roles/ScopedRoleAssignmentForm.tsx
- [X] T248 [P] [US4] Create RoleAssignmentsList component in frontend/src/components/roles/RoleAssignmentsList.tsx with scope display
- [X] T249 [US4] Create role assignments page in frontend/src/app/admin/roles/page.tsx
- [X] T250 [US4] Update roleService API client with scoped assignment methods in frontend/src/services/roleService.ts

#### Den Chief Management

- [X] T251 [P] [US4] Create DenChiefList component in frontend/src/components/den-chief/DenChiefList.tsx
- [X] T252 [P] [US4] Create CreateDenChiefForm component in frontend/src/components/den-chief/CreateDenChiefForm.tsx
- [X] T253 [P] [US4] Create AssignDenChiefDialog component in frontend/src/components/den-chief/AssignDenChiefDialog.tsx with time bounds
- [X] T254 [P] [US4] Create DenChiefProfile component in frontend/src/components/den-chief/DenChiefProfile.tsx
- [X] T255 [US4] Create Den Chiefs list page in frontend/src/app/admin/den-chiefs/page.tsx
- [X] T256 [US4] Create Den Chief profile page in frontend/src/app/admin/den-chiefs/[id]/page.tsx
- [X] T257 [US4] Create denChiefService API client in frontend/src/services/denChiefService.ts

#### Access Control UI

- [X] T258 [US4] Add scope-aware navigation filtering (show only accessible dens) in frontend/src/components/navigation/Navigation.tsx
- [X] T259 [US4] Add access denied error handling in frontend/src/components/common/ErrorBoundary.tsx

#### Tests

- [X] T260 [P] [US4] Unit test for ScopedRoleAssignmentForm component in frontend/src/components/roles/ScopedRoleAssignmentForm.test.tsx
- [X] T261 [P] [US4] Unit test for DenChiefList component in frontend/src/components/den-chief/DenChiefList.test.tsx
- [X] T262 [US4] Integration test for scoped access in frontend/src/test/integration/scoped-access-flow.test.tsx

**Checkpoint**: All user stories should now be independently functional - role-based access controls are enforced throughout

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and production readiness

### Bulk Operations & Admin Tools

- [X] T263 [P] [P] Create CSV import endpoint for ChildScout batch creation in backend/src/api/admin/import.controller.ts
- [X] T264 [P] [P] Create ImportBatchService in backend/src/services/admin/import-batch.service.ts with row-level error tracking
- [X] T265 [P] [P] Create TransferChildDto in backend/src/models/den/transfer-child.dto.ts
- [X] T266 [P] Create transfer-child endpoint in backend/src/api/den.controller.ts (atomic close + assign)
- [X] T267 [P] Create batch-assign endpoint for den splits in backend/src/api/den.controller.ts
- [X] T268 [P] Create annual rollover endpoint in backend/src/api/admin/rollover.controller.ts
- [X] T269 [P] Create RolloverService in backend/src/services/admin/rollover.service.ts with dry-run support
- [X] T270 [P] Implement den rank advancement logic in RolloverService (TIGER→WOLF→BEAR→WEBELOS→AOL)
- [X] T271 [P] Implement AOL den closure logic in RolloverService (mark inactive, preserve history)
- [X] T272 Implement child rank advancement in RolloverService (advance all children regardless of completion)
- [X] T273 Implement unfinished adventure handling in RolloverService (preserve but mark non-awardable)
- [X] T274 [P] Create ImportForm component in frontend/src/components/admin/ImportForm.tsx
- [X] T275 [P] Create RolloverDialog component in frontend/src/components/admin/RolloverDialog.tsx with dry-run preview
- [X] T276 Create admin bulk operations page in frontend/src/app/admin/bulk-operations/page.tsx

### Data Quality & Validation

- [X] T277 [P] [P] Create data quality checks service in backend/src/services/admin/data-quality.service.ts
- [X] T278 [P] Implement duplicate link detection check in data-quality.service.ts
- [X] T279 [P] Implement stale approval detection (requirements older than N days) in data-quality.service.ts
- [X] T280 [P] Implement award reconciliation gap detection in data-quality.service.ts
- [X] T281 [P] Create DataQualityReport component in frontend/src/components/admin/DataQualityReport.tsx
- [X] T282 Create data quality dashboard in frontend/src/app/admin/data-quality/page.tsx

### Documentation

- [X] T283 [P] [P] Update backend README with advancement operations overview in backend/README.md
- [X] T284 [P] [P] Create advancement operations guide in docs/advancement-operations.md
- [X] T285 [P] [P] Create den management guide in docs/den-management.md
- [X] T286 [P] [P] Create award fulfillment guide in docs/award-fulfillment.md
- [X] T287 [P] [P] Update API documentation with new endpoints in docs/api-documentation.md
- [X] T288 [P] Add Den Chief management guide in docs/den-chief-management.md
- [X] T289 [P] Add rollover procedures guide in docs/annual-rollover-procedures.md

### Performance & Optimization

- [X] T290 [P] Add database indexes per contracts/db-constraints.md if not already in migration
- [X] T291 [P] Add query optimization for advancement progress calculations (consider materialized views or caching)
- [ ] T292 [P] Add pagination to large list endpoints (child scouts, awards, reconciliation queue)

### Security & Error Handling

- [X] T293 [P] Review all authorization guards for proper scope enforcement
- [X] T294 [P] Add input sanitization for notes/text fields to prevent XSS
- [X] T295 [P] Add rate limiting for bulk operations endpoints
- [X] T296 Add comprehensive error logging with structured data

### Testing & Validation

- [ ] T297 [P] Add E2E test for den split workflow in backend/test/den-split.e2e-spec.ts
- [ ] T298 [P] Add E2E test for annual rollover in backend/test/rollover.e2e-spec.ts
- [ ] T299 [P] Add E2E test for concurrent reconciliation updates in backend/test/reconciliation-conflicts.e2e-spec.ts
- [ ] T300 [P] Add E2E test for Den Chief event volunteering in backend/test/den-chief-volunteering.e2e-spec.ts
- [ ] T301 Run quickstart.md validation for developer onboarding experience

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-7)**: All depend on Foundational phase completion
  - User Story 1 (Phase 3): Can start after Foundational - No dependencies on other stories
  - User Story 2 (Phase 4): Can start after Foundational - Depends on adventure catalog from US1 for requirement tracking
  - User Story 3 (Phase 5): Can start after Foundational - Depends on RequirementProgress from US2 for award eligibility
  - User Story 5 (Phase 6): Can start after Foundational - Depends on ChildAttendance from US1 for event-based prompts
  - User Story 4 (Phase 7): Can start after Foundational - Cross-cutting (affects all stories)
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

While user stories can start after Foundational, some have data dependencies:

- **User Story 1 (P1)**: Independent - provides child scouts, dens, attendance
- **User Story 2 (P2)**: Uses child scouts from US1, provides requirement progress
- **User Story 3 (P3)**: Uses requirement progress from US2 for award eligibility
- **User Story 5 (P3)**: Uses attendance from US1 for prompt generation
- **User Story 4 (P3)**: Cross-cutting authorization - can be integrated incrementally

**Recommended Order**: US1 → US2 → US3 and US5 in parallel → US4 → Polish

### Within Each User Story

1. Contract tests FIRST (write tests that fail)
2. DTOs and validation schemas (can parallelize by endpoint)
3. Services (core business logic)
4. Controllers (API endpoints)
5. Frontend components (can parallelize by feature area)
6. Integration tests (validate end-to-end flows)

### Parallel Opportunities

**Within Foundational Phase**:
- All Prisma models (T007-T027) can be defined in parallel
- DTOs for different domains can be created in parallel
- Authorization guards can be created in parallel (T032-T034)

**Across User Stories** (after Foundational complete):
- US1 tasks can proceed independently
- US2 can start shortly after US1 provides child scout infrastructure
- US5 can proceed in parallel with US2 once US1 is complete
- US4 can be integrated incrementally alongside other stories

**Within User Stories**:
- Contract tests can all run in parallel (marked [P])
- DTOs can be created in parallel (marked [P])
- Frontend components for different features can be built in parallel (marked [P])

---

## Parallel Example: User Story 1

After Foundational phase completes, launch User Story 1 tests in parallel:

```bash
# All contract tests together:
T041, T042, T043, T044, T045, T046, T047, T048, T049

# After tests written, DTOs in parallel:
T050, T051, T052 (ChildScout DTOs)
T057, T058, T059 (Den DTOs)
T066, T067 (Attendance DTOs)

# After DTOs, services sequentially (T053, T060, T068)
# After services, frontend components in parallel:
T075, T076, T077 (ChildScout components)
T081, T082, T083, T084 (Den components)
T088, T089 (Attendance components)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Record Den Meeting Outcomes)
4. **STOP and VALIDATE**: Test den meeting creation, attendance recording, requirement coverage
5. Deploy/demo if ready

**MVP Deliverable**: Den leaders can create den meetings, record Cub Scout attendance, and mark which requirements were covered during meetings.

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo (Parent submissions + leader reconciliation)
4. Add User Story 3 → Test independently → Deploy/Demo (Award fulfillment lifecycle)
5. Add User Story 5 → Test independently → Deploy/Demo (Hours prompts for Scoutbook)
6. Add User Story 4 → Test independently → Deploy/Demo (Role scoping + Den Chief support)
7. Polish phase → Production hardening

Each story adds value without breaking previous stories.

### Parallel Team Strategy

With multiple developers (after Foundational complete):

- **Developer A**: User Story 1 (den meetings & attendance)
- **Developer B**: User Story 2 (parent completions & reconciliation) - starts after US1 child scout infrastructure
- **Developer C**: User Story 5 (hours prompts) - starts after US1 attendance
- **Developer D**: User Story 3 (awards) - starts after US2 requirement progress
- **Team**: User Story 4 (role scoping) - integrate incrementally across all stories

---

## Notes

- [P] tasks = different files, no dependencies - can run in parallel
- [Story] label maps task to specific user story for traceability (US1, US2, US3, US4, US5)
- Each user story should be independently completable and testable
- Contract tests written first, ensure they fail before implementing
- Commit after each task or logical group
- Stop at each checkpoint to validate story independently
- User Story 4 (role scoping) can be integrated incrementally as other stories are built
- Den Chief support is part of US4 but can be added after core role scoping
- Annual rollover is an admin operation in Polish phase (not blocking for MVP)

---

## Summary

**Total Tasks**: 301  
**Phases**: 8 (Setup, Foundational, 5 User Stories, Polish)  
**User Stories**: 5 (US1, US2, US3, US5, US4)  
**MVP Scope**: Phases 1-3 (Setup + Foundational + User Story 1) = ~95 tasks  
**Parallel Opportunities**: ~150 tasks marked [P] can run in parallel within their phase  
**Critical Path**: Setup → Foundational (BLOCKS) → US1 → US2 → US3/US5 → US4 → Polish
