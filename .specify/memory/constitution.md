<!--
Sync Impact Report:
Version: Initial → 1.0.0
Principles Added:
  - I. Behavior-Driven Development (BDD First)
  - II. Clean and Well-Documented Code
  - III. DRY (Don't Repeat Yourself)
Templates Status:
  ✅ plan-template.md - Constitution Check section aligned
  ✅ spec-template.md - User scenarios and acceptance criteria support BDD
  ✅ tasks-template.md - Test-first workflow and task organization align with principles
  ✅ All command prompts reviewed - no agent-specific references requiring updates
Follow-up TODOs: None - all placeholders filled
-->

# Volunteer WebApp Constitution

## Core Principles

### I. Behavior-Driven Development (BDD First)

**All features MUST begin with behavior specifications and tests before implementation.**

- User stories MUST be written in Given-When-Then format with clear acceptance criteria
- Tests MUST be written first, approved by stakeholders, and MUST fail before implementation begins
- Red-Green-Refactor cycle is strictly enforced:
  1. **Red**: Write failing test that captures expected behavior
  2. **Green**: Implement minimum code to make test pass
  3. **Refactor**: Improve code quality while keeping tests green
- Contract tests are REQUIRED for all API endpoints and inter-service communication
- Integration tests MUST verify end-to-end user journeys as described in specifications
- Every user story MUST be independently testable and deliverable as an MVP increment

**Rationale**: BDD ensures we build the right thing by validating behavior against user needs before committing to implementation. Test-first development catches defects early, guides design decisions, and provides living documentation of system behavior.

### II. Clean and Well-Documented Code

**Code MUST be self-explanatory, maintainable, and thoroughly documented.**

- Functions and methods MUST have single, well-defined responsibilities
- Variable and function names MUST clearly convey purpose and intent (no abbreviations unless standard)
- Every public API, class, and non-trivial function MUST include documentation explaining:
  - Purpose and use case
  - Parameters and return values
  - Exceptions or error conditions
  - Example usage where helpful
- Code comments MUST explain "why" not "what" (the code should explain what it does)
- Complex algorithms or business logic MUST include explanatory comments
- README files MUST be maintained for each major directory explaining structure and purpose
- Documentation MUST be updated in the same commit as code changes

**Rationale**: Clean, well-documented code reduces cognitive load, accelerates onboarding, enables confident refactoring, and ensures knowledge transfer. Future maintainers (including your future self) depend on clear code and documentation to understand intent and make safe changes.

### III. DRY (Don't Repeat Yourself)

**Duplication of logic, data, or configuration MUST be eliminated through abstraction.**

- Identical or near-identical code MUST be extracted into shared functions, classes, or modules
- Business rules and logic MUST have a single, authoritative source of truth
- Configuration values MUST be centralized (environment variables, config files, or constants)
- Database schemas and data models MUST be defined once and referenced everywhere
- API contracts and data structures MUST be defined in a single location and imported
- Copy-paste programming is explicitly forbidden
- Duplication for the sake of testing (test fixtures, mocks) is acceptable
- Premature abstraction MUST be avoided: Extract duplication only after it appears 2-3 times

**Rationale**: DRY reduces maintenance burden, prevents inconsistencies, and minimizes the blast radius of changes. When a rule or structure exists in one place, updates and bug fixes happen once instead of hunting down scattered duplicates. However, abstraction too early can create unnecessary complexity.

## Code Quality Standards

**All code MUST meet these quality gates before merging:**

- All tests pass (unit, integration, and contract tests)
- Code coverage MUST be ≥80% for new code
- No linting errors or warnings (enforcement via CI/CD)
- No commented-out code blocks (use version control instead)
- No TODO comments without associated tracked issues
- All public APIs documented
- Breaking changes MUST be justified and documented

## Development Workflow

**Standard development process:**

1. **Specification**: Write or review user stories with Given-When-Then acceptance criteria
2. **Test Design**: Create failing tests that verify acceptance criteria
3. **Implementation**: Write minimum code to pass tests
4. **Refactor**: Apply DRY principles, improve naming, add documentation
5. **Review**: Verify compliance with all three core principles
6. **Integration**: Merge only when all quality gates pass

**Code Review Requirements:**

- At least one approval from a team member
- Reviewer MUST verify BDD tests exist and are meaningful
- Reviewer MUST verify code clarity and documentation
- Reviewer MUST flag any duplication violations
- Constitution compliance MUST be verified before approval

## Governance

**This constitution supersedes all other development practices and guidelines.**

- All pull requests MUST be reviewed for constitutional compliance
- Deviations from core principles MUST be explicitly justified with technical rationale and documented in code comments or PR descriptions
- Amendments to this constitution require team consensus and MUST follow semantic versioning:
  - MAJOR: Backward-incompatible changes (principle removal or redefinition)
  - MINOR: New principles added or material expansions
  - PATCH: Clarifications, wording improvements, or refinements
- This constitution MUST be referenced during specification and planning phases
- Complexity that violates principles MUST be justified in implementation plans

**Version**: 1.0.0 | **Ratified**: 2026-03-12 | **Last Amended**: 2026-03-12
