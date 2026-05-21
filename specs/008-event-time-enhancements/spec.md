# Feature Specification: Enhanced Event Management - Time and Activity Details

**Feature Branch**: `008-event-time-enhancements`  
**Created**: 2026-05-19  
**Status**: Draft  
**Input**: User description: "I want to update the capabilities around events management. I want the ability to add an end time, not just a beginning time, where end time is optional, and also to add a full day option that will mean that I don't need to enter a start or end time. Also, while activity slots are populated based on the pre-configured list of available activity slots, when I create an event, I also want the ability to create activity slot descriptions; for example, the pre-configured list may say 'event volunteer', but I may want to specify 'Run Lion station for safety'. Similarly, just like tasks have ability to add steps, I want the ability to optionally add steps, for instance for 'Run Lion station for safety' I could include steps like '1. gather the lions in a circle 2. hand out the role placards 3. explain the game which is to go to the right role based on the scenario etc.'."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Specify Event End Time (Priority: P1)

As an event organizer, I want to specify both start and end times for an event so that volunteers know exactly how long the event will last and can plan their schedules accordingly.

**Why this priority**: This is the most frequently requested feature. Many events have defined durations, and volunteers need to know when they'll be finished. Without an end time, volunteers must either guess the duration or contact organizers separately, creating unnecessary friction.

**Independent Test**: Can be fully tested by creating an event with both start time (e.g., "2:00 PM") and end time (e.g., "4:00 PM"), verifying both times display on the event details page, and confirming volunteers can see the duration when signing up.

**Acceptance Scenarios**:

1. **Given** I am creating a new event, **When** I enter a start time and an optional end time, **Then** both times are saved and displayed on the event details
2. **Given** an event has both start and end times, **When** a volunteer views the event, **Then** they see both times clearly labeled (e.g., "2:00 PM - 4:00 PM")
3. **Given** I am editing an existing event, **When** I add or update the end time, **Then** the changes are saved and reflected immediately
4. **Given** I create an event with only a start time (no end time), **When** I save the event, **Then** the end time field remains empty and only start time is displayed

---

### User Story 2 - Mark Events as Full Day (Priority: P2)

As an event organizer, I want to mark an event as "full day" so that I don't need to specify exact start and end times for all-day activities like pack campouts or day trips.

**Why this priority**: While less common than timed events, full-day events are a significant category (campouts, day trips, all-day service projects). This eliminates the awkward workaround of entering arbitrary times like "12:00 AM - 11:59 PM".

**Independent Test**: Can be fully tested by creating an event with the "full day" option checked, verifying no time fields are required, and confirming the event displays as "All Day" on the event details and calendar views.

**Acceptance Scenarios**:

1. **Given** I am creating a new event, **When** I check the "full day" option, **Then** the start time and end time fields become optional/hidden
2. **Given** an event is marked as full day, **When** a volunteer views the event, **Then** they see "All Day" or similar indication instead of specific times
3. **Given** I am editing an event with specific times, **When** I check "full day", **Then** the time fields are cleared and the event becomes a full-day event
4. **Given** I am editing a full-day event, **When** I uncheck "full day", **Then** the time fields become required and I can specify specific start/end times

---

### User Story 3 - Customize Activity Slot Descriptions (Priority: P3)

As an event organizer, I want to provide custom descriptions for activity slots when creating an event so that volunteers understand exactly what their specific responsibilities will be beyond the generic activity type name.

**Why this priority**: This adds valuable context for volunteers. While the pre-configured activity types provide a foundation, event-specific descriptions help volunteers understand what they'll actually be doing and make more informed signup decisions.

**Independent Test**: Can be fully tested by creating an event with an activity slot based on a pre-configured type (e.g., "Event Volunteer"), adding a custom description (e.g., "Run Lion station for safety"), and verifying the custom description displays when volunteers view signup options.

**Acceptance Scenarios**:

1. **Given** I am creating an event with activity slots, **When** I select a pre-configured activity type, **Then** I can optionally add a custom description for that slot
2. **Given** I have added a custom description to an activity slot, **When** volunteers view the event, **Then** they see both the activity type and the custom description
3. **Given** an activity slot has a custom description, **When** I edit the event, **Then** I can update or remove the custom description
4. **Given** I create an activity slot without a custom description, **When** volunteers view the event, **Then** they see only the standard activity type name
5. **Given** multiple activity slots of the same type exist, **When** each has a different custom description, **Then** volunteers can distinguish between them clearly

---

### User Story 4 - Add Steps to Activity Slots (Priority: P3)

As an event organizer, I want to add optional step-by-step instructions to activity slots so that volunteers know exactly what they need to do and in what order, reducing confusion on event day.

**Why this priority**: This provides the highest level of detail for complex volunteer roles. While helpful, it's not critical for most events. Event organizers can prioritize adding steps only where needed, making this a nice-to-have enhancement rather than a must-have.

**Independent Test**: Can be fully tested by creating an activity slot with custom description and adding numbered steps (e.g., "1. Gather lions in a circle 2. Hand out role placards 3. Explain the game"), verifying steps display in order when volunteers view the signup, and confirming steps are optional.

**Acceptance Scenarios**:

1. **Given** I am creating an activity slot with a custom description, **When** I choose to add steps, **Then** I can add multiple numbered steps in sequence
2. **Given** I have added steps to an activity slot, **When** volunteers view the activity details, **Then** they see the steps listed in order with clear numbering
3. **Given** an activity slot has steps, **When** I edit the event, **Then** I can add, remove, reorder, or modify individual steps
4. **Given** I create an activity slot without adding steps, **When** volunteers view it, **Then** they see only the description without a steps section
5. **Given** an activity slot has many steps (e.g., 10+), **When** displayed, **Then** the steps remain readable and well-formatted

---

### Edge Cases

- What happens when an event has an end time that is earlier than the start time? (System should validate and show an error)
- How does the system handle events that span midnight (e.g., start 11:00 PM, end 1:00 AM)? (Should allow but may need date component)
- What happens if an organizer toggles between full-day and timed event multiple times while editing? (Times should be preserved when unchecking full-day option if previously entered)
- How are activity slot steps numbered if an organizer deletes a middle step? (Remaining steps should renumber automatically)
- What is the maximum number of steps allowed per activity slot? (Should have a reasonable limit, e.g., 20 steps)
- What is the maximum length of an activity slot description? (Should have a character limit, e.g., 500 characters)
- How does the system handle very long step text? (Should have per-step character limit, e.g., 200 characters)
- What happens if an activity slot has steps but no custom description? (Should still display steps with the standard activity type name)

## Requirements *(mandatory)*

### Functional Requirements

**Event Timing**

- **FR-001**: System MUST allow organizers to specify an optional end time for events in addition to the existing start time
- **FR-002**: System MUST validate that end time is after start time when both are provided
- **FR-003**: System MUST allow organizers to mark an event as "full day" which makes start and end times optional
- **FR-004**: System MUST display time information appropriately based on what is provided (start only, start-end range, or "All Day")
- **FR-005**: System MUST preserve existing start time when toggling between timed and full-day event modes during editing
- **FR-006**: System MUST display event duration to volunteers when both start and end times are specified

**Activity Slot Descriptions**

- **FR-007**: System MUST allow organizers to add an optional custom description to each activity slot when creating or editing an event
- **FR-008**: System MUST display activity slot custom descriptions to volunteers viewing signup options
- **FR-009**: System MUST display both the pre-configured activity type name and custom description when both exist
- **FR-010**: System MUST allow custom descriptions up to 500 characters in length
- **FR-011**: System MUST preserve the relationship between activity slots and their pre-configured activity types even when custom descriptions are added

**Activity Slot Steps**

- **FR-012**: System MUST allow organizers to add optional numbered steps to activity slots
- **FR-013**: System MUST display steps in sequential order (1, 2, 3, etc.)
- **FR-014**: System MUST automatically renumber steps when steps are added, removed, or reordered
- **FR-015**: System MUST allow up to 20 steps per activity slot
- **FR-016**: System MUST limit each step to 200 characters
- **FR-017**: System MUST allow organizers to add, remove, edit, and reorder steps when editing an event
- **FR-018**: System MUST display steps to volunteers when viewing activity slot details
- **FR-019**: System MUST allow activity slots to have steps without requiring a custom description
- **FR-020**: System MUST save steps with the activity slot and retain them throughout the event lifecycle

**User Interface**

- **FR-021**: System MUST provide clear visual indicators distinguishing between full-day and timed events
- **FR-022**: System MUST hide or disable time fields when "full day" option is selected
- **FR-023**: System MUST show time fields as editable when "full day" option is not selected
- **FR-024**: System MUST provide an intuitive interface for adding and managing activity slot steps
- **FR-025**: System MUST display validation errors clearly when time constraints are violated

**Data Integrity**

- **FR-026**: System MUST maintain backward compatibility with existing events that only have start times
- **FR-027**: System MUST preserve all activity slot data (type, description, steps) when events are edited
- **FR-028**: System MUST preserve step ordering consistently across saves and edits
- **FR-029**: System MUST handle missing or null end times gracefully in all event displays

### Key Entities

- **Event**: Represents a pack activity with timing information. Key attributes include event date, optional start time, optional end time, full-day flag, and collection of activity slots. Relationships: has many activity slots, has one or more assigned activity types.

- **Activity Slot**: Represents a volunteer opportunity within an event. Key attributes include reference to pre-configured activity type, optional custom description, optional collection of steps, capacity, and current signups. Relationships: belongs to one event, references one activity type, has many volunteer signups, optionally has many steps.

- **Activity Slot Step**: Represents an individual instruction step for an activity slot. Key attributes include step number (sequence), step text (description), and reference to parent activity slot. Relationships: belongs to one activity slot, ordered by sequence number.

- **Activity Type** (existing): Pre-configured template for volunteer activities. Attributes include name, category, point value. Used as a foundation that can be customized per event through activity slots.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Event organizers can create an event with start and end times in under 3 minutes
- **SC-002**: Event organizers can create a full-day event without specifying times in under 2 minutes
- **SC-003**: 95% of events with end times specified have valid time ranges (end after start)
- **SC-004**: Volunteers can view complete time information (start, end, or all-day) on event details without confusion
- **SC-005**: Event organizers can add custom descriptions to activity slots in under 1 minute per slot
- **SC-006**: Event organizers can add up to 10 steps to an activity slot in under 5 minutes
- **SC-007**: Volunteers viewing activity slots with steps can understand their responsibilities without needing to contact organizers
- **SC-008**: 90% of activity slots with custom descriptions provide more useful information than generic activity type names alone
- **SC-009**: System displays all timing information consistently across event list, event details, and volunteer signup views
- **SC-010**: Zero data loss occurs when toggling between full-day and timed event modes during editing
- **SC-011**: Event organizers report increased volunteer clarity about event duration and responsibilities
- **SC-012**: Reduction in clarification questions from volunteers about event timing and activity details by 40%

## Clarifications

### Session 2026-05-19

- Q: For tasks.md in 008-event-time-enhancements, should the T008 and T009 steps also apply to the test environment which uses test.db? → A: Yes, create explicit test database tasks (Option B). Add separate tasks for test database setup to make it crystal clear this step is required. This prevents the documented bug pattern where test database schema gets out of sync with development database, causing test failures. Update task structure to include T008a (test environment migration) and T009a (verify test database works) to make both environments explicit and trackable.
