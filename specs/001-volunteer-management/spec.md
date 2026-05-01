# Feature Specification: Cub Scout Volunteer Management Webapp

**Feature Branch**: `001-volunteer-management`  
**Created**: 2026-03-12  
**Status**: Draft  
**Input**: User requirements from docs/requirements.md - Cub Scout volunteer management webapp with gamification system to incentivize parent participation and simplify administrative task management

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Account Registration and Authentication (Priority: P1)

As a volunteer, I can create an account using my email and password so that I can access the volunteer management system. I can log in securely, and have my password reset by pack administrators when needed.

**Why this priority**: Foundation for all other features - no volunteer activities can occur without user authentication and account management.

**Independent Test**: Can be fully tested by creating an account, logging in, logging out, and having an admin reset password. Delivers secure access to the platform.

**Acceptance Scenarios**:

1. **Given** I am a new volunteer, **When** I visit the registration page and enter my name, email, and password, **Then** my account is created and I can log in
2. **Given** I have an account, **When** I forget my password and contact an admin, **Then** the admin can generate a temporary password for me and I must change it on first login
3. **Given** I have an account, **When** I log in with valid credentials, **Then** I am authenticated and redirected to my dashboard
4. **Given** I have an account, **When** an admin resets my password, **Then** I receive a temporary password and am required to change it immediately after login
5. **Given** I have an account, **When** a site admin revokes my access, **Then** I can no longer log in
6. **Given** I am a volunteer, **When** I log in, **Then** I can only access features appropriate to my authorization tier (parent/guardian volunteer, den leader/committee, or site admin)

---

### User Story 2 - Volunteer Profile Management (Priority: P1)

As a volunteer, I can create and manage a profile that includes my name, email, phone, and one or more volunteer roles. Roles include parent/guardian volunteer (default), committee member with specialty, den leader with rank, assistant den leader with rank, assistant cub master, lion guide, or scouter reserve.

**Why this priority**: Profile data is required for role-based permissions, point awards, and event management. Must be completed before volunteers can participate.

**Independent Test**: Can be fully tested by creating a profile, selecting multiple roles, and verifying role assignments. Delivers ability to identify volunteers and their responsibilities.

**Acceptance Scenarios**:

1. **Given** I have created an account, **When** I set up my profile with name, email, and phone, **Then** my role defaults to parent/guardian volunteer (tier 1 authorization)
2. **Given** I am editing my profile, **When** I identify which rank(s) my children are in, **Then** those ranks are saved and determine which rank-specific events I see
3. **Given** I am editing my profile, **When** I select committee role, **Then** I can choose a specialty (chair, fundraising, treasurer, outdoor, recruiting, new member, communications, training) and receive tier 2 authorization
4. **Given** I am editing my profile, **When** I select den leader or assistant den leader role, **Then** I can choose a rank (lion, tiger, wolf, bear, webelos, aol) and receive tier 2 authorization
5. **Given** I am editing my profile, **When** I select multiple volunteer roles, **Then** all roles are saved and displayed on my profile
6. **Given** I have a committee or den leader role, **When** I log in, **Then** I have tier 2 permissions to create events, award points, and manage administrative tasks
7. **Given** I am a site admin, **When** I assign a volunteer role to another user, **Then** that role appears on their profile with appropriate authorization tier

---

### User Story 3 - Volunteer Gamification and Points (Priority: P2)

As a volunteer, I earn points when I perform volunteer activities, and I receive image badges at tier levels (every 20 points) to recognize my contributions. Committee and den leaders automatically receive 100 points. Points can be reset annually while preserving historical achievements.

**Why this priority**: Core value proposition - incentivizes parent participation through recognition and gamification. Critical for engagement but system can function without it initially.

**Independent Test**: Can be fully tested by recording volunteer activities, verifying point awards, checking badge levels, and confirming annual resets. Delivers volunteer recognition and motivation.

**Acceptance Scenarios**:

1. **Given** I am a volunteer with committee or den leader role, **When** my role is assigned, **Then** I automatically receive 100 points
2. **Given** I am a parent volunteer, **When** I record completing a volunteer activity, **Then** I receive the configured point value for that activity
3. **Given** I have earned points, **When** I reach 20, 40, 60, 80, or 100+ points, **Then** I receive the corresponding badge (Tiger, Wolf, Bear, Webelos, or Arrow of Light level)
4. **Given** I am den leader/committee tier, **When** I mark an event as complete, **Then** volunteers who signed up receive their points automatically
5. **Given** a site admin resets points annually, **When** the reset occurs, **Then** my current year points reset to zero but my historical points remain visible in my profile
6. **Given** I am den leader/committee tier, **When** I revoke points from a volunteer, **Then** the points are removed and an audit trail is maintained
7. **Given** I am a volunteer, **When** I record an activity I didn't attend, **Then** den leader/committee tier can revoke those points

---

### User Story 4 - Event Creation and Volunteer Signup (Priority: P2)

As a den leader or committee member (tier 2 authorization), I can create volunteer events with specific activities and capacity limits. Volunteers can sign up for events, filter opportunities by rank or pack level, and withdraw if needed. Den leaders and committee members can mark events complete to award points.

**Why this priority**: Enables coordination of volunteer activities and point awards. Essential for pack operations but requires profiles and points system first.

**Independent Test**: Can be fully tested by creating an event, having volunteers sign up, withdrawing signups, and marking event complete. Delivers volunteer coordination capability.

**Acceptance Scenarios**:

1. **Given** I am den leader/committee tier, **When** I create an event with title, date, rank level, and activity slots, **Then** the event appears in volunteer opportunities
2. **Given** I am a volunteer with children in one rank, **When** I view volunteer opportunities, **Then** I see events for that rank and all pack-wide events
3. **Given** I am a volunteer with children in multiple ranks, **When** I view volunteer opportunities, **Then** I see events for all those ranks and all pack-wide events
4. **Given** I am viewing volunteer opportunities, **When** I apply rank filters, **Then** I can narrow the display to specific ranks or pack-wide only
5. **Given** I am a volunteer, **When** I sign up for an event activity, **Then** my name is added to that activity's volunteer list
6. **Given** I signed up for an event, **When** I withdraw before or after the event, **Then** I am removed from the volunteer list and do not receive points
7. **Given** I am den leader/committee tier, **When** I create an activity with a capacity limit, **Then** signups are blocked once the limit is reached
8. **Given** I am den leader/committee tier, **When** I mark an event as complete, **Then** all volunteers who signed up and did not withdraw receive their activity points
9. **Given** I am den leader/committee tier, **When** I need to add volunteers after an event, **Then** I can manually log volunteer activities and award points
10. **Given** I am den leader/committee tier, **When** I create an event, **Then** I can mark it as recurring (e.g., weekly den meetings)

---

### User Story 5 - Activity Configuration (Priority: P3)

As a site admin (tier 3 authorization), I can configure the point system by adding, editing, and removing volunteer activities. The system includes default activities categorized by effort level (low 2-3 points, medium 5-8 points, high 10-15 points, special 20-25 points).

**Why this priority**: Allows customization of the point system to match pack needs. Important for flexibility but default activities suffice for initial operation.

**Independent Test**: Can be fully tested by adding a new activity, editing point values, and verifying the activity appears in event creation. Delivers customization capability.

**Acceptance Scenarios**:

1. **Given** I am a site admin, **When** I add a new volunteer activity with name and point value, **Then** it appears in the activity list for event creation
2. **Given** I am a site admin, **When** I edit an existing activity's point value, **Then** future events use the new value but historical points remain unchanged
3. **Given** I am a site admin, **When** I remove an activity, **Then** it no longer appears for new events but historical records are preserved
4. **Given** I am a site admin, **When** I first set up the system, **Then** default activities are pre-configured (committee meeting 2pts, planning den meeting 5pts, planning pack event 10pts, exceptional contribution 20pts, etc.)
4. **Given** I am an admin, **When** I first set up the system, **Then** default activities are pre-configured (committee meeting 2pts, planning den meeting 5pts, planning pack event 10pts, exceptional contribution 20pts, etc.)

---

### User Story 6 - Leaderboard and Achievements (Priority: P3)

As a volunteer, I can view my profile with points and badges, see a leaderboard of top volunteers, and opt in or out of displaying my achievements publicly on the leaderboard.

**Why this priority**: Enhances gamification through social recognition but not essential for core volunteer management functions.

**Independent Test**: Can be fully tested by earning points, viewing the leaderboard, and toggling leaderboard visibility. Delivers social recognition features.

**Acceptance Scenarios**:

1. **Given** I am a volunteer, **When** I view my profile, **Then** I see my current points, badge level, and historical achievements
2. **Given** I am a volunteer, **When** I access the leaderboard, **Then** I see volunteers who opted in, ranked by points
3. **Given** I am a volunteer, **When** I opt into leaderboard display, **Then** my name and points appear on the public leaderboard
4. **Given** I opted into the leaderboard, **When** I opt out, **Then** my information is removed from public view but I can still see the leaderboard

---

### User Story 7 - Administrative Task Management (Priority: P3)

As a den leader or committee member (tier 2 authorization), I can create administrative tasks (like completing medical forms, paying dues, completing youth protection training) with due dates, completion steps, and URLs. Volunteers can see their assigned tasks, mark them complete, and track status.

**Why this priority**: Simplifies administrative overhead and compliance tracking. Important for pack management but not core to volunteer incentivization.

**Independent Test**: Can be fully tested by creating an administrative task, assigning it to volunteers, and having volunteers mark it complete. Delivers compliance tracking capability.

**Acceptance Scenarios**:

1. **Given** I am den leader/committee tier, **When** I create an administrative task with name, due date, and completion steps (including URLs), **Then** it is assigned to applicable volunteers
2. **Given** I am den leader/committee tier, **When** I create a recurring administrative task, **Then** it automatically ends at the scouting year end date specified in pack configuration
3. **Given** I am a volunteer, **When** I view my administrative tasks, **Then** I see what tasks apply to me, their due dates, and completion status
4. **Given** I am a volunteer, **When** I complete a task (like submitting a form), **Then** I can mark it as complete
5. **Given** a task is role-specific, **When** I have that role, **Then** the task appears in my task list
6. **Given** I have overdue tasks, **When** the due date passes, **Then** I receive notifications reminding me to complete them
7. **Given** I am den leader/committee tier, **When** I need to verify task completion, **Then** I can see task status across all volunteers

---

### User Story 8 - Pack and Role Configuration (Priority: P3)

As a site admin (tier 3 authorization), I can configure pack information including pack name, number, current scouting year dates, and active ranks. I can also manage the volunteer roles available in the system by adding, modifying, or deleting roles and their descriptions, with safeguards to preserve historical data.

**Why this priority**: Enables multi-pack support, proper year management, and customizable role structures. Useful for scalability and pack-specific needs but default settings work initially.

**Independent Test**: Can be fully tested by configuring pack information, managing volunteer roles, and verifying they display correctly throughout the system. Delivers customization capability.

**Acceptance Scenarios**:

1. **Given** I am a site admin, **When** I configure pack name and number, **Then** they display in the application header and reports
2. **Given** I am a site admin, **When** I set scouting year dates, **Then** the system uses these dates for annual point resets and as end boundaries for recurring tasks and events
3. **Given** I am a site admin, **When** I configure active ranks, **Then** only those ranks appear in filtering and role assignment options
4. **Given** I am a site admin, **When** I add a new volunteer role with description, **Then** it becomes available for volunteers to select in their profiles
5. **Given** I am a site admin, **When** I modify an existing volunteer role's description, **Then** the updated description appears throughout the system
6. **Given** I am a site admin, **When** I delete a volunteer role that is not currently assigned to any volunteers for future events, **Then** the role is deleted and unavailable for future selection but preserved in historical records
7. **Given** I am a site admin, **When** I attempt to delete a volunteer role that is currently assigned to volunteers for future event signups, **Then** the system prevents deletion and shows a message indicating the role is in use

---

### User Story 9 - Volunteer and Administrative Reporting (Priority: P4)

As a den leader or committee member (tier 2 authorization), I can generate reports showing volunteer participation and administrative task completion in aggregated or detailed formats, filtered by rank or pack level, to track engagement, recognize contributions, and monitor compliance.

**Why this priority**: Provides insights for pack leadership on both volunteer activities and administrative compliance. Helpful for planning and tracking but not essential for day-to-day operations.

**Independent Test**: Can be fully tested by generating participation and administrative task reports and verifying data accuracy. Delivers analytics and compliance tracking capability.

**Acceptance Scenarios**:

1. **Given** I am den leader/committee tier, **When** I generate a participation report, **Then** I see volunteer names, activities, points earned, and time periods for completed events
2. **Given** I am generating a report, **When** I apply rank filters, **Then** the report shows only volunteers associated with that rank
3. **Given** I am generating a report, **When** I select pack-level filter, **Then** the report includes all pack volunteers regardless of rank
4. **Given** I need aggregated data, **When** I generate a summary report, **Then** I see total volunteer hours, points distributed, and participation rates
5. **Given** I am den leader/committee tier, **When** I generate an administrative task report, **Then** I see task names, assigned volunteers, due dates, completion status, and completion rates
6. **Given** I am generating an administrative task report, **When** I filter by overdue tasks, **Then** I see only tasks past their due date with incomplete status
7. **Given** I am generating an administrative task report, **When** I filter by specific task type, **Then** the report shows completion status for that task across all assigned volunteers
8. **Given** I am den leader/committee tier, **When** I generate an upcoming events report, **Then** I see future event details, signup counts, and volunteer contact information
9. **Given** I am generating an upcoming events report, **When** I apply rank filters, **Then** the report shows only events for that rank level or pack-wide events
10. **Given** I am viewing an upcoming events report, **When** I examine an event, **Then** I see activity slots with capacity, spots remaining, and volunteers signed up with their roles and email addresses

---

### User Story 10 - Notifications (Priority: P4)

As a volunteer, I receive in-app notifications when I achieve new badge levels or complete administrative tasks, helping me stay engaged and compliant.

**Why this priority**: Enhances user experience and engagement. Nice to have but not critical for core functionality.

**Independent Test**: Can be fully tested by earning a badge and verifying notification appears. Delivers engagement enhancements.

**Acceptance Scenarios**:

1. **Given** I earned enough points for a new badge level, **When** my points update, **Then** I receive an in-app notification congratulating me
2. **Given** I completed an administrative task, **When** I mark it complete, **Then** I receive confirmation notification
3. **Given** I have an upcoming event I signed up for, **When** the event is 48 hours away, **Then** I receive a reminder notification

---

### Edge Cases

- What happens when a volunteer deletes their account mid-year? (All historical data should be archived, signups withdrawn, points history maintained for reports)
- How does the system handle role changes? (If volunteer promoted to den leader mid-year, do they get retroactive 100 points? Assumption: No, points awarded only at time of promotion)
- What if an event is created but no one signs up? (Event can still be marked complete; admin or second tier of authorization can manually add volunteers who participated)
- What happens if annual reset occurs while events are scheduled? (Scheduled events remain in current year; points awarded after reset go to new year)
- How to handle volunteers with multiple children in different ranks? (Volunteer identifies all children's ranks in profile; system automatically shows events for all those ranks plus pack-wide events)
- What if signup capacity is reached but someone withdraws? (Next person on waitlist is notified - assumption: implement waitlist in P2/P3)
- How does system prevent point gaming? (Admin audit trail tracks all point changes; admins can revoke suspicious activity)
- What happens to recurring events when a holiday conflicts? (Admin can skip/cancel individual occurrences without affecting the series)
- When do recurring tasks and events end? (All recurring tasks and events automatically end at the scouting year end date specified in pack configuration; new recurrences must be created for the new year)
- What happens when a volunteer role is deleted? (Deletion only affects future usage; role is preserved in historical records and reporting; roles cannot be deleted if currently assigned to volunteers for future events)

## Clarifications

### Session 2026-03-12

- Q: What are the authorization tiers and their specific permissions? → A: Three tiers: (1) Parent/guardian volunteer - manage own profile, sign up for events, record volunteer activities; (2) Den leader or committee role (all specializations) - create volunteer events, award points, revoke points; (3) Site admin - manage accounts, revoke access, configure site settings like pack information and activity point values.
- Q: How should volunteer profiles handle children's ranks for event visibility? → A: Volunteers should identify which rank(s) their children are in. Event visibility is based on children's ranks: if children are in multiple ranks, volunteer sees events for all those ranks plus pack-wide events; if children are in only one rank, volunteer sees events for that rank plus pack-wide events.
- Q: When should recurring tasks and events end? → A: Recurring tasks and events should automatically end by the year end date that is specified in the site-level pack information (pack configuration scouting year end date).
- Q: How should site admins manage volunteer roles? → A: Site admins can add, modify, or delete volunteer roles and their descriptions. Role deletions only affect future usage - roles used historically are preserved for records and reporting. Roles cannot be deleted if currently assigned to volunteers for future event signups (system shows message to that effect).
- Q: What types of reports can den leader/committee tier generate? → A: Den leader/committee tier can generate reports on both volunteer participation (activities, points) and administrative activities (task completion status).

## Requirements *(mandatory)*

### Functional Requirements

**Authentication & Account Management**
- **FR-001**: System MUST allow volunteers to self-register accounts using email and password
- **FR-002**: System MUST validate email addresses and enforce password strength requirements
- **FR-003**: System MUST allow volunteers to reset their own passwords without admin assistance
- **FR-004**: System MUST allow site admins to revoke volunteer access and manage accounts
- **FR-005**: System MUST enforce three-tier authorization: parent/guardian volunteers (manage own profile, sign up for events, record activities), den leader/committee tier (create events, award/revoke points, manage tasks), and site admin tier (manage accounts, configure pack settings, configure activity point values)

**Profile Management**
- **FR-006**: System MUST allow volunteers to create profiles with name, email, phone, volunteer roles, and children's ranks
- **FR-007**: System MUST default new profiles to parent/guardian volunteer role
- **FR-008**: System MUST allow volunteers to identify one or more ranks their children are in (lion, tiger, wolf, bear, webelos, aol)
- **FR-009**: System MUST allow volunteers to select multiple roles simultaneously
- **FR-010**: System MUST provide role options: committee (with specialties), den leader (with ranks), assistant den leader, assistant cub master, lion guide, scouter reserve
- **FR-011**: System MUST grant den leader/committee tier permissions (event creation, point management, task management) to volunteers with committee or den leader roles
- **FR-012**: System MUST allow volunteers to self-select roles and site admins to assign volunteer roles
- **FR-013**: System MUST allow site admins to remove volunteer profiles from the system

**Gamification & Points**
- **FR-014**: System MUST automatically award 100 points when a volunteer is assigned committee or den leader role
- **FR-015**: System MUST award points to volunteers when they complete activities
- **FR-016**: System MUST display badge tiers at 0-19 (Lion), 20-39 (Tiger), 40-59 (Wolf), 60-79 (Bear), 80-99 (Webelos), 100+ (Arrow of Light)
- **FR-017**: System MUST allow volunteers to self-report completed activities for point credit
- **FR-018**: System MUST allow den leader/committee tier to revoke points with audit trail maintained
- **FR-019**: System MUST preserve historical point totals when annual reset occurs
- **FR-020**: System MUST allow site admins to reset current year points while maintaining archived years

**Activity Configuration**
- **FR-021**: System MUST allow site admins to add, edit, and remove volunteer activities with point values
- **FR-022**: System MUST provide default activities categorized by effort level (low 2-3pts, medium 5-8pts, high 10-15pts, special 20-25pts)
- **FR-023**: System MUST preserve historical point awards when activity configurations change

**Event Management**
- **FR-024**: System MUST allow den leader/committee tier to create events with title, description, date, time, location, rank level, and activity slots
- **FR-025**: System MUST allow setting capacity limits per activity within an event
- **FR-026**: System MUST allow all volunteers to sign up for events and specific activities
- **FR-027**: System MUST allow all volunteers to withdraw from events before or after they occur
- **FR-028**: System MUST prevent signups when activity capacity is reached
- **FR-029**: System MUST allow events to be marked as recurring
- **FR-030**: System MUST allow den leader/committee tier to mark events complete, automatically awarding points to participating volunteers
- **FR-031**: System MUST allow den leader/committee tier to manually add volunteers to events after completion
- **FR-032**: System MUST not award points to volunteers who withdrew from events
- **FR-033**: System MUST automatically end recurring events at the scouting year end date specified in pack configuration

**Volunteer Opportunities**
- **FR-034**: System MUST display upcoming volunteer opportunities to volunteers based on their children's ranks (show events for those ranks plus all pack-wide events)
- **FR-035**: System MUST allow volunteers to manually filter opportunities by rank level (lion, tiger, wolf, bear, webelos, aol) or pack-wide
- **FR-036**: System MUST display volunteer signup status and available capacity

**Administrative Tasks**
- **FR-037**: System MUST allow den leader/committee tier to create administrative tasks with names, due dates, completion steps, and URLs
- **FR-038**: System MUST assign administrative tasks based on volunteer roles or pack-wide
- **FR-039**: System MUST allow administrative tasks to be marked as recurring
- **FR-040**: System MUST automatically end recurring administrative tasks at the scouting year end date specified in pack configuration
- **FR-041**: System MUST allow all volunteers to view their assigned administrative tasks with due dates and completion status
- **FR-042**: System MUST allow all volunteers to mark administrative tasks as complete
- **FR-043**: System MUST display overdue status for tasks past their due date
- **FR-044**: System MUST allow den leader/committee tier to view task completion status across all volunteers

**Leaderboard & Achievements**
- **FR-045**: System MUST display volunteer profile with current points, badge level, and historical achievements
- **FR-046**: System MUST provide leaderboard showing volunteers ranked by points
- **FR-047**: System MUST allow volunteers to opt in or out of leaderboard display
- **FR-048**: System MUST only display opted-in volunteers on public leaderboard

**Pack Configuration**
- **FR-049**: System MUST allow site admins to configure pack name, number, scouting year dates, and active ranks
- **FR-050**: System MUST use configured scouting year dates for annual point resets and as end boundaries for recurring tasks and events
- **FR-051**: System MUST filter rank options based on configured active ranks
- **FR-052**: System MUST allow site admins to add new volunteer roles with descriptions
- **FR-053**: System MUST allow site admins to modify existing volunteer role descriptions
- **FR-054**: System MUST allow site admins to delete volunteer roles that are not currently assigned to volunteers for future events
- **FR-055**: System MUST prevent deletion of volunteer roles that are currently assigned to volunteers for future event signups and display a message indicating the role is in use
- **FR-056**: System MUST preserve deleted volunteer roles in historical records and reporting for past activities

**Reporting**
- **FR-057**: System MUST allow den leader/committee tier to generate volunteer participation reports for completed events
- **FR-058**: System MUST allow den leader/committee tier to generate administrative task completion reports
- **FR-059**: System MUST allow den leader/committee tier to generate upcoming events reports showing future events and volunteer signups
- **FR-060**: System MUST support both aggregated and detailed report formats for participation and administrative task reports
- **FR-061**: System MUST allow filtering reports by rank level or pack-wide
- **FR-062**: System MUST allow filtering administrative task reports by completion status (complete, incomplete, overdue)
- **FR-063**: System MUST allow filtering administrative task reports by specific task type
- **FR-064**: System MUST show volunteer contact information and signup status in upcoming events reports
- **FR-065**: System MUST display capacity, spots remaining, and signup counts for each activity in upcoming events reports
- **FR-066**: System MUST allow exporting all report types to CSV format

**Notifications**
- **FR-067**: System MUST provide in-app notifications for badge level achievements
- **FR-068**: System MUST provide in-app notifications for administrative task completion

**General Requirements**
- **FR-069**: System MUST be mobile-friendly and responsive across devices
- **FR-066**: System MUST maintain audit trails for all point awards, revocations, and administrative actions
- **FR-067**: System MUST persist all data reliably

### Key Entities

- **Volunteer**: Represents a pack volunteer with name, email, phone, one or more roles, children's ranks (one or more: lion, tiger, wolf, bear, webelos, aol), authentication credentials, authorization tier (parent/guardian volunteer, den leader/committee, or site admin), current year points, historical points by year, badge level, leaderboard opt-in preference
- **Volunteer Role**: Represents a role assignment with type (parent/guardian, committee, den leader, etc.), optional specialty (for committee), optional rank (for den leaders), description, associated authorization tier (parent/guardian roles grant tier 1, committee/den leader roles grant tier 2), active status, and deletion timestamp (for soft deletes preserving historical data)
- **Activity Type**: Represents a configurable volunteer activity with name, point value, effort category (low/medium/high/special), and active status
- **Event**: Represents a volunteer opportunity with title, description, date, time, location, rank level or pack-wide flag, recurring flag, completion status, year-end boundary (for recurring events), and associated activity slots
- **Activity Slot**: Represents a specific volunteer need within an event with activity type, capacity limit, and signup list
- **Signup**: Represents a volunteer's commitment to an activity slot with signup date, withdrawal status, and withdrawal date
- **Point Award**: Represents points earned by a volunteer with activity type, point value, award date, associated event, and revocation status with audit trail
- **Administrative Task**: Represents a required task with name, description, due date, role assignment, completion steps with URLs, pack-wide flag, recurring flag, year-end boundary (for recurring tasks), and completion status per volunteer
- **Task Completion**: Represents a volunteer's completion of an administrative task with completion date and status
- **Pack Configuration**: Represents pack settings with pack name, pack number, scouting year start/end dates, active ranks, and point reset schedule
- **Badge Tier**: Represents achievement levels with name (Lion, Tiger, Wolf, Bear, Webelos, Arrow of Light), point threshold, and badge image
- **Notification**: Represents in-app messages with recipient volunteer, message content, notification type, read status, and creation timestamp

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Volunteers can complete account registration and profile setup in under 5 minutes
- **SC-002**: 70% of parent volunteers sign up for at least one event within their first month of using the system
- **SC-003**: Administrative task completion rate increases by 40% compared to manual tracking
- **SC-004**: Den leaders and committee members (tier 2) can create an event with activity slots in under 3 minutes
- **SC-005**: Volunteers can view and filter upcoming opportunities in under 30 seconds
- **SC-006**: Point awards are automatically applied within 1 minute of event completion
- **SC-007**: 80% of volunteers report that gamification increases their motivation to volunteer
- **SC-008**: Administrative overhead for tracking volunteer participation decreases by 50%
- **SC-009**: System remains responsive on mobile devices with load times under 3 seconds
- **SC-010**: Leaderboard opt-in rate reaches 60% of active volunteers within 3 months
- **SC-011**: Annual point reset completes without data loss or system downtime
- **SC-012**: Den leaders and committee members can generate participation and administrative task reports in under 1 minute
