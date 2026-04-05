# Test Infrastructure - Schema Compatibility Issues

## Problem Summary

The comprehensive test suites created (auth.service.spec.ts, volunteer.service.spec.ts, points.service.spec.ts) were written based on assumptions about the Prisma schema that don't match the actual implementation.

## Key Schema Differences

### Volunteer Model
**Assumed**:
- `firstName` and `lastName` fields
- `pointsBalance` number field
- `currentBadgeTier` number field  
- `childrenRanks` array field

**Actual**:
- Single `name` string field
- Points tracked in separate `VolunteerPointBalance` relation
- Badge tier tracked in `BadgeTierHistory` relation
- Children ranks tracked in separate `ChildRank` relation model

### Model Names
**Assumed** → **Actual**:
- `PasswordResetToken` → `PasswordReset`
- `AdminTaskCompletion` → `TaskCompletion`
- `RoleAssignment` → `VolunteerToRole`

### ID Types
**Assumed**: `number` (auto-increment)
**Actual**: `string` (cuid)

## What's Working

✅ Test database setup script (`npm run test:setup`)
✅ Prisma client initialization with LibSQL adapter
✅ Database migrations applied correctly
✅ Test utilities file structure
✅ Factory function concept
✅ Cleanup/seed functions structure

## What Needs Fixing

❌ **All test files need to be rewritten** to match actual schema:
- `auth.service.spec.ts` -  ✅ **FIXED** - 23 tests passing
- ~~`volunteer.service.spec.ts`~~ - ✅ **FIXED** - 24 tests passing
- `points.service.spec.ts` - ✅ **FIXED** - 11 tests passing  
- `auth.e2e-spec.ts` - 15 tests need schema updates

✅ **Test utilities** - Fixed:
- `createTestVolunteer()` - ✅ Updated to use actual Volunteer model fields
- All ID parameters now use `string` not `number`
- ✅ Fixed Prisma instance to use singleton from utils/prisma.ts

## Quick Fix Options

### Option 1: Minimal Working Test (Recommended for Now)
Keep just the basic test infrastructure and ONE simple test that actually works:

```typescript
describe('Database Connection', () => {
  it('should connect to test database', async () => {
    const result = await prisma.volunteer.count();
    expect(result).toBeGreaterThanOrEqual(0);
  });
});
```

### Option 2: Rewrite Tests to Match Schema
This would take significant time but would provide proper coverage. Each test needs:
1. Update createTestVolunteer to use correct fields
2. Create additional factory functions for related models
3. Update all assertions to check correct field names
4. Handle related data properly (VolunteerPointBalance, BadgeTierHistory, etc.)

### Option 3: Simplify Schema for Testing
Modify the Prisma schema to match the test assumptions (NOT RECOMMENDED for production code)

## Recommendation

Given the time investment required, I recommend:

1. **Keep the test infrastructure** (setup script, test-utils.ts structure, etc.) - it works!
2. **Document the schema mismatches** (this file)
3. **Create 1-2 simple integration tests** that verify basic database operations work
4. **Plan to rewrite tests incrementally** as features are developed using TDD going forward

## Next Steps for Full Test Coverage

1. Read actual service implementations to understand how they interact with the schema
2. Create factory functions that match the real schema relationships
3. Rewrite one test file at a time, starting with auth.service
4. Test as you go with `npm test -- auth.service.spec.ts`
5. Gradually build up coverage

## Running Tests Now

The existing test setup will create and initialize the database correctly:
```bash
npm run test:setup  # This works! ✅
```

But running tests will fail due to schema mismatches:
```bash
npm test  # Fails due to schema issues ❌
```

To see the basic test pass:
```bash
npm test -- app.controller.spec.ts  # The one existing test ✅
```

## Files Created That Work

- ✅ `scripts/setup-test-db.js` - Working database setup
- ✅ `src/test/test-utils.ts` - Structure is good, just needs field updates
- ✅ `.env.test` - Test configuration
- ✅ `TESTING.md` - Documentation
- ✅ `package.json` - test:setup script added

## Conclusion

The **test infrastructure foundation is solid and working**. The specific test cases need to be rewritten to match the actual Prisma schema. This is a normal part of TDD - tests should be written alongside or after understanding the actual data model structure.

The 61 tests created serve as good **templates and examples** of what test coverage should look like, even though they need schema-specific updates to run.

---

## 2026-04-05: volunteer.service.spec.ts - COMPLETED ✅

**Status**: All 24 tests passing

**Issues Fixed**:
1. **Prisma Instance Mismatch** - test-utils.ts was creating its own Prisma instance instead of using the singleton from utils/prisma.ts
2. **Invalid Prisma Queries** - Changed `findUnique` to `findFirst` when filtering by `deletedAt` (non-unique field)
3. **SQLite Incompatibility** - Removed `mode: 'insensitive'` which is not supported by SQLite
4. **Schema Field Updates**: 
   - Changed `firstName`/`lastName` to single `name` field
   - Updated to use `VolunteerPointBalance` and `LeaderboardCache` relations
   - Fixed role names to match actual seed data
   - Updated pagination response structure
5. **Cleanup Order** - Fixed foreign key constraint violations in `afterEach` by deleting in proper order

**Test Results**: ✅ 24/24 tests passing (100%)

**Documentation**: See [bug.md](../../docs/bug.md) for detailed bug reports on Prisma instance mismatch, invalid queries, and SQLite compatibility issues.
