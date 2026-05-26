# Event Schemas & Notifications

**Feature**: Den Advancement Operations Workspace  
**Version**: 1.0

## Overview

This document defines domain events and notification schemas for the advancement operations feature. Events are published to the existing notification system for async processing.

## Event Publishing Pattern

**All domain events**:
- Published to in-memory event bus (NestJS EventEmitter)
- Consumed by notification service
- Persistent notification records created
- Delivery via existing channels (email, in-app)

**Event Structure**:
```typescript
interface DomainEvent {
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  occurredAt: Date;
  payload: any;
  metadata?: {
    userId?: string;
    correlationId?: string;
  };
}
```

---

## Parent-Child Linking Events

### ParentChildLinkRequested

**Trigger**: Parent submits link request

**Payload**:
```typescript
{
  eventType: "ParentChildLinkRequested";
  aggregateId: string;  // linkId
  aggregateType: "ParentChildLink";
  occurredAt: Date;
  payload: {
    parentId: string;
    parentName: string;
    parentEmail: string;
    childScoutId: string;
    childName: string;
    relationshipType: string;
    denId: string;
    denName: string;
  };
}
```

**Notifications Generated**:
- **To**: Den leaders with scope to child's den
- **Subject**: "Parent Link Request: [Parent Name] → [Child Name]"
- **Body**: "[Parent Name] has requested to link to [Child Name] in [Den Name]. Please approve or reject this request."
- **CTA**: Link to pending requests dashboard

---

### ParentChildLinkApproved

**Trigger**: Leader approves link request

**Payload**:
```typescript
{
  eventType: "ParentChildLinkApproved";
  aggregateId: string;
  aggregateType: "ParentChildLink";
  occurredAt: Date;
  payload: {
    parentId: string;
    parentEmail: string;
    childScoutId: string;
    childName: string;
    approvedBy: string;
    approvedByName: string;
  };
}
```

**Notifications Generated**:
- **To**: Parent (requestor)
- **Subject**: "Parent Link Approved: [Child Name]"
- **Body**: "Your request to link to [Child Name] has been approved by [Leader Name]. You can now view and manage [Child Name]'s advancement progress."
- **CTA**: Link to child's profile

---

### ParentChildLinkRejected

**Trigger**: Leader rejects link request

**Payload**:
```typescript
{
  eventType: "ParentChildLinkRejected";
  aggregateId: string;
  aggregateType: "ParentChildLink";
  occurredAt: Date;
  payload: {
    parentId: string;
    parentEmail: string;
    childScoutId: string;
    childName: string;
    rejectedBy: string;
    rejectedByName: string;
    reason: string;
  };
}
```

**Notifications Generated**:
- **To**: Parent (requestor)
- **Subject**: "Parent Link Request Not Approved"
- **Body**: "Your request to link to [Child Name] was not approved. Reason: [Reason]"
- **CTA**: Contact den leader if questions

---

## Attendance & Event Events

### ChildAttendanceRecorded

**Trigger**: Leader records child attendance for event

**Payload**:
```typescript
{
  eventType: "ChildAttendanceRecorded";
  aggregateId: string;  // eventId
  aggregateType: "Event";
  occurredAt: Date;
  payload: {
    eventId: string;
    eventTitle: string;
    eventDate: string;
    rankLevel: RankLevel;
    denId: string;
    attendance: Array<{
      childScoutId: string;
      childName: string;
      attendanceStatus: AttendanceStatus;
      coveredRequirements: number;
    }>;
    recordedBy: string;
  };
}
```

**Notifications Generated**:
- **To**: Parents of attendees (if event.sendPostMeetingNotification = true)
- **Subject**: "Meeting Attendance: [Event Title]"
- **Body**: "[Child Name] attended [Event Title] on [Date]. [N] requirements were covered during this meeting."
- **CTA**: Link to child's progress

---

### RequirementCoveredInEvent

**Trigger**: Specific requirements marked as covered during event

**Payload**:
```typescript
{
  eventType: "RequirementCoveredInEvent";
  aggregateId: string;  // eventId
  aggregateType: "Event";
  occurredAt: Date;
  payload: {
    eventId: string;
    eventTitle: string;
    childScoutId: string;
    childName: string;
    requirements: Array<{
      requirementId: string;
      adventureName: string;
      requirementText: string;
    }>;
  };
}
```

**Notifications Generated**: (Optional, included in ChildAttendanceRecorded notification)

---

## Advancement & Requirement Events

### RequirementCompletedByParent

**Trigger**: Parent marks requirement complete outside meeting

**Payload**:
```typescript
{
  eventType: "RequirementCompletedByParent";
  aggregateId: string;  // requirementProgressId
  aggregateType: "RequirementProgress";
  occurredAt: Date;
  payload: {
    childScoutId: string;
    childName: string;
    requirementId: string;
    adventureName: string;
    requirementText: string;
    completedBy: string;
    completedByName: string;
    notes: string;
    denId: string;
  };
}
```

**Notifications Generated**:
- **To**: Den leaders with scope + advancement chair
- **Subject**: "Parent Completion: [Child Name] - [Adventure Name]"
- **Body**: "[Parent Name] marked a requirement complete for [Child Name]: [Requirement Text]. Please approve in Scoutbook and mark reconciled."
- **CTA**: Link to pending reconciliation dashboard

---

### RequirementReconciled

**Trigger**: Leader marks requirement entered in Scoutbook

**Payload**:
```typescript
{
  eventType: "RequirementReconciled";
  aggregateId: string;
  aggregateType: "RequirementProgress";
  occurredAt: Date;
  payload: {
    childScoutId: string;
    childName: string;
    requirementId: string;
    adventureName: string;
    requirementText: string;
    reconciledBy: string;
    reconciledByName: string;
    originalCompleter: string;
    originalCompleterName: string;
  };
}
```

**Notifications Generated**:
- **To**: Original completer (if parent) - confirmation
- **Subject**: "Scoutbook Entry Confirmed: [Child Name]"
- **Body**: "[Leader Name] confirmed [Requirement Text] was entered in Scoutbook for [Child Name]."

---

### AdventureCompleted

**Trigger**: All requirements for adventure marked complete

**Payload**:
```typescript
{
  eventType: "AdventureCompleted";
  aggregateId: string;  // adventureId
  aggregateType: "Adventure";
  occurredAt: Date;
  payload: {
    childScoutId: string;
    childName: string;
    adventureId: string;
    adventureName: string;
    rankLevel: RankLevel;
    classification: AdventureType;
  };
}
```

**Notifications Generated**:
- **To**: Parents of child + den leaders
- **Subject**: "Adventure Completed: [Adventure Name]"
- **Body**: "Congratulations! [Child Name] completed [Adventure Name]."
- **CTA**: View progress

---

### RankEligibilityReached

**Trigger**: Child meets rank advancement criteria

**Payload**:
```typescript
{
  eventType: "RankEligibilityReached";
  aggregateId: string;  // childScoutId
  aggregateType: "ChildScout";
  occurredAt: Date;
  payload: {
    childScoutId: string;
    childName: string;
    currentRank: RankLevel;
    requiredAdventuresCompleted: number;
    electiveAdventuresCompleted: number;
  };
}
```

**Notifications Generated**:
- **To**: Parents + den leaders + advancement chair
- **Subject**: "[Child Name] Eligible for Rank Advancement!"
- **Body**: "[Child Name] has completed all requirements for [Current Rank] and is eligible for advancement!"
- **CTA**: View report, schedule board of review

---

## Award Fulfillment Events

### AwardItemApproved

**Trigger**: Award transitioned to APPROVED state

**Payload**:
```typescript
{
  eventType: "AwardItemApproved";
  aggregateId: string;  // awardItemId
  aggregateType: "AwardItem";
  occurredAt: Date;
  payload: {
    awardItemId: string;
    childScoutId: string;
    childName: string;
    awardType: "ADVENTURE" | "SPECIAL";
    awardName: string;
    approvedBy: string;
    approvedByName: string;
  };
}
```

**Notifications Generated**:
- **To**: Purchaser role (advancement chair, committee)
- **Subject**: "Awards Ready for Purchase"
- **Body**: "[N] awards approved and ready for purchase."
- **CTA**: Link to purchase queue

---

### AwardItemPurchased

**Trigger**: Award transitioned to PURCHASED state

**Payload**:
```typescript
{
  eventType: "AwardItemPurchased";
  aggregateId: string;
  aggregateType: "AwardItem";
  occurredAt: Date;
  payload: {
    awardItemId: string;
    childScoutId: string;
    childName: string;
    awardName: string;
    purchasedBy: string;
    purchasedByName: string;
    batchId: string;
  };
}
```

**Notifications Generated**:
- **To**: Distributor role (den leaders, Cubmaster)
- **Subject**: "Awards Ready for Distribution"
- **Body**: "[N] awards purchased and ready for distribution."
- **CTA**: Link to distribution queue

---

### AwardItemDistributed

**Trigger**: Award transitioned to DISTRIBUTED state

**Payload**:
```typescript
{
  eventType: "AwardItemDistributed";
  aggregateId: string;
  aggregateType: "AwardItem";
  occurredAt: Date;
  payload: {
    awardItemId: string;
    childScoutId: string;
    childName: string;
    awardName: string;
    distributedBy: string;
    distributedByName: string;
    distributedAt: Date;
  };
}
```

**Notifications Generated**:
- **To**: Parents of child
- **Subject**: "[Child Name] Received Award: [Award Name]"
- **Body**: "Congratulations! [Child Name] received their [Award Name] award."
- **To**: Advancement chair (for Scoutbook reconciliation)

---

## Scoutbook Hours Prompt Events

### ScoutbookPromptGenerated

**Trigger**: Hours prompts created after event closeout

**Payload**:
```typescript
{
  eventType: "ScoutbookPromptGenerated";
  aggregateId: string;  // eventId
  aggregateType: "Event";
  occurredAt: Date;
  payload: {
    eventId: string;
    eventTitle: string;
    prompts: Array<{
      promptId: string;
      childScoutId: string;
      childName: string;
      category: PromptCategory;
      categoryData: any;
      message: string;
    }>;
  };
}
```

**Notifications Generated**:
- **To**: Parents of affected children
- **Subject**: "Reminder: Log [Category] Hours in Scoutbook"
- **Body**: "Please log [Suggested Value] for [Child Name] in Scoutbook from [Event Title]."
- **CTA**: External link to Scoutbook + "Mark Done" button

---

### ScoutbookPromptReminder

**Trigger**: Scheduled job finds unacknowledged prompts older than 7 days

**Payload**:
```typescript
{
  eventType: "ScoutbookPromptReminder";
  aggregateId: string;  // promptId
  aggregateType: "ScoutbookPrompt";
  occurredAt: Date;
  payload: {
    promptId: string;
    childScoutId: string;
    childName: string;
    category: PromptCategory;
    originalEventTitle: string;
    daysSincePrompt: number;
    message: string;
  };
}
```

**Notifications Generated**:
- **To**: Parent
- **Subject**: "Reminder: Log [Category] Hours in Scoutbook"
- **Body**: "This is a reminder to log hours for [Child Name] from [Event]. Originally sent [N] days ago."

---

## Bulk Operation Events

### ImportBatchCompleted

**Trigger**: CSV import finishes processing

**Payload**:
```typescript
{
  eventType: "ImportBatchCompleted";
  aggregateId: string;  // batchId
  aggregateType: "ImportBatch";
  occurredAt: Date;
  payload: {
    batchId: string;
    fileName: string;
    status: ImportStatus;
    totalRows: number;
    successRows: number;
    failedRows: number;
    uploadedBy: string;
  };
}
```

**Notifications Generated**:
- **To**: Admin who uploaded
- **Subject**: "Import Complete: [FileName]"
- **Body**: "[Success] of [Total] rows imported successfully. [Failed] errors."
- **CTA**: View error report

---

### RolloverBatchCompleted

**Trigger**: Annual rank rollover finishes

**Payload**:
```typescript
{
  eventType: "RolloverBatchCompleted";
  aggregateId: string;  // batchId
  aggregateType: "RolloverBatch";
  occurredAt: Date;
  payload: {
    batchId: string;
    targetYear: string;
    status: RolloverStatus;
    childrenProcessed: number;
    childrenFailed: number;
    executedBy: string;
  };
}
```

**Notifications Generated**:
- **To**: Admin who executed
- **Subject**: "Annual Rollover Complete: [Year]"
- **Body**: "[Processed] children advanced to new ranks. [Failed] errors."
- **CTA**: View error report

---

## Den Chief Events

### DenChiefAssigned

**Trigger**: Den Chief is assigned to a den

**Payload**:
```typescript
{
  eventType: "DenChiefAssigned";
  aggregateId: string;  // assignmentId
  aggregateType: "DenChiefAssignment";
  occurredAt: Date;
  payload: {
    denChiefId: string;
    denChiefName: string;
    denChiefEmail: string;
    denId: string;
    denName: string;
    denNumber: number;
    rankLevel: RankLevel;
    assignedBy: string;
    assignedByName: string;
    validFrom: string;
    notes?: string;
  };
}
```

**Notifications Generated**:
- **To**: Den Chief (assigned youth)
- **Subject**: "Den Assignment: [Den Name]"
- **Body**: "You have been assigned as a Den Chief for [Den Name]. Your assignment starts [Date]. [Notes if provided]"
- **CTA**: Link to den details and event calendar
- **To**: Den leaders for the assigned den
- **Subject**: "New Den Chief Assigned: [Den Chief Name]"
- **Body**: "[Den Chief Name] has been assigned as a Den Chief for [Den Name] by [Admin Name]."

---

### DenChiefUnassigned

**Trigger**: Den Chief assignment is ended

**Payload**:
```typescript
{
  eventType: "DenChiefUnassigned";
  aggregateId: string;  // assignmentId
  aggregateType: "DenChiefAssignment";
  occurredAt: Date;
  payload: {
    denChiefId: string;
    denChiefName: string;
    denChiefEmail: string;
    denId: string;
    denName: string;
    denNumber: number;
    validTo: string;
  };
}
```

**Notifications Generated**:
- **To**: Den Chief
- **Subject**: "Den Assignment Ended: [Den Name]"
- **Body**: "Your assignment as Den Chief for [Den Name] has ended as of [Date]. Thank you for your service!"
- **To**: Den leaders for the den
- **Subject**: "Den Chief Assignment Ended: [Den Chief Name]"
- **Body**: "[Den Chief Name] is no longer assigned as Den Chief for [Den Name] as of [Date]."

---

### DenChiefEventInvite

**Trigger**: Event created/updated for den(s) with assigned Den Chiefs

**Payload**:
```typescript
{
  eventType: "DenChiefEventInvite";
  aggregateId: string;  // eventId
  aggregateType: "Event";
  occurredAt: Date;
  payload: {
    eventId: string;
    eventTitle: string;
    eventDate: string;
    denId: string;
    denName: string;
    rankLevel: RankLevel;
    denChiefs: Array<{
      denChiefId: string;
      denChiefEmail: string;
      denChiefName: string;
    }>;
  };
}
```

**Notifications Generated**:
- **To**: All assigned Den Chiefs for the den
- **Subject**: "Event Invitation: [Event Title]"
- **Body**: "You are invited to [Event Title] for [Den Name] on [Date]. You can volunteer to help with this event."
- **CTA**: Link to event details + "Volunteer" button

---

## Notification Preferences

**User-configurable settings** (extend existing notification preferences):

```typescript
interface NotificationPreferences {
  // Existing fields...
  
  // New advancement-specific preferences
  advancementPreferences: {
    parentCompletions: boolean;          // Leader notified of parent submissions
    requirementReconciliation: boolean;  // Parent notified of Scoutbook entry
    adventureCompletion: boolean;        // Parent notified of adventure completion
    rankEligibility: boolean;            // Parent + leaders notified of rank eligibility
    awardApproval: boolean;              // Leaders notified of awards needing action
    scoutbookPrompts: boolean;           // Parent notified of hour prompts
    scoutbookReminders: boolean;         // Parent gets reminder after 7 days
    postMeetingUpdates: boolean;         // Parent notified after attendance recorded
  };
}
```

**Defaults**:
- All enabled for parents (can opt out individually)
- All enabled for leaders (can opt out individually)
- Email + in-app delivery by default

---

## Event Processing Guarantees

**At-Least-Once Delivery**:
- Events published to EventEmitter
- Notification service subscribes
- On failure, retry with exponential backoff
- Idempotent notification creation (dedupe by eventId + userId)

**Ordering**:
- Events processed in order of occurredAt timestamp
- Related events (e.g., RequirementCompleted → AdventureCompleted) maintain causal order

**Audit Trail**:
- All events logged to database for debugging
- correlationId tracks related events across workflows

---

## Testing Requirements

**Contract Tests**:
- Verify event payload shapes match schemas
- Verify all required fields present
- Verify notification generation logic

**Integration Tests**:
- Publish event → verify notification created
- Verify notification delivery to correct recipients
- Verify preference filtering applied
- Verify notification deduplication

**E2E Tests**:
- Complete workflows trigger expected notifications
- User receives email and in-app notification
- Notification CTAs link to correct resources
