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