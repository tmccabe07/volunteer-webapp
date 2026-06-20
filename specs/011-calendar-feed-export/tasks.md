# Tasks: Calendar Subscription Feed Export

**Input**: Design documents from /specs/011-calendar-feed-export/
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Included and required for this feature due to BDD-first constitution and plan/quickstart requirements.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: [ID] [P?] [Story] Description

- [P] means the task can run in parallel (different files, no blocking dependency).
- [Story] maps tasks to user stories (US1, US2, US3).

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization for calendar feed development.

- [X] T001 Add ical-generator dependency to backend/package.json and refresh backend/package-lock.json
- [X] T002 Create calendar feed module/service/controller/model file stubs in backend/src/modules/calendar-feed.module.ts, backend/src/services/calendar-feed.service.ts, backend/src/services/calendar-feed-token.service.ts, backend/src/api/calendar-feed.controller.ts, and backend/src/models/calendar-feed/calendar-feed.dto.ts
- [X] T003 [P] Create frontend calendar feed client/component stubs in frontend/src/services/calendarFeed.service.ts and frontend/src/components/profile/CalendarFeedLinksCard.tsx

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core data model and wiring that MUST complete before user stories.

**CRITICAL**: No user story work starts until this phase is complete.

- [X] T004 Add CalendarFeedToken-related enums/models and constraints to backend/prisma/schema.prisma
- [X] T005 Generate and commit Prisma migration for calendar feed tables in backend/prisma/migrations/
- [X] T006 Regenerate Prisma client bindings for new calendar feed schema in backend/node_modules/.prisma/ and backend/node_modules/@prisma/client/
- [X] T007 [P] Implement request/response validation schemas for feed listing and token regeneration in backend/src/models/calendar-feed/calendar-feed.dto.ts
- [X] T008 [P] Wire CalendarFeedModule into Nest app imports in backend/src/modules/calendar-feed.module.ts and backend/src/app.module.ts
- [X] T009 Implement token hashing/random generation primitives in backend/src/services/calendar-feed-token.service.ts
- [X] T010 Implement shared scope resolution helper for pack/den visibility reuse in backend/src/services/calendar-feed.service.ts

**Checkpoint**: Foundation complete. User stories can now proceed.

---

## Phase 3: User Story 1 - Subscribe to scoped events in personal calendar (Priority: P1) 🎯 MVP

**Goal**: Users can copy one pack link and distinct den links, subscribe in Google, and see only scope-matching events.

**Independent Test**: Subscribe with one pack link and one den link, confirm calendars are created and each contains only matching-scope events.

### Tests for User Story 1

- [X] T011 [P] [US1] Add contract tests for GET /api/calendar/feeds/:feedToken.ics and GET /api/me/calendar-feeds in backend/test/calendar-feed.e2e-spec.ts
- [X] T012 [P] [US1] Add integration tests for pack-vs-den scope isolation in backend/test/calendar-feed.e2e-spec.ts
- [X] T013 [P] [US1] Add frontend component tests for pack+den link rendering in frontend/src/test/components/profile/CalendarFeedLinksCard.test.tsx

### Implementation for User Story 1

- [X] T014 [US1] Implement scoped token create/get logic (pack + per-den) in backend/src/services/calendar-feed-token.service.ts
- [X] T015 [US1] Implement scope-filtered upcoming-event projection query in backend/src/services/calendar-feed.service.ts
- [X] T016 [US1] Implement public ICS endpoint GET /api/calendar/feeds/:feedToken.ics in backend/src/api/calendar-feed.controller.ts
- [X] T017 [US1] Implement authenticated feed discovery endpoint GET /api/me/calendar-feeds in backend/src/api/calendar-feed.controller.ts
- [X] T018 [US1] Implement frontend feed listing API methods in frontend/src/services/calendarFeed.service.ts
- [X] T019 [US1] Implement profile card for copyable pack/den links in frontend/src/components/profile/CalendarFeedLinksCard.tsx
- [X] T020 [US1] Integrate calendar feed card into profile screen in frontend/src/app/profile/page.tsx

**Checkpoint**: User Story 1 is fully functional and independently testable (MVP).

---

## Phase 4: User Story 2 - Keep calendar data current through refreshes (Priority: P2)

**Goal**: Event create/update/cancel changes appear on provider refresh without re-subscribe; reminder metadata is included best-effort with clear guidance.

**Independent Test**: After initial subscription, modify events and re-fetch feed content; verify updates/cancellations appear and reminder caveat guidance is visible.

### Tests for User Story 2

- [ ] T021 [P] [US2] Add integration tests for event create/update/cancel feed reflection in backend/test/calendar-feed-sync.e2e-spec.ts
- [ ] T022 [P] [US2] Add tests for reminder metadata presence in ICS payload in backend/test/calendar-feed-sync.e2e-spec.ts
- [ ] T023 [P] [US2] Add service tests for deterministic ICS event mapping and timestamps in backend/src/services/calendar-feed.service.spec.ts

### Implementation for User Story 2

- [X] T024 [US2] Implement stable VEVENT mapping (UID/DTSTAMP/update behavior) in backend/src/services/calendar-feed.service.ts
- [X] T025 [US2] Implement best-effort VALARM reminder serialization in backend/src/services/calendar-feed.service.ts
- [X] T026 [US2] Add provider-refresh and reminder-caveat guidance copy in frontend/src/components/profile/CalendarFeedLinksCard.tsx

**Checkpoint**: User Stories 1 and 2 work independently and together.

---

## Phase 5: User Story 3 - Protect personal feed access (Priority: P3)

**Goal**: Invalid/revoked links are denied, users can regenerate per-scope links, and access-loss rules revoke affected tokens immediately.

**Independent Test**: Validate invalid token denial, per-scope regeneration, den-access revocation, and pack-leave revocation of all user links.

### Tests for User Story 3

- [ ] T027 [P] [US3] Add e2e tests for invalid/revoked token denial and non-leaking errors in backend/test/calendar-feed-revocation.e2e-spec.ts
- [ ] T028 [P] [US3] Add e2e tests for den access-loss revocation and pack-leave full revocation in backend/test/calendar-feed-revocation.e2e-spec.ts
- [ ] T029 [P] [US3] Add e2e tests for POST /api/me/calendar-feeds/regenerate scope behavior in backend/test/calendar-feed-revocation.e2e-spec.ts

### Implementation for User Story 3

- [X] T030 [US3] Implement POST /api/me/calendar-feeds/regenerate endpoint in backend/src/api/calendar-feed.controller.ts
- [X] T031 [US3] Implement scope-specific regeneration and revocation-reason tracking in backend/src/services/calendar-feed-token.service.ts
- [X] T032 [US3] Implement den-access-loss token revocation flow in backend/src/services/den/den.service.ts
- [X] T033 [US3] Implement pack-leave revocation of pack+den tokens in backend/src/services/volunteer.service.ts
- [X] T034 [US3] Implement feed access outcome logging for success/denied requests in backend/src/services/calendar-feed.service.ts

**Checkpoint**: All user stories are independently functional and secure.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Cross-story hardening, docs, and final validation.

- [X] T035 [P] Update calendar feed API and behavior docs in docs/api-documentation.md
- [X] T036 [P] Update implementation runbook notes with reminder caveat and provider cadence in specs/011-calendar-feed-export/quickstart.md
- [ ] T037 Run full backend verification (typecheck, unit, e2e) and capture outcomes in backend/test-results.txt
- [ ] T038 Run frontend tests for profile calendar feed UI and capture outcomes in frontend/test-output.txt
- [X] T039 Security hardening pass for public feed endpoint headers and throttling behavior in backend/src/api/calendar-feed.controller.ts and backend/src/app.module.ts

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1): no dependencies.
- Foundational (Phase 2): depends on Setup and blocks all user stories.
- User Story phases (Phase 3-5): depend on Foundational completion.
- Polish (Phase 6): depends on completion of all target user stories.

### User Story Dependencies

- US1 (P1): starts after Foundational; no dependency on other stories.
- US2 (P2): starts after Foundational; depends on US1 feed endpoint/service groundwork.
- US3 (P3): starts after Foundational; can run in parallel with US2 after US1 controller/service baseline exists.

### Within Each User Story

- Write tests first and confirm they fail.
- Implement services before controllers and UI integration.
- Complete story verification before advancing.

## Parallel Opportunities

- Phase 1: T003 can run while backend stubs are created.
- Phase 2: T007 and T008 can run in parallel after schema decisions are set.
- US1: T011, T012, and T013 can run in parallel; T018 and T019 can run in parallel after T017 contract stabilizes.
- US2: T021, T022, and T023 can run in parallel.
- US3: T027, T028, and T029 can run in parallel.
- Polish: T035 and T036 can run in parallel.

## Parallel Example: User Story 1

- Run in parallel: T011 in backend/test/calendar-feed.e2e-spec.ts
- Run in parallel: T012 in backend/test/calendar-feed.e2e-spec.ts
- Run in parallel: T013 in frontend/src/test/components/profile/CalendarFeedLinksCard.test.tsx

## Parallel Example: User Story 3

- Run in parallel: T027 in backend/test/calendar-feed-revocation.e2e-spec.ts
- Run in parallel: T028 in backend/test/calendar-feed-revocation.e2e-spec.ts
- Run in parallel: T029 in backend/test/calendar-feed-revocation.e2e-spec.ts

## Implementation Strategy

### MVP First (US1)

1. Complete Phase 1 and Phase 2.
2. Complete Phase 3 (US1).
3. Validate US1 independently before expanding scope.

### Incremental Delivery

1. Deliver US1 (scoped subscriptions and profile links).
2. Deliver US2 (sync/update/reminder behavior).
3. Deliver US3 (revocation/regeneration hardening).
4. Finish with Phase 6 polish and full verification.

### Team Parallelism

1. Team completes Setup + Foundational together.
2. Then split by story:
   - Engineer A: US1/UI integration
   - Engineer B: US2 sync/reminder behavior
   - Engineer C: US3 revocation/security behavior
