# Feature Specification: Retroactive Event Credit

**Feature Branch**: `006-retroactive-event-credit`  
**Created**: May 6, 2026  
**Status**: Draft  
**Input**: User description: "Allow leaders to give credit to volunteers for past events even if they had not created the event and/or the volunteer had not signed up for an event"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create Past Event and Award Points (Priority: P1)

As a den leader or committee member, I can create an event with a past date and then mark it complete to award points to volunteers who participated. This covers the scenario where I forgot to set up the event beforehand but still need to recognize volunteer contributions.

**Why this priority**: This is the core functionality - without the ability to create events with past dates, leaders cannot retroactively award credit through the normal event workflow. This directly addresses the primary use case of "forgot to create the event ahead of time."

**Independent Test**: Can be fully tested by a leader creating an event dated in the past, adding volunteers to activity slots, marking it complete, and verifying points are awarded correctly. Delivers immediate value by allowing historical event recording and point distribution.

**Acceptance Scenarios**:

1. **Given** I am a den leader and an event happened yesterday that I forgot to create in advance, **When** I create a new event with yesterday's date, **Then** the system accepts the past date and creates the event successfully
2. **Given** I created a retroactive event for last week's den meeting, **When** I add volunteers to activity slots and mark the event complete, **Then** points are awarded to those volunteers and their point balances are updated
3. **Given** I am viewing the list of events, **When** I see events created with past dates, **Then** they are clearly marked or labeled as retroactive entries for audit purposes
4. **Given** I am a parent volunteer viewing my point history, **When** I receive points from a retroactive event, **Then** I can see the event details and when the points were awarded

---

### User Story 2 - Award Credit Without Pre-signup (Priority: P1)

As a den leader or committee member, I can mark an event complete and manually add volunteers who participated but didn't sign up in advance. This covers volunteers who showed up unexpectedly or when the sign-up wasn't used.

**Why this priority**: This is equally critical as it addresses the second part of the use case - "more volunteers participated than signed up." The existing system already supports this through the `manualVolunteers` feature, but it needs to work seamlessly with retroactive events.

**Independent Test**: Can be fully tested by creating an event (past or future), marking it complete, adding volunteers manually who weren't in the sign-up list, and verifying they receive appropriate points. Works independently of the retroactive date feature.

**Acceptance Scenarios**:

1. **Given** I have an event (past or future) with 2 volunteers signed up, **When** I mark it complete and manually add 3 additional volunteers who helped but didn't sign up, **Then** all 5 volunteers receive points for their respective activities
2. **Given** I created an event but no volunteers signed up in advance, **When** I mark the event complete and manually add all volunteers who actually participated, **Then** points are correctly awarded to each volunteer
3. **Given** I am marking an event complete with manual volunteers, **When** I select a volunteer and activity slot, **Then** the system prevents me from adding duplicate entries (same volunteer to same activity slot)

---

### User Story 3 - Audit Trail for Retroactive Credits (Priority: P2)

As an administrator, I can view an audit trail that distinguishes between advance-planned events and retroactively created events, including who created them and when.

**Why this priority**: Important for accountability and preventing abuse, but the core functionality (P1 stories) can work without explicit audit UI. The data is already captured in the database (createdAt timestamps), so this is primarily about surfacing it.

**Independent Test**: Can be fully tested by creating several events (some future, some past), then viewing an admin report or event list that shows creation timestamps, event dates, and flags retroactive entries. Delivers value by providing oversight capability.

**Acceptance Scenarios**:

1. **Given** I am an administrator viewing event history, **When** I look at an event that was created after its event date, **Then** I can see it's marked as "Retroactive" with the original event date and the creation date
2. **Given** I am reviewing point awards, **When** I filter or sort by retroactive events, **Then** I can see all events where the creation date is after the event date
3. **Given** I want to verify point integrity, **When** I view a volunteer's point history, **Then** I can see which points came from retroactive events versus advance-planned events

---

### User Story 4 - Retroactive Event Validation (Priority: P3)

As a den leader creating a retroactive event, I receive helpful validation that ensures the event date is reasonable (not too far in the past) and all required information is complete.

**Why this priority**: Nice-to-have quality-of-life improvement. The system can function without strict validation on how far back events can be dated. Leaders are trusted users (Tier 2+), so basic validation is sufficient.

**Independent Test**: Can be fully tested by attempting to create events with various past dates (yesterday, last month, last year, 10 years ago) and verifying appropriate feedback. Can be implemented independently as a validation layer.

**Acceptance Scenarios**:

1. **Given** I am creating an event with a past date, **When** the date is within the current scouting year, **Then** the event is created without warnings
2. **Given** I am creating an event with a past date, **When** the date is before the current scouting year start date, **Then** the system shows a warning message and requires explicit confirmation before allowing the event to be created
3. **Given** I am creating a retroactive event, **When** I omit required fields like title or activity slots, **Then** I receive the same validation errors as creating a future event

---

### Edge Cases

- What happens when a leader creates a retroactive event for a date that already has an event with the same title and rank level? (Allow it - legitimate to have multiple events on same day)
- What happens if a volunteer's point balance would change for a past leaderboard snapshot? (Don't update historical snapshots - they represent point-in-time accuracy)
- What happens if a retroactive event is created for a date before a volunteer joined the system? (Allow it - the volunteer may have participated before creating their profile)
- What happens if a leader tries to add a manual volunteer to an event that is not yet marked complete? (Prevent this - manual volunteers can only be added during the completion step)
- What happens if an event is created with past date but marked as recurring? (Use standard recurring logic - future occurrences are generated normally)
- What happens if a leader tries to edit a retroactive event after it's marked complete? (Follow existing rules - completed events cannot be edited, must revoke and recreate)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow leaders (Tier 2+) to create events with dates in the past
- **FR-002**: System MUST record the creation timestamp separately from the event date to maintain audit trail
- **FR-003**: System MUST visually distinguish retroactive events (where createdAt > eventDate) in event lists and reports
- **FR-004**: System MUST allow leaders to mark retroactive events as complete and award points using the existing completion workflow
- **FR-005**: System MUST support adding manual volunteers during event completion for any event (past or future dates)
- **FR-006**: System MUST validate that manual volunteers are not duplicated (same volunteer cannot be added to same activity slot twice)
- **FR-007**: System MUST apply the same point values and rules to retroactive events as regular events
- **FR-008**: System MUST include retroactive event participation in volunteer point histories with appropriate date attribution
- **FR-009**: System MUST NOT modify historical leaderboard snapshots when retroactive points are awarded
- **FR-010**: System MUST prevent creating events with past dates for parent volunteers (Tier 1) - only Tier 2+ can create any events
- **FR-011**: System MUST include information about retroactive events in point event records (reason field, metadata)
- **FR-012**: System MUST allow standard event operations on retroactive events (view, delete if not complete, mark complete)

### Key Entities

- **Event**: Existing entity with added context - when `createdAt` timestamp is after `eventDate`, the event is considered "retroactive"
- **ActivitySlot**: Existing entity - no changes needed, works the same for retroactive events
- **Signup**: Existing entity - can be created retroactively when event is marked complete via `manualVolunteers`
- **PointEvent**: Existing entity - captures points awarded from retroactive events, includes reason and activityType for audit trail
- **VolunteerPointBalance**: Existing entity - updated when retroactive points are awarded, but historical snapshots remain unchanged

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Leaders can create and complete a retroactive event (from initial creation to point distribution) in under 3 minutes
- **SC-002**: 100% of retroactive events are clearly identifiable in event listings and reports through visual indicators
- **SC-003**: Volunteers receive the correct point values for retroactive events identical to what they would have received if the event was planned in advance
- **SC-004**: Point history displays show retroactive event participations with clear attribution to the original event date
- **SC-005**: System prevents all duplicate manual volunteer assignments (0% success rate for duplicate attempts)
- **SC-006**: Administrators can audit retroactive events by comparing creation timestamps to event dates in reports
- **SC-007**: Retroactive point awards appear in volunteer profiles within 1 second of event completion
- **SC-008**: Historical leaderboard snapshots remain unchanged when retroactive points are awarded (data integrity maintained)

## Assumptions

- Leaders (Tier 2+) are trusted users who will not abuse retroactive event creation
- Past event dates are reasonable (within recent history, not decades ago) - validation of specific time limits will be determined during planning
- The existing event workflow (create → add slots → volunteers sign up or are added manually → mark complete → points awarded) is appropriate for retroactive events
- Current scouting year boundaries are defined in PackConfig and can be used for validation context
- Visual indicators for retroactive events (such as badges or icons) are sufficient - no approval workflow is needed
- The existing point revocation feature can be used if retroactive points need to be corrected
