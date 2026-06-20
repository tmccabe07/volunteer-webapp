# Feature Specification: Email Integration

**Feature Branch**: `012-email-integration`  
**Created**: 2026-06-20  
**Status**: Draft  
**Input**: User description: "Leaders should be able to send emails to parents for upcoming events, closed events, and overdue administrative tasks. Peak volume ~500/week. Use Resend SDK on backend; Mailtrap for local dev. Sends are immediate — no digest queue."

## Clarifications

### Session 2026-06-20

- Q: Should emails be sent to the full pack or scoped to a den? -> A: Scoped to the event's scope — pack-wide events go to all parents, den-scoped events go to parents of scouts in that den.
- Q: Who can trigger outbound emails? -> A: LEADER and ADMIN roles only. Parents cannot send emails.
- Q: Should there be an unsubscribe mechanism? -> A: Not required initially — this is a closed-membership app with operational (non-marketing) email only. Revisit if volume or regulatory requirements change.
- Q: Should sent emails be logged for audit purposes? -> A: Yes. Log sender, recipients, template type, and associated event or task.
- Q: Resend + Nodemailer or Resend SDK directly? -> A: Resend SDK directly — simpler, no SMTP adapter needed.
- Q: How to test locally without a deployed domain? -> A: Mailtrap for local dev (captures sends without delivering); Resend for production.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Leader sends event notification to members (Priority: P1)

As a leader or admin, I can open an event and send a notification email to all members within that event's scope — parents/guardians of scouts and assigned den chiefs — so everyone relevant is informed without me manually finding and emailing each person.

**Why this priority**: This is the highest-value use case — event communication is the most frequent leader action and the primary reason for this feature.

**Independent Test**: Can be fully tested by a leader triggering a notification on a den-scoped event and confirming that emails arrive (console log in dev) for parents of scouts in that den and den chiefs assigned to that den, with correct event details in the body.

**Acceptance Scenarios**:

1. **Given** a leader views a future den-scoped event, **When** they click "Notify Members" and confirm, **Then** one email is sent to each parent/guardian of a scout in that den and each den chief assigned to that den, with the event title, date, time, and location.
2. **Given** a leader views a pack-wide event, **When** they send a notification, **Then** all parents/guardians with approved scout links in the pack and all active den chiefs receive the email.
3. **Given** a leader opens the notification dialog, **When** they search for a pack member not in the default scope (e.g. a parent whose child has aged out), **Then** they can add that person as an additional recipient and that person receives the email alongside the default recipients.
4. **Given** a den-scoped event has no scouts enrolled in the den, **When** a leader clicks "Notify Members", **Then** the system informs the leader that there are no default recipients but still allows them to add individuals manually and send.
5. **Given** a leader has already sent a notification for an event, **When** they attempt to send again, **Then** the system warns about a duplicate send but allows the leader to confirm and proceed.

---

### User Story 2 - Admin sends overdue task reminders to volunteers (Priority: P2)

As an admin, I can trigger a reminder email to a volunteer who has an overdue administrative task assigned to them, so I do not need to manually track down individuals.

**Why this priority**: Secondary use case but important for pack administration — reduces manual follow-up burden on the admin.

**Independent Test**: Can be tested by assigning an overdue task to a volunteer, triggering a reminder from the admin task detail view, and confirming the email arrives in Mailtrap with the task name and due date.

**Acceptance Scenarios**:

1. **Given** an admin views an overdue task assigned to a volunteer, **When** they click "Send Reminder", **Then** the assigned volunteer receives an email with the task name, due date, and a link back to the app.
2. **Given** a task is not yet overdue, **When** an admin views the task detail, **Then** the "Send Reminder" action is not available (only available for overdue or due-today tasks).
3. **Given** an admin has sent a reminder for a task in the last 24 hours, **When** they attempt to send again, **Then** the system blocks the send and displays a cooldown message.

---

### User Story 3 - Leader sends event completion summary to attendees (Priority: P3)

As a leader, I can send a post-event thank-you or summary email to parents of scouts who were marked as attended on a completed event.

**Why this priority**: Nice-to-have engagement touchpoint after events; lower priority than proactive notifications.

**Independent Test**: Can be tested by completing an event with attendance recorded, triggering the completion summary, and confirming emails arrive only for parents of scouts with an attendance record on that event.

**Acceptance Scenarios**:

1. **Given** an event has been marked complete with at least one attendee, **When** a leader sends a completion summary, **Then** parents of attended scouts receive a summary email referencing the event.
2. **Given** an event has no attendance records, **When** a leader views the completed event, **Then** the "Send Completion Summary" option is disabled or hidden.
3. **Given** a completion summary has already been sent for an event, **When** the leader views the event, **Then** the last sent timestamp is shown alongside the send option.

---

### Edge Cases

- A parent has no email address on record — skip that recipient and log the skip without failing the whole send.
- A volunteer assigned to a task has no email address — surface an error to the admin before confirming the send.
- A parent is linked to scouts in two different dens and both receive a pack-wide notification — send only one email to that parent, not two.
- A leader is also a parent and falls within the recipient list — include or exclude based on whether they have an active parent link (include if they do).
- Resend API returns an error for one recipient mid-batch — log the failure per recipient; do not silently swallow.
- An event is deleted after a notification is sent — the email log retains the reference even if the event no longer exists.
- Rate limit: a leader rapidly clicks "Notify" multiple times before the first send completes — debounce on the frontend and enforce a per-event cooldown on the backend.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Only users with LEADER or ADMIN auth tier MUST be able to trigger outbound emails.
- **FR-002**: Event notification recipients default to scope resolution — for den-scoped events: parents/guardians of scouts in that den plus den chiefs assigned to that den; for pack-wide events: all parents/guardians with approved scout links plus all active den chiefs.
- **FR-002a**: Leaders MUST be able to add any active pack member (volunteer or den chief) as an additional recipient beyond the default scope, by searching within the confirmation dialog before sending.
- **FR-002b**: The system MUST deduplicate recipients so that a member in both the default scope and the additional list receives only one email.
- **FR-003**: Each triggered send MUST be logged with: sender ID, template type, recipient count, associated event or task ID, timestamp, and per-recipient delivery status.
- **FR-004**: The system MUST deduplicate recipients so a parent linked to multiple scouts in scope receives only one email per send action.
- **FR-005**: The system MUST skip recipients with no email address and log each skip without failing the overall send.
- **FR-006**: The system MUST enforce a per-event/per-task cooldown period (minimum 1 hour for events, 24 hours for task reminders) to prevent accidental duplicate sends.
- **FR-007**: Leaders MUST be warned (but not blocked) when sending a second notification for the same event within the cooldown window; admins MUST be blocked from sending a second task reminder within the cooldown window.
- **FR-008**: Email content MUST include the sender's name and pack name so recipients can identify the source.
- **FR-009**: The system MUST use the Resend SDK in production and a configurable SMTP adapter (Mailtrap) in local development, controlled by environment variables.
- **FR-010**: The backend MUST expose a NestJS MailService abstraction so the transport (Resend vs. Mailtrap SMTP) is swapped via config without changing call sites.
- **FR-011**: Task reminder emails MUST only be triggerable for tasks that are overdue or due today.
- **FR-012**: Completion summary emails MUST only be triggerable for events that are marked complete and have at least one attendance record.
- **FR-013**: The system MUST surface a recipient count preview to the sender before they confirm a send.
- **FR-014**: Individual per-recipient send failures from the email provider MUST be logged but MUST NOT prevent other recipients in the same batch from receiving their emails.

### Key Entities

- **EmailLog**: Record of a triggered send — sender, template type, event or task reference, recipient count, timestamp, and overall status.
- **EmailRecipientLog**: Per-recipient record within a send — email address, delivery status (sent, skipped, failed), and failure reason if applicable.
- **MailService**: Backend service abstraction wrapping either the Resend SDK or Nodemailer/SMTP depending on environment config.
- **Email Template**: Parameterised HTML/text layout for each notification type (event reminder, task reminder, completion summary).

## Assumptions & Dependencies

- Parent email addresses are already stored on Volunteer records in the database.
- Parent–scout links (with APPROVED status) are the source of truth for recipient scope resolution.
- Pack configuration (pack name, leader name) is available via the existing PackConfig model.
- Resend account and API key will be provisioned before production deployment; Mailtrap credentials used for all local and pre-production testing.
- A verified sending domain will be configured in Resend at deploy time (not required for local dev).
- No unsubscribe link is required for the initial version given the closed-membership, operational nature of these emails.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A leader can trigger an event notification and have emails delivered to Mailtrap within 5 seconds in the local dev environment.
- **SC-002**: 100% of send attempts are logged with recipient count and per-recipient outcome before the API response returns.
- **SC-003**: Duplicate send protection prevents accidental re-sends in 100% of cases within the cooldown window for task reminders.
- **SC-004**: Zero emails are sent to recipients with no email address on file; all skips are logged.
- **SC-005**: Swapping from Mailtrap to Resend requires only an environment variable change — no code changes needed.
