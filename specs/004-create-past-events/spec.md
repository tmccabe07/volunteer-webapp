# Feature Specification: Create Past Events for Volunteer Credit

**Feature Branch**: `004-create-past-events`  
**Created**: May 3, 2026  
**Status**: Draft  
**Input**: User description: "as a leader, if I forgot to create an event that already happened, I want to be able to do that to give credit to volunteers"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create Event with Past Date (Priority: P1)

A leader realizes they forgot to log an event that occurred last week. They need to create the event record with the actual date it happened so the system has accurate historical data.

**Why this priority**: This is the core functionality - without the ability to create past-dated events, the entire feature cannot work. It's the minimum viable capability that delivers value.

**Independent Test**: Can be fully tested by creating an event with a past date and verifying it appears in the event list with the correct historical date. Delivers value by ensuring accurate event records even when logged late.

**Acceptance Scenarios**:

1. **Given** a leader is on the create event page, **When** they enter event details with a date in the past (e.g., last week), **Then** the event is created successfully with that past date
2. **Given** a leader creates an event dated 2 weeks ago, **When** they view the events list, **Then** the event appears with the correct past date in chronological order
3. **Given** a leader attempts to create an event with a future date, **When** they submit the form, **Then** the event is created normally (existing functionality remains unchanged)

---

### User Story 2 - Record Volunteer Attendance for Past Event (Priority: P2)

After creating a past event, the leader needs to indicate which volunteers attended so they receive appropriate recognition. The leader remembers who was present and records their participation.

**Why this priority**: Recording attendance is essential for giving credit, but it depends on the event existing first (P1). This is the second critical piece that makes the feature useful.

**Independent Test**: Can be tested by creating a past event, adding volunteer attendance records, and verifying those volunteers are marked as having attended. Delivers value by ensuring volunteers get proper credit for their past participation.

**Acceptance Scenarios**:

1. **Given** a past event exists, **When** a leader marks specific volunteers as attended, **Then** those volunteers are recorded as participants for that event
2. **Given** a leader is recording attendance for a past event, **When** they search for volunteers by name, **Then** the system displays matching volunteers to add to the event
3. **Given** attendance has been recorded for a past event, **When** a leader views the event details, **Then** the list of attendees is displayed accurately

---

### User Story 3 - Automatic Credit Calculation for Past Events (Priority: P3)

Once volunteers are marked as attended for the past event, the system automatically calculates and applies the appropriate points or recognition credit to their profiles, just as it would for a current event.

**Why this priority**: While important for completeness, this could be a manual process initially if needed. It enhances usability but the core value (accurate historical records and attendance tracking) is delivered by P1 and P2.

**Independent Test**: Can be tested by verifying that after recording attendance for a past event, volunteer profiles show updated point totals or achievement progress. Delivers value by automating recognition without requiring manual credit adjustments.

**Acceptance Scenarios**:

1. **Given** volunteers are marked as attended for a past event, **When** the attendance is saved, **Then** their point totals are updated automatically based on the event's point value
2. **Given** a volunteer had 100 points before being added to a past event worth 10 points, **When** their attendance is recorded, **Then** their total becomes 110 points
3. **Given** a past event contributes to a volunteer achievement, **When** attendance is recorded, **Then** the achievement progress is updated accordingly

---

### Edge Cases

- What happens when a leader creates an event dated before the volunteer system was implemented?
- How does the system handle creating a past event with the same name and date as an existing event?
- What happens if a volunteer's account was created after the past event date but they're added as an attendee?
- How far back can events be created (e.g., is there a 1-year limit, 6-month limit, or unlimited)?
- What happens when a past event is created that would cause a volunteer to achieve a milestone they've already passed?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow leaders to create events with dates in the past (any date before today)
- **FR-002**: System MUST accept the same event data for past events as current events (name, description, date, location, point value)
- **FR-003**: System MUST allow leaders to record which volunteers attended past events
- **FR-004**: System MUST calculate and apply point credits automatically when attendance is recorded for past events
- **FR-005**: System MUST display past events in chronological order within event lists (not just creation order)
- **FR-006**: System MUST validate that past event dates are not more than 1 year old (365 days before today)
- **FR-007**: System MUST prevent duplicate events by checking for events with identical name and date before allowing creation
- **FR-008**: System MUST audit log when events are created with past dates, recording who created them and when
- **FR-009**: System MUST allow only users with leader role or higher to create past-dated events

### Key Entities

- **Event**: Represents a volunteer activity. Key attributes include name, description, date (now can be past), location, point value. Related to volunteers through attendance records.
- **Attendance Record**: Links volunteers to events they participated in. Attributes include volunteer reference, event reference, timestamp of when recorded, and who recorded it (especially important for retroactive entries).
- **Audit Log Entry**: Tracks creation of past events. Attributes include event reference, creation timestamp, creator user reference, and indication that event date is in the past.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Leaders can create events with dates up to 1 year in the past within 60 seconds of starting the creation process
- **SC-002**: Volunteer point totals reflect retroactive credit within 5 seconds of recording past event attendance
- **SC-003**: 100% of past events created are captured in audit logs with creator and creation timestamp
- **SC-004**: Past events appear correctly in chronological order when viewing event history
- **SC-005**: System maintains data integrity with no duplicate point credits when past events are created
