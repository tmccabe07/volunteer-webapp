# Bug Documentation Skill

**Purpose**: Document bugs and their resolutions in a structured format for future reference and knowledge sharing.

## When to Use

Document bugs when:
- Encountering runtime errors or build failures
- Discovering circular dependencies or module conflicts
- Fixing TypeScript compilation errors
- Resolving configuration issues
- Addressing integration or deployment problems

## Two-File System

Bugs are documented in TWO locations to optimize for both context efficiency and detailed reference:

1. **`/memories/bugs.md`** - Condensed lessons (auto-loaded in agent context)
   - Key pattern and one-line prevention strategy per bug
   - Organized by category (Prisma, NestJS, Testing, etc.)
   - 5-8 lines per bug instead of 65+
   - Always in context, minimal token usage

2. **`docs/bug.md`** - Complete historical archive
   - Full error messages and investigation steps
   - Detailed solution with code examples
   - Root cause analysis
   - Files modified

## Documentation Format for docs/bug.md

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

1. **Record in docs/bug.md** (detailed archive):
   - Include the exact error message or clear description of the symptom
   - Explain WHY the bug occurred (not just WHAT happened)
   - List specific changes made, in order
   - Include relative paths from repo root
   - Use ISO format (YYYY-MM-DD) matching current date
   - Prepend new bugs at the top after the header

2. **Update /memories/bugs.md** (condensed lessons):
   - Extract the key pattern/mistake
   - Write one-line prevention strategy
   - Add to appropriate category section
   - Keep it brief: 2-3 lines maximum per bug
   - Use technical shorthand for patterns

## Format for /memories/bugs.md

Add condensed entries under the appropriate category heading:

```markdown
## [Category Name]

**[Bug Title - Short]**: [One-line pattern description]. [One-line prevention strategy].
```

Example:
```markdown
## Prisma / Database

**req.user.id undefined**: Always import JWTPayload type from auth middleware instead of redefining interfaces. Use `req.user.userId` not `req.user.id`.
```

## Best Practices

✅ **Do**:
- Update BOTH files for every bug (detailed + condensed)
- Be concise but complete in docs/bug.md
- Be ultra-concise in /memories/bugs.md (2-3 lines max)
- Use technical language appropriate for developers
- Include file paths in detailed archive (docs/bug.md)
- Explain the root cause, not just symptoms
- Record fixes immediately after resolution
- Group similar bugs by category in memory file

❌ **Don't**:
- Include full stack traces in either file (error message sufficient)
- Write in first person ("I fixed", "we changed")
- Over-explain obvious changes
- Skip the root cause analysis
- Forget to date entries in docs/bug.md
- Let /memories/bugs.md exceed ~200 lines (condense further if needed)
- Duplicate verbose details in memory - reference docs/bug.md instead

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
- Update both files for each bug: detailed archive + condensed memory
- Agent automatically has /memories/bugs.md in context (first 200 lines)
- Read docs/bug.md when deeper investigation needed
- Reference bug entries in commit messages if applicable
- Keep bug log in version control for team visibility

## File Locations

**Condensed Memory**: `/memories/bugs.md`
- Auto-loaded into agent context (first 200 lines)
- Quick reference for patterns and prevention
- Should be readable in under 1 minute

**Detailed Archive**: `docs/bug.md`
- Complete historical record with full details
- Reference when encountering similar errors
- Investigation steps and code examples

Both files should be created if they don't exist, with appropriate headers.
