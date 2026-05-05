# Research: Dashboard Upcoming Tasks

**Feature**: 005-dashboard-upcoming-tasks  
**Phase**: 0 - Research & Discovery  
**Date**: May 5, 2026

## Overview

This document captures research findings for implementing the Upcoming Tasks pane on the dashboard. Since all technologies and patterns are already established in the codebase, this research focuses on identifying reusable patterns and API capabilities.

## Research Topics

### 1. Existing Admin Tasks API

**Question**: What API endpoints and query parameters are available for fetching tasks?

**Findings**:
- **Endpoint**: `GET /api/admin-tasks`
- **Query Parameters** (from `listTasksSchema`):
  - `assignedToMe`: boolean - filter to tasks assigned to current user
  - `status`: 'complete' | 'incomplete' | 'overdue' - filter by completion status
  - `page`: number - pagination support
  - `limit`: number - items per page
- **Completion Actions**:
  - `POST /api/admin-tasks/:id/complete` - mark task complete
  - `DELETE /api/admin-tasks/:id/complete` - undo completion
- **Response Structure**: Returns `{ tasks: Task[], pagination: {...} }`
- **Task Object** includes:
  - `id`, `name`, `description`, `dueDate`
  - `isOverdue`: boolean (computed server-side)
  - `currentUserCompletion`: object | null (user's completion status)
  - `assignedRoles`: array of role assignments
  - `isPackWide`: boolean

**Decision**: Use existing `/admin-tasks` endpoint with query params:
```typescript
{ assignedToMe: true, status: 'incomplete', limit: 5 }
```

**Rationale**: 
- API already filters by user assignment and completion status
- Server computes `isOverdue` flag, simplifying client logic
- Single endpoint for all task queries reduces API surface area

**Alternatives Considered**:
- Creating new `/admin-tasks/upcoming` endpoint → Rejected: unnecessary duplication, existing endpoint handles all needed filters
- Client-side filtering after fetching all tasks → Rejected: inefficient, pagination already implemented server-side

---

### 2. Dashboard Pattern from Upcoming Events Pane

**Question**: What UI pattern and code structure is used for the existing "Upcoming Events" pane?

**Findings** (from `frontend/src/app/dashboard/page.tsx`):
- **Pattern**: Card component with header (title + "View All" link) and content area
- **Loading State**: Shows "Loading events..." text during fetch
- **Empty State**: Shows "No upcoming events scheduled." message
- **Data Fetching**: `useEffect` hook triggered when `user` is available
- **Date Formatting**: Uses `toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })`
- **List Rendering**: Maps over items with clickable cards linking to detail pages
- **Card Content**: Title, formatted date, optional location, optional badge
- **Layout**: Positioned in `md:grid-cols-2` grid alongside other panes

**Decision**: Mirror the Upcoming Events pattern exactly for visual consistency:
- Same Card wrapper and header structure
- Same loading/empty state patterns
- Same date formatting function
- Same grid layout positioning (replace "Recent Activity" card)

**Rationale**: 
- Established pattern familiar to users
- Reduces cognitive load with consistent UX
- Reuses existing styling and responsive behavior
- Meets FR-015 requirement for visual consistency

**Alternatives Considered**:
- Different card style or layout → Rejected: violates visual consistency requirement (FR-015)
- Inline task list without cards → Rejected: inconsistent with dashboard design language

---

### 3. React State Management for Inline Completion Toggle

**Question**: What's the best approach for optimistic UI updates when toggling task completion?

**Findings**:
- **Current Pattern** (from `frontend/src/app/tasks/[id]/page.tsx`):
  - Uses local state for loading indicators (`completing`, `uncompleting`)
  - Shows confirmation dialog before action
  - Reloads full task data after action: `await loadTask()`
  - Handles 409 Conflict errors (already completed)
- **Optimistic Update Pattern**:
  - Update local state immediately on user action
  - Send API request in background
  - Revert state if API request fails
  - Show error message on failure

**Decision**: Implement optimistic updates with state rollback on error:

```typescript
const handleToggleComplete = async (taskId: string, currentStatus: boolean) => {
  // 1. Optimistically update local state
  setUpcomingTasks(prev => prev.map(t => 
    t.id === taskId 
      ? { ...t, currentUserCompletion: currentStatus ? null : { isComplete: true } }
      : t
  ));
  
  // 2. Call API
  try {
    if (currentStatus) {
      await adminTasksService.uncompleteTask(taskId);
    } else {
      await adminTasksService.completeTask(taskId);
    }
  } catch (error) {
    // 3. Revert on error
    setUpcomingTasks(prev => prev.map(t => 
      t.id === taskId 
        ? { ...t, currentUserCompletion: currentStatus ? { isComplete: true } : null }
        : t
    ));
    setError('Failed to update task status');
  }
};
```

**Rationale**:
- Provides instant feedback (meets SC-005 requirement)
- Graceful error handling with state rollback
- No page refresh required (meets FR-009)
- Follows React best practices for async state updates

**Alternatives Considered**:
- Reload entire task list after each toggle → Rejected: slower UX, causes flicker, doesn't meet SC-005
- Confirmation dialog before each toggle → Rejected: adds friction for simple action, task page already uses this pattern so differentiation is acceptable

---

### 4. Future Date Filtering

**Question**: How to filter tasks to show only those with future due dates (not overdue)?

**Findings**:
- **Server-Side**: API includes `isOverdue` boolean computed by comparing `dueDate` to current date
- **Status Filter**: `status` query param has 'incomplete' and 'overdue' options, but no 'upcoming' option
- **Client-Side Filtering**: Can filter tasks where `!task.isOverdue` after fetching

**Decision**: Use `status=incomplete` query param and client-side filter to exclude overdue:

```typescript
const data = await adminTasksService.listTasks({ 
  assignedToMe: true, 
  status: 'incomplete', 
  limit: 10  // Fetch more than 5 to account for filtering
});

const upcomingTasks = data.tasks
  .filter(task => !task.isOverdue)
  .slice(0, 5);  // Take first 5 after filtering
```

**Rationale**:
- Server provides `isOverdue` flag, eliminating date parsing client-side
- Fetching extra tasks ensures we get 5 upcoming tasks even if some are overdue
- Simple and reliable without API changes

**Alternatives Considered**:
- Add new `status='upcoming'` filter to API → Rejected: requires backend changes, YAGNI (You Aren't Gonna Need It)
- Parse dates client-side with `new Date(task.dueDate) > new Date()` → Rejected: server already provides `isOverdue`, duplicates logic

---

### 5. Reusable Components

**Question**: Should we create a new task card component or reuse existing TaskCard?

**Findings** (from `frontend/src/components/shared/tasks/TaskCard.tsx`):
- **Existing TaskCard**: Designed for full-page tasks list
  - Includes: name, description, due date, completion status, overdue warning, role count, pack-wide badge
  - Uses Card with CardHeader and CardContent
  - Wraps entire card in Link for navigation
- **Dashboard Needs**: Simplified card for dashboard (less verbose)
  - Should show: name, due date, completion toggle
  - Optional: completion status badge

**Decision**: Create new `DashboardTaskCard` component:
- Lighter weight for dashboard context
- Includes inline completion toggle (not in full TaskCard)
- Omits verbose fields (description, role count)
- Follows same visual style as TaskCard

**Rationale**:
- TaskCard is designed for different use case (list page with filters)
- Inline completion toggle is dashboard-specific feature
- Keeps existing TaskCard unchanged (no regression risk)
- Follows Single Responsibility Principle

**Alternatives Considered**:
- Modify TaskCard with props for dashboard mode → Rejected: violates SRP, adds complexity to existing component
- Duplicate TaskCard code inline → Rejected: violates DRY principle
- Reuse TaskCard as-is → Rejected: doesn't support inline completion toggle, too verbose for dashboard

---

## Summary

### Key Decisions

1. **API Integration**: Use existing `GET /admin-tasks?assignedToMe=true&status=incomplete&limit=10` with client-side overdue filtering
2. **UI Pattern**: Mirror Upcoming Events pane exactly for consistency
3. **State Management**: Optimistic updates with error rollback
4. **Component Strategy**: New lightweight `DashboardTaskCard` component
5. **Date Filtering**: Leverage server's `isOverdue` flag, filter client-side

### No Clarifications Needed

All technical decisions can proceed with existing infrastructure. No API changes, database migrations, or new dependencies required.

### Constitutional Alignment

- ✅ **BDD First**: Tests will be written before implementation for dashboard component
- ✅ **Clean Code**: New component will be well-documented with clear responsibilities
- ✅ **DRY**: Reuses existing API, avoids duplicating TaskCard, will extract shared utilities as needed
