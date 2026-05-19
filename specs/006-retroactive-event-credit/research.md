# Research: Retroactive Event Credit

**Feature**: 006-retroactive-event-credit  
**Date**: May 6, 2026  
**Status**: Complete

## Executive Summary

This feature extends the existing event workflow to allow leaders (Tier 2+) to create events with past dates and award points to volunteers who participated but were not signed up in advance. The implementation is straightforward because:

1. **Existing manual volunteers feature** already handles adding participants during event completion
2. **Event model already tracks `createdAt`** timestamp separate from `eventDate`
3. **Only one validation check** prevents past dates in backend
4. **No UI-level date restrictions** in frontend form

## Current Implementation Analysis

### Backend: Event Date Validation

**File**: `backend/src/services/event.service.ts` (lines 27-30)

```typescript
// Validate event date is in the future
const eventDate = new Date(data.eventDate);
if (eventDate < new Date()) {
  throw new Error('Event date must be in the future');
}
```

**Decision**: Remove or modify this validation to allow past dates for Tier 2+ users.

**Rationale**: This is the **only** location that prevents retroactive events. The validation is simple and can be conditionally applied based on business rules (e.g., allow past dates, but warn if more than X months old).

### Backend: Manual Volunteers

**File**: `backend/src/services/event.service.ts` (lines 243-270)

The `markComplete()` method already supports `manualVolunteers` parameter:

```typescript
if (data.manualVolunteers) {
  for (const manual of data.manualVolunteers) {
    // Create signup record
    const signup = await prisma.signup.create({ ... });
    
    // Award points
    await prisma.pointEvent.create({
      reason: `Event participation (manual): ${event.title} - ...`
    });
  }
}
```

**Decision**: No changes needed. This feature already allows adding volunteers who didn't sign up in advance.

**Rationale**: The manual volunteers feature handles the "more volunteers showed up than signed up" use case perfectly. Works for both past and future events.

### Database: Audit Trail

**File**: `backend/prisma/schema.prisma` (Event model)

```prisma
model Event {
  id              String        @id @default(cuid())
  eventDate       DateTime
  createdAt       DateTime      @default(now())
  createdBy       Volunteer     @relation(...)
  ...
}
```

**Decision**: Leverage existing `createdAt` and `eventDate` fields to identify retroactive events. When `createdAt > eventDate`, the event is retroactive.

**Rationale**: No schema changes needed. The audit trail is already captured. Can add computed field or query logic to identify retroactive events.

### Frontend: Date Input

**File**: `frontend/src/components/forms/events/EventForm.tsx` (lines 213-221)

```typescript
<Input
  id="eventDate"
  type="date"
  value={formData.eventDate}
  onChange={(e) => handleChange('eventDate', e.target.value)}
  required
/>
```

**Decision**: No changes needed for basic functionality. Can optionally add warning message if date is in past.

**Rationale**: The HTML5 date input doesn't restrict past dates by default. The backend handles validation, so removing the backend check is sufficient. A warning in the UI would be helpful but not required.

## Best Practices Research

### Retroactive Data Entry Patterns

**Industry Standard**: Allow retroactive entries with clear audit trails and visual indicators.

**Common approaches:**
1. **Timestamp comparison**: Use creation timestamp vs. event timestamp (exactly what we have)
2. **Status badges**: Display "Retroactive" badge on events where `createdAt > eventDate`
3. **Separate color coding**: Light yellow/orange background for retroactive entries
4. **Filter options**: Allow filtering by retroactive vs. advance-planned events

**Decision**: Use status badge approach in event lists and detail views.

**Rationale**: Non-intrusive, provides clear visual feedback, and leverages existing UI component patterns (Radix UI Badge).

### Date Validation for Flexible Entry

**Research findings:**

| Approach | Pros | Cons |
|----------|------|------|
| **No restriction** | Maximum flexibility | Could allow accidental far-past dates |
| **Hard limit** (e.g., must be within 1 year) | Prevents obvious errors | Could block legitimate use cases |
| **Warning with confirmation** | Flexible + safe | Adds UI complexity |
| **Reasonable default** (current scouting year) | Balances flexibility and safety | Requires pack config integration |

**Decision**: Remove hard restriction, add warning if date is before current scouting year start.

**Rationale**: Aligns with FR-012 requirement: "allow standard event operations on retroactive events." Warning helps prevent mistakes without blocking legitimate use cases.

### Audit Trail Considerations

**Best practices:**
- ✅ **Separate timestamps** - Already have `createdAt` vs `eventDate`
- ✅ **Track creator** - Already have `createdById`
- ✅ **Immutable history** - Completed events can't be edited (existing rule)
- ⚠️ **Visual indicators** - Need to add retroactive badges
- ⚠️ **Point event metadata** - Should include retroactive flag

**Decision**: Add `isRetroactive` computed field or query logic, display in UI, include in point event reason field.

**Rationale**: Provides transparency without adding database complexity. Computed at query time from existing data.

## Technology-Specific Decisions

### TypeScript/Prisma: Retroactive Event Detection

**Approach**: Add a method to check if event is retroactive:

```typescript
function isRetroactiveEvent(event: { createdAt: Date; eventDate: Date }): boolean {
  return event.createdAt > event.eventDate;
}
```

**Rationale**: Simple, type-safe, reusable across backend and frontend. No schema changes needed.

### React/Next.js: Visual Indicators

**Approach**: Use Radix UI Badge component (already in project dependencies):

```typescript
{isRetroactiveEvent(event) && (
  <Badge variant="secondary">Retroactive</Badge>
)}
```

**Rationale**: Consistent with existing UI patterns. Non-intrusive visual feedback.

### NestJS: Validation Logic

**Approach**: Modify validation to be context-aware:

```typescript
// Allow past dates, but warn if before scouting year start
const packConfig = await prisma.packConfig.findFirst();
if (packConfig && eventDate < packConfig.yearStartDate) {
  // Log warning or return informational message
  // Don't throw error - allow the event to be created
}
```

**Rationale**: Provides helpful feedback without blocking functionality. Aligns with Tier 2+ trusted user model.

## Integration Points

### Point Distribution System

**Current behavior**: Points are awarded when event is marked complete, regardless of event date.

**Required changes**: None. The existing point distribution logic works correctly for retroactive events.

**Verification needed**: Ensure point event records include appropriate `reason` field text indicating retroactive participation.

### Leaderboard System

**Current behavior**: Historical leaderboard snapshots are immutable (stored periodically).

**Required changes**: None. Retroactive points update current balances but don't modify historical snapshots.

**Alignment**: FR-009 explicitly states "System MUST NOT modify historical leaderboard snapshots when retroactive points are awarded."

### Event Listing and Filtering

**Current behavior**: Events are typically sorted by `eventDate` ascending (upcoming first).

**Required changes**: Add filter option for retroactive events. Add visual indicator in list view.

**Implementation**: 
- Add computed field in query: `isRetroactive: createdAt > eventDate`
- Add badge to event list items
- Add filter toggle: "Show retroactive events"

## Open Questions Resolved

### Q1: How far back should leaders be allowed to create events?

**Answer**: No hard restriction, but warn if date is before current scouting year start date (from PackConfig).

**Reasoning**: Leaders are trusted users (Tier 2+). The spec's edge case section explicitly allows "retroactive event for a date before a volunteer joined the system" which implies no strict time limit. A warning for very old dates helps prevent accidents without blocking legitimate use cases.

### Q2: Should retroactive events require approval?

**Answer**: No. Leaders (Tier 2+) can create and complete retroactive events immediately, same as regular events.

**Reasoning**: Spec assumptions state "Leaders (Tier 2+) are trusted users who will not abuse retroactive event creation" and "Visual indicators for retroactive events (such as badges or icons) are sufficient - no approval workflow is needed."

### Q3: How should retroactive events appear in reports?

**Answer**: Include a computed `isRetroactive` flag in all event queries. Reports should have filter/sort options for retroactive events.

**Reasoning**: Supports FR-003 "System MUST visually distinguish retroactive events" and US-3 "audit trail that distinguishes between advance-planned events and retroactively created events."

### Q4: Can volunteers see that an event was created retroactively?

**Answer**: Yes. The event detail view will show a "Retroactive" badge, and point history will include appropriate context.

**Reasoning**: Transparency builds trust. Volunteers should understand when credit was awarded retroactively. FR-004 states volunteers can "see the event details and when the points were awarded."

## Alternatives Considered and Rejected

### Alternative 1: Separate "Retroactive Event" Form

**Description**: Create a completely separate workflow for retroactive events with different fields and validation.

**Rejected because**: Violates DRY principle. Adds maintenance burden. Spec explicitly states "existing event workflow...is appropriate for retroactive events."

### Alternative 2: Require Justification Text for Retroactive Events

**Description**: Require leaders to enter a reason/justification when creating an event with a past date.

**Rejected because**: Adds friction for trusted users. Audit trail already exists via `createdAt` timestamp and `createdBy` foreign key. Optional description field already exists for context.

### Alternative 3: Restrict Retroactive Events to Admins Only

**Description**: Only allow Tier 3 (ADMIN) users to create events with past dates.

**Rejected because**: Contradicts spec requirement FR-001 "System MUST allow leaders (Tier 2+) to create events with dates in the past." Den leaders need this capability to handle forgotten event setups.

### Alternative 4: Add New Database Fields for Retroactive Tracking

**Description**: Add explicit `isRetroactive` boolean or `retroactiveReason` text field to Event model.

**Rejected because**: Unnecessary complexity. The `isRetroactive` status can be computed from existing `createdAt` and `eventDate` fields. Adding redundant data violates normalization and creates maintenance burden.

## Implementation Recommendations

### Phase 1: Backend Changes (High Priority)

1. **Modify date validation** in `event.service.ts`:
   - Remove hard "must be in future" check
   - Add optional warning for dates before scouting year start
   - Add unit tests for past date scenarios

2. **Add helper function** for retroactive detection:
   - Create `isRetroactiveEvent()` utility function
   - Export from service for reuse in controllers

3. **Update point event reasons**:
   - Include "Retroactive" prefix in reason field when `isRetroactive === true`
   - Update existing manual volunteer reason format

### Phase 2: Frontend Changes (High Priority)

1. **Add visual indicators**:
   - Import Badge component (already available)
   - Add retroactive badge to event list items
   - Add retroactive badge to event detail header

2. **Add date warning** (optional but recommended):
   - Show warning message when selected date is in past
   - Include confirmation checkbox for dates before scouting year start
   - Use existing error/warning UI patterns

### Phase 3: Testing (Critical)

1. **Backend tests**:
   - Create event with past date succeeds (was failing before)
   - Manual volunteers work on retroactive events
   - Points are correctly awarded
   - Historical leaderboard snapshots unchanged

2. **Frontend tests**:
   - Date input accepts past dates
   - Retroactive badge appears when appropriate
   - Event completion flow works for retroactive events

3. **E2E tests**:
   - Full retroactive event workflow (create → add manual volunteers → complete → verify points)
   - Verify audit trail is maintained

## References

- Feature Spec: `specs/006-retroactive-event-credit/spec.md`
- Current Event Service: `backend/src/services/event.service.ts`
- Current Event Form: `frontend/src/components/forms/events/EventForm.tsx`
- Prisma Schema: `backend/prisma/schema.prisma`
- Constitution: `.specify/memory/constitution.md`
