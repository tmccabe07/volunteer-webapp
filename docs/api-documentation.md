# API Documentation: Cub Scout Volunteer Management

**Version**: 1.0  
**Base URL**: `/api`  
**Authentication**: Bearer tokens (JWT) via `Authorization: Bearer <token>` header or HttpOnly cookies

---

## Table of Contents

1. [Authentication](#authentication)
2. [Volunteers](#volunteers)
3. [Events](#events)
4. [Points & Leaderboard](#points--leaderboard)
5. [Administrative Tasks](#administrative-tasks)
6. [Reports](#reports)
7. [Pack Configuration](#pack-configuration)
8. [Error Responses](#error-responses)
9. [Authorization Tiers](#authorization-tiers)

---

## Authentication

All authentication endpoints are public (no JWT required).

### POST /api/auth/register

Register a new volunteer account.

**Request Body**:
```json
{
  "email": "parent@example.com",
  "password": "SecureP@ss123",
  "name": "John Doe",
  "phone": "+15551234567"
}
```

**Response (201 Created)**:
```json
{
  "user": {
    "id": "ckxyz123",
    "email": "parent@example.com",
    "name": "John Doe",
    "phone": "+15551234567",
    "authTier": "PARENT"
  },
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

**Side Effects**:
- Creates Volunteer with authTier=PARENT
- Sends welcome notification
- Creates VolunteerPointBalance (0 points)

**Error Responses**:
- `400 Bad Request`: Invalid input
- `409 Conflict`: Email already in use

---

### POST /api/auth/login

Authenticate existing volunteer.

**Rate Limit**: 5 requests per 15 minutes per IP

**Request Body**:
```json
{
  "email": "parent@example.com",
  "password": "SecureP@ss123",
  "rememberMe": true
}
```

**Response (200 OK)**:
```json
{
  "user": {
    "id": "ckxyz123",
    "email": "parent@example.com",
    "name": "John Doe",
    "phone": "+15551234567",
    "authTier": "PARENT"
  },
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

**Notes**:
- Sets HttpOnly cookies: `access_token`, `refresh_token`
- Access tokens expire in 15 minutes
- Refresh tokens expire in 7 days (rememberMe=false) or 30 days (rememberMe=true)

**Error Responses**:
- `401 Unauthorized`: Invalid credentials
- `429 Too Many Requests`: Rate limit exceeded

---

### POST /api/auth/logout

Invalidate current session.

**Authorization**: Optional Bearer token

**Response (204 No Content)**

---

### POST /api/auth/refresh

Refresh access token using refresh token.

**Authorization**: Refresh token in cookie

**Response (200 OK)**:
```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

**Error Responses**:
- `401 Unauthorized`: Invalid or expired refresh token

---

### POST /api/auth/request-reset

Request password reset (admin-assisted).

**Rate Limit**: 3 requests per hour per email

**Request Body**:
```json
{
  "email": "parent@example.com"
}
```

**Response (200 OK)**:
```json
{
  "message": "If an account exists with that email, a password reset link has been sent."
}
```

**Notes**:
- Always returns success (prevents email enumeration)
- Generates crypto-secure token (32 bytes, hashed with SHA-256)
- Token expires in 1 hour

---

### POST /api/auth/reset-password

Reset password using token from email.

**Request Body**:
```json
{
  "token": "abc123...",
  "newPassword": "NewSecureP@ss456"
}
```

**Response (200 OK)**:
```json
{
  "message": "Password reset successfully. You can now log in with your new password."
}
```

**Side Effects**:
- Marks reset token as used
- Invalidates all existing sessions
- Updates passwordHash

---

### POST /api/auth/change-password

Change current user's password (required for users with temporary passwords).

**Authorization**: Bearer token required

**Request Body**:
```json
{
  "currentPassword": "TempP@ss123",
  "newPassword": "MyNewSecureP@ss456"
}
```

**Response (200 OK)**:
```json
{
  "message": "Password changed successfully."
}
```

**Side Effects**:
- Updates passwordHash
- Sets mustChangePassword to false
- Invalidates all existing sessions except current one

---

### GET /api/auth/me

Get current authenticated user info.

**Authorization**: Bearer token required

**Response (200 OK)**:
```json
{
  "id": "ckxyz123",
  "email": "parent@example.com",
  "name": "John Doe",
  "phone": "+15551234567",
  "authTier": "PARENT",
  "mustChangePassword": false,
  "leaderboardOptIn": true,
  "roles": [
    {
      "id": "rl123",
      "name": "Den Leader - Wolf",
      "roleType": "DEN_LEADER",
      "specialty": null,
      "rankLevel": "WOLF"
    }
  ],
  "childrenRanks": [
    { "rankLevel": "WOLF" },
    { "rankLevel": "BEAR" }
  ],
  "pointBalance": {
    "totalPoints": 125,
    "currentYearPoints": 125
  }
}
```

---

## Volunteers

### GET /api/volunteers/me/profile

Get current volunteer's full profile.

**Authorization**: Bearer token (Tier 1+)

**Response (200 OK)**:
```json
{
  "id": "ckxyz123",
  "email": "parent@example.com",
  "name": "John Doe",
  "phone": "+15551234567",
  "authTier": "LEADER",
  "leaderboardOptIn": true,
  "roles": [
    {
      "id": "vtr123",
      "roleId": "rl123",
      "roleName": "Den Leader - Wolf",
      "roleType": "DEN_LEADER",
      "specialty": null,
      "rankLevel": "WOLF",
      "assignedAt": "2026-03-15T10:00:00Z"
    }
  ],
  "childrenRanks": [
    { "id": "cr123", "rankLevel": "WOLF" }
  ],
  "pointBalance": {
    "totalPoints": 125,
    "currentYearPoints": 125,
    "badgeTier": "Bronze",
    "rank": 5
  },
  "createdAt": "2026-01-15T08:00:00Z"
}
```

---

### PUT /api/volunteers/me/profile

Update current volunteer's profile.

**Authorization**: Bearer token (Tier 1+)

**Request Body** (all fields optional):
```json
{
  "name": "John A. Doe",
  "phone": "+15559876543",
  "leaderboardOptIn": false,
  "childrenRanks": ["WOLF", "BEAR"]
}
```

**Response (200 OK)**: Updated profile data

**Error Responses**:
- `400 Bad Request`: Invalid input
- `409 Conflict`: Duplicate children rank

---

### POST /api/volunteers/me/roles

Self-assign a volunteer role.

**Authorization**: Bearer token (Tier 1+)

**Request Body**:
```json
{
  "roleId": "rl456"
}
```

**Response (201 Created)**:
```json
{
  "id": "vtr789",
  "roleId": "rl456",
  "roleName": "Committee - Treasurer",
  "assignedAt": "2026-03-20T14:30:00Z"
}
```

**Side Effects**:
- If role grants LEADER tier → upgrade authTier to LEADER
- If role is COMMITTEE or DEN_LEADER → award 100 points
- Create AuditLog entry

---

### DELETE /api/volunteers/me/roles/:roleAssignmentId

Remove a self-assigned role.

**Authorization**: Bearer token (Tier 1+)

**Response (204 No Content)**

**Side Effects**:
- Soft delete VolunteerToRole
- If removing last LEADER-tier role → downgrade authTier to PARENT
- Create AuditLog entry

---

### GET /api/volunteers

List all volunteers (admin/leader view).

**Authorization**: Bearer token (Tier 2+)

**Query Parameters**:
- `page` (default: 1)
- `limit` (default: 50, max: 100)
- `search` (search by name or email)
- `tier` (PARENT | LEADER | ADMIN)
- `roleId` (filter by specific role)

**Response (200 OK)**:
```json
{
  "volunteers": [
    {
      "id": "ckxyz123",
      "email": "parent@example.com",
      "name": "John Doe",
      "authTier": "LEADER",
      "roles": [
        { "roleName": "Den Leader - Wolf" }
      ],
      "pointBalance": {
        "totalPoints": 125,
        "currentYearPoints": 125
      },
      "createdAt": "2026-01-15T08:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 42,
    "totalPages": 1
  }
}
```

---

### GET /api/volunteers/:id

Get specific volunteer details.

**Authorization**: Bearer token (Tier 2+, or Tier 1 if :id matches current user)

**Response (200 OK)**: Extended profile including point history

---

### DELETE /api/volunteers/:id

Delete a volunteer account (site admin only).

**Authorization**: Bearer token (Tier 3 only)

**Response (204 No Content)**

**Side Effects**:
- Soft delete Volunteer
- Withdraw all future signups
- Invalidate all sessions
- Create AuditLog entry

---

### GET /api/admin/volunteers

List all volunteers for admin password reset management.

**Authorization**: Bearer token (Tier 2+)

**Query Parameters**:
- `search` (search by name or email)

**Response (200 OK)**:
```json
{
  "volunteers": [
    {
      "id": "ckxyz123",
      "email": "parent@example.com",
      "name": "John Doe",
      "authTier": "PARENT",
      "mustChangePassword": false,
      "createdAt": "2026-01-15T08:00:00Z"
    }
  ]
}
```

---

### POST /api/admin/volunteers/:id/reset-password

Reset a volunteer's password and generate temporary password (admin-assisted password reset).

**Authorization**: Bearer token (Tier 2+)

**Response (200 OK)**:
```json
{
  "temporaryPassword": "blue-tiger-4729",
  "message": "Password reset successfully. Share this temporary password with the volunteer."
}
```

**Side Effects**:
- Generates readable temporary password (format: word-word-number)
- Updates passwordHash with hashed temporary password
- Sets mustChangePassword to true
- Invalidates all existing sessions for that user
- Creates AuditLog entry

**Notes**:
- User must change password on next login
- Admin should share temporary password securely

---

## Events

### GET /api/events

List upcoming volunteer events.

**Authorization**: Bearer token (Tier 1+)

**Query Parameters**:
- `page` (default: 1)
- `limit` (default: 20, max: 100)
- `rankLevel` (LION | TIGER | WOLF | BEAR | WEBELOS | AOL | PACK_WIDE)
- `upcoming` (default: true, only future events)
- `mySignups` (default: false, filter to events user signed up for)

**Response (200 OK)**:
```json
{
  "events": [
    {
      "id": "evt123",
      "title": "Pack Campout",
      "description": "Annual camping trip at Camp Cedar",
      "eventDate": "2026-05-15T10:00:00Z",
      "eventTime": "10:00 AM",
      "location": "Camp Cedar",
      "rankLevel": null,
      "isRecurring": false,
      "isComplete": false,
      "activitySlots": [
        {
          "id": "slot456",
          "activityType": {
            "id": "at789",
            "name": "Event Setup",
            "pointValue": 10,
            "category": "HIGH"
          },
          "capacity": 5,
          "signedUpCount": 3,
          "currentUserSignup": {
            "id": "signup123",
            "withdrawn": false
          }
        }
      ],
      "createdBy": {
        "id": "ckxyz456",
        "name": "Jane Smith"
      },
      "createdAt": "2026-03-01T14:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 8,
    "totalPages": 1
  }
}
```

---

### GET /api/events/:id

Get single event details.

**Authorization**: Bearer token (Tier 1+)

**Response (200 OK)**: Extended event with full signup list

---

### POST /api/events

Create a new volunteer event.

**Authorization**: Bearer token (Tier 2+)

**Request Body**:
```json
{
  "title": "Pack Campout",
  "description": "Annual camping trip at Camp Cedar",
  "eventDate": "2026-05-15T10:00:00Z",
  "eventTime": "10:00 AM",
  "location": "Camp Cedar",
  "rankLevel": null,
  "isRecurring": false,
  "activitySlots": [
    {
      "activityTypeId": "at789",
      "capacity": 5
    }
  ]
}
```

**Response (201 Created)**: Created event data

**Side Effects**:
- If isRecurring=true → sets recurringEndDate from PackConfig
- Create AuditLog entry

---

### PUT /api/events/:id

Update an existing event.

**Authorization**: Bearer token (Tier 2+)

**Request Body**: Same as POST (all fields optional)

**Error Responses**:
- `409 Conflict`: Cannot modify completed events

---

### POST /api/events/:id/complete

Mark event as complete and award points.

**Authorization**: Bearer token (Tier 2+)

**Request Body** (optional):
```json
{
  "manualVolunteers": [
    {
      "volunteerId": "ckxyz789",
      "activitySlotId": "slot456"
    }
  ]
}
```

**Response (200 OK)**:
```json
{
  "id": "evt123",
  "isComplete": true,
  "pointsAwarded": [
    {
      "volunteerId": "ckxyz123",
      "volunteerName": "John Doe",
      "points": 10,
      "activityType": "Event Setup"
    }
  ]
}
```

**Side Effects**:
- Sets isComplete=true
- Creates PointEvent for each non-withdrawn signup
- Creates Signup + PointEvent for each manualVolunteer
- Updates VolunteerPointBalance
- Triggers badge tier check
- Create AuditLog entry

---

### POST /api/events/:eventId/slots/:slotId/signup

Sign up for an activity slot.

**Authorization**: Bearer token (Tier 1+)

**Response (201 Created)**:
```json
{
  "id": "signup123",
  "volunteerId": "ckxyz123",
  "activitySlotId": "slot456",
  "withdrawn": false,
  "createdAt": "2026-03-20T15:00:00Z"
}
```

**Error Responses**:
- `400 Bad Request`: Event is in the past or slot is at capacity
- `409 Conflict`: Already signed up for this slot

---

### DELETE /api/events/:eventId/slots/:slotId/signup

Withdraw from an activity slot.

**Authorization**: Bearer token (Tier 1+)

**Response (200 OK)**:
```json
{
  "id": "signup123",
  "withdrawn": true,
  "withdrawnAt": "2026-03-22T10:00:00Z"
}
```

**Notes**:
- Can be reversed by signing up again

---

### DELETE /api/events/:id

Delete an event (soft delete).

**Authorization**: Bearer token (Tier 2+)

**Response (204 No Content)**

**Error Responses**:
- `409 Conflict`: Cannot delete completed events

**Side Effects**:
- Soft delete Event
- Cascade soft delete to ActivitySlots
- Withdraw all signups
- Create AuditLog entry

---

## Points & Leaderboard

### GET /api/points/me

Get current volunteer's point history.

**Authorization**: Bearer token (Tier 1+)

**Query Parameters**:
- `page` (default: 1)
- `limit` (default: 50)
- `year` (filter by specific year)

**Response (200 OK)**:
```json
{
  "balance": {
    "totalPoints": 125,
    "currentYearPoints": 125,
    "badgeTier": "Bronze",
    "rank": 5
  },
  "pointEvents": [
    {
      "id": "pe123",
      "points": 10,
      "eventType": "EVENT_PARTICIPATION",
      "reason": null,
      "activityType": {
        "name": "Event Setup",
        "pointValue": 10
      },
      "createdBy": {
        "id": "ckxyz456",
        "name": "Jane Smith"
      },
      "createdAt": "2026-03-20T18:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 12
  }
}
```

---

### GET /api/points/volunteers/:volunteerId

Get specific volunteer's point history (admin/leader view).

**Authorization**: Bearer token (Tier 2+, or Tier 1 if :volunteerId matches current user)

**Query Parameters**: Same as /api/points/me

**Response**: Same as /api/points/me

---

### POST /api/points/revoke/:pointEventId

Revoke a previously awarded point event.

**Authorization**: Bearer token (Tier 2+)

**Request Body**:
```json
{
  "reason": "Points awarded in error - volunteer did not attend event"
}
```

**Response (201 Created)**:
```json
{
  "revocationEvent": {
    "id": "pe456",
    "volunteerId": "ckxyz123",
    "points": -10,
    "eventType": "ADMIN_REVOCATION",
    "reason": "Points awarded in error - volunteer did not attend event",
    "referenceId": "pe123",
    "createdById": "ckxyz456",
    "createdAt": "2026-03-21T09:00:00Z"
  },
  "newBalance": {
    "totalPoints": 115,
    "currentYearPoints": 115,
    "badgeTier": "Bronze"
  }
}
```

**Side Effects**:
- Create new PointEvent with negative points
- Update VolunteerPointBalance
- Check for badge tier downgrade
- Send notification to affected volunteer
- Create AuditLog entry

---

### GET /api/leaderboard

Get current leaderboard rankings.

**Authorization**: Bearer token (Tier 1+)

**Query Parameters**:
- `page` (default: 1)
- `limit` (default: 50, max: 100)

**Response (200 OK)**:
```json
{
  "leaderboard": [
    {
      "rank": 1,
      "volunteer": {
        "id": "ckxyz789",
        "name": "Top Volunteer"
      },
      "totalPoints": 250,
      "badgeTier": "Gold"
    }
  ],
  "currentUser": {
    "rank": 5,
    "totalPoints": 125
  },
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 32
  }
}
```

**Notes**:
- Only displays volunteers with leaderboardOptIn=true
- Cached results updated daily
- currentUser shown even if opted out

---

### GET /api/badge-tiers

Get all badge tier definitions.

**Authorization**: Bearer token (Tier 1+)

**Response (200 OK)**:
```json
{
  "tiers": [
    {
      "tierName": "Bronze",
      "minPoints": 20,
      "maxPoints": 39,
      "displayOrder": 1,
      "badgeColor": "#CD7F32",
      "iconPath": "/badges/bronze.svg"
    },
    {
      "tierName": "Silver",
      "minPoints": 40,
      "maxPoints": 59,
      "displayOrder": 2,
      "badgeColor": "#C0C0C0",
      "iconPath": "/badges/silver.svg"
    }
  ]
}
```

**Notes**:
- Static configuration data
- Can be cached aggressively

---

### GET /api/badge-tiers/me/history

Get current volunteer's badge tier progression history.

**Authorization**: Bearer token (Tier 1+)

**Response (200 OK)**:
```json
{
  "currentTier": "Bronze",
  "history": [
    {
      "id": "bth123",
      "oldTier": null,
      "newTier": "Bronze",
      "pointsAtChange": 20,
      "achievedAt": "2026-03-10T16:00:00Z"
    }
  ]
}
```

---

## Administrative Tasks

### GET /api/admin-tasks

List administrative tasks.

**Authorization**: Bearer token (Tier 1+)

**Query Parameters**:
- `page` (default: 1)
- `limit` (default: 20, max: 100)
- `assignedToMe` (default: true for Tier 1, false for Tier 2+)
- `status` (complete | incomplete | overdue)
- `taskId` (filter by specific task type)

**Response (200 OK)**:
```json
{
  "tasks": [
    {
      "id": "task123",
      "name": "Submit Medical Forms",
      "description": "All volunteers must submit updated medical forms",
      "dueDate": "2026-04-30T23:59:59Z",
      "isOverdue": false,
      "completionSteps": [
        {
          "step": "Download medical form template",
          "url": "https://example.com/forms/medical.pdf"
        },
        {
          "step": "Complete all sections",
          "url": null
        },
        {
          "step": "Upload to portal",
          "url": "https://example.com/upload"
        }
      ],
      "isPackWide": false,
      "isRecurring": true,
      "recurringEndDate": "2026-06-30T23:59:59Z",
      "assignedRoles": [
        {
          "id": "rl123",
          "name": "Den Leader - Wolf"
        }
      ],
      "currentUserCompletion": null,
      "createdBy": {
        "id": "ckxyz456",
        "name": "Jane Smith"
      },
      "createdAt": "2026-03-01T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5
  }
}
```

---

### GET /api/admin-tasks/:id

Get single administrative task details.

**Authorization**: Bearer token (Tier 1+)

**Response (200 OK)**: Extended task details with completions array (Tier 2+ only)

---

### POST /api/admin-tasks

Create a new administrative task.

**Authorization**: Bearer token (Tier 2+)

**Request Body**:
```json
{
  "name": "Submit Medical Forms",
  "description": "All volunteers must submit updated medical forms",
  "dueDate": "2026-04-30T23:59:59Z",
  "completionSteps": [
    {
      "step": "Download medical form template",
      "url": "https://example.com/forms/medical.pdf"
    }
  ],
  "isPackWide": false,
  "assignedRoleIds": ["rl123", "rl456"],
  "isRecurring": true
}
```

**Response (201 Created)**: Created task data

**Side Effects**:
- If isRecurring=true → sets recurringEndDate from PackConfig
- Creates AdminTaskToRole records
- Create AuditLog entry

---

### PUT /api/admin-tasks/:id

Update an existing administrative task.

**Authorization**: Bearer token (Tier 2+)

**Request Body**: Same as POST (all fields optional)

**Response (200 OK)**: Updated task data

---

### POST /api/admin-tasks/:id/complete

Mark administrative task as complete for current user.

**Authorization**: Bearer token (Tier 1+, must be assigned to task)

**Response (201 Created)**:
```json
{
  "id": "tc123",
  "taskId": "task123",
  "volunteerId": "ckxyz123",
  "completedAt": "2026-03-25T14:00:00Z",
  "isComplete": true
}
```

**Side Effects**:
- Create TaskCompletion record
- Create in-app Notification
- No points awarded

---

### DELETE /api/admin-tasks/:id

Delete an administrative task (soft delete).

**Authorization**: Bearer token (Tier 2+)

**Response (204 No Content)**

**Side Effects**:
- Soft delete AdminTask
- Cascade soft delete to AdminTaskToRole
- Preserve TaskCompletion records
- Create AuditLog entry

---

### GET /api/admin-tasks/:id/completions

Get all completion records for a task (leader/admin view).

**Authorization**: Bearer token (Tier 2+)

**Response (200 OK)**:
```json
{
  "task": {
    "id": "task123",
    "name": "Submit Medical Forms",
    "dueDate": "2026-04-30T23:59:59Z"
  },
  "completions": [
    {
      "id": "tc123",
      "volunteer": {
        "id": "ckxyz123",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "completedAt": "2026-03-25T14:00:00Z",
      "isComplete": true
    }
  ],
  "assignedVolunteers": [
    {
      "id": "ckxyz789",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "roles": [
        { "name": "Den Leader - Wolf" }
      ]
    }
  ],
  "stats": {
    "totalAssigned": 5,
    "totalCompleted": 1,
    "completionRate": 20.0
  }
}
```

---

## Reports

### GET /api/reports/participation

Generate volunteer participation report.

**Authorization**: Bearer token (Tier 2+)

**Query Parameters**:
- `startDate` (ISO 8601, default: current year start)
- `endDate` (ISO 8601, default: current year end)
- `rankLevel` (LION | TIGER | WOLF | BEAR | WEBELOS | AOL | PACK_WIDE)
- `format` (summary | detailed, default: summary)

**Response (200 OK)** - Summary Format:
```json
{
  "period": {
    "startDate": "2026-01-01T00:00:00Z",
    "endDate": "2026-12-31T23:59:59Z"
  },
  "stats": {
    "totalVolunteers": 42,
    "totalEvents": 28,
    "totalSignups": 156,
    "averageSignupsPerEvent": 5.57,
    "uniqueVolunteersParticipated": 35
  },
  "topVolunteers": [
    {
      "volunteer": {
        "id": "ckxyz123",
        "name": "John Doe"
      },
      "eventsParticipated": 12,
      "pointsEarned": 125
    }
  ],
  "participationByRank": [
    {
      "rankLevel": "WOLF",
      "eventsHeld": 8,
      "totalSignups": 45
    }
  ]
}
```

---

### GET /api/reports/administrative-tasks

Generate administrative task completion report.

**Authorization**: Bearer token (Tier 2+)

**Query Parameters**:
- `startDate` (ISO 8601, default: current year start)
- `endDate` (ISO 8601, default: current year end)
- `status` (complete | incomplete | overdue)
- `taskId` (filter by specific task)
- `format` (summary | detailed, default: summary)

**Response (200 OK)** - Summary Format:
```json
{
  "period": {
    "startDate": "2026-01-01T00:00:00Z",
    "endDate": "2026-12-31T23:59:59Z"
  },
  "stats": {
    "totalTasks": 12,
    "totalCompletions": 156,
    "overallCompletionRate": 87.5,
    "overdueTasks": 2
  },
  "taskBreakdown": [
    {
      "task": {
        "id": "task123",
        "name": "Submit Medical Forms",
        "dueDate": "2026-04-30T23:59:59Z"
      },
      "assignedCount": 15,
      "completedCount": 12,
      "completionRate": 80.0,
      "isOverdue": false
    }
  ]
}
```

---

### GET /api/reports/upcoming-events

Generate upcoming events report with volunteer signups.

**Authorization**: Bearer token (Tier 2+)

**Query Parameters**:
- `startDate` (ISO 8601, default: today)
- `endDate` (ISO 8601, default: current year end)
- `rankLevel` (LION | TIGER | WOLF | BEAR | WEBELOS | AOL | PACK_WIDE)

**Response (200 OK)**:
```json
{
  "period": {
    "startDate": "2026-03-25T00:00:00Z",
    "endDate": "2026-12-31T23:59:59Z"
  },
  "summary": {
    "totalEvents": 8,
    "totalSignups": 45,
    "uniqueVolunteers": 28,
    "averageSignupsPerEvent": 5.625
  },
  "events": [
    {
      "id": "evt123",
      "title": "Pack Campout",
      "description": "Annual camping trip",
      "eventDate": "2026-05-15T10:00:00Z",
      "location": "Camp Cedar",
      "rankLevel": "PACK_WIDE",
      "totalSignups": 12,
      "activitySlots": [
        {
          "id": "slot456",
          "activityType": "Event Setup",
          "capacity": 5,
          "signupsCount": 3,
          "spotsRemaining": 2,
          "signups": [
            {
              "volunteer": {
                "id": "ckxyz123",
                "name": "John Doe",
                "email": "john@example.com",
                "roles": [
                  { "name": "Den Leader - Wolf" }
                ]
              },
              "signupDate": "2026-03-20T15:00:00Z"
            }
          ]
        }
      ]
    }
  ]
}
```

**Notes**:
- Only returns events where isComplete=false
- Events ordered by eventDate ascending
- Excludes withdrawn signups

---

## Pack Configuration

### GET /api/pack-config

Get current pack configuration.

**Authorization**: Bearer token (Tier 1+)

**Response (200 OK)**:
```json
{
  "id": "pc123",
  "packName": "Cub Scout Pack 123",
  "packNumber": "123",
  "yearStartDate": "2026-01-01T00:00:00Z",
  "yearEndDate": "2026-12-31T23:59:59Z",
  "activeRanks": ["LION", "TIGER", "WOLF", "BEAR", "WEBELOS", "AOL"],
  "createdAt": "2026-01-01T08:00:00Z",
  "updatedAt": "2026-01-01T08:00:00Z"
}
```

---

### PUT /api/pack-config

Update pack configuration.

**Authorization**: Bearer token (Tier 3 only)

**Request Body** (all fields optional):
```json
{
  "packName": "Cub Scout Pack 123",
  "packNumber": "123",
  "yearStartDate": "2026-01-01T00:00:00Z",
  "yearEndDate": "2026-12-31T23:59:59Z",
  "activeRanks": ["WOLF", "BEAR", "WEBELOS"]
}
```

**Response (200 OK)**: Updated pack config

**Side Effects**:
- If yearEndDate changed → updates recurringEndDate for all recurring events/tasks
- Create AuditLog entry

---

### GET /api/pack-config/activity-types

Get all activity types (point values).

**Authorization**: Bearer token (Tier 1+)

**Response (200 OK)**:
```json
{
  "activityTypes": [
    {
      "id": "at123",
      "name": "Event Setup",
      "pointValue": 10,
      "category": "HIGH",
      "description": "Setting up for pack events"
    }
  ]
}
```

---

### POST /api/pack-config/activity-types

Add a new activity type.

**Authorization**: Bearer token (Tier 3 only)

**Request Body**:
```json
{
  "name": "Event Setup",
  "pointValue": 10,
  "category": "HIGH",
  "description": "Setting up for pack events"
}
```

**Response (201 Created)**: Created activity type

**Error Responses**:
- `400 Bad Request`: pointValue doesn't match category range
- `409 Conflict`: Activity type with this name already exists

---

### PUT /api/pack-config/activity-types/:id

Update an existing activity type.

**Authorization**: Bearer token (Tier 3 only)

**Request Body**: Same as POST (all fields optional)

**Response (200 OK)**: Updated activity type

**Notes**:
- Preserves historical point awards

---

### DELETE /api/pack-config/activity-types/:id

Delete an activity type (soft delete).

**Authorization**: Bearer token (Tier 3 only)

**Response (204 No Content)**

**Error Responses**:
- `409 Conflict`: Activity type is in use (referenced by future events)

---

### GET /api/pack-config/volunteer-roles

Get all volunteer roles.

**Authorization**: Bearer token (Tier 1+)

**Response (200 OK)**:
```json
{
  "roles": [
    {
      "id": "rl123",
      "name": "Den Leader - Wolf",
      "description": "Leads Wolf den activities",
      "roleType": "DEN_LEADER",
      "specialty": null,
      "rankLevel": "WOLF",
      "grantsTier": "LEADER"
    }
  ]
}
```

---

### POST /api/pack-config/volunteer-roles

Add a new volunteer role.

**Authorization**: Bearer token (Tier 3 only)

**Request Body**:
```json
{
  "name": "Den Leader - Wolf",
  "description": "Leads Wolf den activities",
  "roleType": "DEN_LEADER",
  "specialty": null,
  "rankLevel": "WOLF",
  "grantsTier": "LEADER"
}
```

**Response (201 Created)**: Created role

**Notes**:
- COMMITTEE role type requires specialty
- DEN_LEADER role type requires rankLevel

---

### PUT /api/pack-config/volunteer-roles/:id

Update volunteer role configuration.

**Authorization**: Bearer token (Tier 3 only)

**Request Body** (all fields optional):
```json
{
  "name": "Den Leader - Wolf",
  "description": "Leads Wolf den activities and meetings",
  "roleType": "DEN_LEADER",
  "specialty": null,
  "rankLevel": "WOLF",
  "grantsTier": "LEADER"
}
```

**Response (200 OK)**: Updated role with assignmentCount

**Notes**:
- Changing grantsTier immediately affects authorization for all volunteers with this role
- Response includes assignmentCount showing how many volunteers currently have this role

---

### DELETE /api/pack-config/volunteer-roles/:id

Delete a volunteer role.

**Authorization**: Bearer token (Tier 3 only)

**Response (204 No Content)**

**Error Responses**:
- `409 Conflict`: Role is assigned to volunteers for future events

**Side Effects**:
- Soft delete VolunteerRole
- Preserves historical assignments

---

## Error Responses

All endpoints may return the following error responses:

**400 Bad Request**:
```json
{
  "error": "Validation failed",
  "details": [
    "Email must be a valid email address",
    "Password must be at least 8 characters"
  ]
}
```

**401 Unauthorized**:
```json
{
  "error": "Authentication required"
}
```

**403 Forbidden**:
```json
{
  "error": "Insufficient permissions"
}
```

**404 Not Found**:
```json
{
  "error": "Resource not found"
}
```

**409 Conflict**:
```json
{
  "error": "Resource already exists or conflict detected"
}
```

**429 Too Many Requests**:
```json
{
  "error": "Rate limit exceeded. Please try again later.",
  "retryAfter": 900
}
```

**500 Internal Server Error**:
```json
{
  "error": "An unexpected error occurred"
}
```

---

## Authorization Tiers

The application uses a three-tier authorization system:

### Tier 1: PARENT (Default)
- All parent/guardian volunteers
- Can view and manage own profile
- Can sign up for events
- Can view and complete assigned administrative tasks
- Can view own points and leaderboard

### Tier 2: LEADER
- Den leaders, committee members, and assistant leaders
- All Tier 1 permissions
- Can create and manage events
- Can create and manage administrative tasks
- Can generate reports
- Can view all volunteer information
- Can reset volunteer passwords

### Tier 3: ADMIN (Site Admin)
- Site administrators
- All Tier 2 permissions
- Can manage pack configuration
- Can manage activity types and point values
- Can manage volunteer roles
- Can delete volunteers and events

**Tier Upgrades**:
- A volunteer is automatically upgraded to LEADER tier when they self-assign a role that grants LEADER tier (Committee, Den Leader, etc.)
- A volunteer is automatically downgraded to PARENT tier when they remove their last LEADER-tier role

---

## Rate Limiting

Rate limits are enforced on sensitive endpoints:

- **Login** (`POST /api/auth/login`): 5 requests per 15 minutes per IP
- **Password Reset Request** (`POST /api/auth/request-reset`): 3 requests per hour per email

Rate limit headers:
```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 4
X-RateLimit-Reset: 1648224000
```

---

## Authentication Flow

1. **Registration**: User registers via `POST /api/auth/register`
   - Receives accessToken and refreshToken
   - Tokens stored in HttpOnly cookies

2. **Login**: User logs in via `POST /api/auth/login`
   - Receives accessToken (15 min expiry) and refreshToken (7-30 day expiry)
   - Tokens stored in HttpOnly cookies

3. **API Requests**: Include access token in Authorization header
   ```
   Authorization: Bearer <accessToken>
   ```

4. **Token Refresh**: When access token expires, use `POST /api/auth/refresh`
   - Refresh token automatically sent via HttpOnly cookie
   - Receives new accessToken and refreshToken

5. **Logout**: User logs out via `POST /api/auth/logout`
   - Clears HttpOnly cookies

---

## Password Security

**Password Requirements**:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

**Password Hashing**:
- bcrypt with 12 rounds
- Never stored in plaintext

---

## Advancement Operations

### GET /api/admin/data-quality

Run admin data quality checks for duplicate links, stale approvals, and award reconciliation gaps.

**Authorization**: Bearer token (Tier 3 only)

**Query Parameters**:
- `olderThanDays` (default: 30)

**Response (200 OK)**:
```json
{
  "summary": {
    "olderThanDays": 30,
    "duplicateLinkCount": 2,
    "staleApprovalCount": 4,
    "awardReconciliationGapCount": 1
  },
  "duplicateLinks": [],
  "staleApprovals": [],
  "awardReconciliationGaps": []
}
```

### POST /api/child-scouts/import

Import child records from a CSV file.

**Authorization**: Bearer token (Tier 3 only)

**Request**: `multipart/form-data` with `file`

**Response (202 Accepted)**:
```json
{
  "batchId": "cuid",
  "message": "Import processing started"
}
```

### GET /api/imports/:batchId

Get a CSV import batch status and row-level errors.

**Authorization**: Bearer token (Tier 3 only)

### POST /api/dens/transfer-child

Atomically move one child from one den to another.

**Authorization**: Bearer token (Tier 3 only)

### POST /api/dens/batch-assign

Bulk assign multiple children during den splits or restructuring.

**Authorization**: Bearer token (Tier 3 only)

### POST /api/rollover/preview

Preview the next annual rank rollover without changing records.

**Authorization**: Bearer token (Tier 3 only)

### POST /api/rollover/execute

Execute annual rollover or queue a dry run.

**Authorization**: Bearer token (Tier 3 only)

### GET /api/rollover/:batchId

Get annual rollover batch status and errors.

**Authorization**: Bearer token (Tier 3 only)

**Password Reset Flow**:
1. Admin initiates reset via `POST /api/admin/volunteers/:id/reset-password`
2. System generates readable temporary password (format: word-word-number)
3. Admin shares temporary password with volunteer securely
4. User logs in with temporary password
5. System sets mustChangePassword=true
6. User is redirected to change password page
7. User changes password via `POST /api/auth/change-password`
8. mustChangePassword flag cleared

---

## Pagination

List endpoints support pagination via query parameters:

**Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default varies by endpoint, max: 100)

**Response**:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 250,
    "totalPages": 5
  }
}
```

---

## Date/Time Format

All dates and times use ISO 8601 format in UTC:
- `2026-03-25T14:30:00Z`

Client applications should convert to local timezone for display.

---

## CORS Configuration

The API supports CORS for frontend requests:
- Allowed Origins: Configured via environment variable
- Allowed Methods: GET, POST, PUT, DELETE
- Credentials: Included (for cookies)

---

## WebSocket Endpoints

Currently not implemented. Notifications use HTTP polling (every 30 seconds).

Future consideration: WebSocket for real-time notifications.

---

## Versioning

Current API version: **v1.0**

Version is not included in the URL path. Breaking changes will be communicated via:
- Major version bump in package.json
- Migration guide in documentation
- Deprecation warnings for affected endpoints

---

## Additional Resources

- [Database Schema](../specs/001-volunteer-management/data-model.md)
- [Quickstart Guide](../specs/001-volunteer-management/quickstart.md)
- [Implementation Plan](../specs/001-volunteer-management/plan.md)
- [Feature Specification](../specs/001-volunteer-management/spec.md)

---

**Last Updated**: May 3, 2026  
**Maintainers**: Development Team  
**Support**: For API questions, please contact the development team or file an issue on the project repository.
