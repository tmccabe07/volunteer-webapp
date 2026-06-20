# Tasks: Email Integration

**Input**: Design documents from /specs/012-email-integration/
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/email-api.md, quickstart.md

**Tests**: Included and required per BDD-first constitution.

**Key schema finding**: AdminTask has no direct assignee — tasks are assigned to roles via AdminTaskToRole. Task reminder recipients = all active volunteers holding any of those roles.

## Format: [ID] [P?] [Story] Description

- [P] means the task can run in parallel (no blocking dependency on other in-progress tasks).
- [Story] maps to user story (US1, US2, US3).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Dependencies and data model wiring that block all user stories.

- [ ] T001 Install `resend` in backend/package.json
- [ ] T002 Add `EmailLog`, `EmailRecipientLog`, and enum types to backend/prisma/schema.prisma per data-model.md
- [ ] T003 Generate and apply Prisma migration for email log tables
- [ ] T004 Regenerate Prisma client
- [ ] T005 [P] Create `MailService` in backend/src/services/mail.service.ts — `EMAIL_TRANSPORT=resend` calls Resend SDK, `EMAIL_TRANSPORT=console` logs to stdout; exposes `send({ to, subject, html })` only
- [ ] T006 [P] Create `EmailNotificationModule` stub and wire into backend/src/app.module.ts
- [ ] T007 [P] Add email env vars (`EMAIL_TRANSPORT`, `RESEND_API_KEY`, `EMAIL_FROM`) to backend/.env.example and backend/README.md

**Checkpoint**: Schema applied, MailService works, module wired. User stories can proceed.

---

## Phase 2: User Story 1 — Leader sends event notification to parents (Priority: P1) 🎯 MVP

**Goal**: Leader clicks "Notify Members" on an event, parents in scope receive emails, send is logged.

**Independent Test**: Trigger notification on a den-scoped event in dev; confirm Mailtrap receives one email per unique parent of scouts in that den with correct event details.

### Tests for User Story 1

- [ ] T008 [P] [US1] Add e2e tests for `POST /events/:id/notify-members` — pack-wide and den-scoped recipient resolution, dedup, skip-on-no-email, log creation in backend/test/email-notification.e2e-spec.ts
- [ ] T009 [P] [US1] Add e2e tests for `GET /events/:id/email-preview` — correct count, cooldown flag in backend/test/email-notification.e2e-spec.ts

### Implementation for User Story 1

- [ ] T010 [US1] Implement recipient resolver in backend/src/services/email-notification.service.ts — pack-wide: all PARENT volunteers with approved ParentChildLink + all active DenChiefs; den-scoped: parents of scouts in the den via DenMembership → ParentChildLink + DenChiefs with an active DenChiefAssignment for that den; deduplicate by recipient id across both groups
- [ ] T011 [US1] Implement event notification HTML template (event title, date, time, location, sender name, pack name) in backend/src/services/email-notification.service.ts
- [ ] T012 [US1] Implement `GET /pack/members/search?q=` in backend/src/api/email-notification.controller.ts — name search across all active Volunteer and DenChief records; used by the additional recipient picker
- [ ] T013 [US1] Implement `POST /events/:id/notify-members` and `GET /events/:id/email-preview` in backend/src/api/email-notification.controller.ts — enforce LEADER/ADMIN auth, resolve scope recipients, merge and deduplicate with any `additionalRecipientIds` from request body, send via MailService, write EmailLog + EmailRecipientLog
- [ ] T014 [US1] Implement `GET /events/:id/email-logs` endpoint for audit history
- [ ] T015 [US1] Add `NotifyMembersDialog` component to frontend/src/components/shared/events/ — shows default recipient count from preview endpoint, searchable picker (calls `/pack/members/search`) to add extra recipients, cooldown warning, confirm button, success/error toast
- [ ] T016 [US1] Wire `NotifyMembersDialog` into the event detail page (frontend/src/app/events/[id]/page.tsx) — visible to LEADER/ADMIN only

**Checkpoint**: US1 independently functional and testable (MVP).

---

## Phase 3: User Story 2 — Admin sends overdue task reminders (Priority: P2)

**Goal**: Admin clicks "Send Reminder" on an overdue task; all volunteers holding the task's assigned roles receive an email; hard cooldown enforced at 24 hours.

**Independent Test**: Create an overdue task assigned to a role, trigger reminder, confirm Mailtrap receives emails for all volunteers with that role; verify 409 on second attempt within 24 hours.

### Tests for User Story 2

- [ ] T017 [P] [US2] Add e2e tests for `POST /admin-tasks/:id/send-reminder` — role-based recipient resolution, overdue gate, 24-hour cooldown block, no-email skip in backend/test/email-notification.e2e-spec.ts

### Implementation for User Story 2

- [ ] T018 [US2] Implement task reminder recipient resolver in backend/src/services/email-notification.service.ts — AdminTaskToRole → VolunteerRole → VolunteerToRole (active, removedAt=null) → Volunteer; deduplicate; skip if no email
- [ ] T019 [US2] Implement task reminder HTML template (task name, due date, app link, sender/pack name)
- [ ] T020 [US2] Implement `POST /admin-tasks/:id/send-reminder` in backend/src/api/email-notification.controller.ts — enforce ADMIN auth, gate on overdue/due-today, enforce 24-hour hard cooldown (409), resolve recipients, send, log
- [ ] T021 [US2] Add `SendReminderButton` component to frontend/src/components/admin/tasks/ — shows cooldown block message with last-sent time if within 24 hours, otherwise sends and shows confirmation
- [ ] T022 [US2] Wire `SendReminderButton` into the admin task detail page — visible to ADMIN only, hidden if task not overdue/due-today

**Checkpoint**: US1 and US2 independently functional.

---

## Phase 4: User Story 3 — Leader sends event completion summary (Priority: P3)

**Goal**: After marking an event complete, leader can send a summary email to parents in scope.

**Independent Test**: Mark an event complete, trigger completion summary, confirm Mailtrap receives emails for all parents in the event's scope.

### Tests for User Story 3

- [ ] T023 [P] [US3] Add e2e tests for `POST /events/:id/send-completion-summary` — gate on isComplete, scope-correct recipients, additionalRecipientIds merging, no-repeat guard in backend/test/email-notification.e2e-spec.ts

### Implementation for User Story 3

- [ ] T024 [US3] Implement completion summary HTML template (event name, date, thank-you copy, sender/pack name)
- [ ] T025 [US3] Implement `POST /events/:id/send-completion-summary` in backend/src/api/email-notification.controller.ts — enforce LEADER/ADMIN, gate on isComplete, reuse scope recipient resolver from T010, merge additionalRecipientIds, send, log
- [ ] T026 [US3] Add completion summary dialog to the event complete/closeout page — same NotifyMembersDialog pattern with additional recipient picker; shows last-sent timestamp if previously sent

**Checkpoint**: All three user stories independently functional.

---

## Phase 5: Polish & Cross-Cutting

- [ ] T027 [P] Verify specs/012-email-integration/quickstart.md accuracy against implementation
- [ ] T028 [P] Update docs/api-documentation.md with new email endpoints
- [ ] T029 Run full backend verification (typecheck + e2e) and capture outcomes
- [ ] T030 Run frontend tests for new email UI components

---

## Dependencies & Execution Order

- Phase 1 (Setup): no dependencies — start here.
- Phase 2 (US1): depends on Phase 1 complete.
- Phase 3 (US2): depends on Phase 1; can run in parallel with Phase 2 after T010 recipient resolver exists.
- Phase 4 (US3): depends on Phase 1 and T010 resolver; can run in parallel with US2.
- Phase 5 (Polish): depends on all user stories complete.

## Parallel Opportunities

- T005, T006, T007 can run in parallel after T001–T004 complete.
- T008 and T009 can run in parallel.
- T017 and T023 can run in parallel with US1 implementation once contracts are stable.
- T026 and T027 can run in parallel.

## Implementation Strategy

### MVP First (US1)

1. Complete Phase 1.
2. Complete Phase 2 (US1) — this alone delivers the highest-value use case.
3. Validate US1 end-to-end via console log before expanding.

### Incremental Delivery

1. US1 — event notifications to parents.
2. US2 — task reminders to role holders.
3. US3 — completion summaries.
4. Phase 5 polish.
