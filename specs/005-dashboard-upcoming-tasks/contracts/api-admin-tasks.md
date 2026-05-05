# API Contract: Admin Tasks for Dashboard

**Feature**: 005-dashboard-upcoming-tasks  
**Phase**: 1 - Design & Contracts  
**Date**: May 5, 2026  
**Contract Type**: REST API - Existing Endpoints

## Overview

This feature uses existing `/api/admin-tasks` endpoints. This contract documents the specific usage patterns and expected responses for dashboard integration.

## Endpoint 1: List Tasks for Dashboard

**Purpose**: Fetch upcoming incomplete tasks assigned to the current user

### Request

```http
GET /api/admin-tasks?assignedToMe=true&status=incomplete&limit=10
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assignedToMe` | boolean | Yes | Filter to tasks assigned to authenticated user |
| `status` | string | Yes | Must be "incomplete" to exclude completed tasks |
| `limit` | number | Yes | Number of tasks to fetch (use 10 to ensure 5 after filtering) |
| `page` | number | No | Pagination page (dashboard uses page 1) |

**Headers**:
- `Authorization: Bearer <JWT_TOKEN>` - Required for authentication
- `Cache-Control: no-store, no-cache` - Server sets this to prevent caching

### Response: Success (200 OK)

```json
{
  "tasks": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Submit attendance report",
      "description": "Monthly attendance summary due",
      "dueDate": "2026-05-10T23:59:59.000Z",
      "isOverdue": false,
      "isPackWide": false,
      "assignedRoles": [
        {
          "id": "role-123",
          "name": "Den Leader"
        }
      ],
      "currentUserCompletion": null,
      "createdAt": "2026-05-01T10:00:00.000Z",
      "updatedAt": "2026-05-01T10:00:00.000Z"
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "name": "Update roster",
      "description": null,
      "dueDate": "2026-05-15T23:59:59.000Z",
      "isOverdue": false,
      "isPackWide": true,
      "assignedRoles": [],
      "currentUserCompletion": null,
      "createdAt": "2026-05-02T10:00:00.000Z",
      "updatedAt": "2026-05-02T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 8
  }
}
```

**Response Fields**:
| Field | Type | Description |
|-------|------|-------------|
| `tasks` | array | Array of task objects |
| `tasks[].id` | string | Unique task identifier (UUID) |
| `tasks[].name` | string | Task title |
| `tasks[].description` | string \| null | Optional task details |
| `tasks[].dueDate` | string | ISO 8601 date-time |
| `tasks[].isOverdue` | boolean | Computed: true if dueDate < now |
| `tasks[].isPackWide` | boolean | True if assigned to all volunteers |
| `tasks[].assignedRoles` | array | Roles this task is assigned to |
| `tasks[].currentUserCompletion` | object \| null | User's completion record if exists |
| `pagination.page` | number | Current page number |
| `pagination.limit` | number | Items per page |
| `pagination.total` | number | Total matching tasks |

### Response: Client Error (400 Bad Request)

```json
{
  "error": "Invalid query parameters",
  "details": [
    "status must be one of: complete, incomplete, overdue"
  ]
}
```

**When**: Invalid query parameter values

### Response: Unauthorized (401 Unauthorized)

```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing authentication token"
}
```

**When**: Missing or invalid JWT token

### Client-Side Processing

**Filter Logic** (applied to response):
```typescript
const upcomingTasks = response.tasks
  .filter(task => !task.isOverdue)  // Exclude overdue tasks
  .slice(0, 5);                      // Take first 5
```

**Why client-side filtering**: 
- API doesn't have "upcoming" status option
- Server provides `isOverdue` flag for efficient filtering
- Fetching 10 ensures we have 5 after filtering

---

## Endpoint 2: Complete Task

**Purpose**: Mark a task as complete for the current user

### Request

```http
POST /api/admin-tasks/:taskId/complete
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `taskId` | string | Yes | UUID of the task to complete |

**Body**: Empty (no request body)

### Response: Success (201 Created)

```json
{
  "id": "completion-uuid",
  "taskId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user-uuid",
  "completedAt": "2026-05-05T14:30:00.000Z",
  "isComplete": true
}
```

**Response Fields**:
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Completion record UUID |
| `taskId` | string | Task that was completed |
| `userId` | string | User who completed it |
| `completedAt` | string | ISO 8601 timestamp |
| `isComplete` | boolean | Always true for new completions |

### Response: Already Completed (409 Conflict)

```json
{
  "error": "Task already completed by this user"
}
```

**When**: User has already completed this task

**Dashboard Handling**: Treat as success (task is complete, which is the desired state)

### Response: Not Found (404 Not Found)

```json
{
  "error": "Task not found or not assigned to you"
}
```

**When**: 
- Task doesn't exist
- Task is soft-deleted
- Task is not assigned to the user

### Response: Unauthorized (401 Unauthorized)

```json
{
  "error": "Unauthorized"
}
```

**When**: Missing or invalid authentication

---

## Endpoint 3: Undo Task Completion

**Purpose**: Remove completion record for the current user

### Request

```http
DELETE /api/admin-tasks/:taskId/complete
Authorization: Bearer <JWT_TOKEN>
```

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `taskId` | string | Yes | UUID of the task to uncomplete |

**Body**: Empty (no request body)

### Response: Success (204 No Content)

```text
(Empty response body)
```

**When**: Completion record successfully deleted

### Response: Not Found (404 Not Found)

```json
{
  "error": "Task not found, not assigned to you, or not completed"
}
```

**When**: 
- Task doesn't exist
- Task not assigned to user
- User hasn't completed this task

### Response: Unauthorized (401 Unauthorized)

```json
{
  "error": "Unauthorized"
}
```

**When**: Missing or invalid authentication

---

## Error Handling Strategy

### Dashboard Component Behavior

| Error Type | Dashboard Response |
|------------|-------------------|
| 401 Unauthorized | Redirect to login (handled by auth middleware) |
| 404 Not Found (list) | Show empty state "No upcoming tasks" |
| 400 Bad Request | Show error message, log to console |
| Network Error | Show "Failed to load tasks" with retry option |
| 409 Conflict (complete) | Treat as success (already in desired state) |
| 404 on complete/uncomplete | Show error toast, revert optimistic update |

### Retry Logic

- **List tasks on mount failure**: No automatic retry (user can refresh page)
- **Complete/uncomplete failure**: Show error, allow user to retry manually
- **Network timeout**: Show error after 10 seconds

---

## Contract Tests

**Purpose**: Verify API endpoints behave as documented

### Test Coverage Required

1. **List Tasks - Success Path**
   - Given: User with assigned incomplete tasks
   - When: GET /admin-tasks?assignedToMe=true&status=incomplete&limit=10
   - Then: Returns 200 with task array and pagination

2. **List Tasks - Empty Result**
   - Given: User with no assigned tasks
   - When: GET with same params
   - Then: Returns 200 with empty array

3. **Complete Task - Success**
   - Given: User with incomplete assigned task
   - When: POST /admin-tasks/:id/complete
   - Then: Returns 201 with completion record

4. **Complete Task - Already Completed**
   - Given: User already completed task
   - When: POST /admin-tasks/:id/complete
   - Then: Returns 409 Conflict

5. **Uncomplete Task - Success**
   - Given: User has completed task
   - When: DELETE /admin-tasks/:id/complete
   - Then: Returns 204 No Content

6. **Authorization Required**
   - Given: No auth token
   - When: Any endpoint call
   - Then: Returns 401 Unauthorized

**Test Location**: `backend/src/test/contract/admin-tasks-dashboard.spec.ts`

---

## Rate Limiting

**Existing Behavior**: API uses `@nestjs/throttler`
- **List tasks**: No specific limit (relies on authentication)
- **Complete/uncomplete**: Standard rate limiting applies

**Dashboard Impact**: Minimal - single load on mount, occasional completion toggles

---

## Backwards Compatibility

**Status**: ✅ No breaking changes

- Uses existing API endpoints without modification
- Query parameters are optional (backwards compatible)
- Response structure unchanged
- Existing task page and admin features unaffected

---

## Summary

This feature consumes three existing API endpoints without modification:
1. `GET /admin-tasks` - Fetch tasks with filters
2. `POST /admin-tasks/:id/complete` - Mark complete
3. `DELETE /admin-tasks/:id/complete` - Undo completion

**Key Contract Points**:
- Client-side filtering for "upcoming" (not overdue)
- Optimistic UI updates with error rollback
- 409 conflicts treated as success for idempotency
- Standard JWT authentication required
- No API versioning or breaking changes needed
