# Developer Quickstart: Enhanced Event Management

**Feature**: Event Time and Activity Details Enhancements  
**Branch**: `008-event-time-enhancements`  
**Quick Links**: [Spec](spec.md) | [Plan](plan.md) | [Research](research.md) | [Data Model](data-model.md) | [Contracts](contracts/)

## TL;DR

Add optional event end times, full-day flag, activity slot descriptions, and numbered steps for better volunteer clarity.

**What Changed**:
- Event: `+endTime`, `+fullDay`
- ActivitySlot: `+description`, `+steps[]`
- New entity: `ActivitySlotStep` (relational model with orderIndex)

**Backward Compatible**: ✅ All new fields optional/defaulted

---

## Database Schema Changes

### Event Model

```prisma
model Event {
  // ... existing fields ...
  eventTime       String?       // EXISTING: Start time
  endTime         String?       // NEW: End time (HH:mm format)
  fullDay         Boolean       @default(false) // NEW: All-day event flag
  // ... existing fields ...
}
```

### ActivitySlot Model

```prisma
model ActivitySlot {
  // ... existing fields ...
  description     String?       // NEW: Custom description (max 500 chars)
  steps           ActivitySlotStep[] // NEW: Relationship
  // ... existing fields ...
}
```

### NEW: ActivitySlotStep Model

```prisma
model ActivitySlotStep {
  id              String        @id @default(cuid())
  activitySlotId  String
  activitySlot    ActivitySlot  @relation(fields: [activitySlotId], references: [id], onDelete: Cascade)
  orderIndex      Int           // Sequential: 1, 2, 3...
  stepText        String        // Max 200 chars
  createdAt       DateTime      @default(now())
  
  @@index([activitySlotId, orderIndex])
  @@unique([activitySlotId, orderIndex])
}
```

**Migration Command**:
```bash
cd backend
npx prisma migrate dev --name add_event_time_enhancements
```

---

## API Quick Reference

### Event Time Fields

```typescript
// Create event with end time
POST /api/events
{
  "eventTime": "14:00",  // 2:00 PM
  "endTime": "16:30",    // 4:30 PM
  "fullDay": false
}

// Create full-day event
POST /api/events
{
  "fullDay": true,
  // eventTime and endTime must be null
}
```

**Validation**:
- `fullDay = true` → times must be null
- `endTime` provided → `eventTime` required
- `endTime` must be after `eventTime` (except midnight-spanning)

### Activity Slot Description & Steps

```typescript
// Create activity slot with steps
POST /api/events
{
  "activitySlots": [
    {
      "activityTypeId": "clx-123",
      "description": "Run Lion station for safety",
      "steps": [
        { "stepText": "Gather the lions in a circle" },
        { "stepText": "Hand out the role placards" },
        { "stepText": "Explain the game rules" }
      ]
    }
  ]
}

// Add step to existing slot
POST /api/activity-slots/:id/steps
{ "stepText": "Clean up area" }

// Remove step (auto-renumbers)
DELETE /api/activity-slots/:slotId/steps/:stepId

// Reorder steps
PATCH /api/activity-slots/:id/steps/reorder
{ "stepIds": ["clx-step-3", "clx-step-1", "clx-step-2"] }
```

**Limits**:
- Description: 500 chars max
- Steps: 20 max per slot, 200 chars each

---

## Backend Implementation

### Time Validation Utility

```typescript
// backend/src/utils/time-validation.util.ts
export function validateEventTimes(
  eventTime: string | null,
  endTime: string | null,
  fullDay: boolean
): void {
  if (fullDay && (eventTime || endTime)) {
    throw new BadRequestException('Full-day events cannot have times');
  }
  
  if (endTime && !eventTime) {
    throw new BadRequestException('Start time required when end time provided');
  }
  
  if (eventTime && endTime) {
    const start = parseTime(eventTime);
    const end = parseTime(endTime);
    if (end <= start) {
      // Allow but log (could be midnight-spanning)
      console.warn('End time not after start time');
    }
  }
}
```

### ActivitySlotStepService

```typescript
// backend/src/services/activity-slot-step.service.ts
@Injectable()
export class ActivitySlotStepService {
  async addStep(activitySlotId: string, stepText: string) {
    const count = await this.countSteps(activitySlotId);
    if (count >= 20) throw new BadRequestException('Max 20 steps');
    
    return this.prisma.activitySlotStep.create({
      data: { activitySlotId, stepText, orderIndex: count + 1 }
    });
  }

  async removeStep(stepId: string) {
    const step = await this.findStepOrFail(stepId);
    await this.prisma.$transaction([
      this.prisma.activitySlotStep.delete({ where: { id: stepId } }),
      this.prisma.activitySlotStep.updateMany({
        where: { activitySlotId: step.activitySlotId, orderIndex: { gt: step.orderIndex } },
        data: { orderIndex: { decrement: 1 } }
      })
    ]);
  }

  async reorderSteps(activitySlotId: string, stepIds: string[]) {
    await this.prisma.$transaction(
      stepIds.map((id, index) =>
        this.prisma.activitySlotStep.update({
          where: { id },
          data: { orderIndex: index + 1 }
        })
      )
    );
  }
}
```

### Event DTO (Zod)

```typescript
// backend/src/models/event.dto.ts
const CreateEventSchema = z.object({
  eventTime: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
  fullDay: z.boolean().default(false),
  // ... other fields ...
}).refine(
  (data) => {
    if (data.fullDay) return !data.eventTime && !data.endTime;
    if (data.endTime) return !!data.eventTime;
    return true;
  },
  { message: 'Invalid time configuration' }
);
```

---

## Frontend Implementation

### Time Picker Component

```tsx
// frontend/src/components/event-time-picker.tsx
export function EventTimePicker({ value, onChange }) {
  const [fullDay, setFullDay] = useState(value.fullDay);
  
  return (
    <div>
      <Checkbox
        checked={fullDay}
        onCheckedChange={(checked) => {
          setFullDay(checked);
          onChange({ ...value, fullDay: checked, eventTime: null, endTime: null });
        }}
      >
        All Day Event
      </Checkbox>
      
      {!fullDay && (
        <>
          <Input
            type="time"
            value={value.eventTime || ''}
            onChange={(e) => onChange({ ...value, eventTime: e.target.value })}
            placeholder="Start Time"
          />
          <Input
            type="time"
            value={value.endTime || ''}
            onChange={(e) => onChange({ ...value, endTime: e.target.value })}
            placeholder="End Time (optional)"
          />
        </>
      )}
    </div>
  );
}
```

### Step Manager Component

```tsx
// frontend/src/components/step-manager.tsx
export function StepManager({ steps, onChange }) {
  const addStep = () => {
    if (steps.length >= 20) return;
    onChange([...steps, { stepText: '' }]);
  };
  
  const removeStep = (index: number) => {
    onChange(steps.filter((_, i) => i !== index));
  };
  
  return (
    <div>
      {steps.map((step, index) => (
        <div key={index}>
          <span>{index + 1}.</span>
          <Input
            value={step.stepText}
            onChange={(e) => {
              const updated = [...steps];
              updated[index].stepText = e.target.value;
              onChange(updated);
            }}
            maxLength={200}
            placeholder="Step instruction"
          />
          <Button onClick={() => removeStep(index)}>Remove</Button>
        </div>
      ))}
      <Button onClick={addStep} disabled={steps.length >= 20}>
        Add Step
      </Button>
    </div>
  );
}
```

### Display Utilities

```typescript
// frontend/src/lib/time-format.util.ts
export function formatEventTime(event: Event): string {
  if (event.fullDay) return 'All Day';
  if (event.eventTime && event.endTime) {
    return `${format12hr(event.eventTime)} - ${format12hr(event.endTime)}`;
  }
  if (event.eventTime) return `Starts at ${format12hr(event.eventTime)}`;
  return 'Time TBD';
}

function format12hr(time24: string): string {
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
}

export function formatActivitySlotName(slot: ActivitySlot): string {
  return slot.description
    ? `${slot.activityType.name} - ${slot.description}`
    : slot.activityType.name;
}
```

---

## Testing Checklist

### Backend Tests

```bash
cd backend
npm test -- activity-slot-step.service.spec.ts  # Unit tests
npm run test:e2e -- event-api.spec.ts           # Contract tests
```

**Key Test Cases**:
- ✅ Time validation (all combinations)
- ✅ Step CRUD with renumbering
- ✅ Max limits (20 steps, 500/200 char limits)
- ✅ Backward compatibility (null handling)

### Frontend Tests

```bash
cd frontend
npm test -- event-time-picker.test.tsx
npm test -- step-manager.test.tsx
npm test -- event-creation.test.tsx  # Integration
```

**Key Test Cases**:
- ✅ Full-day toggle behavior
- ✅ Time validation in UI
- ✅ Step add/remove/reorder
- ✅ Character counters
- ✅ Form submission with new fields

---

## Common Patterns

### Fetch Event with Steps

```typescript
const event = await prisma.event.findUnique({
  where: { id },
  include: {
    activitySlots: {
      include: {
        activityType: true,
        steps: { orderBy: { orderIndex: 'asc' } }
      }
    }
  }
});
```

### Display Event Time

```tsx
<div>
  <h2>{event.title}</h2>
  <p>{formatEventTime(event)}</p>
</div>
```

### Display Activity Slot with Steps

```tsx
<div>
  <h3>{formatActivitySlotName(slot)}</h3>
  {slot.steps.length > 0 && (
    <ol>
      {slot.steps.map(step => (
        <li key={step.id}>{step.stepText}</li>
      ))}
    </ol>
  )}
</div>
```

---

## Troubleshooting

### "End time must be after start time" error
- Check that times are in HH:mm format (24-hour)
- For midnight-spanning events (rare), consider using full-day flag

### "Max 20 steps" error
- Check step count before adding
- Consider breaking into multiple activity slots if > 20 instructions needed

### Steps not displaying in order
- Verify `orderBy: { orderIndex: 'asc' }` in Prisma query
- Check that renumbering logic runs after step deletion

### Full-day toggle not clearing times
- Ensure frontend state management clears `eventTime` and `endTime` when `fullDay = true`
- Backend validation will reject if times provided with fullDay flag

---

## Deployment

1. **Database Migration**:
   ```bash
   cd backend
   npx prisma migrate deploy
   ```

2. **Backend Deploy**:
   ```bash
   npm run build
   npm run start:prod
   ```

3. **Frontend Deploy**:
   ```bash
   cd frontend
   npm run build
   npm start
   ```

**Order Matters**: Deploy database → backend → frontend for zero downtime.

---

## Resources

- [Full Specification](spec.md)
- [Implementation Plan](plan.md)
- [Research & Decisions](research.md)
- [Data Model Details](data-model.md)
- [API Contracts](contracts/)

**Questions?** Check the spec or plan documents for detailed rationale and edge cases.
