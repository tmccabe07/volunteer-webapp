# API Contracts: Authentication
## Endpoint Specifications

*Feature: 001-volunteer-management*

All authentication endpoints are public (no JWT required).

---

## POST `/api/auth/register`

**Description**: Register a new volunteer account

**Authorization**: None (public)

**Request Body**:
```typescript
{
  email: string;        // Valid email format, unique
  password: string;     // Min 8 chars, must include uppercase, lowercase, number, special char
  name: string;         // 1-100 characters
  phone?: string;       // Optional, valid phone format
}
```

**Success Response** (201 Created):
```typescript
{
  user: {
    id: string;
    email: string;
    name: string;
    phone: string | null;
    authTier: "PARENT" | "LEADER" | "ADMIN";
  };
  accessToken: string;   // JWT, expires in 15 minutes
  refreshToken: string;   // JWT, expires in 7-30 days
}
```

**Error Responses**:
- `400 Bad Request`: Invalid input (email format, password strength)
  ```typescript
  { error: string; details?: string[] }
  ```
- `409 Conflict`: Email already registered
  ```typescript
  { error: "Email already in use" }
  ```

**Side Effects**:
- Creates Volunteer record with authTier=PARENT
- Sends welcome notification (in-app)
- Creates VolunteerPointBalance (0 points)

---

## POST `/api/auth/login`

**Description**: Authenticate existing volunteer

**Authorization**: None (public)

**Rate Limit**: 5 requests per 15 minutes per IP

**Request Body**:
```typescript
{
  email: string;
  password: string;
  rememberMe?: boolean;  // Default: false
}
```

**Success Response** (200 OK):
```typescript
{
  user: {
    id: string;
    email: string;
    name: string;
    phone: string | null;
    authTier: "PARENT" | "LEADER" | "ADMIN";
  };
  accessToken: string;   // JWT, expires in 15 minutes
  refreshToken: string;  // JWT, expires based on rememberMe (7 or 30 days)
}
```

**Error Responses**:
- `401 Unauthorized`: Invalid credentials
  ```typescript
  { error: "Invalid email or password" }
  ```
- `429 Too Many Requests`: Rate limit exceeded
  ```typescript
  { error: "Too many login attempts, please try again later" }
  ```

**Notes**:
- Always return same error message for invalid email OR password (prevent email enumeration)
- Set HttpOnly cookies: `access_token`, `refresh_token`

---

## POST `/api/auth/logout`

**Description**: Invalidate current session

**Authorization**: Bearer token (optional)

**Request Body**: None

**Success Response** (204 No Content)

**Side Effects**:
- Clears `access_token` and `refresh_token` cookies

---

## POST `/api/auth/refresh`

**Description**: Refresh access token using refresh token

**Authorization**: Refresh token in cookie

**Request Body**: None

**Success Response** (200 OK):
```typescript
{
  accessToken: string;   // New JWT, expires in 15 minutes
  refreshToken: string;  // Renewed refresh token
}
```

**Error Responses**:
- `401 Unauthorized`: Invalid or expired refresh token
  ```typescript
  { error: "Invalid refresh token" }
  ```

---

## POST `/api/auth/request-reset`

**Description**: Request password reset email

**Authorization**: None (public)

**Rate Limit**: 3 requests per hour per email

**Request Body**:
```typescript
{
  email: string;
}
```

**Success Response** (200 OK):
```typescript
{
  message: "If an account exists with that email, a password reset link has been sent."
}
```

**Notes**:
- Always return success (prevent email enumeration)
- Generate crypto-secure token (32 bytes)
- Hash token with SHA-256 before storing
- Token expires in 1 hour
- Send email with reset link: `https://app.domain.com/auth/reset-password?token={token}`

**Error Responses**:
- `429 Too Many Requests`: Rate limit exceeded

---

## POST `/api/auth/reset-password`

**Description**: Reset password using token from email

**Authorization**: None (public)

**Request Body**:
```typescript
{
  token: string;         // From email link query parameter
  newPassword: string;   // Min 8 chars, strength requirements
}
```

**Success Response** (200 OK):
```typescript
{
  message: "Password reset successfully. You can now log in with your new password."
}
```

**Error Responses**:
- `400 Bad Request`: Invalid or expired token
  ```typescript
  { error: "Invalid or expired reset token" }
  ```
- `400 Bad Request`: Password doesn't meet requirements
  ```typescript
  { error: "Password must be at least 8 characters and include uppercase, lowercase, number, and special character" }
  ```

**Side Effects**:
- Marks reset token as used
- Invalidates all existing sessions for that user
- Updates passwordHash

---

## GET `/api/auth/me`

**Description**: Get current authenticated user info

**Authorization**: Bearer token required

**Request Body**: None

**Success Response** (200 OK):
```typescript
{
  id: string;
  email: string;
  name: string;
  phone: string | null;
  authTier: "PARENT" | "LEADER" | "ADMIN";
  leaderboardOptIn: boolean;
  roles: Array<{
    id: string;
    name: string;
    roleType: string;
    specialty: string | null;
    rankLevel: string | null;
  }>;
  childrenRanks: Array<{
    rankLevel: "LION" | "TIGER" | "WOLF" | "BEAR" | "WEBELOS" | "AOL";
  }>;
  pointBalance: {
    totalPoints: number;
    currentYearPoints: number;
  };
}
```

**Error Responses**:
- `401 Unauthorized`: Missing or invalid token

---

## Validation Schemas (Zod)

```typescript
// backend/src/utils/validation/auth.schema.ts
import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must include uppercase letter')
    .regex(/[a-z]/, 'Password must include lowercase letter')
    .regex(/[0-9]/, 'Password must include number')
    .regex(/[^A-Za-z0-9]/, 'Password must include special character'),
  name: z.string().min(1).max(100),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional()
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional()
});

export const requestResetSchema = z.object({
  email: z.string().email()
});

export const resetPasswordSchema = z.object({
  token: z.string().length(64), // 32 bytes = 64 hex chars
  newPassword: z.string()
    .min(8)
    .regex(/[A-Z]/)
    .regex(/[a-z]/)
    .regex(/[0-9]/)
    .regex(/[^A-Za-z0-9]/)
});
```
