# Quickstart: Dashboard Upcoming Tasks

**Feature**: 005-dashboard-upcoming-tasks  
**Phase**: 1 - Design & Contracts  
**Date**: May 5, 2026

## TL;DR

Replace "Recent Activity" pane with "Upcoming Tasks" pane on dashboard showing user's 5 soonest incomplete tasks with future due dates. Users can toggle completion inline and click to view details.

## Prerequisites

Before starting implementation:

1. ✅ Read [spec.md](spec.md) - Feature specification with user stories
2. ✅ Read [research.md](research.md) - Technical decisions and patterns
3. ✅ Read [data-model.md](data-model.md) - Data structures and flow
4. ✅ Read [contracts/api-admin-tasks.md](contracts/api-admin-tasks.md) - API contract

## Implementation Order (BDD Test-First)

### Phase 1: Tests First (Red) 🔴

**File**: `frontend/src/app/dashboard/page.test.tsx`

1. **Write failing tests** for User Story 1 (P1 - View Upcoming Tasks):
   ```typescript
   describe('Dashboard Upcoming Tasks Pane', () => {
     it('displays upcoming tasks for authenticated user');
     it('shows empty state when no upcoming tasks');
     it('excludes overdue tasks from display');
     it('limits display to 5 tasks');
     it('sorts tasks by due date ascending');
   });
   ```

2. **Write failing tests** for User Story 2 (P2 - Toggle Completion):
   ```typescript
   it('marks task complete with optimistic update');
   it('reverts state on completion error');
   it('marks task incomplete when toggled');
   ```

3. **Write failing tests** for User Story 3 (P2 - Navigation):
   ```typescript
   it('navigates to task detail page when clicked');
   ```

4. **Run tests**: `npm test` (in frontend directory) - All should fail ❌

**Success Criteria**: All tests written, all failing, reviewable by stakeholder

---

### Phase 2: Minimal Implementation (Green) 🟢

#### Step 1: Create DashboardTaskCard Component

**File**: `frontend/src/components/shared/tasks/DashboardTaskCard.tsx`

**Purpose**: Lightweight task card with inline completion toggle

```typescript
interface DashboardTaskCardProps {
  task: {
    id: string;
    name: string;
    dueDate: string;
    currentUserCompletion: { id: string } | null;
  };
  onToggleComplete: (taskId: string, isComplete: boolean) => Promise<void>;
}
```

**Implementation Notes**:
- Mirror styling from existing Upcoming Events cards
- Include completion toggle button (checkbox or toggle icon)
- Show due date formatted like events: `formatDate(dateString)`
- Wrap card content in Link to `/tasks/${task.id}`

**Test Coverage**: Unit tests for component rendering

---

#### Step 2: Update Dashboard Page

**File**: `frontend/src/app/dashboard/page.tsx`

**Changes**:

1. **Add state for tasks**:
   ```typescript
   const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);
   const [loadingTasks, setLoadingTasks] = useState(true);
   ```

2. **Add data fetching**:
   ```typescript
   const loadUpcomingTasks = async () => {
     try {
       const data = await adminTasksService.listTasks({ 
         assignedToMe: true, 
         status: 'incomplete', 
         limit: 10 
       });
       const upcoming = data.tasks
         .filter(task => !task.isOverdue)
         .slice(0, 5);
       setUpcomingTasks(upcoming);
     } catch (error) {
       console.error('Failed to load tasks:', error);
     } finally {
       setLoadingTasks(false);
     }
   };
   ```

3. **Add completion toggle handler**:
   ```typescript
   const handleToggleComplete = async (taskId: string, isComplete: boolean) => {
     // Optimistic update
     setUpcomingTasks(prev => prev.map(t => 
       t.id === taskId 
         ? { ...t, currentUserCompletion: isComplete ? null : { id: 'temp' } }
         : t
     ));
     
     try {
       if (isComplete) {
         await adminTasksService.uncompleteTask(taskId);
       } else {
         await adminTasksService.completeTask(taskId);
       }
     } catch (error) {
       // Revert optimistic update
       setUpcomingTasks(prev => prev.map(t => 
         t.id === taskId 
           ? { ...t, currentUserCompletion: isComplete ? { id: 'temp' } : null }
           : t
       ));
       console.error('Failed to toggle task:', error);
     }
   };
   ```

4. **Replace "Recent Activity" pane** with "Upcoming Tasks" pane:
   ```tsx
   <Card className="p-6">
     <div className="flex justify-between items-center mb-4">
       <h2 className="text-xl font-semibold">Upcoming Tasks</h2>
       <Link href="/tasks">
         <Button variant="ghost" size="sm">View All</Button>
       </Link>
     </div>
     {loadingTasks ? (
       <p className="text-gray-600 text-sm">Loading tasks...</p>
     ) : upcomingTasks.length > 0 ? (
       <div className="space-y-3">
         {upcomingTasks.map(task => (
           <DashboardTaskCard 
             key={task.id} 
             task={task}
             onToggleComplete={handleToggleComplete}
           />
         ))}
       </div>
     ) : (
       <p className="text-gray-600 text-sm">No upcoming tasks.</p>
     )}
   </Card>
   ```

**Test Coverage**: Integration tests for dashboard component

---

#### Step 3: Run Tests

```bash
cd frontend
npm test
```

**Success Criteria**: All tests pass ✅

---

### Phase 3: Refactor (Clean) 🔵

**Goals**:
- Extract date formatting to shared utility if used in multiple places
- Extract task limit (5) and fetch limit (10) to constants
- Add JSDoc comments to new functions
- Ensure DRY principles - no duplication of logic

**Files to Review**:
- `frontend/src/app/dashboard/page.tsx` - Clean up handlers
- `frontend/src/components/shared/tasks/DashboardTaskCard.tsx` - Documentation
- Extract utilities if needed: `frontend/src/lib/date-utils.ts`

**Test Coverage**: Re-run all tests to ensure refactoring didn't break anything

---

## Testing Strategy

### Unit Tests

**Location**: `frontend/src/components/shared/tasks/DashboardTaskCard.test.tsx`

- Render with incomplete task
- Render with completed task
- Click completion toggle calls handler
- Click card navigates to detail page

### Integration Tests

**Location**: `frontend/src/app/dashboard/page.test.tsx`

- Mock adminTasksService.listTasks
- Mock adminTasksService.completeTask / uncompleteTask
- Test full user flows from mounting to completion toggle
- Test error handling and state rollback

### E2E Tests (Optional)

**Location**: Not required for this feature (dashboard already has E2E coverage)

---

## Common Pitfalls

### ❌ Don't Do This

1. **Fetching all tasks and filtering client-side**:
   ```typescript
   // BAD - inefficient
   const allTasks = await adminTasksService.listTasks({});
   const filtered = allTasks.filter(/* ... */);
   ```
   ✅ Use API filters: `assignedToMe=true&status=incomplete`

2. **Reloading full task list after each toggle**:
   ```typescript
   // BAD - causes flicker, slow UX
   await adminTasksService.completeTask(id);
   await loadUpcomingTasks(); // Full reload
   ```
   ✅ Use optimistic updates with state rollback

3. **Parsing dates client-side**:
   ```typescript
   // BAD - duplicates server logic
   const isOverdue = new Date(task.dueDate) < new Date();
   ```
   ✅ Use server's `isOverdue` flag

4. **Modifying existing TaskCard component**:
   ```typescript
   // BAD - violates SRP, risks regression
   <TaskCard {...props} dashboardMode={true} onToggle={...} />
   ```
   ✅ Create separate DashboardTaskCard component

---

## File Checklist

### New Files
- [ ] `frontend/src/components/shared/tasks/DashboardTaskCard.tsx`
- [ ] `frontend/src/components/shared/tasks/DashboardTaskCard.test.tsx`

### Modified Files
- [ ] `frontend/src/app/dashboard/page.tsx` - Add Upcoming Tasks pane
- [ ] `frontend/src/app/dashboard/page.test.tsx` - Add tests for new pane

### No Changes Required
- ✅ Backend API (uses existing endpoints)
- ✅ Database schema (uses existing models)
- ✅ Existing TaskCard component (kept unchanged)

---

## Verification Checklist

Before marking feature complete:

### Functional Requirements
- [ ] FR-001: "Recent Activity" pane replaced with "Upcoming Tasks" ✅
- [ ] FR-002: Shows only tasks assigned to current user ✅
- [ ] FR-003: Shows only tasks with future due dates (not overdue) ✅
- [ ] FR-004: Shows only incomplete tasks ✅
- [ ] FR-005: Limits display to 5 tasks ✅
- [ ] FR-006: Sorts by due date ascending, then by name ✅
- [ ] FR-007: Shows task name, due date, completion status ✅
- [ ] FR-008: Includes completion toggle button ✅
- [ ] FR-009: Updates status without page refresh ✅
- [ ] FR-010: Task card clickable to detail page ✅
- [ ] FR-011: Shows "No upcoming tasks" when empty ✅
- [ ] FR-012: Includes "View All" button to tasks page ✅
- [ ] FR-013: Shows loading state during fetch ✅
- [ ] FR-014: Handles API errors gracefully ✅
- [ ] FR-015: Visual consistency with Upcoming Events pane ✅

### Success Criteria
- [ ] SC-001: Tasks load within 2 seconds ⚡
- [ ] SC-002: Task completion in under 3 clicks ⚡
- [ ] SC-003: 90% successful navigation (track in analytics) 📊
- [ ] SC-004: Dashboard load time under 2 seconds ⚡
- [ ] SC-005: Immediate UI updates (optimistic) ✅
- [ ] SC-006: No visual layout shift ✅

### Constitution Check
- [ ] ✅ BDD: Tests written first, all passing
- [ ] ✅ Clean Code: Components documented, clear naming
- [ ] ✅ DRY: Reused existing API, no duplication

---

## Deployment Notes

### Feature Flag (Optional)
Not required - feature replaces existing pane, no A/B testing needed

### Rollout Plan
1. Merge to main after all tests pass
2. Deploy to production (standard deployment process)
3. Monitor dashboard load times and error rates
4. Collect user feedback on task visibility and completion workflow

### Rollback Plan
If critical issues found:
1. Revert commit that replaced "Recent Activity" with "Upcoming Tasks"
2. Redeploy previous version
3. "Recent Activity" pane will return (though empty)

---

## Support & Troubleshooting

### Common Issues

**Issue**: Tasks not appearing in dashboard
- **Check**: User has tasks assigned via role or pack-wide
- **Check**: Tasks have future due dates (not overdue)
- **Check**: Tasks are incomplete (not already marked complete)
- **Solution**: Verify API filters in network tab

**Issue**: Completion toggle doesn't work
- **Check**: API endpoint responding (network tab)
- **Check**: Task is assigned to user
- **Check**: No 409 Conflict errors (already completed)
- **Solution**: Check browser console for error messages

**Issue**: Layout shift when tasks load
- **Check**: Loading skeleton or fixed height container
- **Solution**: Add `min-h-[200px]` to card during loading

---

## Next Steps After Implementation

1. **Collect Metrics**:
   - Dashboard load time (should be <2s)
   - Task completion click rate
   - Navigation to task details rate

2. **User Feedback**:
   - Is task visibility on dashboard helpful?
   - Is inline completion toggle used?
   - Should we increase limit beyond 5 tasks?

3. **Future Enhancements** (not in scope):
   - Filter by task priority
   - Group by due date (Today, This Week, Later)
   - Notification when new task assigned
   - Bulk completion for similar tasks

---

## Resources

- [Spec](spec.md) - Feature specification
- [Research](research.md) - Technical decisions
- [Data Model](data-model.md) - Data structures
- [API Contract](contracts/api-admin-tasks.md) - API documentation
- [Existing Task Card](../../frontend/src/components/shared/tasks/TaskCard.tsx) - Reference implementation
- [Dashboard Page](../../frontend/src/app/dashboard/page.tsx) - Implementation target

---

**Ready to Start?** Begin with Phase 1 (Tests First). Write all failing tests before any implementation code. 🔴 → 🟢 → 🔵
