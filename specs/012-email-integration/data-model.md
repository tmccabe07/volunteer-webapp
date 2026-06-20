# Data Model: Email Integration

## New Models

### EmailLog

Audit record for every triggered send action.

```prisma
model EmailLog {
  id            String          @id @default(cuid())
  senderId      String
  sender        Volunteer       @relation(fields: [senderId], references: [id])
  templateType  EmailTemplate
  eventId       String?
  event         Event?          @relation(fields: [eventId], references: [id], onDelete: SetNull)
  taskId        String?
  task          AdminTask?      @relation(fields: [taskId], references: [id], onDelete: SetNull)
  recipientCount Int
  skippedCount  Int             @default(0)
  failedCount   Int             @default(0)
  status        EmailSendStatus @default(SENT)
  sentAt        DateTime        @default(now())

  recipients EmailRecipientLog[]

  @@index([senderId])
  @@index([eventId, templateType, sentAt])
  @@index([taskId, templateType, sentAt])
}
```

### EmailRecipientLog

Per-recipient outcome within a send.

```prisma
model EmailRecipientLog {
  id            String              @id @default(cuid())
  emailLogId    String
  emailLog      EmailLog            @relation(fields: [emailLogId], references: [id], onDelete: Cascade)
  recipientId   String              // volunteerId
  recipientEmail String
  status        EmailRecipientStatus @default(SENT)
  failureReason String?
  sentAt        DateTime?

  @@index([emailLogId])
  @@index([recipientId])
}
```

### Enums

```prisma
enum EmailTemplate {
  EVENT_NOTIFICATION
  EVENT_COMPLETION_SUMMARY
  TASK_REMINDER
}

enum EmailSendStatus {
  SENT      // All recipients succeeded
  PARTIAL   // Some recipients failed or were skipped
  FAILED    // All recipients failed
}

enum EmailRecipientStatus {
  SENT
  SKIPPED   // No email address on record
  FAILED    // Provider returned an error
}
```

## Relations Added to Existing Models

```prisma
// Add to Volunteer model
emailLogs EmailLog[]

// Add to Event model
emailLogs EmailLog[]

// Add to AdminTask model
emailLogs EmailLog[]
```

## Cooldown Query Pattern

To enforce cooldown, query the most recent `EmailLog` for a given scope:

```ts
// Event notification cooldown (1 hour)
const recent = await prisma.emailLog.findFirst({
  where: { eventId, templateType: 'EVENT_NOTIFICATION' },
  orderBy: { sentAt: 'desc' },
});
const withinCooldown = recent && (Date.now() - recent.sentAt.getTime()) < 60 * 60 * 1000;

// Task reminder cooldown (24 hours)
const recent = await prisma.emailLog.findFirst({
  where: { taskId, templateType: 'TASK_REMINDER' },
  orderBy: { sentAt: 'desc' },
});
const blocked = recent && (Date.now() - recent.sentAt.getTime()) < 24 * 60 * 60 * 1000;
```

## No Schema Changes to Existing Tables

Recipient resolution uses existing relations:
- Pack-wide event → `Volunteer` where `authTier = PARENT` + active `ParentChildLink`
- Den-scoped event → `DenMembership` (active) → `ChildScout` → `ParentChildLink` (APPROVED) → `Volunteer`
- Task reminder → `AdminTaskToRole` → `VolunteerRole` → `VolunteerToRole` (active) → `Volunteer`
