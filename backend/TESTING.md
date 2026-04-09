# Testing Setup and Documentation

## Overview

This document describes the comprehensive test coverage added for the Volunteer Management Webapp. The testing strategy follows the BDD-first principle outlined in the project constitution.

## Test Coverage Summary

### **Backend Unit Tests** (Created)
- `auth.service.spec.ts` - Authentication service tests (register, login, tokens, password reset)
- `volunteer.service.spec.ts` - Profile management and role assignment tests
- `points.service.spec.ts` - Gamification and points system tests

### **Backend API Contract Tests** (Created)
- `auth.e2e-spec.ts` - Auth API endpoint contract tests

### **Test Infrastructure**
- `test-utils.ts` - Test database utilities, factories, and helpers
- `.env.test` - Test environment configuration

## Test Architecture

### Unit Tests
- **Location**: `backend/src/services/*.spec.ts`
- **Framework**: Jest + @nestjs/testing
- **Coverage**: Service layer business logic
- **Approach**: Isolated tests with mocked dependencies where appropriate

### API Contract Tests  
- **Location**: `backend/test/*.e2e-spec.ts`
- **Framework**: Jest + Supertest
- **Coverage**: HTTP API endpoints
- **Approach**: Integration tests validating request/response contracts

### Test Utilities
The `test-utils.ts` file provides:
- `setupTests()` - Initialize test database with seed data
- `teardownTests()` - Clean up and disconnect after tests
- `cleanupDatabase()` - Remove all test data between tests
- `seedTestDatabase()` - Create essential configuration (pack config, badge tiers, roles, activity types)
- Factory functions for creating test data:
  - `createTestVolunteer()` - Create volunteer with customizable attributes
  - `createTestVolunteerWithRole()` - Create volunteer with assigned role
  - `createTestEvent()` - Create event with activity slots
  - `createTestActivityType()` - Create activity type  
  - `createPasswordResetToken()` - Create password reset token

## Setup Instructions

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Set Up Test Database

**Option A: Automated Setup (Recommended)**
```bash
npm run test:setup
```

This runs the `scripts/setup-test-db.js` Node.js script which:
- Removes old test.db if it exists
- Generates Prisma Client
- Runs migrations on test database

**Option B: Manual Setup**
```bash
# Set DATABASE_URL to test database
export DATABASE_URL="file:./test.db"  # Linux/Mac
set DATABASE_URL=file:./test.db      # Windows CMD
$env:DATABASE_URL="file:./test.db"   # Windows PowerShell

# Run migrations on test database
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

### 3. Configure Environment
The test environment is configured automatically by `test-utils.ts`. 
Optionally create `.env.test` with:
```
DATABASE_URL="file:./test.db"
JWT_SECRET="test-jwt-secret-key-for-testing"
JWT_REFRESH_SECRET="test-refresh-secret-key-for-testing"
NODE_ENV="test"
```

### 4. Run Tests

**Run all tests:**
```bash
npm test
```

**Run specific test suite:**
```bash
npm test -- auth.service.spec.ts
```

**Run with coverage:**
```bash
npm run test:cov
```

**Run E2E tests:**
```bash
npm run  test:e2e
```

## Test Coverage Goals

Based on the technical plan requirements:
- **Target Coverage**: 80%+ across all metrics
- **Critical Paths**: 100% coverage for authentication and authorization logic
- **Service Layer**: 100% coverage for business logic
- **API Contracts**: 100% coverage for all implemented endpoints

## Current Test Coverage

### Unit Tests Written

#### AuthService (23 tests)
- ✅ Registration with password hashing
- ✅ Duplicate email prevention
- ✅ Login with valid/invalid credentials
- ✅ JWT token generation and verification
- ✅ Access token vs refresh token validation
- ✅ Token refresh flow
- ✅ Password change with old password verification
- ✅ Must-change-password flag handling
- ✅ Get current user with roles

#### VolunteerService (12 tests)
- ✅ Get profile with badge tier
- ✅ Update profile information
- ✅ Assign roles with tier upgrades
- ✅ 100-point bonus for first leader role
- ✅ Remove roles with tier downgrades
- ✅ List volunteers with pagination and filters
- ✅ Soft delete with future signup withdrawal

#### PointsService (11 tests)
- ✅ Award points and update balance
- ✅ Badge tier upgrades on point milestones
- ✅ Revoke points with audit trail
- ✅ Badge tier downgrades when revoking
- ✅ Calculate points balance excluding revoked
- ✅ Get point history with pagination
- ✅ Filter by year
- ✅ Role bonus award

### API Contract Tests Written

#### Auth API (15 tests)
- ✅ POST /api/auth/register - Create account
- ✅ POST /api/auth/login - Login with credentials
- ✅ POST /api/auth/logout - Clear session
- ✅ POST /api/auth/refresh - Refresh access token
- ✅ GET /api/auth/me - Get current user
- ✅ POST /api/auth/change-password - Change password
- ✅ POST /api/auth/request-reset - Request password reset
- ✅ POST /api/auth/reset-password - Reset with token
- ✅ Rate limiting validation
- ✅ Input validation
- ✅ Error responses

## Remaining Test Coverage Needed

### Unit Tests 
- [X] EventService tests
- [X] SignupService tests
- [X] BadgeTierService tests
- [X] LeaderboardService tests
- [X] ActivityTypeService tests
- [X] AdminService tests
- [X] PasswordResetService tests

### API Contract Tests 
- [X] Volunteers API (`/api/volunteers/*`)
- [X] Events API (`/api/events/*`)
- [X] Points API (`/api/points/*`)
- [X] Leaderboard API (`/api/leaderboard`)
- [X] Pack Config API (`/api/pack-config/*`)
- [X] Admin API (`/api/admin/*`)

### Frontend Tests (To Be Created)
- [X] Setup Vitest + React Testing Library
- [X] Component tests for auth forms
- [X] Component tests for profile forms
- [X] Component tests for event forms
- [X] Service layer tests
- [X] Hook tests (auth-context)
- [X] Page component tests

### E2E Tests (To Be Created)
- [ ] Setup Playwright
- [ ] Complete user registration and login journey
- [ ] Profile creation and role assignment journey
- [ ] Event creation and signup journey
- [ ] Points earning and badge progression journey
- [ ] Admin password reset journey

## Running Tests in CI/CD

```yaml
# Example GitHub Actions workflow
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '20'
      - run: cd backend && npm install
      - run: cd backend && npx prisma generate
      - run: cd backend && npx prisma migrate deploy
      - run: cd backend && npm run test:cov
      - run: cd frontend && npm install  
      - run: cd frontend && npm test
```

## Troubleshooting

### Test Database Issues
If you encounter "no such table" errors:
```bash
# Delete test database and recreate
rm test.db
export DATABASE_URL="file:./test.db"
npx prisma migrate deploy
```

### Prisma Client Issues
If you see PrismaClient initialization errors:
```bash
# Regenerate Prisma client
npx prisma generate
```

### Port Conflicts
If E2E tests fail due to port conflicts:
```bash
# Kill processes on port 3000
npx kill-port 3000
```

## Test Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Cleanup**: Always clean up test data in `afterEach` hooks
3. **Factories**: Use factory functions to create test data consistently
4. **Assertions**: Be specific with assertions - test exact values, not just existence
5. **Coverage**: Aim for edge cases - test both success and failure paths
6. **Performance**: Keep unit tests fast (<100ms each), E2E tests can be slower
7. **Documentation**: Use descriptive test names that explain what is being tested

## Next Steps

1. **Fix test database setup** - Create automated script to set up test.db with migrations
2. **Complete unit test coverage** - Add remaining service tests
3. **Expand API coverage** - Add contract tests for all endpoints
4. **Add frontend tests** - Set up Vitest and create component tests
5. **Set up E2E testing** - Install Playwright and create critical path tests
6. **Configure CI/CD** - Automate test execution on pull requests
7. **Measure coverage** - Verify 80%+ coverage across all metrics

## Test Metrics

After full implementation, aim for:
- **Statement Coverage**: 80%+
- **Branch Coverage**: 80%+
- **Function Coverage**: 80%+
- **Line Coverage**: 80%+
- **Critical Path Coverage**: 100%
