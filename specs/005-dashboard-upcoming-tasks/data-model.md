# Data Model: Dashboard Upcoming Tasks

**Feature**: 005-dashboard-upcoming-tasks  
**Phase**: 1 - Design & Contracts  
**Date**: May 5, 2026

## Overview

This feature primarily displays existing data models (AdminTask and TaskCompletion) in a new UI context. No database schema changes are required.

## Existing Data Models (No Changes)

### AdminTask (Prisma Schema)

**Source**: `backend/prisma/schema.prisma`

**Purpose**: Represents an administrative task that can be assigned to volunteers by role or pack-wide.

**Key Fields**:
- `id`: String (UUID) - Primary key
- `name`: String - Task title
- `description`: String? - Optional detailed description
- `dueDate`: DateTime - When task should be completed
- `deletedAt`: DateTime? - Soft delete timestamp
- `isPackWide`: Boolean - If true, assigned to all volunteers
- `isRecurring`: Boolean - Whether task repeats (future enhancement)
- `createdAt`: DateTime - Creation timestamp
- `updatedAt`: DateTime - Last modification timestamp

**Relationships**:
- `assignedRoles`: TaskRoleAssignment[] - Which roles this task is assigned to
- `completions`: TaskCompletion[] - User completion records

**Computed Fields** (API Layer):
- `isOverdue`: Boolean - Computed by comparing `dueDate` to current date
- `currentUserCompletion`: TaskCompletion | null - The current user's completion record

**Validation Rules**:
- `name`: Required, non-empty string
- `dueDate`: Required, valid ISO 8601 date
- `isPackWide` OR `assignedRoles` must have at least one role

### TaskCompletion (Prisma Schema)

**Source**: `backend/prisma/schema.prisma`

**Purpose**: Tracks individual user completion status for a task.

**Key Fields**:
- `id`: String (UUID) - Primary key
- `taskId`: String - Foreign key to AdminTask
- `userId`: String - Foreign key to Volunteer (User)
- `completedAt`: DateTime - When user marked task complete
- `isComplete`: Boolean - Completion status (always true for existing records)

**Relationships**:
- `task`: AdminTask - The task being completed
- `user`: Volunteer - The user who completed it

**Business Rules**:
- One completion record per user per task (unique constraint on taskId + userId)
- Record created when user marks task complete
- Record deleted when user reverts completion (soft delete pattern not used here)

## Frontend Data Structures

### UpcomingTask (Component State)

**Purpose**: Simplified task representation for dashboard display.

**Structure**:
```typescript
interface UpcomingTask {
  id: string;                    // Task ID for navigation and actions
  name: string;                  // Display title
  dueDate: string;               // ISO 8601 date string
  isOverdue: boolean;            // Computed server-side
  currentUserCompletion: {       // null if incomplete
    id: string;
    completedAt: string;
    isComplete: boolean;
  } | null;
}
```

**Source**: Subset of AdminTask API response, shaped by API contract (see contracts/)

**Usage**: Stored in React component state (`upcomingTasks: UpcomingTask[]`)

## Data Flow

### Loading Upcoming Tasks

```text
1. Dashboard Component Mount
   ↓
2. useEffect triggered (user authenticated)
   ↓
3. API Call: GET /admin-tasks?assignedToMe=true&status=incomplete&limit=10
   ↓
4. Server Filters:
   - Tasks assigned to current user (by role or pack-wide)
   - Incomplete tasks (currentUserCompletion is null)
   - Computes isOverdue flag
   ↓
5. Client Filters:
   - Exclude tasks where isOverdue === true
   - Take first 5 tasks
   ↓
6. Set Component State: setUpcomingTasks(filtered)
   ↓
7. Render: Display tasks or empty state
```

### Toggling Task Completion

```text
1. User Clicks Completion Toggle
   ↓
2. Optimistic Update: Update local state immediately
   ↓
3. API Call: 
   - If marking complete: POST /admin-tasks/:id/complete
   - If undoing: DELETE /admin-tasks/:id/complete
   ↓
4a. Success Path:
    - TaskCompletion record created/deleted in database
    - Local state remains updated
    - Task may disappear from list (if filtering incomplete tasks)
    ↓
4b. Error Path:
    - Revert optimistic update in local state
    - Display error message to user
```

## State Transitions

### Task Lifecycle (Dashboard View)

```text
[Hidden] ← Task not assigned to user
   ↓
[Hidden] ← Task assigned but overdue
   ↓
[Visible/Incomplete] ← assignedToMe=true, dueDate future, currentUserCompletion=null
   ↓ (User marks complete)
[Visible/Complete] ← currentUserCompletion exists
   ↓ (User reverts)
[Visible/Incomplete]
   ↓ (Time passes)
[Hidden] ← Task becomes overdue (isOverdue=true)
```

**Note**: Dashboard only shows [Visible/Incomplete] tasks with future due dates (first 5).

## Validation & Constraints

### Dashboard Display Constraints

- **Maximum Display**: 5 tasks (FR-005)
- **Filter Criteria**: 
  - `assignedToMe === true` (FR-002)
  - `currentUserCompletion === null` (FR-004)
  - `isOverdue === false` (FR-003 - "future due dates")
- **Sort Order**: `dueDate ASC, name ASC` (FR-006)

### API Constraints (Existing)

- User can only complete tasks assigned to them (enforced by API)
- Cannot create duplicate completion (unique constraint on taskId + userId)
- Cannot complete deleted tasks (enforced by API)

## No Schema Changes Required

This feature uses existing data models without modification. All required fields and relationships already exist:
- ✅ AdminTask model has all needed fields
- ✅ TaskCompletion model tracks user completion status
- ✅ API computes `isOverdue` flag
- ✅ API filters by user assignment and completion status

## Performance Considerations

### Query Optimization

- **Limit Parameter**: Fetch `limit=10` instead of 5 to ensure 5 upcoming tasks after filtering overdue
- **Index Usage**: Existing indexes on `dueDate` and `deletedAt` support efficient queries
- **Pagination**: Not needed for dashboard (always first 5), but API supports it

### Client-Side Efficiency

- **Minimal Re-renders**: Use React.memo for task cards if needed
- **Debouncing**: Not required (single load on mount, optimistic updates don't refetch)
- **State Management**: Local component state sufficient (no global state needed)

## Testing Data Requirements

### Test Scenarios Need:

1. **User with 3 upcoming tasks**: Verify all 3 displayed
2. **User with 10 upcoming tasks**: Verify only first 5 displayed by due date
3. **User with 3 upcoming + 2 overdue tasks**: Verify only 3 upcoming shown
4. **User with no upcoming tasks**: Verify empty state message
5. **Completed task in list**: Verify completion badge and toggle state
6. **Task completion toggle**: Verify optimistic update and API call

### Test Data Setup

```typescript
// Seed script for test database
const testTasks = [
  { name: "Task 1", dueDate: futureDate(2), assignedRoles: [userRole] },
  { name: "Task 2", dueDate: futureDate(5), assignedRoles: [userRole] },
  { name: "Task 3", dueDate: futureDate(10), assignedRoles: [userRole] },
  { name: "Task 4", dueDate: pastDate(1), assignedRoles: [userRole] }, // Overdue
  { name: "Task 5", dueDate: futureDate(1), assignedRoles: [otherRole] }, // Not assigned
];
```

## Summary

- **No database changes**: Uses existing AdminTask and TaskCompletion models
- **No API changes**: Uses existing `/admin-tasks` endpoints with query parameters
- **Client-side filtering**: Excludes overdue tasks after API response
- **Optimistic updates**: Local state changes before API confirmation
- **Performance**: Query limit optimization, minimal re-renders
