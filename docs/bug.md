# Bug Tracking

## 2026-04-02: Prisma Validation Error - req.user.id is undefined

**Error**: 
```
PrismaClientValidationError: Invalid `prisma.volunteer.findUnique()` invocation
Argument `where` of type VolunteerWhereUniqueInput needs at least one of `id` or `email` arguments.
where: { id: undefined }
```

**Root Cause**: Mismatch between the JWT payload structure and controller interface expectations:
- The `AuthGuard` in `backend/src/middleware/auth.ts` sets `request.user = payload` where payload has property `userId` (from `JWTPayload` interface)
- Controllers defined their own `AuthenticatedRequest` interface expecting `user.id`
- Controllers accessed `req.user!.id` which was `undefined` because the actual property is `userId`

**Affected Controllers**:
- `backend/src/api/events.controller.ts` - All event endpoints
- `backend/src/api/points.controller.ts` - Points, leaderboard, badge tier endpoints

**Solution**: 
1. Import the `JWTPayload` type from auth middleware in affected controllers
2. Change `AuthenticatedRequest` interface to use `JWTPayload` type:
   ```typescript
   import type { JWTPayload } from '../middleware/auth';
   
   interface AuthenticatedRequest extends Request {
     user?: JWTPayload;  // Instead of custom { id: string, authTier: AuthTier }
   }
   ```
3. Update all `req.user!.id` references to `req.user!.userId` to match the actual JWT payload structure

**Prevention**:
- Always use TypeScript interfaces from the source of truth (auth middleware) rather than redefining them
- Use a shared type for authenticated requests across all controllers
- Consider creating a base `AuthenticatedRequest` type exported from auth middleware
- Add type tests to verify JWT payload structure matches expectations

**Key Learning**: 
When middleware sets properties on the request object, controllers must match the exact structure of those properties. Redefining interfaces in multiple places leads to type mismatches that TypeScript can't catch when using type assertions (`req.user!`).

**Files Modified**:
- `backend/src/api/events.controller.ts` - Updated interface and 6 req.user references
- `backend/src/api/points.controller.ts` - Updated interface and 5 req.user references

---

## 2026-04-02: NestJS "metatype is not a constructor" Error - Missing reflect-metadata

**Error**: `TypeError: metatype is not a constructor` at `Injector.instantiateClass()` when running `npm run start:dev` in backend.

**Root Cause**: Missing `import 'reflect-metadata'` at the top of `main.ts`. NestJS requires reflect-metadata to be imported before any other modules to enable runtime reflection for dependency injection. Without it, TypeScript's `emitDecoratorMetadata` cannot generate the metadata that NestJS uses to resolve constructor parameter types.

**Investigation Steps Taken**:
1. Verified module configuration (imports/exports/providers) - all correct
2. Checked for circular dependencies - none found
3. Verified all services have @Injectable() decorators - confirmed
4. Verified all controllers have @Controller() decorators - confirmed
5. Verified import/export syntax (named vs default exports) - all correct
6. Checked tsconfig.json for `emitDecoratorMetadata: true` and `experimentalDecorators: true` - enabled
7. Examined compiled JavaScript to verify metadata was generated - metadata present
8. **Discovered missing `reflect-metadata` import in main.ts**

**Solution**: 
- Added `import 'reflect-metadata';` as the first line after comments in `backend/src/main.ts`

**Prevention**:
- Always import `reflect-metadata` as the very first import in NestJS application entry point
- This is a critical requirement for NestJS dependency injection to function
- Consider adding this to project templates/scaffolds

**Key Learning**: 
Even though TypeScript generated the metadata correctly (verified in compiled files), the runtime reflection API wasn't available to read it without the reflect-metadata polyfill imported first.

**Files Modified**:
- `backend/src/main.ts`

---

## 2026-04-02: NestJS "metatype is not a constructor" Error - Incorrect @UseGuards Usage

**Error**: `TypeError: metatype is not a constructor` at `Injector.instantiateClass()` when running `npm run start:dev` in backend after Phase 5 implementation.

**Root Cause**: In `backend/src/api/points.controller.ts`, the `@UseGuards` decorator was incorrectly used with `RequireTier(AuthTier.LEADER)` directly. `RequireTier` is a metadata decorator (uses `SetMetadata`), not a guard class. The `@UseGuards` decorator expects guard classes that implement `CanActivate`, not function return values.

**Incorrect Code**:
```typescript
@Post('revoke/:pointEventId')
@UseGuards(RequireTier(AuthTier.LEADER))  // WRONG: RequireTier returns metadata, not a guard
@HttpCode(HttpStatus.CREATED)
async revokePoints(...) { ... }
```

**Correct Pattern**:
```typescript
@Post('revoke/:pointEventId')
@UseGuards(TierGuard)                    // Guard class that implements CanActivate
@RequireTier(AuthTier.LEADER)            // Metadata decorator for the guard to read
@HttpCode(HttpStatus.CREATED)
async revokePoints(...) { ... }
```

**Solution**: 
1. Added `TierGuard` to imports: `import { AuthGuard, TierGuard, RequireTier } from '../middleware/auth';`
2. Changed `@UseGuards(RequireTier(AuthTier.LEADER))` to use two decorators:
   - `@UseGuards(TierGuard)` - to apply the guard
   - `@RequireTier(AuthTier.LEADER)` - to set the metadata the guard reads

**How It Works**:
- `RequireTier(tier)` sets metadata on the route using `SetMetadata(TIER_KEY, tier)`
- `TierGuard` implements `CanActivate` and uses `Reflector` to read that metadata
- `TierGuard` then checks if the authenticated user's tier meets the requirement

**Prevention**:
- Always use guard classes with `@UseGuards()`, never decorator functions
- Metadata decorators (like `@RequireTier`) should be used alongside guards, not inside them
- Follow NestJS patterns: guards implement logic, metadata decorators provide configuration
- Review other controllers for similar incorrect usage patterns

**Key Learning**: 
NestJS has two types of decorators that work together:
1. **Guard decorators** (`@UseGuards`) - take classes that implement execution logic
2. **Metadata decorators** (custom decorators using `SetMetadata`) - attach configuration data to routes

These must be used as separate decorators and cannot be nested.

**Files Modified**:
- `backend/src/api/points.controller.ts`

---

## 2026-04-02: Radix UI Select.Item - Empty String Value Not Allowed

**Error**: Runtime error in browser when visiting `/events` page:
```
A <Select.Item /> must have a value prop that is not an empty string. This is because the Select value can be set to an empty string to clear the selection and show the placeholder.
```

**Root Cause**: In `frontend/src/app/events/page.tsx`, the rank filter Select component had a SelectItem with an empty string value:
```typescript
const RANK_LEVELS = [
  { value: '', label: 'All Ranks' },  // WRONG: empty string not allowed
  // ...other ranks
];
```

Radix UI's `<SelectItem>` component explicitly rejects empty strings as values because the Select uses empty string internally to represent "no selection" state.

**Solution**: 
1. Changed the "All Ranks" option value from `''` to `'ALL'`:
   ```typescript
   const RANK_LEVELS = [
     { value: 'ALL', label: 'All Ranks' },
     // ...other ranks
   ];
   ```

2. Updated initial state to match:
   ```typescript
   const [rankLevel, setRankLevel] = useState('ALL');
   ```

3. Updated filter logic to treat 'ALL' as "no filter" (undefined):
   ```typescript
   rankLevel: (rankLevel && rankLevel !== 'ALL') ? rankLevel : undefined,
   ```

**Prevention**:
- Never use empty strings as `value` prop for Radix UI SelectItem components
- Use meaningful sentinel values like 'ALL', 'NONE', or 'DEFAULT' instead
- Ensure filter logic properly handles the sentinel value
- Consider using `null` or `undefined` for initial state and conditional rendering to avoid placeholder items

**Key Learning**: 
Radix UI components have strict value requirements to maintain internal state consistency. Empty strings are reserved for internal use, not for user-defined options.

**Files Modified**:
- `frontend/src/app/events/page.tsx`

---

## 2026-04-02: Events API 500 Error - Invalid Enum Value in Query Parameter

**Error**: HTTP 500 Internal Server Error when loading `/events` page with "All Ranks" filter:
```
GET http://localhost:3001/api/events?page=1&limit=20&upcoming=true&mySignups=false&rankLevel=ALL
Status: 500 (Internal Server Error)
```

**Symptom**: Error only occurred when "All Ranks" was selected in the rank filter. Selecting specific ranks (Lion, Tiger, etc.) worked fine.

**Root Cause**: The Zod validation schema in `backend/src/utils/validation/event.schema.ts` expects `rankLevel` to be a valid `RankLevel` enum value:
```typescript
export const listEventsSchema = z.object({
  // ...
  rankLevel: z.nativeEnum(RankLevel).optional(),  // Only accepts LION, TIGER, WOLF, etc.
  // ...
});
```

When the frontend sent `rankLevel=ALL`, Zod validation rejected it because 'ALL' is not in the `RankLevel` enum, causing the request to fail validation and return a 500 error.

**Solution**: 
Modified `frontend/src/app/events/page.tsx` to conditionally build the params object and exclude the `rankLevel` parameter entirely when "All Ranks" is selected:

```typescript
const params: any = {
  page: pagination.page,
  limit: pagination.limit,
  upcoming,
  mySignups,
};

// Only include rankLevel if a specific rank is selected (not 'ALL')
if (rankLevel && rankLevel !== 'ALL') {
  params.rankLevel = rankLevel;
}

const result = await eventsService.listEvents(params);
```

**Why This Works**:
- When no `rankLevel` parameter is sent, the backend handles it correctly:
  - Queries the user's children ranks from the database
  - Uses those ranks to filter events relevant to the user
  - If user has no children ranks, shows all events
- This matches the API contract where `rankLevel` is an optional parameter

**Prevention**:
- When using sentinel values ('ALL', 'NONE', etc.) in UI components, ensure they're not passed to APIs that expect strict enum values
- Explicitly omit parameters from request objects when they represent "no filter" states
- Don't rely on `undefined` values being automatically omitted - explicitly exclude keys from objects
- Consider using TypeScript discriminated unions for filter states that need sentinel values

**Key Learning**: 
Frontend sentinel values used for UI state management ('ALL', 'NONE') should not be passed to backend APIs with strict enum validation. Instead, omit the parameter entirely to indicate "no filter".

**Files Modified**:
- `frontend/src/app/events/page.tsx`

---

## 2026-04-02: Events API 500 Error (continued) - Prisma IN Clause with Null Values

**Error**: HTTP 500 Internal Server Error persisted when loading `/events` page with "All Ranks" filter even after fixing the enum validation issue.

**Root Cause**: In `backend/src/services/event.service.ts`, the Prisma query attempted to use an `in` clause that mixed enum values with `null`:

```typescript
where.rankLevel = {
  in: [...filters.userRankLevels, null], // WRONG: Prisma doesn't handle null in IN clause properly
};
```

**Why This Fails**:
- Prisma/SQLite doesn't correctly handle `in: [value1, value2, null]` queries
- In SQL, `column IN (values)` doesn't match NULL values - you need `column IS NULL`
- Prisma translates `{ in: [values, null] }` incorrectly, causing query failures

**Solution**: 
Changed to use Prisma's `OR` clause to separate the two conditions:

```typescript
where.OR = [
  { rankLevel: { in: filters.userRankLevels } },  // Rank-specific events
  { rankLevel: null },                             // Pack-wide events (IS NULL)
];
```

**Why This Works**:
- `{ in: values }` generates proper `rankLevel IN (values)` SQL
- `{ rankLevel: null }` generates proper `rankLevel IS NULL` SQL  
- `OR` combines both conditions correctly

**Prevention**:
- Never include `null` in Prisma `in` arrays
- Use `OR` clauses to combine `{ in: [...] }` with `{ field: null }` conditions
- Remember SQL `IN` doesn't match NULL - always use `IS NULL` for null checks
- Test with empty result sets and null values during development

**Key Learning**: 
Prisma's `in` operator doesn't handle null values in the array. When you need to match both specific values AND null, use an `OR` clause with separate conditions: `{ field: { in: values } } OR { field: null }`.

**Files Modified**:
- `backend/src/services/event.service.ts`

---

## 2026-04-03: Events API Browser Caching - 304 Not Modified Returning Stale Data

**Error**: Events list page (`/events`) displayed no events even though events existed in the database and the dashboard showed them correctly. Browser console showed `Status Code 304 Not Modified` for repeated API calls.

**Symptoms**:
- Dashboard (`/dashboard`) fetched events with `limit: 5` and displayed them correctly
- Events page (`/events`) fetched events with `limit: 20` but received empty array
- Backend logs showed only `limit: 5` requests, never `limit: 20`
- Frontend logs showed axios receiving `{events: [], pagination: {total: 0}}` with 200 OK status
- Network tab showed `Status Code: 304 Not Modified` for `GET /api/events` requests
- Frontend was sending correct parameters (`limit: 20`) but getting cached response from previous request

**Root Cause**: 
The browser was caching GET requests to `/api/events` and returning HTTP 304 (Not Modified) responses with stale data. When the Events page made a request with different parameters than the Dashboard's previous request:

1. Dashboard made: `GET /api/events?limit=5&upcoming=true` → Backend returned 2 events
2. Browser cached this response
3. Events page made: `GET /api/events?limit=20&upcoming=true` 
4. Browser returned cached response with empty events array (from a different earlier request)
5. Backend never processed the new request (304 tells client "use your cache")

**Why This Happened**:
- NestJS controllers by default don't set cache-control headers
- Browsers cache GET requests by default for performance
- Different query parameters should invalidate cache, but browser was returning stale data
- Dynamic data (event listings) should never be cached

**Solution**: 
Added no-cache headers to all events GET endpoints in `backend/src/api/events.controller.ts`:

```typescript
import { Header } from '@nestjs/common';

@Get()
@Header('Cache-Control', 'no-store, no-cache, must-revalidate, private')
@Header('Pragma', 'no-cache')
@Header('Expires', '0')
async listEvents(...) { ... }

@Get(':id')
@Header('Cache-Control', 'no-store, no-cache, must-revalidate, private')
@Header('Pragma', 'no-cache')
@Header('Expires', '0')
async getEvent(...) { ... }
```

**Header Meanings**:
- `Cache-Control: no-store` - Don't store response in cache at all
- `Cache-Control: no-cache` - Revalidate with server before using cached response
- `Cache-Control: must-revalidate` - Once stale, must check with server
- `Cache-Control: private` - Only browser cache, not CDN/proxy caches
- `Pragma: no-cache` - HTTP/1.0 backward compatibility
- `Expires: 0` - Response is already expired, don't cache

**Prevention**:
- Always set appropriate cache headers for dynamic content (events, points, user data)
- Use `@Header()` decorators on GET endpoints that return real-time data
- Static/reference data (activity types, rank levels) can be cached with TTL
- Consider creating a custom `@NoCache()` decorator for reusability
- Test with browser DevTools Network tab to verify cache behavior

**Key Learning**: 
Browsers aggressively cache GET requests. For dynamic data that changes frequently or is user-specific, explicitly prevent caching with appropriate headers. The 304 Not Modified status is useful for static assets but dangerous for dynamic API responses.

**Files Modified**:
- `backend/src/api/events.controller.ts`

---

## 2026-04-03: Query Parameter Boolean Parsing - String 'false' Coerced to Boolean true

**Error**: Events list page showed zero events when `mySignups` filter was off, even though user had not signed up for any events and ALL events should have been shown.

**Symptoms**:
- Frontend sent: `GET /api/events?mySignups=false`
- Backend logged: `Raw query: { mySignups: 'false' }` (string)
- Backend logged: `List events query: { mySignups: true }` (boolean)
- The string `'false'` was being incorrectly parsed as boolean `true`
- Query filtered to show only events with user signups, resulting in empty list

**Root Cause**: 
The Zod schema used `z.coerce.boolean()` to parse query parameters:

```typescript
export const listEventsSchema = z.object({
  // ...
  upcoming: z.coerce.boolean().optional().default(true),
  mySignups: z.coerce.boolean().optional().default(false),
});
```

**Why This Failed**:
- Query parameters are always strings in HTTP: `?mySignups=false` → `{ mySignups: 'false' }`
- Zod's `z.coerce.boolean()` uses JavaScript's Boolean() constructor
- `Boolean('false')` returns `true` because any non-empty string is truthy
- Only `Boolean('')` returns `false`, but empty strings aren't sent in query params

**Incorrect Behavior**:
```javascript
Boolean('false') // → true  ❌
Boolean('true')  // → true  ✓
Boolean('0')     // → true  ❌
Boolean('1')     // → true  ✓
Boolean('')      // → false ✓ (but not sent as query param)
```

**Solution**: 
Created a custom Zod transform that properly parses string boolean values:

```typescript
/**
 * Custom boolean coercion that handles string 'true'/'false'
 */
const booleanString = z
  .string()
  .transform(val => val === 'true')
  .or(z.boolean());

export const listEventsSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  rankLevel: z.nativeEnum(RankLevel).optional(),
  upcoming: booleanString.optional().default(true),
  mySignups: booleanString.optional().default(false),
});
```

**How It Works**:
- `z.string().transform(val => val === 'true')` handles string inputs ('true' → true, 'false' → false, anything else → false)
- `.or(z.boolean())` allows actual boolean values to pass through (for programmatic usage)
- Works correctly for both query params and JSON body requests

**Correct Behavior**:
```javascript
booleanString.parse('true')  // → true  ✓
booleanString.parse('false') // → false ✓
booleanString.parse('0')     // → false ✓
booleanString.parse('1')     // → false ❓ (debatable, could enhance)
booleanString.parse(true)    // → true  ✓
booleanString.parse(false)   // → false ✓
```

**Prevention**:
- Never use `z.coerce.boolean()` for query parameter validation
- Create reusable `booleanString` schema for all query param booleans
- Consider enhancing to also accept '1'/'0' or 'yes'/'no' if needed
- Document this pattern in project conventions
- Add unit tests for query parameter parsing edge cases

**Alternative Solutions Considered**:
1. **Client-side conversion**: Convert `false` → `undefined` and omit param entirely
   - ❌ Breaks API contract, makes debugging harder
2. **Accept '1' and '0' instead**: `?mySignups=0`
   - ❌ Inconsistent with REST conventions, less readable
3. **Use POST with JSON body**: Send filters in request body
   - ❌ Violates REST semantics (GET should not have body), breaks caching

**Key Learning**: 
HTTP query parameters are always strings. When using Zod to validate them, you must explicitly handle string-to-boolean conversion. JavaScript's built-in Boolean() coercion is NOT suitable for parsing string literals 'true' and 'false'. Always use explicit string comparison (`val === 'true'`) for query param boolean validation.

**Files Modified**:
- `backend/src/utils/validation/event.schema.ts`

---

## 2026-04-05: Test Database Failures - Stale Database Schema and Data

**Errors**: Multiple test failures when running `npm test -- auth.service.spec.ts`:
```
● AuthService › registerVolunteer › should create a new volunteer with hashed password
  Email already in use

● AuthService › loginVolunteer › should return volunteer and tokens for valid credentials
  expect(received).not.toBeNull()
  Received: null

● AuthService › changePassword › should update password and clear mustChangePassword flag
  Volunteer not found

● AuthService › getCurrentUser › should return volunteer with roles and point balance
  Volunteer not found
```

After deleting test.db and rerunning, different errors appeared:
```
DriverAdapterError: SQLITE_ERROR: no such table: main.PasswordReset
```

**Root Causes**: 
1. **Stale test data**: The test database (`backend/test.db`) contained volunteers from previous test runs that weren't properly cleaned up
2. **Incomplete schema**: The test database schema was out of sync with the Prisma schema - missing tables added in recent migrations
3. **Test isolation issues**: Tests were potentially running in parallel and interfering with each other
4. **Inadequate cleanup**: The `afterEach` hook only deleted volunteers, not related data (point balances, child ranks, etc.), causing foreign key constraint issues

**Investigation Steps**:
1. Found existing `backend/test.db` file with stale data
2. Discovered `afterEach` was only calling `prisma.volunteer.deleteMany()`, not clearing related tables
3. After deleting test.db, found migrations had never been run on test database
4. Identified that tests may run in parallel by default in Jest

**Solution**: 
1. **Forced sequential test execution** - Added `"maxWorkers": 1` to Jest config in `backend/package.json`:
   ```json
   "jest": {
     // ... other config
     "testEnvironment": "node",
     "maxWorkers": 1
   }
   ```

2. **Improved test cleanup** - Enhanced `afterEach` in `backend/src/services/auth.service.spec.ts` to delete all related data in proper order:
   ```typescript
   afterEach(async () => {
     // Clean up volunteers and related data created during tests
     // Delete in order to respect foreign key constraints
     await prisma.passwordReset.deleteMany();
     await prisma.notification.deleteMany();
     await prisma.signup.deleteMany();
     await prisma.pointEvent.deleteMany();
     await prisma.badgeTierHistory.deleteMany();
     await prisma.volunteerToRole.deleteMany();
     await prisma.childRank.deleteMany();
     await prisma.volunteerPointBalance.deleteMany();
     await prisma.volunteer.deleteMany();
   });
   ```

3. **Applied database migrations** - Ran migrations on test database:
   ```powershell
   $env:DATABASE_URL = "file:./test.db"
   npx prisma migrate deploy
   ```

**Result**: All 25 tests passed successfully after implementing these fixes.

**Prevention**:
- Run `DATABASE_URL=file:./test.db npx prisma migrate deploy` after any schema changes
- Consider adding a `test:setup` script to package.json that runs migrations automatically
- Always clean up ALL related data in test teardown, not just the primary entity
- Use `maxWorkers: 1` for tests that share a database to prevent race conditions
- Consider using transactions with rollback for test isolation instead of manual cleanup
- Add test database initialization to CI/CD pipeline setup steps
- Document test database setup requirements in TESTING.md

**Alternative Solutions Considered**:
1. **Separate database per test suite**: More isolation but slower and more complex
2. **In-memory SQLite database**: Faster but doesn't catch disk-based issues
3. **Database transactions with rollback**: Cleaner but requires wrapping all tests in transactions

**Key Learning**: 
Test databases require the same migration discipline as development/production databases. Deleting test data is not enough - you must also ensure the schema is up-to-date and that cleanup respects foreign key constraints. When tests share a database, parallel execution can cause race conditions that lead to misleading failures.

**Files Modified**:
- `backend/package.json` - Added `maxWorkers: 1` to Jest config
- `backend/src/services/auth.service.spec.ts` - Enhanced `afterEach` cleanup to delete all related data

---

## 2026-04-05: Test Failure - Prisma Instance Mismatch Between Tests and Services

**Error**: Tests creating data that services couldn't find, causing "Volunteer not found" errors even though the volunteer was successfully created in the test.

**Symptom**: 
```typescript
const volunteer = await createTestVolunteer({ name: 'Test User' });
const profile = await service.getProfile(volunteer.id); // Error: Volunteer not found
```

**Root Cause**: The test utilities (`backend/src/test/test-utils.ts`) were creating their own separate Prisma client instance instead of using the singleton from `backend/src/utils/prisma.ts`:

```typescript
// WRONG: Creates a new Prisma instance
const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL });
export const prisma = new PrismaClient({ adapter });
```

This meant:
- Tests were writing to one database connection
- Services were reading from a different database connection (the singleton)
- Both could technically point to the same file, but different client instances could have different caching behavior
- The singleton wasn't aware of data created by the test's separate instance

**Solution**: 
Changed `backend/src/test/test-utils.ts` to import and re-export the singleton Prisma instance:

```typescript
// CORRECT: Use the singleton instance
import prisma from '../utils/prisma';

// Set test environment variables BEFORE importing
process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:./test.db';
process.env.NODE_ENV = 'test';

// Re-export the singleton for tests to use
export { prisma };
```

**Prevention**:
- Always use a single Prisma client instance per application (singleton pattern)
- Test utilities should import the application's Prisma instance, not create their own
- Set environment variables (DATABASE_URL, NODE_ENV) before the Prisma singleton is created
- In test setup files, set env vars at the top before any imports
- Consider using a test setup file that runs before all tests to configure the environment

**Key Learning**: 
Prisma clients maintain internal state and connection pools. Creating multiple instances that point to the same database can lead to data visibility issues where one instance can't see data created by another. This is especially problematic in tests where you create data with one instance and query it with another.

**Files Modified**:
- `backend/src/test/test-utils.ts` - Changed to import/export singleton instead of creating new instance

---

## 2026-04-08: ZodError Handling - Using error.errors Instead of error.issues

**Error**: `TypeError: Cannot read properties of undefined (reading 'map')` when Zod validation failed in API controllers.

```
[Nest] ERROR [ExceptionsHandler] TypeError: Cannot read properties of undefined (reading 'map')
    at PointsController.getMyPoints (C:\...\backend\src\api\points.controller.ts:71:33)
    at VolunteersController.updateMyProfile (C:\...\backend\src\api\volunteers.controller.ts:90:33)
    at EventsController.listEvents (C:\...\backend\src\api\events.controller.ts:107:33)
```

**Symptoms**:
- API endpoints crashed with 500 errors when receiving invalid input that failed Zod validation
- Tests passed but console showed TypeError exceptions
- Error occurred before the BadRequestException could be thrown
- Issue appeared in all controllers that validated request data with Zod schemas

**Root Cause**: 
Controllers were using `error.errors.map()` to extract validation error messages, but Zod's error object has an `issues` property, not `errors`:

```typescript
// WRONG: ZodError doesn't have 'errors' property
catch (error: any) {
  if (error.name === 'ZodError') {
    throw new BadRequestException({
      error: 'Invalid input',
      details: error.errors.map((e: any) => e.message)  // ❌ error.errors is undefined
    });
  }
}
```

**Why This Happened**:
- Zod's error object structure: `{ name: 'ZodError', issues: [...] }`
- Initial implementation incorrectly assumed property was called `errors`
- TypeScript didn't catch this because `error` was typed as `any`
- Tests passed because they sent valid data and never triggered validation failures
- Only discovered when running e2e tests with invalid query parameters

**Solution**: 
Changed all error handlers to use `error.issues` with optional chaining and fallback:

```typescript
// CORRECT: Use error.issues with safe access
catch (error: any) {
  if (error.name === 'ZodError') {
    throw new BadRequestException({
      error: 'Invalid input',
      details: error.issues?.map((e: any) => e.message) || []  // ✓ Safe access with fallback
    });
  }
}
```

**Affected Controllers**:
- `backend/src/api/points.controller.ts` - 4 instances
- `backend/src/api/volunteers.controller.ts` - 3 instances
- `backend/src/api/events.controller.ts` - 4 instances
- `backend/src/api/config.controller.ts` - 2 instances
- `backend/src/api/auth.controller.ts` - Already correct

**Prevention**:
- Always use `error.issues` for Zod validation errors, never `error.errors`
- Include optional chaining (`?.`) and fallback (`|| []`) for safety
- Type Zod errors properly instead of using `any`: `import { ZodError } from 'zod'`
- Add negative test cases that intentionally trigger validation errors
- Create reusable error handler utility to ensure consistency:
  ```typescript
  function handleZodError(error: any) {
    if (error.name === 'ZodError') {
      return {
        error: 'Validation failed',
        details: error.issues?.map((e: any) => e.message) || []
      };
    }
    return null;
  }
  ```

**Correct Zod Error Structure**:
```typescript
interface ZodError {
  name: 'ZodError';
  issues: Array<{
    code: string;
    path: (string | number)[];
    message: string;
    // ... other properties
  }>;
}
```

**Key Learning**: 
When working with third-party validation libraries, always reference the official documentation for error object structure. Don't assume property names. TypeScript's `any` type bypasses type checking and can hide these errors until runtime. Use proper typing or at least verify the property exists before accessing it.

**Files Modified**:
- `backend/src/api/points.controller.ts` - Fixed 4 ZodError handlers
- `backend/src/api/volunteers.controller.ts` - Fixed 3 ZodError handlers
- `backend/src/api/events.controller.ts` - Fixed 4 ZodError handlers
- `backend/src/api/config.controller.ts` - Fixed 2 ZodError handlers

---

## 2026-04-05: Prisma Query Error - Using findUnique with Non-Unique Fields

**Error**: Prisma validation errors when querying with `deletedAt` filter:
```
Invalid `prisma.volunteer.findUnique()` invocation
Argument `where` of type VolunteerWhereUniqueInput needs exactly one of `id` or `email` arguments.
Multiple arguments were provided, including non-unique fields.
```

**Root Cause**: Using `findUnique()` with additional non-unique filter fields like `deletedAt`:

```typescript
// WRONG: findUnique only accepts unique constraint fields
const volunteer = await prisma.volunteer.findUnique({
  where: { id: volunteerId, deletedAt: null }, // deletedAt is not unique!
});
```

Prisma's `findUnique()` method only accepts fields that are part of a unique constraint (like `@id` or `@unique` fields). You cannot add additional filter conditions in the where clause.

**Solution**: 
Use `findFirst()` instead when you need to filter by both unique and non-unique fields:

```typescript
// CORRECT: findFirst accepts any filter conditions
const volunteer = await prisma.volunteer.findFirst({
  where: { id: volunteerId, deletedAt: null },
});
```

Changed in these methods:
- `VolunteerService.getProfile()`
- `VolunteerService.updateProfile()`
- `VolunteerService.getVolunteerById()`
- `VolunteerService.deleteVolunteer()`

**Why This Matters**:
- `findUnique()` - Optimized for single-record lookup by unique constraint, returns null if not found
- `findFirst()` - Flexible filtering but returns the first matching record, returns null if not found
- Both methods are similar for single-record lookups, but `findFirst()` supports complex where clauses

**Prevention**:
- Use `findUnique({ where: { id } })` or `findUnique({ where: { email } })` only
- Use `findFirst({ where: { ...complexFilters } })` when combining conditions
- When implementing soft deletes (deletedAt pattern), always use `findFirst()` or `findMany()` with `where: { deletedAt: null }`
- Consider creating database views for commonly filtered queries if performance is a concern

**Key Learning**: 
Prisma enforces type safety at the query level. The `where` clause of `findUnique()` is typed to only accept unique constraint fields, while `findFirst()` accepts any filter conditions. This prevents inefficient queries but requires using the right method for your use case.

**Files Modified**:
- `backend/src/services/volunteer.service.ts` - Changed 4 instances of `findUnique` to `findFirst`

---

## 2026-04-05: SQLite Incompatibility - Case-Insensitive Text Search

**Error**: Prisma query error when using case-insensitive search mode:
```
Invalid `prisma.volunteer.count()` invocation
Unknown argument `mode`. Did you mean `lte`? Available options are marked with ?.
```

**Root Cause**: Using Prisma's `mode: 'insensitive'` option for case-insensitive text search, which is only supported by PostgreSQL, MySQL, and MongoDB, but not SQLite:

```typescript
// WRONG: mode is not supported by SQLite
where.OR = [
  { name: { contains: search, mode: 'insensitive' } },
  { email: { contains: search, mode: 'insensitive' } },
];
```

SQLite's string comparison is case-sensitive by default and doesn't support Prisma's `mode` parameter.

**Solution**: 
Remove the `mode` parameter and add a comment documenting the limitation:

```typescript
// CORRECT for SQLite: Case-sensitive search
where.OR = [
  { name: { contains: search } },
  { email: { contains: search } },
];
// Note: SQLite doesn't support mode: 'insensitive'
// For case-insensitive search, use PostgreSQL or add COLLATE NOCASE to schema
```

**Workarounds for Case-Insensitive Search in SQLite**:
1. **Add COLLATE NOCASE to schema** (SQLite-specific):
   ```prisma
   model Volunteer {
     name String @db.Text // Add: COLLATE NOCASE in raw SQL
   }
   ```
2. **Use raw SQL queries** with COLLATE NOCASE:
   ```typescript
   await prisma.$queryRaw`SELECT * FROM Volunteer WHERE name COLLATE NOCASE LIKE ${search}`
   ```
3. **Convert to lowercase at application level**:
   ```typescript
   where.OR = [
     { nameLower: { contains: search.toLowerCase() } }, // Requires separate column
   ]
   ```
4. **Use PostgreSQL for production** (recommended solution)

**Production Consideration**:
The comment added notes: "For case-insensitive search in production, use PostgreSQL". This is important because:
- SQLite is great for development/testing but has feature limitations
- PostgreSQL supports `mode: 'insensitive'` out of the box
- Migration to PostgreSQL requires no code changes if you avoid SQLite-specific workarounds

**Prevention**:
- Check Prisma documentation for database-specific feature support
- Use PostgreSQL in development if you're using it in production
- Test with production database engine before deploying features that use database-specific features
- Document database limitations in code comments
- Use feature flags or environment-based configuration for database-specific queries

**Key Learning**: 
Not all Prisma features are available across all database providers. The `mode: 'insensitive'` parameter for case-insensitive string matching is only supported by PostgreSQL, MySQL, and MongoDB. SQLite requires alternative approaches like COLLATE NOCASE in raw SQL or migrating to a database that supports the feature.

**Files Modified**:
- `backend/src/services/volunteer.service.ts` - Removed `mode: 'insensitive'` and added documentation comment
- `backend/src/services/volunteer.service.spec.ts` - Updated test to use exact case match ('Alice' instead of 'alice')

---

## 2026-04-05: E2E Test Failures - Zod Error Handling Accessing Wrong Property

**Errors**: Multiple e2e test failures with server crashes:
```
[Nest] 43456 - ERROR [ExceptionsHandler] TypeError: Cannot read properties of undefined (reading 'map')
    at AuthController.register (auth.controller.ts:87:33)
```

**Symptoms**:
- Tests for `/api/auth/register`, `/api/auth/refresh`, and `/api/auth/reset-password` were failing with 500 errors
- Backend was crashing when trying to handle Zod validation errors
- Error message showed `error.errors.map()` failing because `error.errors` was undefined
- Tests that should return 400 Bad Request were returning 500 Internal Server Error

**Root Cause**: 
Zod error handling code in `backend/src/api/auth.controller.ts` was accessing the wrong property name. Zod error objects have an `issues` property, not an `errors` property:

```typescript
// WRONG: Zod errors don't have an 'errors' property
catch (error: any) {
  if (error.name === 'ZodError') {
    throw new BadRequestException({
      error: 'Invalid input',
      details: error.errors.map((e: any) => e.message)  // ❌ error.errors is undefined
    });
  }
}
```

**Zod Error Object Structure**:
```typescript
{
  name: 'ZodError',
  issues: [                    // ✓ Correct property name
    { message: '...', path: [...], code: '...' },
    { message: '...', path: [...], code: '...' }
  ]
}
```

**Solution**: 
Changed all Zod error handlers to access `error.issues` with optional chaining for safety:

```typescript
// CORRECT: Access error.issues with fallback
catch (error: any) {
  if (error.name === 'ZodError') {
    throw new BadRequestException({
      error: 'Invalid input',
      details: error.issues?.map((e: any) => e.message) || []  // ✓ Correct
    });
  }
}
```

**Affected Locations**:
All error handlers in `backend/src/api/auth.controller.ts`:
1. Line 87 - POST `/api/auth/register`
2. Line 154 - POST `/api/auth/login`
3. Line 260 - POST `/api/auth/request-reset`
4. Line 301 - POST `/api/auth/reset-password`
5. Line 366 - POST `/api/auth/change-password` (slightly different format but same issue)

**Additional E2E Test Issues Fixed**:
While investigating, discovered and fixed multiple e2e test issues:

1. **Missing cookieParser middleware** - Tests weren't able to read/send cookies:
   ```typescript
   import cookieParser from 'cookie-parser';
   app.use(cookieParser());
   ```

2. **Incorrect status code expectations** - Tests expected wrong HTTP status codes:
   - Validation errors: Changed from 500 to 400 (Bad Request)
   - Refresh token errors: Changed from 500 to 401 (Unauthorized)
   - Password reset: Changed from 200 to 201 (Created)

3. **AuthGuard token location** - Tests sent JWT in Authorization header, but AuthGuard expects cookies:
   ```typescript
   // WRONG:
   .set('Authorization', `Bearer ${token}`)
   
   // CORRECT:
   .set('Cookie', cookies)
   ```

4. **Refresh token endpoint** - Test sent token in body, but endpoint reads from cookies

5. **Password reset token hashing** - `createPasswordResetToken()` helper in `test-utils.ts` was storing unhashed tokens, but the service expects SHA-256 hashed tokens:
   ```typescript
   const token = crypto.randomBytes(32).toString('hex');
   const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
   ```

**Prevention**:
- Always check Zod documentation for the correct property names when handling errors
- Use optional chaining (`?.`) when accessing properties that might not exist
- Provide fallback values (`|| []`) to prevent undefined errors
- Add type definitions for error objects to catch these issues at compile time
- Run e2e tests regularly to catch integration issues early
- Consider creating a reusable Zod error handler utility function

**Key Learning**: 
Third-party library error objects may not follow expected naming conventions. Zod uses `issues` not `errors` for validation failures. Always consult the library documentation and use defensive coding (optional chaining + fallbacks) when accessing error properties. Additionally, e2e tests require matching the exact implementation details (cookies vs headers, status codes) of the production code.

**Files Modified**:
- `backend/src/api/auth.controller.ts` - Changed `error.errors` to `error.issues?.` with fallback in 5 locations
- `backend/src/test/test-utils.ts` - Fixed `createPasswordResetToken()` to hash tokens
- `backend/test/auth.e2e-spec.ts` - Added cookieParser, fixed token sending, updated status codes

---

## 2026-04-08: E2E Test Failures - Foreign Key Constraint Violation in Test Cleanup

**Error**: 
```
Foreign key constraint failed on the constraint: `<constraint_name>`
Error occurred in afterEach() hook at line 40:
  await prisma.volunteer.deleteMany()
```

**Symptoms**:
- Volunteers e2e tests were failing with foreign key constraint violations during cleanup
- Tests that created volunteers and related data (roles, point events) would fail when deleting volunteers
- Error occurred in the `afterEach()` cleanup hook, not in the test itself
- Subsequent tests failed due to dirty database state from previous test failures

**Root Cause**: 
The test cleanup in `afterEach()` was deleting records in the wrong order, violating foreign key constraints. The initial cleanup code was:

```typescript
afterEach(async () => {
  await prisma.volunteerToRole.deleteMany();
  await prisma.childRank.deleteMany();
  await prisma.volunteer.deleteMany();  // ❌ FAILS: Other tables still reference volunteers
});
```

**Why This Fails**:
- The `volunteer` table has foreign key relationships with many other tables
- `pointEvent` table has a `volunteerId` foreign key that references `volunteer.id`
- When role assignments are created, the `PointsService.awardRoleAssignmentPoints()` method creates point events
- Attempting to delete volunteers before deleting point events violates the foreign key constraint
- SQLite (and most databases) enforce referential integrity by default

**Foreign Key Cascade Behavior**:
Some relationships use `onDelete: Cascade` in the Prisma schema, which automatically deletes child records. However:
- Not all relationships use cascade delete (some use `Restrict` or `SetNull`)
- Test cleanup should be explicit and not rely solely on cascade behavior
- Cascade deletes can mask issues in test data cleanup strategies

**Solution**: 
Updated the cleanup order to delete child records before parent records:

```typescript
afterEach(async () => {
  // Delete in order to respect foreign key constraints
  await prisma.pointEvent.deleteMany();       // ✓ Delete child records first
  await prisma.volunteerToRole.deleteMany();
  await prisma.childRank.deleteMany();
  await prisma.volunteer.deleteMany();        // ✓ Delete parent records last
});
```

**Complete Cleanup Order** (for reference):
When cleaning up all test data, the full order should be:
1. Leaf tables (no foreign keys to other tables)
2. Junction tables / relationship tables
3. Tables with foreign keys to core entities
4. Core entity tables (volunteers, events, roles, etc.)

Example from `test-utils.ts`:
```typescript
async function cleanupDatabase() {
  await prisma.passwordReset.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.taskCompletion.deleteMany();
  await prisma.adminTask.deleteMany();
  await prisma.signup.deleteMany();
  await prisma.activitySlot.deleteMany();
  await prisma.event.deleteMany();
  await prisma.pointEvent.deleteMany();           // Before volunteer
  await prisma.badgeTierHistory.deleteMany();
  await prisma.volunteerToRole.deleteMany();
  await prisma.childRank.deleteMany();
  await prisma.volunteer.deleteMany();            // After all child tables
  await prisma.volunteerRole.deleteMany();
  await prisma.activityType.deleteMany();
  await prisma.badgeTier.deleteMany();
  await prisma.packConfig.deleteMany();
}
```

**Prevention**:
- Always delete child records before parent records in test cleanup
- Review Prisma schema to understand foreign key relationships and cascade behavior
- Use a consistent cleanup order across all test files
- Consider creating a shared cleanup utility function
- Run tests with `--verbose` to see which cleanup operations fail
- Document the required cleanup order in test-utils.ts

**Key Learning**: 
Database foreign key constraints must be respected during test cleanup. Delete child records (tables with foreign keys) before parent records (tables being referenced). The cleanup order should mirror the reverse of the creation order. While Prisma cascade deletes can help, explicit cleanup in the correct order is more reliable and makes dependencies visible.

**Files Modified**:
- `backend/test/volunteers.e2e-spec.ts` - Added `prisma.pointEvent.deleteMany()` before deleting volunteers

---

## 2026-04-09: Vitest Mock Hoisting - Cannot Access Variable Before Initialization

**Error**:
```
ReferenceError: Cannot access 'mockResetPassword' before initialization
    at vi.mock factory function (ResetPasswordForm.test.tsx:15)
```

**Symptoms**:
- ResetPasswordForm.test.tsx failing to run
- Tests crash immediately on load, before any test execution
- Error occurs in the vi.mock() factory function
- Mock variable declared with `const mockResetPassword = vi.fn()` is undefined inside factory

**Root Cause**: 
Vitest hoists `vi.mock()` calls to the top of the file during module transformation, but variables declared below the mock cannot be accessed in the factory function:

```typescript
// WRONG: mockResetPassword is not available in hoisted factory
const mockResetPassword = vi.fn().mockResolvedValue({ success: true });

vi.mock('@/services/authService', () => ({
  authService: {
    resetPassword: mockResetPassword,  // ❌ ReferenceError: not initialized
  },
}));
```

**Why This Happens**:
- Vitest hoists `vi.mock()` calls before any other code runs (similar to import hoisting)
- Variables declared with `const` or `let` are not hoisted, only their declarations
- The factory function executes during hoisting, before `mockResetPassword` is initialized
- This is a JavaScript temporal dead zone (TDZ) issue with hoisted code

**Solution 1: Declare Mock Before vi.mock()**
Move the mock variable declaration before the `vi.mock()` call:

```typescript
// CORRECT: Declare mock at the very top of the file
const mockResetPassword = vi.fn().mockResolvedValue({ success: true });

vi.mock('@/services/authService', () => ({
  authService: {
    resetPassword: mockResetPassword,  // ✓ Now accessible
  },
}));
```

**Solution 2: Use Getter Pattern (Preferred)**
Use a getter function in the mock factory to access the variable lazily:

```typescript
// CORRECT: Getter accesses variable at runtime, not during hoisting
const mockResetPassword = vi.fn().mockResolvedValue({ success: true });

vi.mock('@/services/authService', () => ({
  authService: {
    get resetPassword() {  // ✓ Getter evaluated at runtime
      return mockResetPassword;
    },
  },
}));
```

**Why Getter Pattern is Better**:
- Accessing the mock variable happens at test runtime, not during module initialization
- More flexible - allows reassigning the mock between tests
- Clearer intent - shows this is a dynamic reference
- Avoids hoisting issues entirely

**Solution 3: Factory Function Pattern**
For complex mocks, return a factory function that creates the mock object:

```typescript
const createMockAuthService = () => ({
  resetPassword: vi.fn().mockResolvedValue({ success: true }),
});

vi.mock('@/services/authService', () => ({
  authService: createMockAuthService(),
}));
```

**Prevention**:
- Always declare mock functions before `vi.mock()` calls
- Use getter pattern (`get property() { return mock; }`) when mocks need to be reassigned
- Group all mock declarations at the top of test files
- Consider creating test utilities that encapsulate common mocking patterns
- Review Vitest hoisting documentation when writing new mocks

**Key Learning**: 
Vitest hoists `vi.mock()` calls before executing any other code in the file. Variables declared after the mock call are not accessible in the factory function due to JavaScript's temporal dead zone. Use the getter pattern to access mock variables lazily at runtime instead of during module initialization.

**Files Modified**:
- `frontend/src/components/forms/auth/ResetPasswordForm.test.tsx` - Changed mock factory to use getter pattern

---

## 2026-04-09: React Testing Library - Form Validation Errors Not in DOM

**Symptoms**:
- RegisterForm component validates input correctly and prevents submission
- Tests expecting validation error messages to appear in DOM were failing
- `expect(screen.queryByText('Password must be...')).toBeInTheDocument()` returns null
- Form blocks submission when invalid, but no visible error messages rendered

**Investigation**:
Initial test approach tried to verify error message display:

```typescript
// WRONG: Assumes form shows inline error messages
await user.type(passwordInput, 'weak');
await user.click(submitButton);

// Looking for error text in DOM
expect(screen.queryByText(/password must be at least 8 characters/i)).toBeInTheDocument();
// ❌ FAILS: Error message not found
```

**Root Cause**: 
The RegisterForm component uses HTML5 validation attributes (`required`, `pattern`, `minLength`) rather than displaying custom error messages in the DOM:

```typescript
<input
  required
  minLength={8}
  pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+"
  {...}
/>
```

When validation fails:
- The browser's built-in validation prevents form submission
- Error messages appear as browser tooltips (not in DOM)
- React Testing Library's jsdom environment doesn't render browser tooltips
- No custom React error messages are rendered to the DOM

**Solution**: 
Test the observable behavior (form submission blocking) rather than implementation details (error message text):

```typescript
// CORRECT: Test that form blocks submission when invalid
const passwordInput = screen.getByLabelText(/password/i);
const submitButton = screen.getByRole('button', { name: /register/i });

// Enter invalid password
await user.type(passwordInput, 'weak');
await user.click(submitButton);

// Verify form did NOT submit (register was not called)
expect(mockRegister).not.toHaveBeenCalled();

// Enter valid password
await user.clear(passwordInput);
await user.type(passwordInput, 'ValidPass123!');
await user.click(submitButton);

// Verify form DID submit
expect(mockRegister).toHaveBeenCalledWith({
  password: 'ValidPass123!',
  ...
});
```

**Why This is Better Testing**:
- Tests actual user experience: "Can I submit with invalid data?"
- More resilient to implementation changes (HTML5 vs React validation)
- Tests behavior, not implementation details
- Validates the business requirement: prevent invalid submissions

**Alternative Approaches**:

1. **If using a UI library with custom validation**:
   ```typescript
   // Some UI libraries render errors to DOM
   expect(screen.getByText('Password too weak')).toBeInTheDocument();
   ```

2. **If adding custom validation messages**:
   ```typescript
   const [errors, setErrors] = useState({});
   
   // Render errors below inputs
   {errors.password && <span role="alert">{errors.password}</span>}
   
   // Test can then find by role
   expect(screen.getByRole('alert')).toHaveTextContent('Password too weak');
   ```

3. **Testing HTML5 validity**:
   ```typescript
   const passwordInput = screen.getByLabelText(/password/i);
   expect(passwordInput.validity.valid).toBe(false);
   ```

**Prevention**:
- Understand component's validation strategy before writing tests
- Test observable behavior over implementation details
- Check if error messages are actually rendered to DOM
- Consider using a UI library that renders validation feedback to DOM
- Document validation approach in component comments

**Key Learning**: 
HTML5 form validation triggers browser-native error messages (tooltips) that are not rendered to the DOM and cannot be queried with React Testing Library. Test the actual behavior (submission blocking) rather than assuming error messages will appear in the DOM. This makes tests more resilient and focused on user experience.

**Files Modified**:
- `frontend/src/components/forms/auth/RegisterForm.test.tsx` - Changed validation tests to check submission blocking rather than error message text

---

## 2026-04-09: Vitest Mock Cleanup - Test Timeouts After mockReset()

**Error**:
```
Error: Test timed out in 5000ms.
If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".

  ❯ Timeout._onTimeout node_modules/vitest/dist/chunks/utils.UcoRDj0Z.js:2152:18
```

**Symptoms**:
- ResetPasswordForm.test.tsx had 7 tests timing out after 5 seconds
- Tests were hanging on `waitFor()` assertions
- Problem appeared after adding `mockResetPassword.mockReset()` in `afterEach()`
- First test in each block passed, but subsequent tests timed out
- Timeout occurred when waiting for success/error state changes

**Root Cause**: 
Using `mockReset()` in `afterEach()` removed all mock implementations, including the default return value. Subsequent tests called the mock which returned `undefined`, creating unhandled promise rejections:

```typescript
// WRONG: mockReset() removes all behavior
beforeEach(() => {
  mockResetPassword.mockResolvedValue({ success: true });
});

afterEach(() => {
  mockResetPassword.mockReset();  // ❌ Removes the default implementation
});

it('test 2', async () => {
  await user.click(submitButton);
  // mockResetPassword returns undefined (no longer mocked)
  // Promise never resolves, test times out
  await waitFor(() => {
    expect(screen.getByText(/success/i)).toBeInTheDocument();
  });
});
```

**Mock Lifecycle Methods**:

1. **mockReset()**: 
   - Clears call history and arguments
   - **Removes all mock implementations** (mockResolvedValue, mockImplementation)
   - Returns mock to unimplemented state (returns undefined)
   - Use when you need a completely clean slate

2. **mockClear()**: 
   - Clears call history and arguments
   - **Keeps mock implementations** (mockResolvedValue, mockImplementation)
   - Use for most test cleanup between tests

3. **mockRestore()**: 
   - Removes the mock entirely, restoring original implementation
   - Only works with `vi.spyOn()`
   - Use when testing real implementation after mocking

**Solution**: 
Use `mockClear()` instead of `mockReset()`, and set default mock behavior in setup:

```typescript
// CORRECT: Clear history but keep implementation
const mockResetPassword = vi.fn();

beforeEach(() => {
  // Set default behavior for all tests
  mockResetPassword.mockResolvedValue({ success: true });
});

afterEach(() => {
  // Clear call history but keep mockResolvedValue
  mockResetPassword.mockClear();  // ✓ Keeps implementation
  cleanup();
});

it('test 1', async () => {
  await user.click(submitButton);
  expect(mockResetPassword).toHaveBeenCalledWith({...});
});

it('test 2 - custom error', async () => {
  // Override for this specific test
  mockResetPassword.mockResolvedValueOnce({ 
    success: false, 
    error: 'Invalid token' 
  });
  
  await user.click(submitButton);
  await waitFor(() => {
    expect(screen.getByText(/invalid token/i)).toBeInTheDocument();
  });
});
```

**Alternative Pattern - Reset in beforeEach**:
If you must use `mockReset()`, re-establish behavior immediately after:

```typescript
beforeEach(() => {
  mockResetPassword.mockReset();  // Clear everything
  mockResetPassword.mockResolvedValue({ success: true });  // Re-establish default
});
```

**When to Use Each**:

| Method | Call History | Arguments | Implementation | Use When |
|--------|-------------|-----------|----------------|----------|
| `mockClear()` | ✓ Clears | ✓ Clears | ✗ Keeps | Standard cleanup between tests |
| `mockReset()` | ✓ Clears | ✓ Clears | ✓ Removes | Need completely fresh mock |
| `mockRestore()` | ✓ Clears | ✓ Clears | ✓ Restores original | Testing real implementation |

**Prevention**:
- Use `mockClear()` for standard cleanup between tests
- Set default mock behavior in `beforeEach()`
- Override with `mockResolvedValueOnce()` for test-specific behavior
- Only use `mockReset()` when you need to remove implementations
- Always ensure mocks return valid values (avoid undefined promises)
- Check mock configuration if tests timeout on promise assertions

**Key Learning**: 
`mockReset()` completely removes mock implementations, causing subsequent tests to call functions that return `undefined`. This creates unhandled promises that never resolve, leading to test timeouts. Use `mockClear()` to clean call history between tests while preserving mock behavior, and establish default mock implementations in `beforeEach()`.

**Files Modified**:
- `frontend/src/components/forms/auth/ResetPasswordForm.test.tsx` - Changed `mockReset()` to `mockClear()` and moved default mock setup to `beforeEach()`

---

## 2026-04-09: Vitest Fake Timers - Conflicts with Async User Interactions

**Error**:
```
Error: Test timed out in 5000ms.

  ❯ src/components/forms/auth/ResetPasswordForm.test.tsx:389:5
    387|   });
    388| 
    389|   it('should show "Request a new reset link" after timeout', async () => {
```

**Symptoms**:
- Test for password reset timeout expiration was hanging
- Used `vi.useFakeTimers()` to speed up 15-minute timer test
- `await user.type()` calls never completed
- Test timeout occurred before timer could be advanced
- Code flow: user interaction → start timer → advance time → verify UI update

**Root Cause**: 
`vi.useFakeTimers()` interferes with async operations in `@testing-library/user-event`. The `user.type()` and `user.click()` methods use internal timers for realistic interaction delays, and fake timers prevent these from resolving:

```typescript
// WRONG: Fake timers block user-event operations
it('should show message after timeout', async () => {
  vi.useFakeTimers();
  
  await user.type(emailInput, 'test@example.com');  // ❌ Hangs - internal delays frozen
  await user.click(sendCodeButton);  // Never reached
  
  vi.advanceTimersByTime(15 * 60 * 1000);  // Advance 15 minutes
  
  await waitFor(() => {
    expect(screen.getByText(/request a new reset link/i)).toBeInTheDocument();
  });
});
```

**Why This Happens**:
- `user-event` uses `setTimeout` internally to simulate realistic typing/clicking delays
- `vi.useFakeTimers()` mocks all timer functions (setTimeout, setInterval, Date)
- `user.type()` calls setTimeout but fake timers freeze it
- `await` never resolves because the frozen timer never fires
- Test times out waiting for user interaction to complete

**Solutions**:

**1. Disable user-event Delays (Quick Fix)**:
```typescript
it('should show message after timeout', async () => {
  vi.useFakeTimers();
  const user = userEvent.setup({ delay: null });  // ✓ Disable interaction delays
  
  await user.type(emailInput, 'test@example.com');  // Works instantly
  await user.click(sendCodeButton);
  
  vi.advanceTimersByTime(15 * 60 * 1000);
  
  await vi.runOnlyPendingTimersAsync();  // Process component timers
  
  await waitFor(() => {
    expect(screen.getByText(/request a new reset link/i)).toBeInTheDocument();
  });
  
  vi.useRealTimers();
});
```

**2. Use Real Timers with Extended Timeout (Simpler)**:
```typescript
// BETTER: No fake timers, just wait longer
it('should show message after timeout', async () => {
  const user = userEvent.setup();
  
  await user.type(emailInput, 'test@example.com');
  await user.click(sendCodeButton);
  
  // Wait for actual timer (15 min in production, could mock shorter in code)
  await waitFor(
    () => {
      expect(screen.getByText(/request a new reset link/i)).toBeInTheDocument();
    },
    { timeout: 3000 }  // ✓ Extended timeout for real timer
  );
}, 10000);  // Set test timeout to 10 seconds
```

**3. Mock Timer Duration in Component (Best)**:
Change the component to use a configurable timeout:

```typescript
// In component:
export function ResetPasswordForm({ timeoutDuration = 15 * 60 * 1000 }: Props) {
  useEffect(() => {
    const timer = setTimeout(() => {
      setTimedOut(true);
    }, timeoutDuration);  // ✓ Configurable
    
    return () => clearTimeout(timer);
  }, [timeoutDuration]);
}

// In test:
render(<ResetPasswordForm timeoutDuration={100} />);  // 100ms for testing

await waitFor(() => {
  expect(screen.getByText(/request a new reset link/i)).toBeInTheDocument();
}, { timeout: 1000 });
```

**When to Use Fake Timers**:
- Simple setTimeout/setInterval without user interaction
- Testing debounce/throttle functions
- Discrete time-based state changes
- No complex async operations involved

**When to Avoid Fake Timers**:
- Tests with user-event interactions (typing, clicking)
- Complex async flows (API calls + timers)
- Multiple interleaved timers
- When real timer waits are acceptable

**Prevention**:
- Prefer real timers with extended `waitFor` timeouts for simple cases
- Use `{ delay: null }` with userEvent.setup() when using fake timers
- Make timer durations configurable props for easier testing
- Call `vi.useRealTimers()` in afterEach to prevent leaking into other tests
- Document timer behavior in component comments

**Key Learning**: 
Vitest fake timers (`vi.useFakeTimers()`) freeze all timer APIs including internal delays in `@testing-library/user-event`, causing user interactions to hang. For tests involving both timers and user interactions, either disable user-event delays with `{ delay: null }` or avoid fake timers entirely by using real timers with extended waitFor timeouts. Making timer durations configurable props is the cleanest solution.

**Files Modified**:
- `frontend/src/components/forms/auth/ResetPasswordForm.test.tsx` - Replaced fake timer test with real timer and extended waitFor timeout
