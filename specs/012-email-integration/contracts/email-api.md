# API Contracts: Email Notifications

All endpoints require a valid JWT. Role enforcement is noted per endpoint.

---

## GET /events/:id/email-preview

Returns the default recipient count for an event before the sender confirms. Used to populate the dialog before the leader adds any additional recipients.

**Auth**: LEADER, ADMIN  
**Response 200**:
```json
{
  "defaultRecipientCount": 12,
  "recentSend": {
    "sentAt": "2026-06-20T14:00:00Z",
    "withinCooldown": false
  }
}
```

`recentSend` is `null` if no prior send exists.

---

## GET /pack/members/search?q=

Searches all active pack members (volunteers and den chiefs) by name. Used by the additional recipient picker in the notification dialog.

**Auth**: LEADER, ADMIN  
**Query**: `q` — partial name string (min 2 chars)  
**Response 200**:
```json
[
  { "id": "clxxx", "name": "Jane Smith", "type": "volunteer", "email": "jane@example.com" },
  { "id": "clyyy", "name": "Alex Jones", "type": "denChief", "email": "alex@example.com" }
]
```

Members with no email address are excluded from results (they cannot receive email).

---

## POST /events/:id/notify-members

Sends an event notification to all scope-resolved members plus any additional recipients the leader selected.

**Auth**: LEADER, ADMIN  
**Request body**:
```json
{
  "additionalRecipientIds": ["clzzz"]
}
```

`additionalRecipientIds` is optional. Each entry is a volunteer or den chief ID. Duplicates with scope-resolved recipients are silently deduplicated.

**Response 200**:
```json
{
  "emailLogId": "clxxx",
  "recipientCount": 14,
  "skippedCount": 1,
  "failedCount": 0,
  "status": "SENT",
  "withinCooldownWarning": false
}
```

**Response 400** (no recipients after dedup and skip):
```json
{ "error": "No recipients with email addresses found for this event" }
```

---

## POST /events/:id/send-completion-summary

Sends a post-event summary to scope-resolved members plus any additional recipients. Only available when `isComplete = true`.

**Auth**: LEADER, ADMIN  
**Request body**: same shape as `notify-members`  
**Response 200**: same shape as `notify-members`  
**Response 400** (event not complete):
```json
{ "error": "Event is not marked complete" }
```

---

## POST /admin-tasks/:id/send-reminder

Sends a reminder to all volunteers holding any role assigned to the task. No additional recipient selection — task reminders are always role-scoped. Only available when task is overdue or due today.

**Auth**: ADMIN  
**Request body**: none  
**Response 200**:
```json
{
  "emailLogId": "clxxx",
  "recipientCount": 3,
  "skippedCount": 0,
  "failedCount": 0,
  "status": "SENT"
}
```

**Response 400** (task not overdue/due today):
```json
{ "error": "Reminders can only be sent for overdue or due-today tasks" }
```

**Response 409** (within 24-hour cooldown):
```json
{
  "error": "A reminder was already sent within the last 24 hours",
  "lastSentAt": "2026-06-20T10:00:00Z"
}
```

---

## GET /events/:id/email-logs

Returns the send history for an event.

**Auth**: LEADER, ADMIN  
**Response 200**:
```json
[
  {
    "id": "clxxx",
    "templateType": "EVENT_NOTIFICATION",
    "senderName": "Jane Smith",
    "recipientCount": 14,
    "skippedCount": 1,
    "failedCount": 0,
    "status": "SENT",
    "sentAt": "2026-06-20T14:00:00Z"
  }
]
```
