# Bug Documentation Skill

**Purpose**: Document bugs and their resolutions in a structured format for future reference and knowledge sharing.

## When to Use

Document bugs when:
- Encountering runtime errors or build failures
- Discovering circular dependencies or module conflicts
- Fixing TypeScript compilation errors
- Resolving configuration issues
- Addressing integration or deployment problems

## Documentation Format

All bugs should be documented in `docs/bug.md` using this structure:

```markdown
## YYYY-MM-DD: [Concise Bug Title]

**Error**: [Exact error message or symptom]

**Root Cause**: [Brief explanation of what caused the issue]

**Solution**: 
- [Step 1: What was changed]
- [Step 2: What was changed]
- [Additional context if needed]

**Files Modified**:
- `path/to/file1`
- `path/to/file2`
```

## Documentation Process

1. **Record the error**: Include the exact error message or clear description of the symptom
2. **Identify root cause**: Explain WHY the bug occurred (not just WHAT happened)
3. **Document solution**: List specific changes made, in order
4. **List affected files**: Include relative paths from repo root
5. **Date entry**: Use ISO format (YYYY-MM-DD) matching current date
6. **Prepend to file**: Add new bugs at the top after the header

## Best Practices

✅ **Do**:
- Be concise but complete
- Use technical language appropriate for developers
- Include file paths for all modifications
- Explain the root cause, not just symptoms
- Record fixes immediately after resolution

❌ **Don't**:
- Include full stack traces (error message is sufficient)
- Write in first person ("I fixed", "we changed")
- Over-explain obvious changes
- Skip the root cause analysis
- Forget to date the entry

## Example

```markdown
## 2026-04-02: NestJS Module Circular Dependency Error

**Error**: `TypeError: metatype is not a constructor` when running `npm run start:dev` in backend.

**Root Cause**: PointsService was provided in both VolunteersModule and PointsModule, creating a duplicate provider conflict that NestJS couldn't resolve.

**Solution**: 
- Removed PointsService from VolunteersModule providers array
- Added PointsModule to VolunteersModule imports
- Reordered app.module.ts imports so PointsModule loads before VolunteersModule
- PointsService now only provided by PointsModule and accessed via module import

**Files Modified**:
- `backend/src/modules/volunteers.module.ts`
- `backend/src/modules/app.module.ts`
```

## Integration with Development Workflow

- Document bugs AFTER fixing them (not before)
- Review `docs/bug.md` when encountering similar errors
- Reference bug entries in commit messages if applicable
- Keep bug log in version control for team visibility

## File Location

**Bug Log**: `docs/bug.md`

This file should be created if it doesn't exist, with a "# Bug Tracking" header at the top.
