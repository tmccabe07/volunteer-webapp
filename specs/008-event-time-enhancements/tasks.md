# Implementation Tasks: Enhanced Event Management - Time and Activity Details

**Feature**: 008-event-time-enhancements  
**Branch**: `008-event-time-enhancements`  
**Generated**: 2026-05-19  
**Spec**: [spec.md](spec.md) | [Plan](plan.md) | [Data Model](data-model.md) | [Contracts](contracts/)

---

## Implementation Strategy

This feature is organized into **7 phases** aligned with user stories (P1, P2, P3 priorities). Each user story is independently testable and can be deployed as a standalone increment.

**MVP Scope**: User Story 1 only (Event End Time) delivers immediate value and can ship independently.

**Parallel Opportunities**: Tasks marked with `[P]` can be developed in parallel within the same phase (different files, no dependencies).

---

## Phase 1: Setup & Infrastructure

**Goal**: Initialize database schema and shared utilities needed across all user stories.

**Independent Test**: Database migration runs successfully, no existing data corrupted, new fields accessible via Prisma client.

- [X] T001 Create Prisma migration for schema changes in backend/prisma/schema.prisma
- [X] T002 Add Event.endTime String? field to Event model
- [X] T003 Add Event.fullDay Boolean @default(false) field to Event model
- [X] T004 Add ActivitySlot.description String? field to ActivitySlot model
- [X] T005 Create new ActivitySlotStep model with id, activitySlotId, orderIndex, stepText, createdAt
- [X] T006 Add unique constraint on ActivitySlotStep [activitySlotId, orderIndex]
- [X] T007 Add index on ActivitySlotStep [activitySlotId, orderIndex]
- [X] T008 Run migration in development environment: `npx prisma migrate dev --name add_event_time_enhancements`
- [X] T008a Run migration in test environment: `DATABASE_URL=file:./test.db npx prisma migrate deploy`
- [X] T009 Generate Prisma client: `npx prisma generate`
- [X] T009a Verify Prisma client works with test database by running a sample query against test.db
- [X] T012 Verify migration rollback script in migration file

---

## Phase 2: Foundational - Shared Services & Utilities

**Goal**: Build reusable services and utilities that all user stories depend on.

**Independent Test**: Utility functions work correctly with all time combinations, service layer methods execute without errors.

- [X] T013 [P] Create time validation utility in backend/src/utils/time-validation.util.ts
- [X] T014 [P] Implement validateEventTimes(eventTime, endTime, fullDay) function with Zod validation
- [X] T015 [P] Implement parseTime(timeString) helper to convert HH:mm to minutes since midnight
- [X] T016 [P] Add edge case handling for midnight-spanning events (log warning, allow)
- [X] T017 [P] Create unit tests for time-validation.util.ts in backend/src/utils/time-validation.spec.ts
- [X] T018 [P] Create time formatting utility in frontend/src/lib/time-format.util.ts
- [X] T019 [P] Implement formatEventTime(event) function for display logic (all-day, range, single time)
- [X] T020 [P] Implement format12hr(time24) helper to convert HH:mm to 12-hour format
- [X] T021 [P] Implement calculateDuration(startTime, endTime) helper for duration display
- [X] T022 [P] Create unit tests for time-format.util.ts in frontend/src/lib/time-format.spec.ts

---

## Phase 3: User Story 1 - Specify Event End Time (P1)

**Goal**: Enable organizers to specify optional end times for events.

**Story**: As an event organizer, I want to specify both start and end times for an event so that volunteers know exactly how long the event will last.

**Independent Test**: Create event with start/end times, verify both display correctly, confirm validation rejects invalid ranges.

### Backend Implementation

- [X] T023 [US1] Update CreateEventDto in backend/src/models/event.dto.ts to include endTime String? field
- [X] T024 [US1] Update UpdateEventDto in backend/src/models/event.dto.ts to include endTime String? field
- [X] T025 [US1] Add Zod validation schema for endTime (HH:mm format, optional)
- [X] T026 [US1] Add Zod refinement to validate endTime > eventTime when both provided
- [X] T027 [US1] Update EventService.create() in backend/src/services/event.service.ts to call validateEventTimes()
- [X] T028 [US1] Update EventService.update() in backend/src/services/event.service.ts to call validateEventTimes()
- [X] T029 [US1] Update EventService response mapping to include endTime field
- [X] T030 [US1] Update EventsController.create() in backend/src/api/events.controller.ts to accept endTime
- [X] T031 [US1] Update EventsController.update() in backend/src/api/events.controller.ts to accept endTime
- [X] T032 [US1] Update EventsController.findOne() to return endTime in response

### Contract Tests (Backend)

- [X] T033 [US1] Add contract test: Create event with valid start and end times in backend/tests/contract/event-api.spec.ts
- [X] T034 [US1] Add contract test: Create event with start time only (no end time) - existing behavior
- [X] T035 [US1] Add contract test: Reject event with end time before start time (400 error)
- [X] T036 [US1] Add contract test: Reject event with end time but no start time (400 error)
- [X] T037 [US1] Add contract test: Update event to add end time
- [X] T038 [US1] Add contract test: Update event to change end time
- [X] T039 [US1] Add contract test: GET event returns endTime field correctly

### Frontend Implementation

- [X] T040 [P] [US1] Update Event interface in frontend/src/services/events.service.ts to include endTime?: string
- [X] T041 [P] [US1] Update CreateEventRequest interface to include endTime?: string
- [X] T042 [P] [US1] Modify EventTimePicker component in frontend/src/components/event-time-picker.tsx to add end time input
- [X] T043 [P] [US1] Add end time field below start time with label "End Time (optional)"
- [X] T044 [P] [US1] Add inline validation to show error if end time < start time
- [X] T045 [P] [US1] Display duration hint (e.g., "Duration: 2 hours") when both times provided
- [X] T046 [P] [US1] Update event create page in frontend/src/app/events/create/page.tsx to use enhanced time picker
- [X] T047 [P] [US1] Update event edit page in frontend/src/app/events/[id]/edit/page.tsx to use enhanced time picker
- [X] T048 [P] [US1] Update event details page in frontend/src/app/events/[id]/page.tsx to display end time using formatEventTime()
- [X] T049 [P] [US1] Update event list items to display time range when endTime exists

### Integration Tests (Frontend)

- [ ] T050 [US1] Add integration test: Create event with start and end times in frontend/tests/integration/event-creation.test.tsx
- [ ] T051 [US1] Add integration test: Edit event to add end time
- [ ] T052 [US1] Add integration test: Validation error shown for invalid time range
- [ ] T053 [US1] Add integration test: Event details display time range correctly

---

## Phase 4: User Story 2 - Mark Events as Full Day (P2)

**Goal**: Enable organizers to mark events as full-day without requiring specific times.

**Story**: As an event organizer, I want to mark an event as "full day" so that I don't need to specify exact start and end times for all-day activities.

**Independent Test**: Create full-day event with checkbox checked, verify times are null and "All Day" displays.

### Backend Implementation

- [X] T054 [US2] Update CreateEventDto in backend/src/models/event.dto.ts to include fullDay Boolean @default(false)
- [X] T055 [US2] Update UpdateEventDto to include fullDay Boolean field
- [X] T056 [US2] Add Zod refinement: if fullDay=true, eventTime and endTime must be null
- [X] T057 [US2] Update EventService validation to enforce fullDay constraint
- [X] T058 [US2] Update EventsController to accept fullDay field
- [X] T059 [US2] Update response mapping to include fullDay in all event responses

### Contract Tests (Backend)

- [X] T060 [US2] Add contract test: Create full-day event with fullDay=true, times=null in backend/tests/contract/event-api.spec.ts
- [X] T061 [US2] Add contract test: Reject full-day event with times provided (400 error)
- [X] T062 [US2] Add contract test: Update event to convert to full-day (clears times)
- [X] T063 [US2] Add contract test: Update event from full-day to timed (requires times)

### Frontend Implementation

- [X] T064 [P] [US2] Update Event interface in frontend/src/services/events.service.ts to include fullDay: boolean
- [X] T065 [P] [US2] Add fullDay checkbox to EventTimePicker component in frontend/src/components/event-time-picker.tsx
- [X] T066 [P] [US2] Implement toggle behavior: when checked, hide time fields and clear values
- [X] T067 [P] [US2] Preserve time values in local state cache when toggling (restore if unchecked)
- [X] T068 [P] [US2] Update formatEventTime() in frontend/src/lib/time-format.util.ts to return "All Day" when fullDay=true
- [X] T069 [P] [US2] Add visual indicator (badge) for full-day events in event list
- [X] T070 [P] [US2] Update event details page to show "All Day" badge for full-day events

### Integration Tests (Frontend)

- [ ] T071 [US2] Add integration test: Create full-day event in frontend/tests/integration/event-creation.test.tsx
- [ ] T072 [US2] Add integration test: Toggle full-day checkbox clears times
- [ ] T073 [US2] Add integration test: Toggle off restores previously entered times
- [ ] T074 [US2] Add integration test: Event details display "All Day" for full-day events

---

## Phase 5: User Story 3 - Customize Activity Slot Descriptions (P3)

**Goal**: Enable organizers to add custom descriptions to activity slots.

**Story**: As an event organizer, I want to provide custom descriptions for activity slots so volunteers understand their specific responsibilities.

**Independent Test**: Create activity slot with custom description, verify it displays alongside activity type name.

### Backend Implementation

- [ ] T075 [US3] Update CreateActivitySlotDto in backend/src/models/activity-slot.dto.ts to include description String?
- [ ] T076 [US3] Add Zod validation for description (max 500 characters)
- [ ] T077 [US3] Update UpdateActivitySlotDto to include description field
- [ ] T078 [US3] Update ActivitySlotService.create() in backend/src/services/activity-slot.service.ts to save description
- [ ] T079 [US3] Update ActivitySlotService.update() to handle description changes
- [ ] T080 [US3] Update response mapping to include description in activity slot responses
- [ ] T081 [US3] Update EventsController to accept description in nested activitySlots array

### Contract Tests (Backend)

- [ ] T082 [US3] Add contract test: Create activity slot with description in backend/tests/contract/activity-slot-api.spec.ts
- [ ] T083 [US3] Add contract test: Create activity slot without description (null)
- [ ] T084 [US3] Add contract test: Reject description > 500 chars (400 error)
- [ ] T085 [US3] Add contract test: Update activity slot description
- [ ] T086 [US3] Add contract test: Clear description (set to null)

### Frontend Implementation

- [ ] T087 [P] [US3] Update ActivitySlot interface in frontend/src/services/activity-slots.service.ts to include description?: string
- [ ] T088 [P] [US3] Create or modify ActivitySlotForm component in frontend/src/components/activity-slot-form.tsx
- [ ] T089 [P] [US3] Add description textarea field below activity type selector
- [ ] T090 [P] [US3] Add character counter showing "X / 500 characters"
- [ ] T091 [P] [US3] Add client-side validation for 500 char limit
- [ ] T092 [P] [US3] Create formatActivitySlotName() utility in frontend/src/lib/time-format.util.ts
- [ ] T093 [P] [US3] Update event details page to display activity type + description (if exists)
- [ ] T094 [P] [US3] Update signup dialog to show full activity slot name with description

### Integration Tests (Frontend)

- [ ] T095 [US3] Add integration test: Add custom description to activity slot in frontend/tests/integration/activity-slot-management.test.tsx
- [ ] T096 [US3] Add integration test: Character counter updates correctly
- [ ] T097 [US3] Add integration test: Validation prevents > 500 chars
- [ ] T098 [US3] Add integration test: Event details display custom description

---

## Phase 6: User Story 4 - Add Steps to Activity Slots (P3)

**Goal**: Enable organizers to add numbered step-by-step instructions to activity slots.

**Story**: As an event organizer, I want to add optional step-by-step instructions so volunteers know exactly what to do.

**Independent Test**: Create activity slot with multiple steps, verify steps display in order, test add/remove/reorder operations.

### Backend Implementation

- [ ] T099 [US4] Create ActivitySlotStepService in backend/src/services/activity-slot-step.service.ts
- [ ] T100 [US4] Implement addStep(activitySlotId, stepText) method with orderIndex auto-calculation
- [ ] T101 [US4] Implement removeStep(stepId) method with renumbering logic using transaction
- [ ] T102 [US4] Implement reorderSteps(activitySlotId, stepIds[]) method with batch update
- [ ] T103 [US4] Implement getStepsBySlot(activitySlotId) method with orderBy orderIndex ASC
- [ ] T104 [US4] Add validation: max 20 steps per activity slot
- [ ] T105 [US4] Add validation: stepText max 200 chars, cannot be empty
- [ ] T106 [US4] Create CreateActivitySlotStepDto in backend/src/models/activity-slot-step.dto.ts
- [ ] T107 [US4] Add Zod validation for stepText (required, 1-200 chars)
- [ ] T108 [US4] Update CreateActivitySlotDto to include optional steps: CreateActivitySlotStepDto[]
- [ ] T109 [US4] Update ActivitySlotService to create steps when activity slot created
- [ ] T110 [US4] Create ActivitySlotsStepsController in backend/src/api/activity-slot-steps.controller.ts
- [ ] T111 [US4] Add POST /activity-slots/:id/steps endpoint (add step)
- [ ] T112 [US4] Add DELETE /activity-slots/:slotId/steps/:stepId endpoint (remove step)
- [ ] T113 [US4] Add PATCH /activity-slots/:id/steps/reorder endpoint (reorder steps)
- [ ] T114 [US4] Update ActivitySlot queries to include steps with orderBy

### Unit Tests (Backend)

- [ ] T115 [US4] Create unit tests for ActivitySlotStepService in backend/src/services/activity-slot-step.service.spec.ts
- [ ] T116 [US4] Test addStep() appends to end with correct orderIndex
- [ ] T117 [US4] Test removeStep() renumbers remaining steps
- [ ] T118 [US4] Test reorderSteps() updates all orderIndex values correctly
- [ ] T119 [US4] Test max 20 steps validation throws error
- [ ] T120 [US4] Test empty stepText validation throws error

### Contract Tests (Backend)

- [ ] T121 [US4] Add contract test: Create activity slot with steps in backend/tests/contract/activity-slot-api.spec.ts
- [ ] T122 [US4] Add contract test: Add step to activity slot (POST)
- [ ] T123 [US4] Add contract test: Remove step and verify renumbering
- [ ] T124 [US4] Add contract test: Reorder steps with valid stepIds
- [ ] T125 [US4] Add contract test: Reject > 20 steps (400 error)
- [ ] T126 [US4] Add contract test: Reject empty stepText (400 error)
- [ ] T127 [US4] Add contract test: Reject stepText > 200 chars (400 error)
- [ ] T128 [US4] Add contract test: GET activity slot returns steps in correct order

### Frontend Implementation

- [ ] T129 [P] [US4] Update ActivitySlot interface to include steps: ActivitySlotStep[]
- [ ] T130 [P] [US4] Create ActivitySlotStep interface with id, orderIndex, stepText
- [ ] T131 [P] [US4] Create StepManager component in frontend/src/components/step-manager.tsx
- [ ] T132 [P] [US4] Implement step list with numbered inputs (1, 2, 3...)
- [ ] T133 [P] [US4] Add "Add Step" button (disabled if 20 steps reached)
- [ ] T134 [P] [US4] Add remove button for each step
- [ ] T135 [P] [US4] Implement character counter per step (X / 200 chars)
- [ ] T136 [P] [US4] Auto-renumber when step removed (visual update)
- [ ] T137 [P] [US4] Add empty state: "No steps added. Click 'Add Step'..."
- [ ] T138 [P] [US4] Add StepManager to ActivitySlotForm component
- [ ] T139 [P] [US4] Update event create/edit forms to include step management
- [ ] T140 [P] [US4] Update event details page to display steps as ordered list
- [ ] T141 [P] [US4] Create renderSteps() utility to display steps in signup dialog

### Component Tests (Frontend)

- [ ] T142 [US4] Create unit tests for StepManager in frontend/src/components/step-manager.test.tsx
- [ ] T143 [US4] Test adding step appends to list
- [ ] T144 [US4] Test removing step renumbers remaining steps
- [ ] T145 [US4] Test "Add Step" button disabled at 20 steps
- [ ] T146 [US4] Test character counter per step
- [ ] T147 [US4] Test validation prevents empty step text

### Integration Tests (Frontend)

- [ ] T148 [US4] Add integration test: Add multiple steps to activity slot in frontend/tests/integration/activity-slot-management.test.tsx
- [ ] T149 [US4] Add integration test: Remove step and verify renumbering
- [ ] T150 [US4] Add integration test: Validate max 20 steps enforced
- [ ] T151 [US4] Add integration test: Event details display steps in correct order

---

## Phase 7: Polish & Cross-Cutting Concerns

**Goal**: Finalize documentation, ensure backward compatibility, and verify all acceptance criteria met.

**Independent Test**: All existing events display correctly, no regressions, documentation complete.

- [ ] T152 [P] Update API documentation in docs/api-documentation.md with new endpoints
- [ ] T153 [P] Add migration guide for existing events (no action needed, backward compatible)
- [ ] T154 [P] Update README.md with feature summary and links to specs
- [ ] T155 [P] Run full backend test suite: `npm test`
- [ ] T156 [P] Run backend e2e tests: `npm run test:e2e`
- [ ] T157 [P] Run frontend test suite: `npm test`
- [ ] T158 [P] Run test coverage reports and verify ≥80% coverage for new code
- [ ] T159 Verify backward compatibility: existing events with only startTime display correctly
- [ ] T160 Verify backward compatibility: events without descriptions display activity type name only
- [ ] T161 Test full user journey: Create event with all new features → volunteer views → signs up
- [ ] T162 Manual testing on mobile devices (responsive design)
- [ ] T163 Accessibility audit (keyboard navigation, screen readers)
- [ ] T164 Performance testing: API response times <200ms p95
- [ ] T165 Create deployment checklist (database migration → backend → frontend order)
- [ ] T166 Update CHANGELOG.md with feature summary

---

## Dependencies & Parallel Execution

### Dependency Graph (User Story Completion Order)

```text
Setup (Phase 1)
    ↓
Foundational (Phase 2)
    ↓
User Story 1 (Phase 3) ← Can deploy as MVP
    ↓ (optional)
User Story 2 (Phase 4) ← Independent, can deploy separately
    ↓ (optional)
User Story 3 (Phase 5) ← Independent, builds on foundational
    ↓ (requires US3)
User Story 4 (Phase 6) ← Depends on US3 (description field exists)
    ↓
Polish (Phase 7)
```

**Critical Path**: Phase 1 → Phase 2 → Phase 3 → Phase 7 (minimum for MVP)

**Optional Enhancements**: Phase 4, 5, 6 can be added incrementally

### Parallel Execution Examples

**Phase 2 (Foundational)**: All tasks T011-T020 can run in parallel (backend utils vs frontend utils)

**Phase 3 (User Story 1)**:
- Backend tasks T021-T030 (sequential within backend)
- Contract tests T031-T037 (after backend implementation)
- Frontend tasks T038-T047 (parallel to backend, use mocks)
- Integration tests T048-T051 (after frontend complete)

**Phase 5 (User Story 3)**:
- Backend tasks T073-T079 can run in parallel with Frontend tasks T085-T092

**Phase 6 (User Story 4)**:
- Service implementation T097-T112 and Frontend component T127-T139 can develop in parallel

---

## Implementation Summary

**Total Tasks**: 166  
**Phases**: 7  
**User Stories**: 4 (prioritized P1, P2, P3, P3)  
**Estimated Effort**: 
- MVP (US1 only): ~42 tasks (Phases 1, 2, 3, 7 partial)
- Full Feature: ~166 tasks (all phases)

**MVP First Delivery**: User Story 1 (Event End Time) provides immediate value and can ship independently. Subsequent stories add polish and advanced features incrementally.

**Test Coverage**: 50+ test cases across contract, integration, unit, and component tests ensuring BDD compliance.

**Backward Compatibility**: ✅ All existing events continue to work without modification.

**Next Step**: Begin implementation with Phase 1 (Setup & Infrastructure).
