# Implementation Plan: Calendar Subscription Feed Export

**Branch**: `011-calendar-feed-export` | **Date**: 2026-06-19 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/011-calendar-feed-export/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Add scoped iCalendar subscription support so each user can copy one pack feed link and separate per-den feed links for Google Calendar "From URL" subscriptions. The implementation will add secure per-scope feed tokens, a public tokenized ICS endpoint, authenticated feed-management endpoints, and profile UI for copy/regenerate actions. Feed updates are pull-based (provider refresh cadence), with immediate token invalidation on den access loss and full scope revocation when a user leaves the pack.

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 20.x runtime, NestJS 11 backend, Next.js/React frontend)  
**Primary Dependencies**: NestJS, Prisma ORM, Zod validation, ical-generator (new), jsonwebtoken/cookie auth stack  
**Storage**: Prisma-managed relational DB (SQLite in development, production relational deployment)  
**Testing**: Jest unit/integration/e2e in backend, contract tests for new API surface, frontend integration tests where UI is updated  
**Target Platform**: Web application with backend API consumed by browser clients and external calendar providers
**Project Type**: Full-stack web application feature extension (backend + frontend)  
**Performance Goals**: Feed endpoint p95 < 300ms for typical pack datasets; deterministic response generation for repeated provider pulls; no user action required after initial subscribe  
**Constraints**: Public ICS endpoint must be unauthenticated but token-obfuscated; strict scope isolation; immediate revocation on access loss; den naming excludes rank labels; provider-controlled sync cadence  
**Scale/Scope**: Pack-scale deployment (~50-150 families, ~100-500 active events/year); 1 new public endpoint, 2 authenticated management endpoints, profile UI additions, and token lifecycle automation

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Behavior-Driven Development (BDD First)

**Status**: PASS

- Specification includes independently testable user stories with Given-When-Then scenarios.
- Planning defines contract tests for the public ICS endpoint and authenticated management endpoints before implementation.
- Token lifecycle and revocation rules are explicitly testable via service and integration/e2e tests.

### II. Clean and Well-Documented Code

**Status**: PASS

- Design isolates responsibilities into token lifecycle service, event projection service, and API controller layers.
- Public API behavior is documented in an OpenAPI contract.
- Quickstart and research artifacts document operational behavior (pull sync, delay expectations) and rationale.

### III. DRY (Don't Repeat Yourself)

**Status**: PASS

- Feed scope resolution reuses existing event scope and den visibility rules instead of introducing parallel authorization paths.
- Token security implementation follows existing hashed-token pattern used elsewhere in backend.
- Contract and data-model artifacts define single sources of truth for endpoint payloads and entity semantics.

### Gate Result (Pre-Phase 0)

**PASS** - No constitutional violations requiring justification.

### Gate Re-check (Post-Phase 1 Design)

**PASS**

- Phase 0 research resolved all technical unknowns and selected stable patterns.
- Phase 1 artifacts completed: [research.md](research.md), [data-model.md](data-model.md), [contracts/calendar-feed.openapi.yaml](contracts/calendar-feed.openapi.yaml), [quickstart.md](quickstart.md).
- No design decisions conflict with BDD-first, documentation, or DRY principles.

## Project Structure

### Documentation (this feature)

```text
specs/011-calendar-feed-export/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── calendar-feed.openapi.yaml
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── api/
│   │   └── calendar-feed.controller.ts             # New public/auth feed endpoints
│   ├── services/
│   │   ├── calendar-feed.service.ts                # ICS generation and scope filtering
│   │   └── calendar-feed-token.service.ts          # Token issue/regenerate/revoke rules
│   ├── modules/
│   │   └── calendar-feed.module.ts                 # Nest module wiring
│   └── models/
│       └── calendar-feed/                          # DTOs and request validation schemas
├── prisma/
│   ├── schema.prisma                               # Calendar feed token model + enums
│   └── migrations/
└── test/
  ├── calendar-feed.e2e-spec.ts                  # Endpoint behavior and scope isolation
  └── calendar-feed-revocation.e2e-spec.ts       # Access loss and pack exit invalidation

frontend/
├── src/
│   ├── app/
│   │   └── profile/page.tsx                        # Calendar link management section
│   ├── components/
│   │   └── profile/CalendarFeedLinksCard.tsx       # Copy/regenerate UI
│   └── services/
│       └── calendarFeed.service.ts                 # API client for feed management
└── src/test/
  └── components/profile/CalendarFeedLinksCard.test.tsx
```

**Structure Decision**: Use the existing full-stack web app structure (backend + frontend) and extend current NestJS module/controller/service patterns plus profile page UI. No new top-level projects are introduced.

## Complexity Tracking

No constitutional violations identified; complexity exceptions are not required for this feature.
