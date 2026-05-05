# Feature Specification: Dashboard Upcoming Tasks

**Feature Branch**: `005-dashboard-upcoming-tasks`  
**Created**: May 5, 2026  
**Status**: Draft  
**Input**: User description: "on the dashboard, instead of recent activity pane, I want to see upcoming tasks pane similar to upcoming events where upcoming tasks shows me tasks that have been assigned to me that are due in the future. I should be able to mark complete or not from that view, click into the view to see more information."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Upcoming Tasks (Priority: P1)

A volunteer logs into the dashboard and immediately sees their upcoming tasks in the "Upcoming Tasks" pane, similar to how they currently see upcoming events. This provides quick visibility into pending responsibilities without navigating away from the dashboard.

**Why this priority**: Core feature that delivers the primary value - quick visibility of pending tasks from the dashboard. Without this, the feature has no purpose.

**Independent Test**: Can be fully tested by loading the dashboard and verifying that tasks assigned to the user with future due dates appear in the pane, and delivers the value of consolidated task visibility.

**Acceptance Scenarios**:

1. **Given** I am a logged-in volunteer with 3 upcoming tasks assigned to me, **When** I view the dashboard, **Then** I see all 3 tasks displayed in the "Upcoming Tasks" pane
2. **Given** I am a logged-in volunteer with no upcoming tasks, **When** I view the dashboard, **Then** I see "No upcoming tasks" message in the "Upcoming Tasks" pane
3. **Given** I am viewing the dashboard, **When** I see an upcoming task in the pane, **Then** I see the task name, due date, and completion status
4. **Given** there are more than 5 upcoming tasks assigned to me, **When** I view the dashboard, **Then** I see only the 5 soonest tasks by due date

---

### User Story 2 - Quick Task Completion Toggle (Priority: P2)

A volunteer can mark a task as complete (or revert to incomplete) directly from the dashboard without navigating to the full task detail page. This saves time for simple task completions.

**Why this priority**: Adds convenience but depends on P1 showing the tasks first. Users can still complete tasks via the full tasks page if this feature isn't implemented.

**Independent Test**: Can be tested by displaying a task with a completion toggle and verifying the status updates both visually and in the database.

**Acceptance Scenarios**:

1. **Given** I see an incomplete task in the "Upcoming Tasks" pane, **When** I click the completion toggle/button, **Then** the task is marked as complete and updates visually without page refresh
2. **Given** I see a completed task in the "Upcoming Tasks" pane, **When** I click the completion toggle/button, **Then** the task is marked as incomplete and updates visually without page refresh
3. **Given** I mark a task as complete, **When** the action succeeds, **Then** the completion status persists if I refresh the page
4. **Given** I attempt to mark a task complete but an error occurs, **When** the request fails, **Then** I see an error message and the task status remains unchanged

---

### User Story 3 - Navigate to Task Details (Priority: P2)

A volunteer can click on a task in the "Upcoming Tasks" pane to navigate to the full task detail page where they can view complete information, edit (if authorized), and see additional context.

**Why this priority**: Provides access to full task information, but basic task visibility (P1) is more critical. Navigation pattern already exists with "Upcoming Events" pane.

**Independent Test**: Can be tested by clicking a task card and verifying navigation to the correct task detail page.

**Acceptance Scenarios**:

1. **Given** I see a task in the "Upcoming Tasks" pane, **When** I click on the task card, **Then** I am navigated to the full task detail page for that task
2. **Given** I am viewing a task detail page, **When** I use browser back navigation, **Then** I return to the dashboard with the "Upcoming Tasks" pane still visible

---

### User Story 4 - View All Tasks Link (Priority: P3)

A volunteer can click a "View All" button to navigate to the full tasks page where they can see all tasks (not just the 5 soonest) and use advanced filtering options.

**Why this priority**: Nice-to-have convenience feature following the pattern from "Upcoming Events" pane. Users can always access tasks via the main navigation menu.

**Independent Test**: Can be tested by clicking the "View All" button and verifying navigation to the tasks page with appropriate filters applied.

**Acceptance Scenarios**:

1. **Given** I see the "Upcoming Tasks" pane header, **When** I click "View All", **Then** I am navigated to the full tasks page filtered to show my assigned tasks

---

### Edge Cases

- What happens when a task becomes overdue while the user is viewing the dashboard? (Expected: Task should disappear from "Upcoming Tasks" on next refresh, as it only shows future tasks)
- What happens when a task's due date is changed from future to past? (Expected: Task should no longer appear in "Upcoming Tasks" pane)
- What happens when a user completes the last task in the pane? (Expected: Show "No upcoming tasks" message)
- How does the pane handle tasks with the same due date? (Expected: Sort by due date ascending, then by task name alphabetically as secondary sort)
- What happens if the API request for tasks fails? (Expected: Show error state with retry option or fallback message)
- What happens when multiple users are assigned to the same task and one marks it complete? (Expected: Only the completing user's status updates; other users still see it as incomplete)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST replace the "Recent Activity" pane on the dashboard with an "Upcoming Tasks" pane in the same visual position
- **FR-002**: System MUST display only tasks that are assigned to the currently logged-in user
- **FR-003**: System MUST display only tasks with due dates in the future (not overdue, not past due)
- **FR-004**: System MUST display tasks that are incomplete (where currentUserCompletion is null) by default
- **FR-005**: System MUST limit the display to the 5 soonest tasks by due date
- **FR-006**: System MUST sort tasks by due date in ascending order (soonest first), with task name as secondary sort criterion
- **FR-007**: System MUST display for each task: task name, due date (formatted as "Weekday, Mon DD, YYYY"), and completion status indicator
- **FR-008**: System MUST provide a visual toggle/button on each task card to mark the task as complete or incomplete
- **FR-009**: System MUST update the task completion status immediately upon user action without requiring a page refresh
- **FR-010**: System MUST make each task card clickable to navigate to the full task detail page
- **FR-011**: System MUST display "No upcoming tasks" message when the user has no incomplete tasks with future due dates
- **FR-012**: System MUST include a "View All" button in the pane header that navigates to the full tasks page
- **FR-013**: System MUST show appropriate loading state while fetching tasks from the API
- **FR-014**: System MUST handle API errors gracefully with user-friendly error messages
- **FR-015**: System MUST maintain visual consistency with the existing "Upcoming Events" pane design (card styling, layout, spacing)

### Key Entities *(include if feature involves data)*

- **Task**: Represents an administrative task with properties including id, name, description, dueDate, isOverdue flag, assignedRoles, and currentUserCompletion status
- **User**: The currently logged-in volunteer viewing the dashboard, identified by user.id
- **TaskCompletion**: Represents a user's completion status for a specific task, including completedAt timestamp and isComplete boolean

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can see their upcoming tasks within 2 seconds of loading the dashboard
- **SC-002**: Users can mark tasks complete from the dashboard in under 3 clicks (click toggle, confirm if needed)
- **SC-003**: 90% of users successfully navigate to task details on first attempt by clicking the task card
- **SC-004**: Dashboard maintains sub-2-second load time even with the additional tasks API request
- **SC-005**: Task completion state updates are reflected immediately in the UI without requiring page refresh
- **SC-006**: Zero visual layout shift or inconsistency between "Upcoming Events" and "Upcoming Tasks" panes when both are displayed
