# Implementation Plan: Retroactive Event Credit

**Branch**: `006-retroactive-event-credit` | **Date**: May 6, 2026 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/006-retroactive-event-credit/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Allow leaders (Tier 2+) to create events with past dates and award points to volunteers who participated but were not signed up in advance. This extends the existing event workflow to support retroactive credit without requiring a separate approval system. The core implementation leverages existing `Event.createdAt` timestamps to identify retroactive events and the existing `manualVolunteers` feature to add participants during event completion.

## Technical Context

**Language/Version**: TypeScript (Node.js 20+)  
**Primary Dependencies**: NestJS 11.x (backend), Next.js 16.x + React 19.x (frontend), Prisma 7.x (ORM)  
**Storage**: SQLite with Prisma ORM (libSQL adapter for production)  
**Testing**: Jest (backend e2e/unit), Vitest (frontend unit/integration)  
**Target Platform**: Web application (browser-based)  
**Project Type**: Full-stack web application with REST API  
**Performance Goals**: <500ms API response time, <2s page load for event forms  
**Constraints**: Must not modify existing completed events or historical leaderboard snapshots  
**Scale/Scope**: ~50-200 volunteers, ~10-30 events/month, single pack deployment

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. BDD First** | ✅ PASS | Feature spec includes user stories with Given-When-Then acceptance criteria (US1-US4). Test-first approach will be enforced during implementation. |
| **II. Clean Code** | ⏳ PENDING | To be verified during implementation. All new functions must be documented with purpose, parameters, and examples. |
| **III. DRY** | ⏳ PENDING | To be verified during implementation. Will leverage existing event workflow and point calculation logic without duplication. |

**Gate Decision**: PROCEED to Phase 0 research. All user stories are properly specified with testable acceptance criteria.

---

### Post-Design Constitution Re-check

*After Phase 1 design completion*

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. BDD First** | ✅ PASS | Contract tests specified in contracts/events-api-changes.md. Test-first workflow documented in quickstart.md with clear Red-Green-Refactor phases. All user stories have testable acceptance criteria. |
| **II. Clean Code** | ✅ PASS | Helper function `isRetroactiveEvent()` designed with clear purpose. JSDoc documentation required in quickstart. No complex logic - simple date comparison and badge display. |
| **III. DRY** | ✅ PASS | Reuses existing event workflow without duplication. No schema changes - computes from existing fields. Helper function extracted for reuse. Manual volunteers feature already exists - no re-implementation. |

**Final Gate Decision**: ✅ PROCEED to implementation. All constitutional principles satisfied. Design leverages existing code, maintains single source of truth, and follows test-first approach.

## Project Structure

### Documentation (this feature)

```text
specs/006-retroactive-event-credit/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── api/
│   │   ├── events.controller.ts        # Existing - event CRUD operations
│   │   └── admin-tasks.controller.ts   # Existing - event completion endpoint
│   ├── services/
│   │   ├── events.service.ts           # Existing - will add retroactive validation
│   │   └── points.service.ts           # Existing - handles point distribution
│   ├── modules/
│   │   └── events.module.ts            # Existing - event-related DI
│   └── utils/
│       └── validators.ts               # Existing - date validation utilities
└── tests/
    ├── events.e2e-spec.ts              # Existing - will add retroactive tests
    └── admin-tasks.e2e-spec.ts         # Existing - will add manual volunteer tests

frontend/
├── src/
│   ├── app/
│   │   └── dashboard/
│   │       └── events/
│   │           ├── new/                # Existing - create event form
│   │           └── [id]/               # Existing - event details/completion
│   ├── components/
│   │   └── events/                     # Existing - event-related UI components
│   └── services/
│       └── eventService.ts             # Existing - API client for events
└── tests/
    └── components/
        └── events/                     # Existing - will add retroactive UI tests
```

**Structure Decision**: Web application with existing backend/frontend separation. This feature extends existing event management functionality without requiring new top-level directories or modules. All changes will be to existing controllers, services, and UI components.

## Complexity Tracking

> **No violations detected** - Constitution Check passed all gates. This feature extends existing functionality without introducing architectural complexity.
