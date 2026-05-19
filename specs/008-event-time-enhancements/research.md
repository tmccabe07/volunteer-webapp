# Research: Enhanced Event Management - Time and Activity Details

**Phase**: Phase 0 - Research & Technical Decisions  
**Date**: 2026-05-19  
**Feature**: [spec.md](spec.md) | [plan.md](plan.md)

## Overview

Research focused on four key areas: time field storage and validation, step data modeling, UI patterns for dynamic form fields, and backward compatibility strategies. All decisions prioritize data integrity, user experience, and maintainability.

---

## 1. Time Field Storage and Validation

### Decision: Store Times as Strings, Validate Format and Logic

**Rationale**:
- Existing `Event.eventTime` field is `String?` in Prisma schema
- Times represent local wall-clock times without timezone complexity (pack events are local)
- String storage allows flexible formats (12hr with AM/PM for user display)
- Validation layer ensures consistency before persistence

**Implementation Approach**:
- **Storage**: `eventTime String?`, `endTime String?` (new field), `fullDay Boolean @default(false)` (new field)
- **Format**: Store in 24-hour format (HH:mm) internally, display in 12-hour format (h:mm AM/PM) for users
- **Validation Rules**:
  1. If `fullDay = true`, ignore `eventTime` and `endTime` (both must be null)
  2. If `fullDay = false` and `endTime` is provided, `eventTime` is required
  3. If both times provided, `endTime` must be after `eventTime` (parse and compare)
  4. Edge case: Times spanning midnight (e.g., 11:00 PM to 1:00 AM) - validate endTime < startTime indicates next day (allow but document)

**Validation Library**: Use Zod for DTO validation with custom refinements

**Code Pattern**:
```typescript
// Centralized validation utility
export function validateEventTimes(startTime: string | null, endTime: string | null, fullDay: boolean): ValidationResult {
  if (fullDay) {
    return { valid: true };
  }
  if (endTime && !startTime) {
    return { valid: false, error: 'Start time required when end time is provided' };
  }
  if (startTime && endTime) {
    const start = parseTime(startTime); // Convert to minutes since midnight
    const end = parseTime(endTime);
    if (end <= start) {
      // Could be next day (e.g., 11:00 PM to 1:00 AM)
      // Document this behavior but allow it
      console.warn('End time is before or equal to start time - may span midnight');
    }
  }
  return { valid: true };
}
```

**Alternatives Considered**:
- **DateTime fields**: Rejected - requires coupling time to date, creates timezone complexity
- **Separate date+time fields**: Rejected - unnecessary for local events without timezone needs
- **Minutes since midnight (integer)**: Rejected - less readable in database, harder to debug

---

## 2. Step Data Modeling

### Decision: Relational Model (ActivitySlotStep) vs JSON String

**Chosen Approach**: **Relational Model** (ActivitySlotStep entity)

**Rationale**:
- **Data Integrity**: Foreign key constraints ensure steps belong to valid activity slots
- **Queryability**: Can filter, sort, and join on step data without JSON parsing
- **Type Safety**: Prisma generates typed models with compile-time validation
- **Ordering**: Explicit `orderIndex` field for reordering without array manipulation
- **CRUD Operations**: Standard Prisma operations vs JSON deserialization/serialization
- **Scalability**: Supports future enhancements (step completion tracking, step templates)

**Trade-offs**:
- More database rows (1 row per step vs 1 JSON field per activity slot)
- Slightly more complex queries (join required)
- Additional migration and model setup

**Existing Pattern**: AdminTask uses `completionSteps String?` (JSON array). This works for simple cases but limits future extensibility. For activity slots, relational model is preferred to enable richer features long-term.

**Schema Design**:
```prisma
model ActivitySlotStep {
  id              String        @id @default(cuid())
  activitySlotId  String
  activitySlot    ActivitySlot  @relation(fields: [activitySlotId], references: [id], onDelete: Cascade)
  orderIndex      Int           // 1, 2, 3... for ordering
  stepText        String        // Max 200 characters (validated in DTO)
  
  createdAt       DateTime      @default(now())
  
  @@index([activitySlotId, orderIndex]) // Efficient ordering queries
  @@unique([activitySlotId, orderIndex]) // Prevent duplicate order indices
}
```

**Service Pattern**: ActivitySlotStepService with methods:
- `addStep(activitySlotId, stepText)` - Appends to end, auto-calculates orderIndex
- `removeStep(stepId)` - Deletes and renumbers remaining steps
- `reorderSteps(activitySlotId, newOrder: string[])` - Batch update orderIndex
- `getStepsBySlot(activitySlotId)` - Fetch ordered list

**Alternatives Considered**:
- **JSON array in ActivitySlot.steps**: Rejected - limits future features, harder to query
- **Separate Step template entity**: Rejected - over-engineering, steps are event-specific

---

## 3. UI Patterns for Dynamic Form Fields

### Decision: Progressive Disclosure with Inline Validation

**Full-Day Toggle Pattern**:
- Checkbox/toggle "All Day Event" at top of time section
- When checked: Hide/disable time pickers, show "All Day" badge
- When unchecked: Show start time (required) and end time (optional)
- State management: Clear time values when toggling to full-day, preserve values when toggling back (use local state cache)

**End Time Pattern**:
- Start time field always visible (required unless full-day)
- End time field below start time with label "End Time (optional)"
- Inline validation: Show error if end time < start time (excluding midnight-spanning cases)
- Display duration hint: "Duration: 2 hours" when both times provided

**Step Manager Pattern**:
- Dynamic list of step inputs numbered 1, 2, 3...
- "Add Step" button at bottom (disabled if max 20 reached)
- Each step has:
  - Number badge (read-only, auto-updates)
  - Text input (max 200 chars, show counter)
  - Remove button (icon)
  - Drag handle for reordering (future enhancement, optional for MVP)
- Empty state: "No steps added. Click 'Add Step' to provide instructions."
- Auto-focus new step input when added

**Component Library**: Radix UI primitives for accessibility
- Checkbox for full-day toggle
- Input components with validation states
- Dialog/popover for step help text

**Validation Timing**:
- Inline validation on blur (time fields, step text)
- Form-level validation on submit
- Server-side validation always enforced (never trust client)

**Responsive Design**:
- Mobile: Stack time fields vertically, full-width inputs
- Desktop: Time fields side-by-side, step list with compact spacing

**Alternatives Considered**:
- **Modal for step editing**: Rejected - adds unnecessary clicks, disrupts flow
- **Rich text editor for steps**: Rejected - over-complicates simple text instructions
- **Drag-and-drop reordering**: Deferred to future enhancement (MVP uses up/down buttons or manual reorder)

---

## 4. Backward Compatibility Strategy

### Decision: Graceful Null Handling + Migration Plan

**Database Compatibility**:
- New fields are nullable or have defaults: `endTime String?`, `fullDay Boolean @default(false)`
- Existing events automatically have `fullDay = false`, `endTime = null`
- Queries handle null gracefully (e.g., `endTime ?? 'End time not specified'`)

**API Compatibility**:
- GET endpoints: Include new fields in response (clients ignore unknown fields)
- POST/PUT endpoints: Accept new fields as optional (omitted = null/default)
- No breaking changes to existing API contracts

**Display Logic**:
- If `fullDay = true`: Display "All Day"
- If `eventTime` exists, `endTime = null`: Display "Starts at {time}" (existing behavior)
- If both times exist: Display "{startTime} - {endTime}" with duration
- If neither time exists (edge case): Display "Time TBD"

**Migration Strategy**:
1. Deploy schema migration (adds fields with defaults, safe to roll back)
2. Deploy backend changes (handles new fields, backward compatible)
3. Deploy frontend changes (uses new fields, falls back for old events)
4. No data backfill needed (existing events remain valid)

**Rollback Plan**:
- If critical bug found, roll back frontend/backend deployments
- Database migration can be reverted (drop columns) if no data written yet
- If data exists in new fields, manual migration required (convert back to old schema)

**Testing Approach**:
- Integration tests with existing events (no new fields)
- Integration tests with new events (all new fields)
- E2E tests verify display logic for all combinations

**Alternatives Considered**:
- **Versioned API endpoints**: Rejected - unnecessary for additive changes
- **Feature flags**: Considered for gradual rollout, optional based on deployment confidence

---

## 5. Form UX and Validation Best Practices

### Decision: Client-Side Validation + Server-Side Enforcement

**Client-Side Validation** (Zod + React Hook Form):
- Immediate feedback on invalid input (e.g., end time before start time)
- Prevents submission of invalid data
- Improves UX by catching errors early

**Server-Side Validation** (Zod DTOs in NestJS):
- **Always enforced** - never trust client input
- Returns 400 Bad Request with clear error messages
- Logs validation failures for monitoring

**Error Message Patterns**:
- Specific and actionable: "End time must be after start time" (not "Invalid time")
- Highlight problematic field (red border, error text below input)
- Summary error at form level: "Please fix 2 errors before submitting"

**Character Limits**:
- Activity slot description: 500 characters (enforced client + server)
- Step text: 200 characters per step (enforced client + server)
- Show character counter: "245 / 500 characters" (turns red when limit approached)

**Step Limit**:
- Max 20 steps per activity slot (enforced client + server)
- Disable "Add Step" button when limit reached
- Error message if server receives > 20 steps: "Maximum 20 steps allowed"

**Validation Edge Cases**:
- Empty step text: Not allowed (trim whitespace, require at least 1 character)
- Duplicate step text: Allowed (users may intentionally repeat instructions)
- Very long words: Allow but may cause layout issues (CSS word-wrap handles)
- Special characters: Allow all UTF-8 characters (no injection risk with proper escaping)

---

## 6. Performance Considerations

### Database Query Optimization

**Step Loading**:
- Always fetch steps with activity slots using Prisma `include: { steps: { orderBy: { orderIndex: 'asc' } } }`
- Single query with join vs N+1 queries
- Index on `[activitySlotId, orderIndex]` ensures fast ordering

**Event Queries**:
- Existing indexes on `eventDate` remain optimal
- No additional index needed for `fullDay` or `endTime` (not primary query filters)

**Frontend Data Loading**:
- Fetch event with all activity slots and steps in single API call
- Cache on client to avoid refetching during edit mode
- Optimistic updates for step reordering (update UI immediately, sync to server)

### Bundle Size Impact

**New Components**:
- Step manager: ~5KB (small reusable component)
- Time picker enhancement: Modifies existing component, minimal size increase

**No New Dependencies**:
- Use existing Radix UI, React Hook Form, Zod
- No date/time library needed (simple string parsing)

---

## Summary

All research questions resolved. Key decisions:

1. **Time Storage**: Strings (HH:mm format), validated with custom Zod refinements
2. **Step Modeling**: Relational `ActivitySlotStep` entity with `orderIndex` for proper data integrity
3. **UI Pattern**: Progressive disclosure (full-day toggle), inline validation, dynamic step list
4. **Backward Compatibility**: Nullable/default fields, graceful null handling, no breaking changes
5. **Validation**: Client-side for UX + server-side for security, clear error messages
6. **Performance**: Single queries with joins, existing indexes sufficient

**No unknowns remain.** Ready to proceed to Phase 1 (Data Model, Contracts, Quickstart).
