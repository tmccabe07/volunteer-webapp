# Tasks: Dashboard Upcoming Tasks

**Input**: Design documents from `/specs/005-dashboard-upcoming-tasks/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Feature Branch**: `005-dashboard-upcoming-tasks`
**Date**: May 5, 2026

**Tests**: This feature follows BDD test-first approach per constitution requirements. All test tasks must be completed and FAIL before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `- [ ] [ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify existing infrastructure and prepare development environment

- [ ] T001 Verify frontend dependencies are installed (Next.js 16, React 19, Tailwind CSS 4)
- [ ] T002 Verify existing admin-tasks API endpoints are functional (GET /api/admin-tasks, POST /complete, DELETE /complete)
- [ ] T003 [P] Verify existing adminTasksService.ts has required methods (listTasks, completeTask, uncompleteTask)
- [ ] T004 [P] Create feature branch 005-dashboard-upcoming-tasks from main

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Test infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T005 Setup test data fixtures for admin tasks in frontend/src/test/fixtures/admin-tasks.ts
- [ ] T006 [P] Create mock adminTasksService for dashboard tests in frontend/src/test/mocks/admin-tasks-service.mock.ts
- [ ] T007 [P] Verify Vitest configuration supports React Testing Library in frontend/vitest.config.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - View Upcoming Tasks (Priority: P1) 🎯 MVP

**Goal**: Display user's 5 soonest incomplete tasks with future due dates in new dashboard pane

**Independent Test**: Load dashboard as authenticated user with assigned tasks, verify tasks appear in new pane

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T008 [P] [US1] Write test: displays upcoming tasks for authenticated user in frontend/src/app/dashboard/page.test.tsx
- [ ] T009 [P] [US1] Write test: shows empty state when no upcoming tasks in frontend/src/app/dashboard/page.test.tsx
- [ ] T010 [P] [US1] Write test: excludes overdue tasks from display in frontend/src/app/dashboard/page.test.tsx
- [ ] T011 [P] [US1] Write test: limits display to 5 tasks in frontend/src/app/dashboard/page.test.tsx
- [ ] T012 [P] [US1] Write test: sorts tasks by due date ascending in frontend/src/app/dashboard/page.test.tsx
- [ ] T013 [P] [US1] Write test: shows loading state while fetching tasks in frontend/src/app/dashboard/page.test.tsx

### Implementation for User Story 1

- [ ] T014 [P] [US1] Create DashboardTaskCard component in frontend/src/components/shared/tasks/DashboardTaskCard.tsx
- [ ] T015 [P] [US1] Create unit tests for DashboardTaskCard in frontend/src/components/shared/tasks/DashboardTaskCard.test.tsx
- [ ] T016 [US1] Add state management for upcoming tasks in frontend/src/app/dashboard/page.tsx (upcomingTasks, loadingTasks, error)
- [ ] T017 [US1] Implement loadUpcomingTasks function with API call to GET /admin-tasks in frontend/src/app/dashboard/page.tsx
- [ ] T018 [US1] Add client-side filtering logic to exclude overdue tasks in frontend/src/app/dashboard/page.tsx
- [ ] T019 [US1] Implement useEffect hook to fetch tasks on user authentication in frontend/src/app/dashboard/page.tsx
- [ ] T020 [US1] Replace "Recent Activity" pane with "Upcoming Tasks" pane in dashboard grid in frontend/src/app/dashboard/page.tsx
- [ ] T021 [US1] Implement loading state UI (skeleton or spinner) in dashboard tasks pane in frontend/src/app/dashboard/page.tsx
- [ ] T022 [US1] Implement empty state UI ("No upcoming tasks" message) in frontend/src/app/dashboard/page.tsx
- [ ] T023 [US1] Render list of DashboardTaskCard components for upcoming tasks in frontend/src/app/dashboard/page.tsx
- [ ] T024 [US1] Add date formatting utility for task due dates (reuse from events) in frontend/src/app/dashboard/page.tsx

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently - dashboard displays upcoming tasks

---

## Phase 4: User Story 2 - Quick Task Completion Toggle (Priority: P2)

**Goal**: Enable inline task completion/uncommpletion from dashboard without page navigation

**Independent Test**: Display a task, click completion toggle, verify status updates immediately and persists

### Tests for User Story 2

- [ ] T025 [P] [US2] Write test: marks task complete with optimistic update in frontend/src/app/dashboard/page.test.tsx
- [ ] T026 [P] [US2] Write test: marks task incomplete when toggled in frontend/src/app/dashboard/page.test.tsx
- [ ] T027 [P] [US2] Write test: reverts state on completion error in frontend/src/app/dashboard/page.test.tsx
- [ ] T028 [P] [US2] Write test: shows error message when completion fails in frontend/src/app/dashboard/page.test.tsx
- [ ] T029 [P] [US2] Write test: persists completion status after page refresh in frontend/src/app/dashboard/page.test.tsx

### Implementation for User Story 2

- [ ] T030 [US2] Add completion toggle UI element to DashboardTaskCard component in frontend/src/components/shared/tasks/DashboardTaskCard.tsx
- [ ] T031 [US2] Implement handleToggleComplete function with optimistic updates in frontend/src/app/dashboard/page.tsx
- [ ] T032 [US2] Add API call to POST /admin-tasks/:id/complete for mark complete in frontend/src/app/dashboard/page.tsx
- [ ] T033 [US2] Add API call to DELETE /admin-tasks/:id/complete for undo completion in frontend/src/app/dashboard/page.tsx
- [ ] T034 [US2] Implement state rollback on API error in handleToggleComplete in frontend/src/app/dashboard/page.tsx
- [ ] T035 [US2] Add error state and error message display in dashboard tasks pane in frontend/src/app/dashboard/page.tsx
- [ ] T036 [US2] Wire completion toggle in DashboardTaskCard to handleToggleComplete callback in frontend/src/app/dashboard/page.tsx
- [ ] T037 [US2] Add visual feedback for completion state (checkmark, strikethrough, or badge) in frontend/src/components/shared/tasks/DashboardTaskCard.tsx

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - users can view and complete tasks from dashboard

---

## Phase 5: User Story 3 - Navigate to Task Details (Priority: P2)

**Goal**: Enable clicking task card to navigate to full task detail page

**Independent Test**: Click task card in dashboard pane, verify navigation to correct task detail page

### Tests for User Story 3

- [ ] T038 [P] [US3] Write test: navigates to task detail page when task card clicked in frontend/src/app/dashboard/page.test.tsx
- [ ] T039 [P] [US3] Write test: returns to dashboard when using browser back navigation in frontend/src/app/dashboard/page.test.tsx

### Implementation for User Story 3

- [ ] T040 [US3] Wrap task card content in Next.js Link component in frontend/src/components/shared/tasks/DashboardTaskCard.tsx
- [ ] T041 [US3] Configure Link href to navigate to /tasks/:id in frontend/src/components/shared/tasks/DashboardTaskCard.tsx
- [ ] T042 [US3] Ensure completion toggle click doesn't trigger navigation (event.stopPropagation) in frontend/src/components/shared/tasks/DashboardTaskCard.tsx
- [ ] T043 [US3] Add hover state styling to indicate task card is clickable in frontend/src/components/shared/tasks/DashboardTaskCard.tsx

**Checkpoint**: All user stories 1-3 should now be independently functional - view, complete, and navigate tasks

---

## Phase 6: User Story 4 - View All Tasks Link (Priority: P3)

**Goal**: Add "View All" link in pane header to navigate to full tasks page

**Independent Test**: Click "View All" button, verify navigation to tasks page with appropriate filters

### Tests for User Story 4

- [ ] T044 [P] [US4] Write test: "View All" button present in pane header in frontend/src/app/dashboard/page.test.tsx
- [ ] T045 [P] [US4] Write test: navigates to /tasks page when "View All" clicked in frontend/src/app/dashboard/page.test.tsx

### Implementation for User Story 4

- [ ] T046 [US4] Add "View All" button/link to Upcoming Tasks pane header in frontend/src/app/dashboard/page.tsx
- [ ] T047 [US4] Configure "View All" link to navigate to /tasks?assignedToMe=true&status=incomplete in frontend/src/app/dashboard/page.tsx
- [ ] T048 [US4] Style "View All" link to match existing "View All" button in Upcoming Events pane in frontend/src/app/dashboard/page.tsx

**Checkpoint**: All user stories should now be independently functional - complete feature delivered

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and final quality checks

- [ ] T049 [P] Add JSDoc comments to DashboardTaskCard component and props in frontend/src/components/shared/tasks/DashboardTaskCard.tsx
- [ ] T050 [P] Add JSDoc comments to handleToggleComplete and loadUpcomingTasks functions in frontend/src/app/dashboard/page.tsx
- [ ] T051 [P] Verify responsive design on mobile viewport (Tailwind breakpoints) for dashboard tasks pane
- [ ] T052 [P] Verify accessibility (keyboard navigation, screen reader support) for DashboardTaskCard
- [ ] T053 [P] Add error boundary for dashboard tasks pane to handle runtime errors gracefully
- [ ] T054 Review and ensure visual consistency with Upcoming Events pane (spacing, colors, typography)
- [ ] T055 [P] Run frontend unit tests: npm test in frontend directory
- [ ] T056 [P] Run frontend linting: npm run lint in frontend directory
- [ ] T057 Validate implementation against quickstart.md workflow steps
- [ ] T058 Manual testing: Test with 0, 3, 5, and 10 upcoming tasks scenarios
- [ ] T059 Manual testing: Test completion toggle with network errors (throttle connection)
- [ ] T060 Manual testing: Test overdue task filtering (verify overdue tasks don't appear)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Depends on User Story 1 (needs task display first) - Adds completion toggle to existing cards
- **User Story 3 (P2)**: Depends on User Story 1 (needs task cards first) - Adds navigation to existing cards
- **User Story 4 (P3)**: Can start after Foundational (Phase 2) - Independent, just adds header link

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- DashboardTaskCard component before dashboard page integration (US1)
- Dashboard state management before UI rendering (US1)
- Basic display (US1) before interaction features (US2, US3)
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

**Phase 1 (Setup)**: T003 can run in parallel with T001-T002

**Phase 2 (Foundational)**: T006 and T007 can run in parallel with T005

**User Story 1 Tests**: T008-T013 can all run in parallel (different test cases)

**User Story 1 Implementation**: T014 and T015 can run in parallel (component + tests in separate files)

**User Story 2 Tests**: T025-T029 can all run in parallel

**User Story 3 Tests**: T038-T039 can run in parallel

**User Story 4 Tests**: T044-T045 can run in parallel

**Polish Phase**: T049-T053 and T055-T056 can run in parallel (different files)

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Parallel Task T008: "Write test: displays upcoming tasks for authenticated user"
Parallel Task T009: "Write test: shows empty state when no upcoming tasks"
Parallel Task T010: "Write test: excludes overdue tasks from display"
Parallel Task T011: "Write test: limits display to 5 tasks"
Parallel Task T012: "Write test: sorts tasks by due date ascending"
Parallel Task T013: "Write test: shows loading state while fetching tasks"

# After tests complete, launch component creation in parallel:
Parallel Task T014: "Create DashboardTaskCard component"
Parallel Task T015: "Create unit tests for DashboardTaskCard"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (verify infrastructure)
2. Complete Phase 2: Foundational (test infrastructure - CRITICAL)
3. Complete Phase 3: User Story 1 (view upcoming tasks)
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready - **Dashboard shows upcoming tasks!**

### Incremental Delivery

1. Complete Setup + Foundational → Test infrastructure ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP - view tasks!)
3. Add User Story 2 → Test independently → Deploy/Demo (add completion toggle!)
4. Add User Story 3 → Test independently → Deploy/Demo (add navigation!)
5. Add User Story 4 → Test independently → Deploy/Demo (add view all link!)
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers (after Phase 2 complete):

1. **Developer A**: User Story 1 (T008-T024) - Core display
2. **Developer B**: User Story 4 (T044-T048) - View All link (independent!)
3. **Sequential after US1 complete**:
   - Developer A or B: User Story 2 (T025-T037) - Completion toggle
   - Developer A or B: User Story 3 (T038-T043) - Navigation
4. Stories complete and integrate independently

**Note**: US2 and US3 depend on US1 being complete (they enhance the task cards created in US1)

---

## Notes

- All test tasks must be completed and tests must FAIL before implementation begins (Red-Green-Refactor)
- [P] tasks = different files, no dependencies, can run in parallel
- [Story] label maps task to specific user story for traceability
- No backend changes required - feature uses existing admin-tasks API
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Visual consistency with Upcoming Events pane is critical (FR-015)
- Client-side filtering for overdue tasks is intentional (see research.md for rationale)
- Optimistic UI updates pattern documented in research.md must be followed for completion toggle

---

## Success Metrics

Upon completion of all phases:

- ✅ Dashboard loads with Upcoming Tasks pane in <2 seconds (SC-001)
- ✅ Users can mark tasks complete in <3 clicks (SC-002)
- ✅ Task cards are clickable and navigate correctly (SC-003)
- ✅ No visual layout inconsistency with Upcoming Events pane (SC-006)
- ✅ Task completion updates immediately without refresh (SC-005)
- ✅ All tests passing (frontend unit tests + dashboard integration tests)
- ✅ Responsive design works on mobile and desktop
- ✅ Accessibility standards met (keyboard navigation, screen readers)
