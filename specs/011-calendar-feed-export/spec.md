# Feature Specification: Calendar Subscription Feed Export

**Feature Branch**: `011-calendar-feed-export`  
**Created**: 2026-06-19  
**Status**: Draft  
**Input**: User description: "I want a feature for calendar integration. As a user, I want a way to export events into a calendar format for gmail."

## Clarifications

### Session 2026-06-19

- Q: Should calendar links be separated by pack vs den with one distinct den link per den? -> A: Yes. Provide separate links by scope: one pack-level link plus one distinct link per den.
- Q: What should happen to a den-specific link when user den access is removed, and how should den calendar naming handle yearly rank rollover? -> A: Immediately invalidate that den-specific link on access loss; use den name (not rank) for den-scoped calendar naming so rollover does not force renaming.
- Q: If a user leaves the pack, should access revocation apply to both pack and den links? -> A: Yes. Immediately revoke both the pack link and all den links for that user.
- Q: After subscribing to pack and den calendars, do users need to take action for new events to appear? -> A: No ongoing user action is required; Google pulls updates automatically on its refresh cycle.
- Q: Can calendar events include preset reminders? -> A: Yes, include ICS preset reminders as best effort, and clearly communicate that Google Calendar subscription feeds may ignore them so users should set calendar-level default notifications in Google for reliable reminders.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Subscribe to scoped events in personal calendar (Priority: P1)

As a logged-in user (parent, leader, den chief, or admin volunteer), I can copy a scope-specific calendar subscription link (pack or a specific den) and add it to Google Calendar so only the events for that scope appear automatically in my personal calendar app.

**Why this priority**: This is the core value of the feature and the main user outcome requested.

**Independent Test**: Can be fully tested by generating pack and den subscription links, adding one selected link to Google Calendar, and confirming only that scope's events appear in the subscribed calendar.

**Acceptance Scenarios**:

1. **Given** a user has at least one upcoming pack event, **When** they copy their pack subscription link and add it in Google Calendar using "From URL", **Then** the subscribed calendar is created and includes pack events only.
2. **Given** a user has no events, **When** they subscribe using the link, **Then** the subscription succeeds and shows an empty calendar without errors.
3. **Given** a user is interested in multiple dens, **When** they copy the link for each den, **Then** each den link is distinct and each subscribed calendar shows only that den's events.

---

### User Story 2 - Keep calendar data current through refreshes (Priority: P2)

As a subscribed user, I want event updates in the app to appear in my external calendar after provider refresh so my calendar remains useful without manual re-export.

**Why this priority**: Ongoing usefulness depends on update behavior, not just first-time export.

**Independent Test**: Can be tested by subscribing once, updating an event in the app, waiting for provider refresh, and confirming the update is reflected.

**Acceptance Scenarios**:

1. **Given** a user has already subscribed, **When** an existing event's time or details are updated in the app and the calendar provider refreshes, **Then** the subscribed calendar reflects the updated event details.
2. **Given** a user has already subscribed, **When** a future event is canceled in the app and the calendar provider refreshes, **Then** the canceled event no longer appears as an active upcoming event in the subscribed calendar.
3. **Given** a user has subscribed to both a pack link and a den link, **When** new events are added in either scope and Google performs its normal refresh, **Then** the new events appear in the corresponding subscribed calendars without additional user action.
4. **Given** an event includes preset reminder settings in the feed, **When** Google Calendar ignores feed-level reminder metadata, **Then** user guidance explains how to set reliable calendar-level notifications in Google.

---

### User Story 3 - Protect personal feed access (Priority: P3)

As a user, I want my subscription link to be difficult to guess and revocable so only people I share it with can view my event feed.

**Why this priority**: The feed contains user-specific calendar data and requires practical privacy controls.

**Independent Test**: Can be tested by attempting access with invalid tokens, then rotating a valid token and confirming old links stop working while new links continue working.

**Acceptance Scenarios**:

1. **Given** a request uses an invalid or unknown feed token, **When** the feed URL is requested, **Then** the system denies access and does not expose calendar data.
2. **Given** a user regenerates their feed link, **When** the old link is requested, **Then** it no longer returns calendar content.
3. **Given** a user regenerates their feed link, **When** the new link is requested, **Then** it returns that user's current calendar feed.

### Edge Cases

- A feed request is made for a valid scope token after the user is deactivated or loses visibility permissions for that scope.
- A user leaves the pack and previously issued pack and den links are still being polled by external calendar providers.
- Den rank designation changes during annual rollover while den identity remains the same.
- An event has missing optional fields (description, location, end time) and still must produce a valid calendar entry.
- Two events have identical titles and start times; each must still appear as a distinct event in the feed.
- A token that was previously valid is used repeatedly by external systems after revocation.
- External calendar providers refresh infrequently (for example, 8-24 hours), causing temporary differences between app data and subscribed calendar data.
- External providers may not honor feed-supplied event reminder metadata consistently.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide scope-specific calendar subscription URLs, including one pack-level link and one distinct den-level link per den the user can access.
- **FR-001a**: The system MUST support calendar feed link management for all authenticated user roles, including DEN_CHIEF accounts, with scope-limited event visibility.
- **FR-002**: The system MUST return a valid iCalendar feed when a request includes a valid active feed token.
- **FR-003**: The system MUST include only events that match the requested feed scope and that the user is authorized to see, occurring on or after the current date.
- **FR-004**: Each calendar entry in the feed MUST include, at minimum, an event title and start date/time when that data exists in the source event.
- **FR-005**: The system MUST include optional event details (such as end date/time, description, and location) when those fields are available.
- **FR-006**: The system MUST deny feed access for invalid, revoked, expired, or unknown tokens without revealing whether a user account exists.
- **FR-006a**: The system MUST immediately invalidate a den-scoped feed token when the token owner no longer has access to that den.
- **FR-006b**: The system MUST immediately invalidate the pack-scoped feed token and all den-scoped feed tokens for a user when that user leaves the pack.
- **FR-007**: Users MUST be able to regenerate a scope-specific feed token, and regeneration MUST immediately invalidate previously issued links for that same scope.
- **FR-008**: The system MUST ensure each feed response contains only events visible to the token owner for that specific scope and MUST NOT include events from other scopes or users.
- **FR-008a**: Den-scoped calendar naming exposed to users MUST use den name only and MUST NOT include rank labels so yearly rank rollover does not require link replacement.
- **FR-009**: The system MUST expose clear user-facing guidance that external calendar sync timing is controlled by the calendar provider and may be delayed.
- **FR-010**: The system MUST generate feed responses in a way that external providers can repeatedly poll without requiring user interaction after initial subscription.
- **FR-011**: Den-scoped subscription links MUST remain stable across yearly rollover when the underlying den identity remains the same.
- **FR-012**: After initial subscription, users MUST NOT be required to manually refresh or re-subscribe for routine event create, update, or cancel changes to appear; updates are delivered by provider polling cadence.
- **FR-013**: The system MUST include preset event reminder metadata in generated iCalendar feeds when reminder settings are configured.
- **FR-014**: The system MUST provide user-facing guidance that subscribed calendar providers (including Google Calendar) may ignore feed-level reminder metadata and that reliable reminders should be configured via calendar-level notification defaults in the provider UI.

### Key Entities *(include if feature involves data)*

- **Calendar Feed Token**: A unique, user-associated and scope-associated credential embedded in a subscription URL; has scope type (pack or den), optional scope identifier for den links, status (active/revoked), creation time, and last rotation time.
- **Calendar Subscription Link**: The user-visible, scope-specific URL derived from the feed token and used by external calendar providers to pull feed data.
- **Exportable Event**: A user-visible event record represented in the feed with fields such as scope, title, start date/time, optional end date/time, optional description, optional location, and cancellation status.
- **Feed Access Request**: A pull request from an external calendar provider or user agent that resolves token validity and returns either calendar data or an access denial.

## Assumptions & Dependencies

- Users already have an authenticated way in the product UI to view and manage personal settings where their subscription link can be shown.
- Google Calendar and similar providers support iCalendar URL subscription and pull-based refresh behavior.
- Event visibility and scope assignment rules already exist and can be reused to determine which events appear in each scoped feed.
- The feature does not require push-based real-time sync; provider-controlled polling is accepted behavior.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 90% of users in pilot validation can complete subscription setup in Google Calendar in under 3 minutes using in-app instructions.
- **SC-002**: 100% of valid feed URL requests return a parsable iCalendar payload during acceptance testing.
- **SC-003**: 100% of invalid or revoked token requests are denied without exposing user-identifying information.
- **SC-004**: In staged validation, event create/update/cancel changes appear in subscribed calendars on the provider's next refresh cycle without requiring user re-subscription.
- **SC-005**: Support requests about "calendar export not updating instantly" decrease by at least 40% after publishing explicit sync-delay guidance.
