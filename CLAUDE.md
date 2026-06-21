# Cub Scouts Volunteer Webapp

Monorepo: `backend/` (NestJS) + `frontend/` (Next.js App Router).

## Running

```
cd backend && npm run start:dev   # http://localhost:3000
cd frontend && npm run dev        # http://localhost:3001 (or next available)
```

Tests: `npm test` in either directory. Frontend uses Vitest, backend uses Jest.

## Stack

| Layer | Tech |
|-------|------|
| Backend | NestJS, TypeScript, Prisma 7 + libSQL adapter (SQLite) |
| Frontend | Next.js 14 App Router, TypeScript, Tailwind, shadcn/ui |
| Auth | JWT in HttpOnly cookies, bcrypt passwords |
| DB | SQLite via `backend/prisma/schema.prisma` |

## Key Patterns

**Prisma** — singleton imported directly, never injected via NestJS DI:
```ts
import prisma from '../../utils/prisma';
```
No Prisma middleware (removed in Prisma 7). Soft-delete logic lives in service layer — always filter `deletedAt: null` on queries.

**Auth guards** — two decorators always used together:
```ts
@UseGuards(TierGuard)
@RequireTier(AuthTier.ADMIN)   // or LEADER, DEN_CHIEF
```
`AuthGuard` (applied at controller level) validates JWT and populates `req.user`. `TierGuard` + `@RequireTier` enforces minimum tier. Tier hierarchy: `PARENT < LEADER < DEN_CHIEF < ADMIN`.

**Adding a feature** — follow the module pattern:
1. Create service in `backend/src/services/<domain>/`
2. Create controller in `backend/src/api/`
3. Register both in `backend/src/modules/<domain>.module.ts`
4. Import module in `app.module.ts` if new

**CSV bulk import pattern** — see `import-batch.service.ts` as the canonical example:
- Create `ImportBatch` (PROCESSING), loop rows, catch per-row errors into `ImportError`, update batch status at end
- Shared CSV parser: `import { parseCsv } from '../../utils/csv-parser'`
- Controller uses `@UseInterceptors(FileInterceptor('file'))`, returns HTTP 202
- Frontend polls `GET /imports/:batchId` for results

**Frontend API calls** — axios instance at `frontend/src/lib/axios.ts`, cookies sent automatically. Services live in `frontend/src/services/`.

**Frontend auth** — `useRequireTier('ADMIN')` hook from `@/lib/auth-context` gates pages.

## Data Model Highlights

```
Volunteer         authTier: PARENT | LEADER | DEN_CHIEF | ADMIN
  └── VolunteerToRole (roleId, denId, denNumber) — den scoping for LEADER tier
  └── ParentChildLink (childScoutId, status: PENDING|APPROVED|REJECTED|REVOKED)

ChildScout        currentRank: LION|TIGER|WOLF|BEAR|WEBELOS|AOL
  └── DenMembership (denId, validFrom, validTo — null = current)
  └── RequirementProgress (requirementId, completedAt, scoutbookStatus)
  └── AwardItem (adventureId, currentState: ELIGIBLE→APPROVED→PURCHASED→DISTRIBUTED→RECONCILED)

Rank → Adventure (REQUIRED|ELECTIVE|SPECIAL_ELECTIVE) → Requirement
  Adventure unique key: rankId + name + catalogYear
  Requirement unique key: adventureId + displayOrder

PasswordReset     token stored as SHA-256 hash, 1hr expiry (72hr for import invites)
ImportBatch       status: PROCESSING|COMPLETED|COMPLETED_WITH_ERRORS|FAILED
  └── ImportError (rowNumber, errorMessage, rowData JSON)
```

**Den scoping for leaders**: a LEADER volunteer without any `VolunteerToRole` records has pack-wide access. A `VolunteerToRole` with a `denId` restricts them to that den. Den-scoped `roleType` values: `DEN_LEADER`, `ASSISTANT_DEN_LEADER`, `LION_GUIDE`.

## Gotchas

- `mustChangePassword: true` is set on volunteer accounts created via import; users must change on first login
- Den leader role assignment during import requires a pre-existing `VolunteerRole` record with matching `grantsTier` + den-scoped `roleType` — if none exists, `authTier` is still set correctly but no `VolunteerToRole` is created
- `ParentChildLink` has a unique constraint on `(parentId, childScoutId, status)` — the import handles existing PENDING links by approving them
- Adventure import does not touch `SpecialAward` records
