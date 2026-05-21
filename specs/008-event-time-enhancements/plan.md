# Implementation Plan: Enhanced Event Management - Time and Activity Details

**Branch**: `008-event-time-enhancements` | **Date**: 2026-05-19 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/008-event-time-enhancements/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Add event timing enhancements (optional end time, full-day flag) and activity slot customization (descriptions, numbered steps) to provide volunteers with clearer event duration and responsibility information. Backend changes include database schema additions (endTime field, fullDay boolean, description text, ActivitySlotStep relational model) with validation logic. Frontend changes include form controls for time ranges, full-day toggle, dynamic description fields, and step management UI. Implementation follows BDD principles with contract tests for API changes and integration tests for user flows.

## Technical Context

**Language/Version**: TypeScript 5 (backend and frontend)  
**Primary Dependencies**: Backend - NestJS 11.0.1, Prisma 7.5.0, Zod 4.3.6; Frontend - Next.js 16.1.6, React 19.2.3, Radix UI  
**Storage**: SQLite (development), PostgreSQL (production) with Prisma ORM  
**Testing**: Backend - Jest for unit/e2e tests; Frontend - Vitest 4.1.3 with Testing Library  
**Target Platform**: Web application - Backend REST API on Node.js, Frontend SSR/CSR on Next.js
**Project Type**: Full-stack web application (volunteer management system)  
**Performance Goals**: API response <200ms p95, UI interactions <100ms, form submissions <500ms  
**Constraints**: Backward compatibility with existing events (only start time), mobile-responsive UI, accessibility compliance  
**Scale/Scope**: ~50 active volunteers, ~100 events per year, ~20 activity types, multi-tenant capable

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Phase 0 Check (Pre-Research) ✅

**Status**: PASS - All principles satisfied, no violations

### Phase 1 Check (Post-Design) ✅

**Re-evaluation Date**: 2026-05-19  
**Status**: PASS - Design adheres to all constitutional principles

### I. Behavior-Driven Development (BDD First)

**Status**: ✅ PASS  
**Evidence**: 
- Spec.md contains 4 user stories with complete Given-When-Then acceptance scenarios (Phase 0 artifact)
- Contract tests defined in [contracts/event-api.md](contracts/event-api.md) and [contracts/activity-slot-api.md](contracts/activity-slot-api.md) (Phase 1 artifacts)
- 14+ contract test cases specified for Event API, 14+ for Activity Slot API
- Integration test scenarios documented for full user flows
- Data model designed before implementation ([data-model.md](data-model.md))

**Validation**: All 29 functional requirements from spec.md have corresponding test cases in contract documentation. Test-first approach enforced.

### II. Clean and Well-Documented Code

**Status**: ✅ PASS  
**Evidence**: 
- Service methods documented with clear responsibilities (ActivitySlotStepService: add/remove/reorder)
- Validation logic centralized in dedicated utility (time-validation.util.ts)
- API contracts provide comprehensive documentation with request/response examples
- [Quickstart guide](quickstart.md) created for developer onboarding
- Prisma schema changes documented with inline purpose comments (data-model.md)

**Code Organization**:
- Single-responsibility services: EventService (time validation), ActivitySlotStepService (step CRUD)
- Clear naming: `validateEventTimes()`, `addStep()`, `reorderSteps()`
- Documentation-first approach: Contracts written before code

### III. DRY (Don't Repeat Yourself)

**Status**: ✅ PASS  
**Evidence**: 
- Time validation: Single `validateEventTimes()` utility shared by create/update endpoints
- Step management: Single `ActivitySlotStepService` for all step operations
- UI components: Reusable `StepManager` component shared between create/edit forms
- Time formatting: Centralized `formatEventTime()` utility prevents display logic duplication
- Database schema: Single source of truth (Prisma schema), no redundant time/step storage

**Abstraction Strategy Validated**:
- No duplication in validation logic (DRY principle maintained)
- Service layer properly abstracts database operations
- UI components reusable across multiple contexts

### Summary

✅ **All constitution principles are satisfied post-design.**  
- BDD: Contract tests and integration tests defined before implementation
- Clean Code: Clear responsibilities, comprehensive documentation, developer quickstart
- DRY: Centralized validation, service abstractions, reusable UI components

**No violations or complexity requiring justification.**

**Ready for Phase 2**: Tasks generation (`/speckit.tasks`)

## Project Structure

### Documentation (this feature)

```text
specs/008-event-time-enhancements/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output - time handling, step patterns, validation approaches
├── data-model.md        # Phase 1 output - Prisma schema changes, entity relationships
├── quickstart.md        # Phase 1 output - Quick reference for developers
├── checklists/
│   └── requirements.md  # Validation checklist (already created)
└── contracts/
    ├── event-api.md     # Event API contract with new fields
    └── activity-slot-api.md  # Activity slot API contract with description/steps
```

### Source Code (repository root)

```text
backend/
├── prisma/
│   ├── schema.prisma           # ADD: Event.endTime, Event.fullDay, ActivitySlot.description, ActivitySlotStep model
│   └── migrations/             # ADD: Migration for schema changes
├── src/
│   ├── models/
│   │   ├── event.dto.ts        # MODIFY: Add endTime, fullDay validation
│   │   └── activity-slot.dto.ts # MODIFY: Add description, steps validation
│   ├── services/
│   │   ├── event.service.ts    # MODIFY: Time validation logic, backward compatibility
│   │   ├── activity-slot.service.ts # MODIFY: Description handling
│   │   └── activity-slot-step.service.ts # NEW: Step CRUD operations
│   ├── api/
│   │   ├── events.controller.ts # MODIFY: Handle new fields in create/update
│   │   └── activity-slots.controller.ts # MODIFY: Handle description/steps
│   └── utils/
│       └── time-validation.util.ts # NEW: Centralized time validation
└── tests/
    ├── contract/
    │   ├── event-api.spec.ts   # ADD: Contract tests for new fields
    │   └── activity-slot-api.spec.ts # ADD: Contract tests for description/steps
    ├── integration/
    │   └── event-time-flow.spec.ts # ADD: Full event creation flow tests
    └── unit/
        ├── time-validation.spec.ts # ADD: Time validation unit tests
        └── step-service.spec.ts # ADD: Step CRUD unit tests

frontend/
├── src/
│   ├── components/
│   │   ├── event-time-picker.tsx # MODIFY: Add end time, full-day toggle
│   │   ├── activity-slot-form.tsx # MODIFY: Add description field
│   │   └── step-manager.tsx    # NEW: Reusable step add/remove/reorder UI
│   ├── pages/
│   │   ├── events/create.tsx   # MODIFY: Use enhanced time picker, step manager
│   │   ├── events/edit.tsx     # MODIFY: Use enhanced time picker, step manager
│   │   └── events/[id].tsx     # MODIFY: Display end time, full-day, steps
│   ├── services/
│   │   ├── events.service.ts   # MODIFY: Include new fields in API calls
│   │   └── activity-slots.service.ts # MODIFY: Include description/steps
│   └── lib/
│       └── time-format.util.ts # NEW: Time range and full-day formatting
└── tests/
    ├── components/
    │   ├── event-time-picker.test.tsx # ADD: Time picker UI tests
    │   └── step-manager.test.tsx # ADD: Step manager UI tests
    └── integration/
        └── event-creation.test.tsx # ADD: Full event creation flow
```

**Structure Decision**: Web application with separate backend (NestJS REST API) and frontend (Next.js SSR/CSR) directories. This feature adds database entities (ActivitySlotStep), modifies existing models (Event, ActivitySlot), creates new service (ActivitySlotStepService) and utility modules (time validation, formatting), and enhances UI components (time picker, step manager). All changes follow existing architectural patterns.

## Complexity Tracking

No constitutional violations requiring justification.

---

## Planning Complete ✅

**Status**: Phase 0 (Research) and Phase 1 (Design & Contracts) complete  
**Date**: 2026-05-19  
**Branch**: `008-event-time-enhancements`

### Artifacts Generated

#### Phase 0: Research & Technical Decisions
- ✅ [research.md](research.md) - Technical decisions for time storage, step modeling, UI patterns, backward compatibility

**Key Decisions**:
- Time fields: String storage (HH:mm format), Zod validation
- Steps: Relational model (ActivitySlotStep) vs JSON - chose relational for data integrity
- UI: Progressive disclosure (full-day toggle), inline validation, dynamic step list
- Backward compatibility: Nullable/default fields, graceful null handling

#### Phase 1: Design & Contracts
- ✅ [data-model.md](data-model.md) - Prisma schema changes, entity relationships, migration strategy
- ✅ [contracts/event-api.md](contracts/event-api.md) - Event API contract with endTime, fullDay fields (14+ test cases)
- ✅ [contracts/activity-slot-api.md](contracts/activity-slot-api.md) - Activity Slot API contract with description, steps (14+ test cases)
- ✅ [quickstart.md](quickstart.md) - Developer quick reference guide
- ✅ Agent context updated - GitHub Copilot instructions enhanced with TypeScript/NestJS/Prisma/Next.js patterns

**Schema Changes**:
- Event: `+endTime String?`, `+fullDay Boolean @default(false)`
- ActivitySlot: `+description String?`, `+steps ActivitySlotStep[]`
- NEW: ActivitySlotStep model (id, activitySlotId, orderIndex, stepText)

**API Endpoints**:
- Modified: POST/PATCH /api/events (accept new time fields)
- Modified: GET /api/events/:id (return new fields)
- NEW: POST /api/activity-slots/:id/steps (add step)
- NEW: DELETE /api/activity-slots/:slotId/steps/:stepId (remove step, renumber)
- NEW: PATCH /api/activity-slots/:id/steps/reorder (reorder steps)

#### Constitutional Validation
- ✅ Phase 0 Check: PASS - All principles satisfied before research
- ✅ Phase 1 Check: PASS - Design adheres to BDD, Clean Code, DRY principles

### Next Steps

**Phase 2: Task Generation** (separate command)
```bash
/speckit.tasks
```

This will generate `tasks.md` with dependency-ordered implementation tasks based on the design artifacts created in Phase 1.

**Ready for Implementation**: All design artifacts complete, no unknowns remaining, constitution validated.

---

## Summary

This plan documents the complete design phase for Enhanced Event Management features. The implementation is now ready to be broken down into actionable tasks with clear dependencies, test specifications, and acceptance criteria. All constitutional requirements met, backward compatibility ensured, and comprehensive documentation provided for developers.
