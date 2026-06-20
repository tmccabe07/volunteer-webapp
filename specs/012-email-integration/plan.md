# Implementation Plan: Email Integration

**Branch**: `012-email-integration` | **Date**: 2026-06-20 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `/specs/012-email-integration/spec.md`

## Summary

Leaders and admins can trigger immediate transactional emails to parents (event notifications, completion summaries) and to volunteers (overdue task reminders). The backend wraps either the Resend SDK (production) or Nodemailer+Mailtrap SMTP (local dev) behind a single NestJS `MailService` so the transport is swapped via environment variables. All sends are logged with per-recipient outcomes. Peak volume is ~500 emails/week, well within Resend's free tier (3,000/month).

## Technical Context

**Language/Version**: TypeScript / Node.js 20, Next.js 14 (React 18)  
**Primary Dependencies**: NestJS 10, Prisma 7, Resend SDK (`resend`) — no additional transport library needed  
**Storage**: SQLite (dev) / PostgreSQL-compatible (prod) via Prisma — new `EmailLog` and `EmailRecipientLog` tables  
**Testing**: Jest + Supertest (backend e2e), React Testing Library (frontend)  
**Target Platform**: Linux server (backend), browser (frontend)  
**Project Type**: Web application (backend NestJS API + Next.js frontend)  
**Performance Goals**: Each send completes within 5 seconds for up to ~50 recipients  
**Constraints**: No background queue — sends are synchronous within the HTTP request. Cooldown enforcement prevents accidental duplicate sends.  
**Scale/Scope**: ~500 emails/week; single pack deployment

## Constitution Check

- No new third-party auth flows introduced.
- MailService abstraction keeps Resend/Mailtrap swap to environment config only — no forked code paths.
- EmailLog/EmailRecipientLog are append-only audit records — no soft-delete complexity needed.

## Project Structure

### Documentation (this feature)

```text
specs/012-email-integration/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Transport/SDK comparison notes
├── data-model.md        # EmailLog + EmailRecipientLog schema
├── quickstart.md        # Local Mailtrap setup + Resend prod config
├── contracts/           # API endpoint contracts
└── tasks.md             # Task breakdown (created separately)
```

### Source Code

```text
backend/
├── src/
│   ├── models/email/
│   │   └── email.dto.ts               # Request/response schemas
│   ├── services/
│   │   ├── mail.service.ts            # MailService abstraction (Resend / Mailtrap)
│   │   └── email-notification.service.ts  # Recipient resolution + send orchestration
│   └── api/
│       └── email-notification.controller.ts  # POST endpoints
├── prisma/
│   └── schema.prisma                  # EmailLog, EmailRecipientLog models
└── test/
    └── email-notification.e2e-spec.ts

frontend/
└── src/
    ├── components/shared/events/
    │   └── NotifyParentsButton.tsx    # Confirm + send UI for events
    └── components/admin/tasks/
        └── SendReminderButton.tsx     # Remind UI for overdue tasks
```

## Phase 0: Research

- [x] Confirm Resend SDK works without a verified domain in test/sandbox mode → use Mailtrap SMTP for local dev instead; Resend only in production.
- [x] Confirm Nodemailer supports Mailtrap SMTP → yes, standard SMTP transport.
- [x] Confirm parent email is already on the `Volunteer` table → yes, `email` field exists.
- [x] Confirm `AdminTask` has an assignee relation → NO direct assignee. Tasks are assigned to `VolunteerRole`s via `AdminTaskToRole`. Task reminder recipients = all active volunteers holding any of those roles via `VolunteerToRole`.

## Phase 1: Design Decisions

### Transport Strategy

```
EMAIL_TRANSPORT=console → logs subject, recipients, and HTML to stdout (local dev)
EMAIL_TRANSPORT=resend  → Resend SDK (production)
```

`MailService.send({ to, subject, html })` is the only call site. Controllers and services never reference Resend directly. No Nodemailer — console mode covers local dev without any extra library or account.

### Recipient Resolution

| Trigger | Recipient source |
|---|---|
| Pack-wide event notification | All volunteers with `authTier=PARENT` and an APPROVED `ParentChildLink`, plus all active `DenChief` records (`isActive=true, deletedAt=null`) |
| Den-scoped event notification | Parents of scouts with an active `DenMembership` in that den via `ParentChildLink` (APPROVED), plus `DenChief` records with an active `DenChiefAssignment` for that den (`validTo=null`) |
| Task reminder | All active volunteers holding any role assigned to the `AdminTask` via `AdminTaskToRole` → `VolunteerToRole` |
| Completion summary | Members in the event's scope — same resolution as event notification (parents/guardians + den chiefs) |

Deduplication: collect recipient IDs into a `Set` before sending; one email per unique `volunteerId`.

### Cooldown Enforcement

Stored on `EmailLog` — query for the most recent log entry for the same `(eventId | taskId, templateType)` and compare `sentAt` against the cooldown threshold before allowing a new send. Cooldown periods:

- Event notification: 1 hour (soft-warn to sender, not a hard block)
- Task reminder: 24 hours (hard block)
- Completion summary: no cooldown (typically sent once; show last-sent timestamp)

### Data Model (summary — see data-model.md for full schema)

```
EmailLog
  id, senderId, templateType, eventId?, taskId?,
  recipientCount, skippedCount, failedCount,
  sentAt, status (SENT | PARTIAL | FAILED)

EmailRecipientLog
  id, emailLogId, recipientEmail, recipientId,
  status (SENT | SKIPPED | FAILED), failureReason?, sentAt
```

### API Endpoints (summary — see contracts/ for full spec)

```
GET  /events/:id/email-preview              → LEADER, ADMIN (default recipient count)
POST /events/:id/notify-members             → LEADER, ADMIN (body: { additionalRecipientIds?: string[] })
POST /events/:id/send-completion-summary    → LEADER, ADMIN (body: { additionalRecipientIds?: string[] })
POST /admin-tasks/:id/send-reminder         → ADMIN
GET  /events/:id/email-logs                 → LEADER, ADMIN (audit view)
GET  /pack/members/search?q=                → LEADER, ADMIN (name search across all volunteers + den chiefs)
```

### Frontend

- `NotifyMembersDialog` on the event detail page (LEADER/ADMIN only): modal showing default recipient count, a searchable picker to add extra pack members beyond scope, cooldown warning if applicable, confirm button.
- `SendReminderButton` on the admin task detail page (ADMIN only): no additional recipient selection — task reminders go to role holders only.
- Completion summary on the event closeout page — same dialog pattern as notify, supporting additional recipients.

## Phase 2: Implementation Order

### Setup (no dependencies)

1. Install `resend` in backend.
2. Add `EmailLog` and `EmailRecipientLog` to Prisma schema; generate migration.
3. Create `MailService` with transport switch via `EMAIL_TRANSPORT` env var.

### Core service (depends on Setup)

4. Implement `EmailNotificationService`: recipient resolution, deduplication, cooldown check, send orchestration, logging.
5. Implement email HTML templates (event reminder, task reminder, completion summary) — plain but readable.

### API layer (depends on Core service)

6. Implement `EmailNotificationController` with the four endpoints; auth guards enforce LEADER/ADMIN.
7. Wire module into `AppModule`.

### Frontend (depends on API layer — can begin in parallel once contracts are stable)

8. `NotifyParentsButton`: preview call → confirmation dialog → send call → success/error toast.
9. `SendReminderButton`: send call → success/error/cooldown feedback.
10. Completion summary button on event complete page.

### Quickstart + docs

11. Document Mailtrap setup and Resend production config in `quickstart.md`.
12. Update `backend/README.md` and `.env.example` with new env vars.

## Parallel Opportunities

- Template HTML authoring can run in parallel with `MailService` implementation.
- Frontend components can be stubbed and wired once API contracts are written.
- `EmailNotificationService` recipient resolution can be tested in isolation before the controller exists.
