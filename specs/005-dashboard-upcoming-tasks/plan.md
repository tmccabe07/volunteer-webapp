# Implementation Plan: Dashboard Upcoming Tasks

**Branch**: `005-dashboard-upcoming-tasks` | **Date**: May 5, 2026 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/005-dashboard-upcoming-tasks/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Replace the "Recent Activity" pane on the dashboard with an "Upcoming Tasks" pane that displays the user's 5 soonest incomplete tasks with future due dates. Users can mark tasks complete/incomplete inline and navigate to task details. The implementation leverages the existing admin-tasks API and follows the established pattern from the "Upcoming Events" pane for visual consistency.

## Technical Context

**Language/Version**: TypeScript 5.x (both frontend and backend)  
**Primary Dependencies**: Backend: NestJS 11, Prisma 7.5; Frontend: Next.js 16, React 19, Tailwind CSS 4  
**Storage**: Prisma ORM with libSQL adapter (SQLite-compatible), existing AdminTask and TaskCompletion models  
**Testing**: Backend: Jest with @nestjs/testing; Frontend: Vitest with Testing Library  
**Target Platform**: Web (browser clients), responsive design for mobile and desktop  
**Project Type**: Web application (monorepo: frontend + backend)  
**Performance Goals**: <2s dashboard load time, <500ms API response for task list  
**Constraints**: Must use existing admin-tasks API endpoints, must maintain visual consistency with Upcoming Events pane  
**Scale/Scope**: Single-user dashboard widget, max 5 tasks displayed, existing codebase with ~50 screens

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Behavior-Driven Development (BDD First) ✅

- **User stories in Given-When-Then format**: ✅ PASS - Spec includes 4 prioritized user stories with acceptance scenarios in GWT format
- **Tests before implementation**: ⚠️ PENDING - Must write failing tests for dashboard component before implementation
- **Contract tests for APIs**: ⚠️ PENDING - Must add contract tests for existing admin-tasks API endpoints used by this feature
- **Independently testable stories**: ✅ PASS - Each story (P1-P3) can be tested and delivered independently

**Gate Status**: ✅ PASS - Specification meets BDD requirements. Implementation must follow test-first workflow.

### II. Clean and Well-Documented Code ✅

- **Single responsibility**: ✅ PASS - Feature scope limited to dashboard widget, reuses existing API
- **Documentation requirements**: ⚠️ PENDING - Must document new dashboard component and any utility functions
- **Self-explanatory naming**: ⚠️ PENDING - Implementation must follow project naming conventions
- **README updates**: ⚠️ PENDING - No README updates needed for dashboard widget

**Gate Status**: ✅ PASS - No violations. Standard documentation requirements apply during implementation.

### III. DRY (Don't Repeat Yourself) ✅

- **Reuse existing code**: ✅ PASS - Feature reuses existing admin-tasks API, TaskCard component pattern from tasks page
- **Avoid duplication**: ✅ PASS - Will extract shared task display logic into reusable components if needed
- **Single source of truth**: ✅ PASS - API endpoints and data models already centralized
- **Configuration centralized**: ✅ PASS - Task limit (5) and date formatting can be extracted to constants

**Gate Status**: ✅ PASS - No violations. Feature leverages existing infrastructure appropriately.

### Overall Assessment

**Status**: ✅ PASS - All constitutional principles satisfied. No complexity violations to justify.

- BDD requirements met in specification phase
- Standard clean code practices apply
- Appropriate reuse of existing components and APIs
- No architectural complexity introduced

## Project Structure

### Documentation (this feature)

```text
specs/005-dashboard-upcoming-tasks/
├── spec.md              # Feature specification (completed)
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
├── checklists/          # Quality checklists
│   └── requirements.md  # Specification quality checklist (completed)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── api/
│   │   └── admin-tasks.controller.ts    # Existing - listTasks, completeTask, uncompleteTask
│   ├── services/
│   │   └── admin-tasks.service.ts       # Existing - business logic for tasks
│   └── test/
│       └── contract/                     # New - contract tests for API
└── prisma/
    └── schema.prisma                     # Existing - AdminTask, TaskCompletion models

frontend/
├── src/
│   ├── app/
│   │   └── dashboard/
│   │       ├── page.tsx                  # Modified - add Upcoming Tasks pane
│   │       └── page.test.tsx             # Modified - add tests for new pane
│   ├── components/
│   │   ├── shared/
│   │   │   └── tasks/
│   │   │       ├── TaskCard.tsx          # Existing - reusable task card
│   │   │       └── DashboardTaskCard.tsx # New - simplified task card for dashboard
│   │   └── ui/                           # Existing - Radix UI components (Card, Button, Badge)
│   └── services/
│       └── admin-tasks.service.ts        # Existing - API client for tasks
└── tests/
    └── integration/                      # Tests for dashboard with tasks pane
```

**Structure Decision**: Web application structure with separate frontend (Next.js) and backend (NestJS) directories. Feature implementation primarily in frontend/src/app/dashboard/ with potential new reusable component in frontend/src/components/shared/tasks/. No backend API changes required - uses existing admin-tasks endpoints.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**Status**: N/A - No constitutional violations detected. This feature:
- Follows BDD principles with test-first approach
- Reuses existing components and API infrastructure
- Introduces no new architectural complexity
- Maintains clean separation of concerns

---

## Phase Completion Summary

### Phase 0: Research ✅ COMPLETE

**Artifacts Created**:
- [research.md](research.md) - Technical decisions documented

**Key Findings**:
- Existing admin-tasks API fully supports requirements (no backend changes needed)
- Dashboard pattern from Upcoming Events pane provides proven UX template
- Optimistic UI updates pattern documented for inline completion toggle
- Client-side filtering strategy for "upcoming" (non-overdue) tasks defined

**Clarifications Resolved**: All technical unknowns resolved - no NEEDS CLARIFICATION markers remain

---

### Phase 1: Design & Contracts ✅ COMPLETE

**Artifacts Created**:
- [data-model.md](data-model.md) - Data structures and flow documented
- [contracts/api-admin-tasks.md](contracts/api-admin-tasks.md) - API contract specification
- [quickstart.md](quickstart.md) - Implementation guide with BDD workflow

**Design Decisions**:
- **Data Model**: Uses existing AdminTask and TaskCompletion models (no schema changes)
- **API Contract**: Documents three existing endpoints with dashboard usage patterns
- **Component Architecture**: New DashboardTaskCard component (lightweight, dashboard-specific)
- **State Management**: Local React state with optimistic updates

**Agent Context Updated**: ✅ Copilot instructions updated with TypeScript, NestJS, Next.js, Prisma

---

### Constitution Check: Post-Phase-1 Re-Evaluation ✅ PASS

#### I. Behavior-Driven Development (BDD First) ✅

**Re-assessment**:
- ✅ quickstart.md includes test-first implementation workflow (Red-Green-Refactor)
- ✅ Test scenarios defined for all user stories in quickstart
- ✅ Contract tests identified for API endpoints (backend/src/test/contract/)
- ✅ Integration tests scoped for dashboard component

**Status**: ✅ PASS - BDD workflow clearly defined, ready for implementation

#### II. Clean and Well-Documented Code ✅

**Re-assessment**:
- ✅ Single Responsibility Principle maintained:
  - DashboardTaskCard: dashboard-specific task display + completion toggle
  - Dashboard page: task fetching + state management
  - Existing TaskCard: unchanged, maintains its responsibility
- ✅ Documentation requirements defined in quickstart (JSDoc for new functions)
- ✅ Naming conventions follow existing patterns (DashboardTaskCard, handleToggleComplete)

**Status**: ✅ PASS - Clean code principles embedded in design

#### III. DRY (Don't Repeat Yourself) ✅

**Re-assessment**:
- ✅ Reuses existing API endpoints (no new endpoints created)
- ✅ Reuses existing service layer (adminTasksService.ts)
- ✅ Date formatting will use existing formatDate utility
- ✅ Avoids duplicating TaskCard (creates focused alternative instead)
- ✅ Task limit (5) and fetch limit (10) to be extracted as constants
- ✅ Single source of truth: API returns isOverdue flag (no client-side date logic duplication)

**Status**: ✅ PASS - DRY principles applied throughout design

#### Overall Post-Design Assessment

**Status**: ✅ PASS - All constitutional principles satisfied after Phase 1 design

**Justification**:
- Design leverages existing infrastructure appropriately
- No architectural complexity introduced
- BDD workflow clearly defined for implementation
- Clean separation of concerns maintained
- No duplication of logic or data

**Ready for Implementation**: ✅ YES - Proceed to /speckit.tasks for task breakdown

---

## Next Steps

**Status**: Planning phase complete. Ready for task generation.

**Command**: Run `/speckit.tasks` to generate actionable, dependency-ordered tasks in `tasks.md`

**Implementation Readiness**:
- ✅ All research complete
- ✅ Design artifacts created
- ✅ API contracts documented
- ✅ Test-first workflow defined
- ✅ Constitutional compliance verified
- ✅ Agent context updated

**Estimated Complexity**: Low (2-3 days)
- Frontend-only changes
- Reuses existing API
- No database migrations
- Clear implementation path

---

## Appendix: Artifact Cross-Reference

| Artifact | Purpose | Status |
|----------|---------|--------|
| [spec.md](spec.md) | Feature requirements & user stories | ✅ Complete |
| [research.md](research.md) | Technical decisions & alternatives | ✅ Complete |
| [data-model.md](data-model.md) | Data structures & flow | ✅ Complete |
| [contracts/api-admin-tasks.md](contracts/api-admin-tasks.md) | API contract specification | ✅ Complete |
| [quickstart.md](quickstart.md) | Implementation guide (BDD workflow) | ✅ Complete |
| [checklists/requirements.md](checklists/requirements.md) | Spec quality validation | ✅ Complete |
| tasks.md | Actionable implementation tasks | ⏳ Pending /speckit.tasks |

---

**Planning Phase Status**: ✅ COMPLETE  
**Branch**: 005-dashboard-upcoming-tasks  
**Next Command**: `/speckit.tasks` to generate implementation tasks
