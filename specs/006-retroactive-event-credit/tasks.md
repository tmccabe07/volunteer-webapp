# Tasks: Retroactive Event Credit

**Feature Branch**: `006-retroactive-event-credit`  
**Input**: Design documents from `/specs/006-retroactive-event-credit/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/events-api-changes.md, quickstart.md

**Tests**: Included per BDD-first approach (Constitution Principle I)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `- [ ] [ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Review design artifacts and prepare for implementation

- [X] T001 Review spec.md user stories and acceptance criteria
- [X] T002 Review research.md technical decisions and existing code analysis
- [X] T003 Review quickstart.md implementation guide
- [X] T004 [P] Review data-model.md entity relationships
- [X] T005 [P] Review contracts/events-api-changes.md API modifications

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core helper function needed by multiple user stories

**⚠️ CRITICAL**: This helper function is used by US1 (backend queries) and US3 (frontend display)

- [X] T006 Create isRetroactiveEvent() helper function in backend/src/services/event.service.ts
- [X] T007 Add unit tests for isRetroactiveEvent() helper in backend/src/services/event.service.spec.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Create Past Event and Award Points (Priority: P1) 🎯 MVP

**Goal**: Allow leaders to create events with past dates and mark them complete to award points retroactively

**Independent Test**: Leader creates event dated in the past, adds volunteers to activity slots, marks it complete, and verifies points are awarded correctly

### Tests for User Story 1 (Write First - Red Phase) 🔴

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T008 [P] [US1] Contract test: POST /api/events accepts past date (200 instead of 400) in backend/test/events.e2e-spec.ts
- [X] T009 [P] [US1] Contract test: GET /api/events includes isRetroactive field in backend/test/events.e2e-spec.ts
- [X] T010 [P] [US1] Unit test: createEvent() allows past dates in backend/src/services/event.service.spec.ts
- [X] T011 [P] [US1] Unit test: Event created with past date computes isRetroactive=true in backend/src/services/event.service.spec.ts

### Implementation for User Story 1 (Green Phase) 🟢

- [X] T012 [US1] Remove "event date must be in future" validation in backend/src/services/event.service.ts (line ~27-30)
- [X] T013 [US1] Add isRetroactive computed field to listEvents() method in backend/src/services/event.service.ts
- [X] T014 [US1] Add isRetroactive computed field to getEvent() method in backend/src/services/event.service.ts
- [X] T015 [US1] Verify all US1 tests pass (green phase complete)

### Refactor for User Story 1 (Clean Phase) 🔵

- [X] T016 [US1] Add JSDoc documentation to isRetroactiveEvent() helper function
- [X] T017 [US1] Extract event date constants if needed (validation thresholds)
- [X] T018 [US1] Code review: Verify DRY principles (no duplication)

**Checkpoint**: Leaders can create events with past dates. Events are marked as retroactive in API responses.

---

## Phase 4: User Story 2 - Award Credit Without Pre-signup (Priority: P1) 🎯 MVP

**Goal**: Verify that manual volunteers feature works correctly for retroactive events

**Independent Test**: Create retroactive event, mark complete with manual volunteers, verify all volunteers receive points

**Note**: The manualVolunteers feature already exists. This phase verifies it works for retroactive events.

### Tests for User Story 2 (Write First - Red Phase) 🔴

- [X] T019 [P] [US2] E2E test: Complete retroactive event with manualVolunteers in backend/test/events.e2e-spec.ts
- [X] T020 [P] [US2] E2E test: Verify points awarded to manual volunteers on retroactive event in backend/test/events.e2e-spec.ts
- [X] T021 [P] [US2] E2E test: Verify point event reason includes "manual" indicator in backend/test/events.e2e-spec.ts
- [X] T022 [P] [US2] E2E test: Prevent duplicate manual volunteer assignments in backend/test/events.e2e-spec.ts

### Implementation for User Story 2 (Green Phase) 🟢

- [X] T023 [US2] Update point event reason format to include "manual" for manual volunteers in backend/src/services/event.service.ts (line ~243-270)
- [X] T024 [US2] Verify all US2 tests pass (no additional implementation needed - feature exists)

### Refactor for User Story 2 (Clean Phase) 🔵

- [X] T025 [US2] Extract reason string formatting to helper function if used in multiple places
- [X] T026 [US2] Verify point event reason format is consistent across regular and manual volunteers

**Checkpoint**: Manual volunteers feature confirmed working for retroactive events with correct point attribution.

---

## Phase 5: User Story 3 - Audit Trail for Retroactive Credits (Priority: P2)

**Goal**: Visual indicators distinguish retroactive events from advance-planned events in UI

**Independent Test**: Create retroactive event, view event list and detail pages, verify "Retroactive" badge displays correctly

### Tests for User Story 3 (Write First - Red Phase) 🔴

- [X] T027 [P] [US3] Component test: Retroactive badge appears when isRetroactive=true in frontend/src/app/events/page.test.tsx
- [X] T028 [P] [US3] Component test: Badge does not appear when isRetroactive=false in frontend/src/app/events/page.test.tsx
- [X] T029 [P] [US3] Component test: Event detail shows retroactive badge in frontend/src/app/events/[id]/page.test.tsx
- [X] T030 [P] [US3] Component test: Event detail shows creation date for retroactive events in frontend/src/app/events/[id]/page.test.tsx

### Implementation for User Story 3 (Green Phase) 🟢

- [X] T031 [P] [US3] Add isRetroactive field to Event interface in frontend/src/services/events.service.ts
- [X] T032 [US3] Import Badge component in frontend/src/app/events/page.tsx
- [X] T033 [US3] Add retroactive badge to event list items in frontend/src/app/events/page.tsx
- [X] T034 [US3] Import Badge component in frontend/src/app/events/[id]/page.tsx
- [X] T035 [US3] Add retroactive badge to event detail header in frontend/src/app/events/[id]/page.tsx
- [X] T036 [US3] Display creation date for retroactive events in frontend/src/app/events/[id]/page.tsx
- [X] T037 [US3] Verify all US3 tests pass (green phase complete)

### Refactor for User Story 3 (Clean Phase) 🔵

- [X] T038 [US3] Extract RetroactiveBadge component if used in multiple places
- [ ] T039 [US3] Ensure consistent badge styling across list and detail views
- [ ] T040 [US3] Verify accessibility: badge has appropriate aria-label

**Checkpoint**: Retroactive events are clearly identifiable with visual indicators in all UI views.

---

## Phase 6: User Story 4 - Retroactive Event Validation (Priority: P3)

**Goal**: Optional validation warnings for events with very old dates (nice-to-have)

**Independent Test**: Attempt to create event with date before scouting year start, verify warning message appears but event can still be created

### Tests for User Story 4 (Write First - Red Phase) 🔴

- [ ] T041 [P] [US4] Unit test: Warning logged for date before scouting year in backend/src/services/event.service.spec.ts
- [ ] T042 [P] [US4] Unit test: Event still created despite warning in backend/src/services/event.service.spec.ts
- [ ] T043 [P] [US4] E2E test: No error returned for very old dates (just warning) in backend/test/events.e2e-spec.ts

### Implementation for User Story 4 (Green Phase) 🟢

- [ ] T044 [US4] Add optional validation check for scouting year boundary in backend/src/services/event.service.ts
- [ ] T045 [US4] Log warning (don't throw error) for dates before scouting year start
- [ ] T046 [US4] Verify all US4 tests pass (green phase complete)

### Refactor for User Story 4 (Clean Phase) 🔵

- [ ] T047 [US4] Extract scouting year date logic to utility function if used elsewhere
- [ ] T048 [US4] Add configuration option for validation strictness (if desired)

**Checkpoint**: Helpful validation warnings provide feedback without blocking legitimate use cases.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T049 [P] Update API documentation to reflect contract changes in docs/api-documentation.md
- [ ] T050 [P] Add retroactive events examples to documentation
- [X] T051 Code cleanup: Remove commented-out validation code
- [X] T052 Run full test suite: backend (npm test) and frontend (npm test)
- [X] T053 Run E2E tests: Create → complete → verify retroactive event workflow
- [X] T054 Verify backward compatibility: Existing event flows unaffected
- [ ] T055 [P] Update CHANGELOG or release notes with feature summary
- [X] T056 Run quickstart.md validation checklist

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS US1 and US3
- **User Story 1 (Phase 3)**: Depends on Foundational (Phase 2) - Backend API changes
- **User Story 2 (Phase 4)**: Depends on US1 completion - Needs retroactive events to exist for testing
- **User Story 3 (Phase 5)**: Depends on US1 completion - Needs isRetroactive field from backend
- **User Story 4 (Phase 6)**: Depends on US1 completion - Adds validation to existing create flow
- **Polish (Phase 7)**: Depends on desired user stories being complete

### User Story Completion Order

**Recommended Order** (based on priorities and dependencies):
1. US1 (P1) - MUST complete first (enables all other stories)
2. US2 (P1) - Can start after US1 (verify manual volunteers work)
3. US3 (P2) - Can start after US1 (add visual indicators)
4. US4 (P3) - Can start after US1 (add optional warnings)

**MVP Scope**: US1 + US2 deliver core functionality (create retroactive events and award points)

### Within Each User Story

1. **Tests First (Red)** - Write failing tests
2. **Implementation (Green)** - Make tests pass
3. **Refactor (Clean)** - Improve code quality
4. **Checkpoint** - Verify story is independently testable

### Parallel Opportunities

**Phase 1 (Setup)**: All tasks can run in parallel

**Phase 2 (Foundational)**: T006 and T007 are sequential (tests after implementation)

**Phase 3 (US1 Tests)**: T008-T011 can run in parallel (all test writing)

**Phase 3 (US1 Implementation)**: T012 blocks T013-T014 (validation removal must happen first)

**Phase 4 (US2 Tests)**: T019-T022 can run in parallel (all test writing)

**Phase 5 (US3 Tests)**: T027-T030 can run in parallel (all test writing)

**Phase 5 (US3 Implementation)**: T031 (type update) blocks T032-T036; T032-T033 can be parallel with T034-T036

**Phase 6 (US4 Tests)**: T041-T043 can run in parallel (all test writing)

**Phase 7 (Polish)**: T049-T050 can run in parallel with T055

---

## Parallel Execution Examples

### User Story 1 Backend Tests (Phase 3 - Red)

```bash
# All test files can be created in parallel
git checkout -b us1-tests-backend
# Developer A:
touch backend/test/events.e2e-spec.ts  # Add T008-T009
# Developer B:
touch backend/src/services/event.service.spec.ts  # Add T010-T011
```

### User Story 3 Frontend Implementation (Phase 5 - Green)

```bash
# Type update first, then UI components in parallel
# Step 1 (Sequential):
# Edit frontend/src/services/events.service.ts (T031)

# Step 2 (Parallel):
git checkout -b us3-frontend
# Developer A:
# Edit frontend/src/app/events/page.tsx (T032-T033)
# Developer B:
# Edit frontend/src/app/events/[id]/page.tsx (T034-T036)
```

### Polish Phase (Phase 7)

```bash
# Documentation and test runs can be parallel
# Developer A:
# Update docs/api-documentation.md (T049-T050)
# Developer B:
# Run test suites (T052-T054)
# Developer C:
# Update CHANGELOG (T055)
```

---

## Implementation Strategy

### MVP-First Approach

**Minimum Viable Product**: User Story 1 + User Story 2
- Leaders can create events with past dates
- Leaders can add manual volunteers during completion
- Points are awarded correctly
- **Delivers core value**: Retroactive credit for forgotten events

**Phase 2 Delivery**: Add User Story 3
- Visual indicators for retroactive events
- Audit trail visible to all users
- **Adds transparency**: Users can see which events were retroactive

**Phase 3 Delivery**: Add User Story 4 (Optional)
- Validation warnings for very old dates
- **Adds safety**: Helps prevent accidental far-past dates

### Incremental Delivery Cadence

- **Sprint 1**: Setup + Foundational + US1 (backend only)
- **Sprint 2**: US2 tests + US3 (frontend indicators)
- **Sprint 3**: US4 (optional validation) + Polish

### Testing Strategy

**Test-First (BDD)**: All user stories follow Red-Green-Refactor
1. Write tests that capture acceptance criteria
2. Verify tests fail (red)
3. Implement minimum code to pass (green)
4. Refactor for quality (clean)

**Test Coverage Goals**:
- Backend: Contract tests for API changes (T008-T011, T019-T022, T043)
- Backend: Unit tests for helper functions (T007, T010-T011, T041-T042)
- Frontend: Component tests for UI indicators (T027-T030)
- E2E: Full retroactive workflow (T053)

### Risk Mitigation

**Low Risk Feature**: 
- No schema changes (zero migration risk)
- Minimal code changes (~250 lines total)
- Reuses existing features (manual volunteers)
- Backward compatible (all changes are additive or relaxed validation)

**Rollback Plan**: 
- Redeploy previous backend/frontend versions
- No database cleanup needed
- Existing events unaffected

---

## Task Count Summary

- **Total Tasks**: 56
- **Setup Phase**: 5 tasks
- **Foundational Phase**: 2 tasks (blocking)
- **User Story 1 (P1)**: 11 tasks (tests: 4, implementation: 3, refactor: 3, verification: 1)
- **User Story 2 (P1)**: 8 tasks (tests: 4, implementation: 2, refactor: 2)
- **User Story 3 (P2)**: 14 tasks (tests: 4, implementation: 7, refactor: 3)
- **User Story 4 (P3)**: 8 tasks (tests: 3, implementation: 3, refactor: 2)
- **Polish Phase**: 8 tasks

**Parallel Opportunities**: 
- 15 tasks marked [P] can run in parallel with other tasks
- User stories can be parallelized after Foundational phase (if team capacity allows)

**Estimated Effort**: 
- MVP (US1 + US2): ~2-3 days for one developer
- Full Feature (US1-US4): ~4-5 days for one developer
- With parallelization (2 developers): ~2-3 days for full feature

---

## Validation Checklist (Post-Implementation)

After completing all tasks, verify:

- [ ] All tests pass (backend and frontend)
- [ ] Leaders can create events with past dates
- [ ] Retroactive events display "Retroactive" badge
- [ ] Manual volunteers work on retroactive events
- [ ] Points are awarded correctly
- [ ] Point history shows retroactive attribution
- [ ] Historical leaderboard snapshots unchanged
- [ ] Existing event creation (future dates) still works
- [ ] API returns isRetroactive field for all events
- [ ] Validation warnings appear for very old dates (if US4 implemented)
- [ ] No regressions in existing event functionality
- [ ] Documentation updated
- [ ] Code follows DRY, Clean Code, and BDD principles
