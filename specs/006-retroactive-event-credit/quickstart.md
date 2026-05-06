# Quickstart: Retroactive Event Credit

**Feature**: 006-retroactive-event-credit  
**Phase**: 1 - Design & Contracts  
**Date**: May 6, 2026

## TL;DR

Allow leaders (Tier 2+) to create events with past dates and award points to volunteers who participated but didn't sign up in advance. Extends existing event workflow by removing date validation and adding visual indicators for retroactive events.

## Prerequisites

Before starting implementation:

1. ✅ Read [spec.md](spec.md) - Feature specification with user stories
2. ✅ Read [research.md](research.md) - Technical decisions and existing implementation analysis
3. ✅ Read [data-model.md](data-model.md) - Entity relationships (no schema changes needed)
4. ✅ Read [contracts/events-api-changes.md](contracts/events-api-changes.md) - API contract changes

## Key Implementation Points

### What Changes

✅ **Backend**: Remove "event date must be in future" validation  
✅ **Backend**: Add `isRetroactive` computed field to event queries  
✅ **Frontend**: Add "Retroactive" badge to events where `createdAt > eventDate`  
✅ **Tests**: Add test cases for past event dates  

### What Doesn't Change

❌ **Schema**: No database migrations - uses existing fields  
❌ **Manual Volunteers**: Already works - no changes needed  
❌ **Point Distribution**: Already works correctly for past events  
❌ **Event Completion**: Workflow remains identical  

## Implementation Order (BDD Test-First)

### Phase 1: Backend Tests First (Red) 🔴

#### Step 1A: Event Service Tests

**File**: `backend/src/services/event.service.spec.ts`

**Write failing tests** for User Story 1 (P1 - Create Past Event):

```typescript
describe('EventService - Retroactive Events', () => {
  it('allows creating event with past date');
  it('allows creating event with today date');
  it('allows creating event with future date (existing behavior)');
  it('computes isRetroactive correctly when createdAt > eventDate');
  it('computes isRetroactive as false when createdAt <= eventDate');
});
```

**File**: `backend/test/events.e2e-spec.ts`

**Write failing E2E tests**:

```typescript
describe('POST /api/events - Retroactive', () => {
  it('creates event with past date and returns 201');
  it('GET /api/events includes isRetroactive=true for past events');
  it('GET /api/events/:id includes isRetroactive field');
});

describe('POST /api/events/:id/complete - Retroactive', () => {
  it('completes retroactive event with manual volunteers');
  it('awards points correctly for retroactive event');
  it('point event reason includes "manual" for manual volunteers');
});
```

**Run tests**:
```bash
cd backend
npm test
```

**Success Criteria**: All new tests written, all failing ❌, reviewable by stakeholder

---

### Phase 2: Backend Implementation (Green) 🟢

#### Step 2A: Update Event Validation

**File**: `backend/src/services/event.service.ts` (line ~27-30)

**Before**:
```typescript
// Validate event date is in the future
const eventDate = new Date(data.eventDate);
if (eventDate < new Date()) {
  throw new Error('Event date must be in the future');
}
```

**After**:
```typescript
// Removed - now allows past dates for retroactive event creation
// const eventDate = new Date(data.eventDate);
// if (eventDate < new Date()) {
//   throw new Error('Event date must be in the future');
// }
```

**Test**: Run event service unit tests - should now pass ✅

---

#### Step 2B: Add isRetroactive to Event Queries

**File**: `backend/src/services/event.service.ts`

**Add helper function** at top of file:

```typescript
/**
 * Determines if an event was created retroactively
 * @param event Event with createdAt and eventDate
 * @returns true if event was created after its event date
 */
function isRetroactiveEvent(event: { createdAt: Date; eventDate: Date }): boolean {
  return event.createdAt > event.eventDate;
}
```

**Update listEvents method** (around line ~80):

```typescript
async listEvents(query: ListEventsQuery, userId?: string) {
  // ... existing query logic ...
  
  const events = await prisma.event.findMany({ /* ... */ });
  
  // Add isRetroactive computed field
  return {
    events: events.map(event => ({
      ...event,
      isRetroactive: isRetroactiveEvent(event),
    })),
    pagination: { /* ... */ }
  };
}
```

**Update getEvent method** (around line ~130):

```typescript
async getEvent(eventId: string) {
  const event = await prisma.event.findUnique({ /* ... */ });
  
  if (!event) {
    throw new Error('Event not found');
  }
  
  return {
    ...event,
    isRetroactive: isRetroactiveEvent(event),
  };
}
```

**Test**: Run E2E tests - should now pass ✅

---

### Phase 3: Frontend Tests First (Red) 🔴

#### Step 3A: Event List Tests

**File**: `frontend/src/app/events/page.test.tsx`

**Write failing tests** for User Story 1 (P1 - View Retroactive Events):

```typescript
describe('Events Page - Retroactive Indicators', () => {
  it('displays "Retroactive" badge for events where isRetroactive=true');
  it('does not display badge for events where isRetroactive=false');
  it('displays retroactive badge in event list items');
});
```

**File**: `frontend/src/app/events/[id]/page.test.tsx`

**Write failing tests** for event detail:

```typescript
describe('Event Detail - Retroactive Indicator', () => {
  it('displays "Retroactive" badge in event header when isRetroactive=true');
  it('displays event creation date for retroactive events');
});
```

**Run tests**:
```bash
cd frontend
npm test
```

**Success Criteria**: All tests written, all failing ❌

---

### Phase 4: Frontend Implementation (Green) 🟢

#### Step 4A: Update Type Definitions

**File**: `frontend/src/services/events.service.ts`

**Update Event interface**:

```typescript
export interface Event {
  id: string;
  title: string;
  description: string | null;
  eventDate: string;
  eventTime: string | null;
  location: string | null;
  rankLevel: string | null;
  isRecurring: boolean;
  isComplete: boolean;
  isRetroactive: boolean;  // ✅ Add this field
  activitySlots: ActivitySlot[];
  createdBy: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}
```

**No changes to methods** - API automatically returns the field.

---

#### Step 4B: Add Retroactive Badge to Event List

**File**: `frontend/src/app/events/page.tsx`

**Import Badge component**:

```typescript
import { Badge } from '@/components/ui/badge';
```

**Add badge to event list items** (find the event mapping section):

```tsx
{events.map(event => (
  <Link key={event.id} href={`/events/${event.id}`}>
    <Card className="p-4 hover:bg-gray-50">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            {event.title}
            {event.isRetroactive && (
              <Badge variant="secondary">Retroactive</Badge>
            )}
          </h3>
          {/* ... rest of card content ... */}
        </div>
      </div>
    </Card>
  </Link>
))}
```

---

#### Step 4C: Add Retroactive Badge to Event Detail

**File**: `frontend/src/app/events/[id]/page.tsx`

**Import Badge component** (if not already imported):

```typescript
import { Badge } from '@/components/ui/badge';
```

**Add badge to event header**:

```tsx
<div className="flex justify-between items-center mb-6">
  <div>
    <h1 className="text-3xl font-bold flex items-center gap-3">
      {event.title}
      {event.isRetroactive && (
        <Badge variant="secondary" className="text-sm">
          Retroactive
        </Badge>
      )}
    </h1>
    <p className="text-gray-600 mt-1">
      Event Date: {formatDate(event.eventDate)}
      {event.isRetroactive && (
        <span className="ml-2 text-sm">
          (Created {formatDate(event.createdAt)})
        </span>
      )}
    </p>
  </div>
  {/* ... rest of header ... */}
</div>
```

**Test**: Run frontend tests - should now pass ✅

---

### Phase 5: Refactor (Clean) 🔵

**Goals**:
- Extract `isRetroactiveEvent()` to shared utility if needed in multiple places
- Add JSDoc comments to the helper function
- Ensure badge styling is consistent across list and detail views
- Verify no duplication of retroactive logic

**Files to Review**:
- `backend/src/services/event.service.ts` - Document helper function
- `backend/src/utils/event-helpers.ts` - Consider extracting helper if reused
- `frontend/src/app/events/page.tsx` - Consistent badge rendering
- `frontend/src/app/events/[id]/page.tsx` - Consistent badge rendering

**Refactoring Candidates**:

1. **Extract Badge Component** (if used in multiple places):
   ```typescript
   // frontend/src/components/events/RetroactiveBadge.tsx
   export function RetroactiveBadge({ show }: { show: boolean }) {
     if (!show) return null;
     return <Badge variant="secondary">Retroactive</Badge>;
   }
   ```

2. **Extract Date Comparison** (if needed in frontend):
   ```typescript
   // frontend/src/lib/event-utils.ts
   export function isRetroactiveEvent(event: { createdAt: string; eventDate: string }): boolean {
     return new Date(event.createdAt) > new Date(event.eventDate);
   }
   ```

**Constitution Check**:
- ✅ **DRY**: Helper functions extracted, no duplication
- ✅ **Clean Code**: Functions documented with JSDoc
- ✅ **BDD**: Tests written first, all pass before refactoring

---

## Testing Checklist

### Backend Tests

- [ ] Unit test: Create event with past date succeeds
- [ ] Unit test: `isRetroactiveEvent()` returns true when `createdAt > eventDate`
- [ ] Unit test: `isRetroactiveEvent()` returns false when `createdAt <= eventDate`
- [ ] E2E test: POST /api/events with past date returns 201
- [ ] E2E test: GET /api/events includes `isRetroactive` field
- [ ] E2E test: GET /api/events/:id includes `isRetroactive` field
- [ ] E2E test: Complete retroactive event with manual volunteers
- [ ] E2E test: Points awarded correctly for retroactive event
- [ ] E2E test: Point event reason includes "manual" indicator

### Frontend Tests

- [ ] Component test: Retroactive badge appears when `isRetroactive=true`
- [ ] Component test: Badge does not appear when `isRetroactive=false`
- [ ] Integration test: Event list displays retroactive badges
- [ ] Integration test: Event detail displays retroactive badge
- [ ] Integration test: Event creation with past date works end-to-end
- [ ] Integration test: Event completion with manual volunteers works

### Manual Testing

- [ ] Create event with past date as leader
- [ ] Verify event appears with "Retroactive" badge in list
- [ ] Verify event detail shows badge and creation date
- [ ] Mark retroactive event complete with manual volunteers
- [ ] Verify points awarded to manual volunteers
- [ ] Verify point history shows correct attribution
- [ ] Verify existing event creation (future dates) still works

---

## File Changes Summary

### Backend Files Modified

| File | Change Type | Lines Changed |
|------|-------------|---------------|
| `src/services/event.service.ts` | Remove validation, add helper | ~10 lines |
| `src/services/event.service.spec.ts` | Add tests | +50 lines |
| `test/events.e2e-spec.ts` | Add tests | +100 lines |

### Frontend Files Modified

| File | Change Type | Lines Changed |
|------|-------------|---------------|
| `src/services/events.service.ts` | Update types | +1 line |
| `src/app/events/page.tsx` | Add badge | +5 lines |
| `src/app/events/[id]/page.tsx` | Add badge | +10 lines |
| `src/app/events/page.test.tsx` | Add tests | +40 lines |
| `src/app/events/[id]/page.test.tsx` | Add tests | +30 lines |

**Total Estimated Changes**: ~250 lines across 8 files (including tests)

---

## Deployment Steps

1. **Deploy Backend** (no migration needed):
   ```bash
   cd backend
   npm run build
   npm run start:prod
   ```

2. **Deploy Frontend**:
   ```bash
   cd frontend
   npm run build
   npm run start
   ```

3. **Verify**:
   - Create test event with past date
   - Verify badge appears
   - Complete event with manual volunteers
   - Verify points awarded

**Rollback**: Redeploy previous versions. No database cleanup needed.

---

## Common Pitfalls

### ❌ Don't Do This

1. **Add new database fields** - Use computed `isRetroactive` from existing fields
2. **Modify point calculation** - Existing logic already correct
3. **Change manual volunteers logic** - Already works perfectly
4. **Add separate retroactive event form** - Violates DRY, use existing form
5. **Require approval workflow** - Spec explicitly says no approval needed

### ✅ Do This

1. **Remove date validation** - Single source of truth in event service
2. **Compute isRetroactive at query time** - No stored field needed
3. **Add visual indicators** - Use Badge component consistently
4. **Test backward compatibility** - Ensure existing event flows unaffected
5. **Document helper functions** - Clear JSDoc for `isRetroactiveEvent()`

---

## Quick Reference

### Backend: Remove Date Validation

```typescript
// DELETE THIS CODE:
if (eventDate < new Date()) {
  throw new Error('Event date must be in the future');
}
```

### Backend: Add Computed Field

```typescript
// ADD THIS HELPER:
function isRetroactiveEvent(event: { createdAt: Date; eventDate: Date }): boolean {
  return event.createdAt > event.eventDate;
}

// USE IN QUERIES:
return {
  ...event,
  isRetroactive: isRetroactiveEvent(event),
};
```

### Frontend: Add Badge

```tsx
// IN EVENT LIST AND DETAIL:
import { Badge } from '@/components/ui/badge';

{event.isRetroactive && (
  <Badge variant="secondary">Retroactive</Badge>
)}
```

---

## Need Help?

- **Spec questions**: See [spec.md](spec.md) user stories
- **Technical questions**: See [research.md](research.md) decisions
- **Data questions**: See [data-model.md](data-model.md) entity diagrams
- **API questions**: See [contracts/events-api-changes.md](contracts/events-api-changes.md) endpoints
- **Constitution questions**: See `.specify/memory/constitution.md` principles
