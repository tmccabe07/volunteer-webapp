# Implementation Plan: Den Advancement Operations Workspace

**Branch**: `010-plan-md-spec` | **Date**: 2026-05-22 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/010-plan-md-spec/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

This feature adds comprehensive den advancement operations to the volunteer management system, including:
- Den-scoped event creation and Cub Scout attendance tracking (separate from volunteer signups)
- Den management with support for mid-year den splits and consolidation (preserves membership history)
- Den Chief youth leader support (Scouts BSA youth assigned to help with dens, with login access and event volunteering)
- Parent-child linking and parent-submitted requirement completions
- Leader reminder queues for Scoutbook approval reconciliation
- Award fulfillment lifecycle (approved → purchased → distributed → Scoutbook reconciliation)
- Adventure and requirement progress tracking per child
- Multi-scope role assignments (pack/den/rank) with privacy controls
- Camping/Hiking/Service hour prompts for parent Scoutbook entry
- Admin-controlled child record creation via Scoutbook import or manual entry
- Annual rank rollover (promotes dens to next rank level and advances children to next rank)
- Special awards and inventory tracking

Technical approach will extend the existing NestJS/Prisma backend and Next.js/React frontend with new domain models, APIs, and UI components following established patterns.

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 20.x LTS, Next.js 16.1.6)  
**Primary Dependencies**: NestJS 11.x, Prisma ORM 7.5.0, React 19.2.3, Radix UI, Tailwind CSS, Zod validation  
**Storage**: SQLite (development), PostgreSQL (production), Prisma migrations  
**Testing**: Jest (backend unit/e2e), Vitest + Testing Library (frontend unit/integration), contract tests required per BDD  
**Target Platform**: Web application (modern browsers: Chrome, Firefox, Safari, Edge)
**Project Type**: Full-stack web application (existing codebase extension)  
**Performance Goals**: <200ms p95 API response, <2s initial page load, 60fps UI interactions  
**Constraints**: Browser-based only (no offline mode), maintain existing role-based auth tier system, Scoutbook remains external source of truth  
**Scale/Scope**: Pack-level deployment (~50-150 families, ~200-500 children, ~50-100 events/year), ~42 new database tables, ~45 new API endpoints, ~32 new React components

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Behavior-Driven Development (BDD First)

**Status**: ✅ COMPLIANT

- Spec provides detailed Given-When-Then acceptance scenarios for all 5 user stories
- Each user story marked as independently testable with clear boundaries
- Edge cases explicitly documented
- Test-first workflow enforced: Contract tests for ~45 new API endpoints required before implementation
- E2E integration tests required for all user journeys (den meeting flow, parent completion flow, award fulfillment flow, den chief assignment, etc.)

**Action Required**: Phase 1 will define API contracts in `/contracts/` directory before implementation begins.

**Phase 1 Review**: ✅ COMPLETE
- [contracts/api-endpoints.md](contracts/api-endpoints.md) defines all ~45 new endpoints with request/response schemas (including 7 Den Chief management endpoints)
- Contract testing requirements specified for each endpoint
- BDD test format examples provided
- quickstart.md emphasizes test-first development workflow

---

### II. Clean and Well-Documented Code

**Status**: ✅ COMPLIANT (pending implementation discipline)

- Feature introduces ~42 new database tables with clear entity relationships requiring comprehensive schema documentation
- ~45 new API endpoints requiring OpenAPI/NestJS decorator documentation
- ~32 new React components requiring PropTypes/TypeDoc comments
- Complex business logic (award eligibility, concurrent reconciliation updates, annual rollover, den chief permissions) requires extensive inline "why" comments
- README updates required for new domain concepts (Den, ChildScout, DenChief, Award Fulfillment lifecycle)

**Concerns**: Complexity of state machines (requirement progress, award fulfillment, reconciliation) may challenge maintainability. Mitigation: dedicated service layer with comprehensive unit tests and documentation.

**Phase 1 Review**: ✅ COMPLETE
- [data-model.md](data-model.md) provides comprehensive entity documentation with validation rules and state transitions
- [contracts/api-endpoints.md](contracts/api-endpoints.md) specifies required documentation patterns
- [contracts/event-schemas.md](contracts/event-schemas.md) documents all notification events
- [contracts/db-constraints.md](contracts/db-constraints.md) details database-level constraints
- [quickstart.md](quickstart.md) provides developer onboarding guide
- Research documents provide pattern examples and implementation guidance

---

### III. DRY (Don't Repeat Yourself)

**Status**: ✅ COMPLIANT (design must avoid premature duplication)

- Shared patterns identified:
  - Role-scoped queries (parents → linked children, den leaders → assigned dens) - MUST extract reusable authorization guard
  - Audit timestamp fields (completer, approver, timestamps) - MUST use Prisma model extension or base class
  - Reconciliation status tracking (pending/entered) - MUST centralize state enum and status transition logic
  - Category-specific prompt generation (Camping/Hiking/Service) - MUST use strategy pattern or config-driven template system
  - Scoutbook reconciliation workflows - MUST extract shared reconciliation service

**Risk**: With 42+ tables and 45+ endpoints, copy-paste risk is high. Mitigation: Code review checklist must explicitly verify DRY compliance for authorization logic, audit patterns, and reconciliation workflows.

**Phase 1 Review**: ✅ COMPLETE
- Authorization patterns centralized in ScopeGuard and AuthorizationService (see [advanced-patterns-research.md](../../docs/advanced-patterns-research.md))
- Audit field patterns consistent across entities in data-model.md
- Reconciliation status enum defined once, reused across RequirementProgress and AwardItem
- Strategy pattern specified for category-specific prompts (eliminates conditional duplication)
- State machine patterns established for award fulfillment (VALID_TRANSITIONS map)
- Shared service layer patterns documented in quickstart.md

---

### Overall Assessment

**GATE STATUS**: ✅ **PASS** - Phase 0 Research Complete, Phase 1 Design Complete

All three constitutional principles satisfied with appropriate planning and design. No violations requiring justification. 

**Phase 0 Completion**:
✅ All technical unknowns resolved via research
✅ Key decisions documented with rationale
✅ Alternatives evaluated and rejected with clear reasoning
✅ Technical risks identified with mitigation strategies

**Phase 1 Completion**:
✅ Complete data model with 17 entities defined
✅ API contracts for 31 endpoints documented
✅ Domain event schemas for 14 event types specified
✅ Database constraints and indexes defined
✅ Developer quickstart guide created
✅ Agent context updated with new technologies

**Key Success Factors Confirmed**:
1. ✅ Comprehensive contract tests specified before implementation
2. ✅ Shared authorization and audit patterns extracted in design
3. ✅ Complex state machines and business rules thoroughly documented
4. ✅ Code review checklist includes DRY verification

**Ready for Phase 2**: Task breakdown can now proceed with confidence in architectural foundation.

**No re-evaluation triggers identified** - design reinforces constitutional compliance.

## Project Structure

### Documentation (this feature)

```text
specs/010-plan-md-spec/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── api-endpoints.md        # REST API contracts for all endpoints
│   ├── event-schemas.md        # Domain event schemas for notifications
│   └── db-constraints.md       # Database constraints and indexes
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── models/                      # Existing pattern: DTOs and validation
│   ├── services/                    # New domain services
│   │   ├── den/                    # Den and membership management
│   │   ├── child-scout/            # Child record and attendance
│   │   ├── advancement/            # Requirement progress and reconciliation
│   │   ├── awards/                 # Award fulfillment lifecycle
│   │   ├── hours-prompt/           # Camping/Hiking/Service prompts
│   │   └── role-scope/             # Authorization and scoping logic
│   ├── api/                        # Existing pattern: REST controllers
│   │   ├── den.controller.ts
│   │   ├── child-scout.controller.ts
│   │   ├── advancement.controller.ts
│   │   ├── awards.controller.ts
│   │   └── parent-link.controller.ts
│   └── modules/                    # Existing NestJS modules
│       ├── den.module.ts
│       ├── child-scout.module.ts
│       ├── advancement.module.ts
│       └── awards.module.ts
├── prisma/
│   ├── schema.prisma               # Extended with ~40 new tables
│   ├── migrations/                 # New migration files
│   └── seed.ts                     # Seed data for adventure catalogs
└── test/                           # E2E tests for new workflows
    ├── den-events.e2e-spec.ts
    ├── child-attendance.e2e-spec.ts
    ├── parent-completions.e2e-spec.ts
    ├── award-fulfillment.e2e-spec.ts
    └── role-scoping.e2e-spec.ts

frontend/
├── src/
│   ├── components/                 # Existing pattern: reusable UI
│   │   ├── den/                   # Den event and attendance forms
│   │   ├── child/                 # Child profile and progress
│   │   ├── advancement/           # Requirement tracking UI
│   │   ├── awards/                # Award fulfillment workflows
│   │   └── parent/                # Parent-child linking and submissions
│   ├── app/                        # Next.js app router pages
│   │   ├── dens/                  # Den management pages
│   │   ├── children/              # Child profiles and attendance
│   │   ├── advancement/           # Requirement and progress pages
│   │   ├── awards/                # Award fulfillment dashboard
│   │   └── parent/                # Parent portal
│   └── services/                   # API client services
│       ├── denService.ts
│       ├── childScoutService.ts
│       ├── advancementService.ts
│       └── awardService.ts
└── src/test/                       # Component and integration tests
    ├── components/den/*.test.tsx
    ├── components/child/*.test.tsx
    └── integration/advancement-flow.test.tsx
```

**Structure Decision**: This feature extends the existing web application architecture (backend/ + frontend/ directories). No new top-level directories required. New domain services and modules follow established NestJS patterns. React components follow existing Radix UI + Tailwind CSS conventions. All new code integrates with current auth tier system (PARENT/LEADER/ADMIN) and builds on existing Event, Volunteer, and Role infrastructure.

## Complexity Tracking

**Status**: Not Required

All Constitutional principles satisfied without violations. No complexity justifications needed.
