# API Contracts: Administrative Tasks
## Endpoint Specifications

*Feature: 001-volunteer-management*

Administrative task management for pack operations.

---

## GET `/api/admin-tasks`

**Description**: List administrative tasks

**Authorization**: Bearer token (Tier 1+)

**Query Parameters**:
```typescript
{
  page?: number;                    // Default: 1
  limit?: number;                   // Default: 20, max: 100
  assignedToMe?: boolean;           // Default: true for Tier 1, false for Tier 2+
  status?: "complete" | "incomplete" | "overdue";
  taskId?: string;                  // Filter by specific task type
}
```

**Success Response** (200 OK):
```typescript
{
  tasks: Array<{
    id: string;
    name: string;
    description: string | null;
    dueDate: string; // ISO 8601
    isOverdue: boolean; // Calculated: dueDate < now && !isComplete
    completionSteps: Array<{
      step: string;
      url: string | null;
    }> | null;
    isPackWide: boolean;
    isRecurring: boolean;
    recurringEndDate: string | null;
    assignedRoles: Array<{
      id: string;
      name: string;
    }>;
    currentUserCompletion: {
      id: string;
      completedAt: string;
      isComplete: boolean;
    } | null;
    createdBy: {
      id: string;
      name: string;
    };
    createdAt: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}
```

**Notes**:
- If `assignedToMe = true` → filters to tasks assigned to user's roles OR pack-wide tasks
- `status = "overdue"` → `dueDate < now AND currentUserCompletion IS NULL`
- `status = "incomplete"` → `currentUserCompletion IS NULL`
- `status = "complete"` → `currentUserCompletion IS NOT NULL`

---

## GET `/api/admin-tasks/:id`

**Description**: Get single administrative task details

**Authorization**: Bearer token (Tier 1+)

**Success Response** (200 OK):
```typescript
{
  id: string;
  name: string;
  description: string | null;
  dueDate: string;
  isOverdue: boolean;
  completionSteps: Array<{
    step: string;
    url: string | null;
  }> | null;
  isPackWide: boolean;
  isRecurring: boolean;
  recurringEndDate: string | null;
  assignedRoles: Array<{
    id: string;
    name: string;
  }>;
  completions: Array<{           // Only visible to Tier 2+
    id: string;
    volunteer: {
      id: string;
      name: string;
    };
    completedAt: string;
    isComplete: boolean;
  }> | null;
  currentUserCompletion: {
    id: string;
    completedAt: string;
    isComplete: boolean;
  } | null;
  createdBy: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}
```

**Error Responses**:
- `404 Not Found`: Task does not exist

**Notes**:
- `completions` array only returned for Tier 2+ (leaders/admins)

---

## POST `/api/admin-tasks`

**Description**: Create a new administrative task

**Authorization**: Bearer token (Tier 2+)

**Request Body**:
```typescript
{
  name: string;                     // 3-200 characters
  description?: string;
  dueDate: string;                  // ISO 8601, must be future date
  completionSteps?: Array<{
    step: string;
    url?: string;                   // Optional URL for reference
  }>;
  isPackWide?: boolean;             // Default: false
  assignedRoleIds?: string[];       // Required if !isPackWide
  isRecurring?: boolean;            // Default: false
}
```

**Success Response** (201 Created):
```typescript
{
  id: string;
  name: string;
  description: string | null;
  dueDate: string;
  completionSteps: Array<{ step: string; url: string | null }> | null;
  isPackWide: boolean;
  isRecurring: boolean;
  recurringEndDate: string | null; // Auto-set from PackConfig if isRecurring=true
  assignedRoles: Array<{
    id: string;
    name: string;
  }>;
  createdById: string;
  createdAt: string;
}
```

**Error Responses**:
- `400 Bad Request`: Invalid input (past due date, isPackWide=false but no assignedRoleIds)
- `403 Forbidden`: Insufficient permissions

**Side Effects**:
- If `isRecurring = true` → set `recurringEndDate` to PackConfig.yearEndDate
- Create AdminTaskToRole records for each assignedRoleId
- Create AuditLog entry

---

## PUT `/api/admin-tasks/:id`

**Description**: Update an existing administrative task

**Authorization**: Bearer token (Tier 2+)

**Request Body**: Same as POST (all fields optional)

**Success Response** (200 OK): Same as POST response

**Error Responses**:
- `400 Bad Request`: Invalid input
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Task does not exist

---

## POST `/api/admin-tasks/:id/complete`

**Description**: Mark administrative task as complete for current user

**Authorization**: Bearer token (Tier 1+, must be assigned to task)

**Request Body**: None

**Success Response** (201 Created):
```typescript
{
  id: string;
  taskId: string;
  volunteerId: string;
  completedAt: string;
  isComplete: true;
}
```

**Error Responses**:
- `400 Bad Request`: Task not assigned to current user's roles
- `404 Not Found`: Task does not exist
- `409 Conflict`: Task already marked complete by current user

**Side Effects**:
- Create TaskCompletion record
- Create in-app Notification (type=TASK_COMPLETION)
- No points awarded for task completion (as per spec - only for self-reported activities)

---

## DELETE `/api/admin-tasks/:id`

**Description**: Delete an administrative task (soft delete)

**Authorization**: Bearer token (Tier 2+)

**Success Response** (204 No Content)

**Error Responses**:
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Task does not exist

**Side Effects**:
- Soft delete AdminTask (set deletedAt)
- Cascade soft delete to AdminTaskToRole (via onDelete: Cascade)
- Keep TaskCompletion records for historical tracking
- Create AuditLog entry

---

## GET `/api/admin-tasks/:id/completions`

**Description**: Get all completion records for a task (leader/admin view)

**Authorization**: Bearer token (Tier 2+)

**Success Response** (200 OK):
```typescript
{
  task: {
    id: string;
    name: string;
    dueDate: string;
  };
  completions: Array<{
    id: string;
    volunteer: {
      id: string;
      name: string;
      email: string;
    };
    completedAt: string;
    isComplete: boolean;
  }>;
  assignedVolunteers: Array<{    // Volunteers with matching roles who haven't completed
    id: string;
    name: string;
    email: string;
    roles: Array<{ name: string }>;
  }>;
  stats: {
    totalAssigned: number;
    totalCompleted: number;
    completionRate: number;       // Percentage
  };
}
```

**Error Responses**:
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Task does not exist

---

## Validation Schemas

```typescript
// backend/src/utils/validation/admin-task.schema.ts
import { z } from 'zod';

export const createAdminTaskSchema = z.object({
  name: z.string().min(3).max(200),
  description: z.string().optional(),
  dueDate: z.string().datetime().refine(
    (date) => new Date(date) > new Date(),
    'Due date must be in the future'
  ),
  completionSteps: z.array(z.object({
    step: z.string().min(1).max(500),
    url: z.string().url().optional()
  })).optional(),
  isPackWide: z.boolean().optional(),
  assignedRoleIds: z.array(z.string().cuid()).optional(),
  isRecurring: z.boolean().optional()
}).refine(
  (data) => data.isPackWide || (data.assignedRoleIds && data.assignedRoleIds.length > 0),
  'Must specify assignedRoleIds if task is not pack-wide'
);

export const updateAdminTaskSchema = createAdminTaskSchema.partial();

export const listAdminTasksSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  assignedToMe: z.coerce.boolean().optional(),
  status: z.enum(['complete', 'incomplete', 'overdue']).optional(),
  taskId: z.string().cuid().optional()
});
```
