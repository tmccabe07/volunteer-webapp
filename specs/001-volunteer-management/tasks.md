# Tasks: Cub Scout Volunteer Management Webapp

**Feature Branch**: `001-volunteer-management`  
**Generated**: 2026-03-16  
**Input**: Design documents from `/specs/001-volunteer-management/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Not explicitly requested in feature specification - test tasks omitted per template instructions

**Organization**: Tasks grouped by user story to enable independent implementation and testing

---

## Format: `- [ ] [ID] [P?] [Story?] Description`

- **Checkbox**: `- [ ]` for task tracking
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story label (US1, US2, US3, etc.) from spec.md
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure) ✅

**Purpose**: Project initialization and basic structure per plan.md

- [X] T001 Create backend/ directory structure with src/, prisma/, tests/ folders per plan.md project structure
- [X] T002 Initialize backend Node.js project with package.json and install dependencies (express, @prisma/client, prisma, bcrypt, jsonwebtoken, zod, cors, helmet, cookie-parser, express-rate-limit)
- [X] T003 [P] Initialize frontend Next.js 14 project with App Router in frontend/ directory and install dependencies (next, react, react-dom, axios, tailwindcss)
- [X] T004 [P] Configure ESLint and Prettier for both backend/eslint.config.mjs and frontend/eslint.config.mjs
- [X] T005 [P] Create backend/.env.example and frontend/.env.local.example with environment variable templates from quickstart.md
- [X] T006 [P] Setup TailwindCSS configuration in frontend/tailwind.config.js and frontend/postcss.config.mjs
- [X] T007 Create .gitignore files for backend/ and frontend/ (exclude node_modules/, .env, dev.db)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story implementation

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T008 Create complete Prisma schema in backend/prisma/schema.prisma from data-model.md (all 20+ models)
- [X] T009 [P] Create Prisma seed script in backend/prisma/seed.ts with default data (pack config, badge tiers, activity types, volunteer roles, test admin user) from quickstart.md
- [X] T010 Run initial Prisma migration in backend/prisma/migrations/ to create SQLite database
- [X] T011 [P] Create JWT middleware in backend/src/middleware/auth.ts with authenticateJWT and requireTier functions per research.md Decision 3.1
- [X] T012 [P] Create error handling middleware in backend/src/middleware/error.ts for consistent API error responses
- [X] T013 [P] Create validation utility in backend/src/utils/validation/ with Zod schema helpers
- [X] T014 Create Express app initialization in backend/src/index.ts with middleware (cors, helmet, cookie-parser, rate-limit) and route mounting
- [X] T015 [P] Create Prisma client singleton in backend/src/utils/prisma.ts for database connection management
- [X] T016 [P] Create Axios client configuration in frontend/src/lib/axios.ts with interceptors for JWT refresh per research.md Decision 2.3
- [X] T017 [P] Create Next.js middleware in frontend/src/middleware.ts for route protection and tier-based authorization per research.md Decision 2.2
- [X] T018 [P] Create frontend layout components in frontend/src/components/layouts/ (header, nav, footer with pack name display)
- [X] T019 [P] Setup shadcn/ui base components in frontend/src/components/ui/ (button, input, card, dialog, table from shadcn/ui)
- [X] T020 Create root layout in frontend/src/app/layout.tsx with TailwindCSS globals and metadata

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Account Registration and Authentication (Priority: P1) 🎯 MVP

**Goal**: Volunteers can create accounts, log in securely, request admin password resets when needed, and have accounts managed by admins

**Independent Test**: Create account, log in, log out, have admin reset password. Verify secure access to platform.

### Backend Implementation for User Story 1

- [X] T021 [P] [US1] Create Zod validation schemas in backend/src/utils/validation/auth.schema.ts (registerSchema, loginSchema, requestResetSchema, resetPasswordSchema) from contracts/auth-api.md
- [X] T022 [P] [US1] Create AuthService in backend/src/services/auth.service.ts with password hashing (bcrypt 12 rounds), JWT generation, token verification methods per research.md Decision 3.2
- [X] T023 [P] [US1] Create PasswordResetService in backend/src/services/password-reset.service.ts with crypto-secure token generation per research.md Decision 3.3
- [X] T024 [US1] Implement POST /api/auth/register endpoint in backend/src/api/auth.controller.ts (create volunteer with PARENT tier, send welcome notification)
- [X] T025 [US1] Implement POST /api/auth/login endpoint in backend/src/api/auth.controller.ts with rate limiting (5 per 15 min) and HttpOnly cookie setting
- [X] T026 [US1] Implement POST /api/auth/logout endpoint in backend/src/api/auth.controller.ts (clear cookies)
- [X] T027 [US1] Implement POST /api/auth/refresh endpoint in backend/src/api/auth.controller.ts for JWT token refresh
- [X] T028 [US1] Implement POST /api/auth/request-reset endpoint in backend/src/api/auth.controller.ts with rate limiting (3 per hour)
- [X] T029 [US1] Implement POST /api/auth/reset-password endpoint in backend/src/api/auth.controller.ts with token validation and password update
- [X] T030 [US1] Implement GET /api/auth/me endpoint in backend/src/api/auth.controller.ts to fetch current user info with roles and point balance
- [X] T031a [US1] Add mustChangePassword field to Volunteer model in backend/prisma/schema.prisma for temporary password tracking
- [X] T031b [US1] Create Prisma migration for mustChangePassword field
- [X] T031c [US1] Implement POST /api/auth/change-password endpoint in backend/src/api/auth.controller.ts for users to change password
- [X] T031d [US1] Implement GET /api/admin/volunteers endpoint in backend/src/api/admin.controller.ts to list all volunteers for admin password reset
- [X] T031e [US1] Implement POST /api/admin/volunteers/:id/reset-password endpoint in backend/src/api/admin.controller.ts to generate temporary passwords
- [X] T031f [US1] Update AdminService in backend/src/services/admin.service.ts with listVolunteers and resetVolunteerPassword methods

### Frontend Implementation for User Story 1

- [X] T032 [P] [US1] Create auth form components in frontend/src/components/forms/auth/ (RegisterForm, LoginForm, ResetPasswordForm with validation)
- [X] T033 [P] [US1] Create auth API service in frontend/src/services/auth.service.ts with Axios client methods for all auth endpoints
- [X] T034 [US1] Create registration page in frontend/src/app/auth/register/page.tsx with RegisterForm component
- [X] T035 [US1] Create login page in frontend/src/app/auth/login/page.tsx with LoginForm component and rememberMe checkbox
- [X] T036 [US1] Create password reset request page in frontend/src/app/auth/reset-password/page.tsx
- [X] T037 [US1] Create password reset confirmation page in frontend/src/app/auth/reset-password/confirm/page.tsx with token handling
- [X] T038 [US1] Create auth context provider in frontend/src/lib/auth-context.tsx for user session state management across app
- [X] T038a [US1] Create change password page in frontend/src/app/auth/change-password/page.tsx for users with temporary passwords
- [X] T038b [US1] Create admin volunteers page in frontend/src/app/admin/volunteers/page.tsx for managing users and resetting passwords
- [X] T038c [US1] Update auth context in frontend/src/lib/auth-context.tsx to redirect users with mustChangePassword to change password page

**Checkpoint**: User Story 1 complete - volunteers can register, log in, and request admin-assisted password resets

---

## Phase 4: User Story 2 - Volunteer Profile Management (Priority: P1)

**Goal**: Volunteers can create and manage profiles with roles (parent/guardian, committee, den leader, etc.) and children's ranks

**Independent Test**: Create profile, select multiple roles including committee/den leader, identify children's ranks. Verify role assignments and tier 2 permissions.

### Backend Implementation for User Story 2

- [X] T038 [P] [US2] Create Zod validation schemas in backend/src/utils/validation/volunteer.schema.ts (updateProfileSchema, assignRoleSchema, listVolunteersSchema) from contracts/volunteers-api.md
- [X] T039 [P] [US2] Create VolunteerService in backend/src/services/volunteer.service.ts with profile CRUD operations, role assignment logic, tier upgrade/downgrade
- [X] T040 [P] [US2] Create PointsService in backend/src/services/points.service.ts with role assignment bonus (100 points for LEADER tier roles) per spec.md User Story 3
- [X] T041 [US2] Implement GET /api/volunteers/me/profile endpoint in backend/src/api/volunteers.controller.ts (fetch full profile with roles, ranks, points)
- [X] T042 [US2] Implement PUT /api/volunteers/me/profile endpoint in backend/src/api/volunteers.controller.ts (update name, phone, leaderboardOptIn, childrenRanks)
- [X] T043 [US2] Implement POST /api/volunteers/me/roles endpoint in backend/src/api/volunteers.controller.ts (self-assign role, check for tier upgrade, award 100 points if LEADER role)
- [X] T044 [US2] Implement DELETE /api/volunteers/me/roles/:roleAssignmentId endpoint in backend/src/api/volunteers.controller.ts (remove role, check for tier downgrade)
- [X] T045 [US2] Implement GET /api/volunteers endpoint in backend/src/api/volunteers.controller.ts (list volunteers with pagination, search, tier/role filters) restricted to Tier 2+
- [X] T046 [US2] Implement GET /api/volunteers/:id endpoint in backend/src/api/volunteers.controller.ts (get specific volunteer details with point history) restricted to Tier 2+ or self
- [X] T047 [US2] Implement DELETE /api/volunteers/:id endpoint in backend/src/api/volunteers.controller.ts (soft delete volunteer, withdraw future signups) restricted to Tier 3

### Frontend Implementation for User Story 2

- [X] T048 [P] [US2] Create profile form components in frontend/src/components/forms/profile/ (ProfileEditForm, RoleSelectionForm, ChildrenRanksForm)
- [X] T049 [P] [US2] Create volunteer API service in frontend/src/services/volunteer.service.ts with Axios methods for all volunteer endpoints
- [X] T050 [US2] Create profile page in frontend/src/app/profile/page.tsx displaying current profile with edit capabilities
- [X] T051 [US2] Create profile edit page in frontend/src/app/profile/edit/page.tsx with ProfileEditForm, RoleSelectionForm, ChildrenRanksForm
- [X] T052 [US2] Create volunteer list page in frontend/src/app/volunteers/page.tsx (Tier 2+ only) with search, filters, pagination
- [X] T053 [US2] Create volunteer detail page in frontend/src/app/volunteers/[id]/page.tsx (Tier 2+ or self) showing full profile and point history
- [X] T054 [US2] Update navigation in frontend/src/components/layouts/navigation.tsx to show tier-appropriate links (volunteers list for Tier 2+)

**Checkpoint**: User Stories 1 AND 2 complete - authentication and profile management both functional ✅

---

## Phase 5: User Story 3 - Volunteer Gamification and Points (Priority: P2)

**Goal**: Volunteers earn points for activities, receive badge tiers (every 20 points), and track achievements. Points can be reset annually.

**Independent Test**: Record volunteer activity, verify point award, check badge level at thresholds (20, 40, 60, 80, 100+), confirm annual reset preserves history.

### Backend Implementation for User Story 3

- [X] T055 [P] [US3] Create Zod validation schemas in backend/src/utils/validation/points.schema.ts (revokePointsSchema, listPointsSchema, leaderboardSchema) from contracts/points-api.md
- [X] T056 [P] [US3] Enhance PointsService in backend/src/services/points.service.ts with point event creation, balance updates, badge tier calculation, revocation logic
- [X] T057 [P] [US3] Create BadgeTierService in backend/src/services/badge-tier.service.ts with tier threshold checking, tier upgrade/downgrade, history tracking
- [X] T058 [P] [US3] Create LeaderboardService in backend/src/services/leaderboard.service.ts with cache update logic, ranking calculation
- [X] T059 [US3] Implement GET /api/points/me endpoint in backend/src/api/points.controller.ts (fetch own point history with pagination, year filter)
- [X] T060 [US3] Implement GET /api/points/volunteers/:volunteerId endpoint in backend/src/api/points.controller.ts (fetch specific volunteer points) restricted to Tier 2+ or self
- [X] T061 [US3] Implement POST /api/points/revoke/:pointEventId endpoint in backend/src/api/points.controller.ts (revoke points with reason, audit trail) restricted to Tier 2+
- [X] T062 [US3] Implement GET /api/leaderboard endpoint in backend/src/api/points.controller.ts (fetch ranked volunteers with pagination, only leaderboardOptIn=true)
- [X] T063 [US3] Implement GET /api/badge-tiers endpoint in backend/src/api/points.controller.ts (fetch all badge tier definitions)
- [X] T064 [US3] Implement GET /api/badge-tiers/me/history endpoint in backend/src/api/points.controller.ts (fetch own badge tier progression history)

### Frontend Implementation for User Story 3

- [X] T065 [P] [US3] Create points display components in frontend/src/components/shared/points/ (PointsBalance, BadgeTier, PointsHistory)
- [X] T066 [P] [US3] Create points API service in frontend/src/services/points.service.ts with Axios methods for all points endpoints
- [X] T067 [US3] Create points page in frontend/src/app/points/page.tsx displaying own points, badge tier, and history
- [X] T068 [US3] Create leaderboard page in frontend/src/app/leaderboard/page.tsx with ranked volunteers, current user position, opt-in toggle
- [X] T069 [US3] Create badge tier display component in frontend/src/components/shared/BadgeTierBadge.tsx with color coding and tier icons
- [X] T070 [US3] Add points badge to navigation header in frontend/src/components/layouts/header.tsx showing current points and badge tier
- [X] T071 [US3] Create point revocation dialog in frontend/src/components/shared/PointRevocationDialog.tsx (Tier 2+ only) with reason input

**Checkpoint**: User Stories 1, 2, AND 3 complete - authentication, profiles, and gamification all functional

---

## Phase 6: User Story 4 - Event Creation and Volunteer Signup (Priority: P2)

**Goal**: Den leaders/committee create events with activities and capacity limits. Volunteers sign up, withdraw, and receive points on completion.

**Independent Test**: Create event as Tier 2, have volunteers sign up, withdraw signup, mark event complete. Verify point awards.

### Backend Implementation for User Story 4

- [X] T072 [P] [US4] Create Zod validation schemas in backend/src/utils/validation/event.schema.ts (createEventSchema, updateEventSchema, completeEventSchema, signupSchema) from contracts/events-api.md
- [X] T073 [P] [US4] Create EventService in backend/src/services/event.service.ts with event CRUD, recurring event year-end date logic, completion workflow
- [X] T074 [P] [US4] Create SignupService in backend/src/services/signup.service.ts with capacity checking, signup/withdrawal logic
- [X] T075 [US4] Implement GET /api/events endpoint in backend/src/api/events.controller.ts (list events filtered by rank/upcoming/mySignups with pagination)
- [X] T076 [US4] Implement GET /api/events/:id endpoint in backend/src/api/events.controller.ts (fetch event details with activity slots and signups)
- [X] T077 [US4] Implement POST /api/events endpoint in backend/src/api/events.controller.ts (create event, auto-set recurringEndDate if recurring) restricted to Tier 2+
- [X] T078 [US4] Implement PUT /api/events/:id endpoint in backend/src/api/events.controller.ts (update event, prevent modification if complete) restricted to Tier 2+
- [X] T079 [US4] Implement POST /api/events/:id/complete endpoint in backend/src/api/events.controller.ts (mark complete, award points to non-withdrawn signups, add manual volunteers) restricted to Tier 2+
- [X] T080 [US4] Implement POST /api/events/:eventId/slots/:slotId/signup endpoint in backend/src/api/events.controller.ts (signup for activity, check capacity)
- [X] T081 [US4] Implement DELETE /api/events/:eventId/slots/:slotId/signup endpoint in backend/src/api/events.controller.ts (withdraw from activity)

### Frontend Implementation for User Story 4

- [X] T082 [P] [US4] Create event form components in frontend/src/components/forms/events/ (EventForm with activity slots, SignupButton, WithdrawButton)
- [X] T083 [P] [US4] Create event display components in frontend/src/components/shared/events/ (EventCard, EventDetails, ActivitySlotList)
- [X] T084 [P] [US4] Create events API service in frontend/src/services/events.service.ts with Axios methods for all event endpoints
- [X] T085 [US4] Create events list page in frontend/src/app/events/page.tsx with rank filters, upcoming toggle, mySignups filter
- [X] T086 [US4] Create event detail page in frontend/src/app/events/[id]/page.tsx with full event info, signup buttons, capacity indicators
- [X] T087 [US4] Create event creation page in frontend/src/app/events/create/page.tsx (Tier 2+ only) with EventForm component
- [X] T088 [US4] Create event edit page in frontend/src/app/events/[id]/edit/page.tsx (Tier 2+ only) with EventForm pre-populated
- [X] T089 [US4] Create event completion dialog in frontend/src/components/forms/events/CompleteEventDialog.tsx (Tier 2+ only) with manual volunteer addition
- [X] T090 [US4] Create navigation link for Events (already present in frontend/src/components/layouts/navigation.tsx for all tiers)

**Checkpoint**: User Stories 1-4 complete - authentication, profiles, gamification, and event management all functional

---

## Phase 7: User Story 5 - Activity Configuration (Priority: P3)

**Goal**: Site admins configure point system by adding, editing, removing volunteer activities with point values

**Independent Test**: Add new activity as admin, edit point value, verify activity appears in event creation. Verify historical points unchanged.

### Backend Implementation for User Story 5

- [ ] T091 [P] [US5] Create Zod validation schemas in backend/src/utils/validation/activity.schema.ts (createActivitySchema, updateActivitySchema) from contracts/reports-config-api.md
- [ ] T092 [P] [US5] Create ActivityTypeService in backend/src/services/activity-type.service.ts with CRUD operations, soft delete, category validation
- [ ] T093 [US5] Implement GET /api/pack-config/activity-types endpoint in backend/src/api/config.routes.ts (list all active activity types)
- [ ] T094 [US5] Implement POST /api/pack-config/activity-types endpoint in backend/src/api/config.routes.ts (create activity type) restricted to Tier 3
- [ ] T095 [US5] Implement PUT /api/pack-config/activity-types/:id endpoint in backend/src/api/config.routes.ts (update activity type, preserve historical points) restricted to Tier 3
- [ ] T096 [US5] Implement DELETE /api/pack-config/activity-types/:id endpoint in backend/src/api/config.routes.ts (soft delete, preserve historical records) restricted to Tier 3

### Frontend Implementation for User Story 5

- [ ] T097 [P] [US5] Create activity type form components in frontend/src/components/forms/config/ActivityTypeForm.tsx with category dropdown and point value validation
- [ ] T098 [P] [US5] Create activity type list component in frontend/src/components/shared/config/ActivityTypeList.tsx with edit/delete actions
- [ ] T099 [US5] Create activity configuration page in frontend/src/app/admin/activities/page.tsx (Tier 3 only) with ActivityTypeList and creation dialog
- [ ] T100 [US5] Update EventForm in frontend/src/components/forms/events/EventForm.tsx to fetch and display available activity types in activity slot selection

**Checkpoint**: User Stories 1-5 complete - can now customize point system

---

## Phase 8: User Story 6 - Leaderboard and Achievements (Priority: P3)

**Goal**: Volunteers view profiles with points/badges, see leaderboard of top volunteers, opt in/out of public display

**Independent Test**: Earn points, view leaderboard, toggle leaderboard visibility. Confirm profile shows badges and achievements.

### Frontend Implementation for User Story 6

*(Backend endpoints already implemented in Phase 5)*

- [ ] T101 [P] [US6] Create achievement display components in frontend/src/components/shared/achievements/ (AchievementBadge, AchievementHistory)
- [ ] T102 [US6] Enhance profile page in frontend/src/app/profile/page.tsx to display badges, current tier, historical achievements from badge tier history
- [ ] T103 [US6] Add leaderboard opt-in toggle in frontend/src/app/profile/edit/page.tsx with visual indicator of public/private status
- [ ] T104 [US6] Enhance leaderboard page in frontend/src/app/leaderboard/page.tsx to show badge tier icons, volunteer ranks with visual distinction for top 3
- [ ] T105 [US6] Create badge tier legend component in frontend/src/components/shared/BadgeTierLegend.tsx showing all tiers with point thresholds

**Checkpoint**: User Stories 1-6 complete - full gamification experience with leaderboards

---

## Phase 9: User Story 7 - Administrative Task Management (Priority: P3)

**Goal**: Den leaders/committee create administrative tasks (medical forms, dues, training) with due dates. Volunteers view assigned tasks and mark complete.

**Independent Test**: Create admin task as Tier 2, assign to role, verify volunteers see task, mark complete. Check overdue status.

### Backend Implementation for User Story 7

- [ ] T106 [P] [US7] Create Zod validation schemas in backend/src/utils/validation/admin-task.schema.ts (createTaskSchema, updateTaskSchema, completeTaskSchema) from contracts/admin-tasks-api.md
- [ ] T107 [P] [US7] Create AdminTaskService in backend/src/services/admin-task.service.ts with CRUD operations, role assignment logic, completion tracking, recurring task year-end logic
- [ ] T108 [US7] Implement GET /api/admin-tasks endpoint in backend/src/api/admin-tasks.routes.ts (list tasks with assignedToMe/status/taskId filters, calculate isOverdue)
- [ ] T109 [US7] Implement GET /api/admin-tasks/:id endpoint in backend/src/api/admin-tasks.routes.ts (fetch task details, show completions array for Tier 2+)
- [ ] T110 [US7] Implement POST /api/admin-tasks endpoint in backend/src/api/admin-tasks.routes.ts (create task, validate role assignments, set recurringEndDate) restricted to Tier 2+
- [ ] T111 [US7] Implement PUT /api/admin-tasks/:id endpoint in backend/src/api/admin-tasks.routes.ts (update task) restricted to Tier 2+
- [ ] T112 [US7] Implement POST /api/admin-tasks/:id/complete endpoint in backend/src/api/admin-tasks.routes.ts (mark complete for current user, create notification)
- [ ] T113 [US7] Implement DELETE /api/admin-tasks/:id endpoint in backend/src/api/admin-tasks.routes.ts (soft delete) restricted to Tier 2+
- [ ] T114 [US7] Implement GET /api/admin-tasks/:id/completions endpoint in backend/src/api/admin-tasks.routes.ts (view completion status across volunteers) restricted to Tier 2+

### Frontend Implementation for User Story 7

- [ ] T115 [P] [US7] Create admin task form components in frontend/src/components/forms/tasks/ (AdminTaskForm with completion steps editor, role selector)
- [ ] T116 [P] [US7] Create admin task display components in frontend/src/components/shared/tasks/ (TaskCard, TaskDetails, CompletionSteps with URLs)
- [ ] T117 [P] [US7] Create admin tasks API service in frontend/src/services/admin-tasks.service.ts with Axios methods for all admin task endpoints
- [ ] T118 [US7] Create admin tasks list page in frontend/src/app/tasks/page.tsx with status filters (complete/incomplete/overdue), overdue highlighting
- [ ] T119 [US7] Create admin task detail page in frontend/src/app/tasks/[id]/page.tsx with completion button and completion steps
- [ ] T120 [US7] Create admin task creation page in frontend/src/app/tasks/create/page.tsx (Tier 2+ only) with AdminTaskForm
- [ ] T121 [US7] Create admin task edit page in frontend/src/app/tasks/[id]/edit/page.tsx (Tier 2+ only) with AdminTaskForm pre-populated
- [ ] T122 [US7] Create task completion tracking page in frontend/src/app/tasks/[id]/completions/page.tsx (Tier 2+ only) showing volunteer completion status
- [ ] T123 [US7] Update navigation in frontend/src/components/layouts/nav.tsx to include Tasks link for all tiers

**Checkpoint**: User Stories 1-7 complete - administrative task tracking functional

---

## Phase 10: User Story 8 - Pack and Role Configuration (Priority: P3)

**Goal**: Site admins configure pack info (name, number, year dates, ranks) and manage volunteer roles with descriptions

**Independent Test**: Configure pack as admin, set year dates, manage roles. Verify recurring events/tasks end at year-end date.

### Backend Implementation for User Story 8

- [ ] T124 [P] [US8] Create Zod validation schemas in backend/src/utils/validation/config.schema.ts (updatePackConfigSchema, createRoleSchema, updateRoleSchema) from contracts/reports-config-api.md
- [ ] T125 [P] [US8] Create PackConfigService in backend/src/services/pack-config.service.ts with config CRUD, year-end date updates to recurring events/tasks
- [ ] T126 [P] [US8] Create VolunteerRoleService in backend/src/services/volunteer-role.service.ts with role CRUD, soft delete with historical preservation, deletion prevention if role in use
- [ ] T127 [US8] Implement GET /api/pack-config endpoint in backend/src/api/config.routes.ts (fetch pack configuration)
- [ ] T128 [US8] Implement PUT /api/pack-config endpoint in backend/src/api/config.routes.ts (update pack config, cascade year-end date changes) restricted to Tier 3
- [ ] T129 [US8] Implement GET /api/volunteer-roles endpoint in backend/src/api/config.routes.ts (list all active volunteer roles)
- [ ] T130 [US8] Implement POST /api/volunteer-roles endpoint in backend/src/api/config.routes.ts (create new role) restricted to Tier 3
- [ ] T131 [US8] Implement PUT /api/volunteer-roles/:id endpoint in backend/src/api/config.routes.ts (update role description) restricted to Tier 3
- [ ] T132 [US8] Implement DELETE /api/volunteer-roles/:id endpoint in backend/src/api/config.routes.ts (soft delete, check for usage in future events) restricted to Tier 3

### Frontend Implementation for User Story 8

- [ ] T133 [P] [US8] Create pack config form component in frontend/src/components/forms/config/PackConfigForm.tsx with year date pickers and active ranks checkboxes
- [ ] T134 [P] [US8] Create volunteer role form component in frontend/src/components/forms/config/VolunteerRoleForm.tsx with role type selector, specialty/rank fields
- [ ] T135 [P] [US8] Create config API service in frontend/src/services/config.service.ts with Axios methods for pack config and role endpoints
- [ ] T136 [US8] Create pack configuration page in frontend/src/app/admin/config/page.tsx (Tier 3 only) with PackConfigForm
- [ ] T137 [US8] Create volunteer roles management page in frontend/src/app/admin/roles/page.tsx (Tier 3 only) with role list, create/edit/delete actions
- [ ] T138 [US8] Update application header in frontend/src/app/layout.tsx to display pack name and number from pack config
- [ ] T139 [US8] Update navigation in frontend/src/components/layouts/nav.tsx to include Admin section with Config and Roles links (Tier 3 only)

**Checkpoint**: User Stories 1-8 complete - pack configuration and role management functional

---

## Phase 11: User Story 9 - Volunteer and Administrative Reporting (Priority: P4)

**Goal**: Den leaders/committee generate reports on volunteer participation and admin task completion with filters

**Independent Test**: Generate participation report, filter by rank, verify data accuracy. Generate admin task report, filter by overdue status.

### Backend Implementation for User Story 9

- [ ] T140 [P] [US9] Create Zod validation schemas in backend/src/utils/validation/reports.schema.ts (participationReportSchema, adminTaskReportSchema) from contracts/reports-config-api.md
- [ ] T141 [P] [US9] Create ReportsService in backend/src/services/reports.service.ts with participation aggregation, admin task completion aggregation, date range filtering
- [ ] T142 [US9] Implement GET /api/reports/participation endpoint in backend/src/api/reports.routes.ts (generate summary or detailed participation reports) restricted to Tier 2+
- [ ] T143 [US9] Implement GET /api/reports/administrative-tasks endpoint in backend/src/api/reports.routes.ts (generate summary or detailed admin task completion reports) restricted to Tier 2+

### Frontend Implementation for User Story 9

- [ ] T144 [P] [US9] Create report filter components in frontend/src/components/forms/reports/ (ReportFilters with date range, rank level, format selectors)
- [ ] T145 [P] [US9] Create report display components in frontend/src/components/shared/reports/ (ParticipationReportTable, AdminTaskReportTable, ReportStats)
- [ ] T146 [P] [US9] Create reports API service in frontend/src/services/reports.service.ts with Axios methods for report endpoints
- [ ] T147 [US9] Create reports dashboard page in frontend/src/app/reports/page.tsx (Tier 2+ only) with report type selector
- [ ] T148 [US9] Create participation report page in frontend/src/app/reports/participation/page.tsx (Tier 2+ only) with filters and summary/detailed toggle
- [ ] T149 [US9] Create admin task report page in frontend/src/app/reports/administrative-tasks/page.tsx (Tier 2+ only) with filters and summary/detailed toggle
- [ ] T150 [US9] Add export functionality in frontend/src/components/shared/reports/ExportButton.tsx to download reports as CSV
- [ ] T151 [US9] Update navigation in frontend/src/components/layouts/nav.tsx to include Reports link (Tier 2+ only)

**Checkpoint**: User Stories 1-9 complete - reporting capabilities functional

---

## Phase 12: User Story 10 - Notifications (Priority: P4)

**Goal**: Volunteers receive in-app notifications for badge achievements, task completions, and event reminders

**Independent Test**: Earn badge, verify notification appears. Complete task, verify confirmation notification.

### Backend Implementation for User Story 10

- [ ] T152 [P] [US10] Create NotificationService in backend/src/services/notification.service.ts with notification creation, retrieval, mark-as-read logic
- [ ] T153 [US10] Implement GET /api/notifications endpoint in backend/src/api/notifications.routes.ts (fetch user notifications with unread count, pagination)
- [ ] T154 [US10] Implement PUT /api/notifications/:id/read endpoint in backend/src/api/notifications.routes.ts (mark notification as read)
- [ ] T155 [US10] Implement PUT /api/notifications/read-all endpoint in backend/src/api/notifications.routes.ts (mark all notifications as read)
- [ ] T156 [US10] Update BadgeTierService in backend/src/services/badge-tier.service.ts to create BADGE_ACHIEVEMENT notification on tier upgrade
- [ ] T157 [US10] Update AdminTaskService in backend/src/services/admin-task.service.ts to create TASK_COMPLETION notification on task completion (already partially implemented in T112)
- [ ] T158 [US10] Create scheduled job script in backend/src/jobs/event-reminders.ts to send EVENT_REMINDER notifications 48 hours before events

### Frontend Implementation for User Story 10

- [ ] T159 [P] [US10] Create notification display components in frontend/src/components/shared/notifications/ (NotificationDropdown, NotificationItem)
- [ ] T160 [P] [US10] Create notifications API service in frontend/src/services/notifications.service.ts with Axios methods for notification endpoints
- [ ] T161 [US10] Create notifications dropdown in frontend/src/components/layouts/header.tsx with unread count badge, mark-as-read functionality
- [ ] T162 [US10] Create notifications page in frontend/src/app/notifications/page.tsx with full notification list, filters, mark all as read button
- [ ] T163 [US10] Add notification polling or WebSocket connection in frontend/src/lib/notification-context.tsx to check for new notifications every 30 seconds
- [ ] T164 [US10] Update navigation in frontend/src/components/layouts/nav.tsx to include notifications bell icon with unread badge

**Checkpoint**: User Stories 1-10 complete - all feature requirements implemented

---

## Phase 13: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T165 [P] Create comprehensive API documentation in docs/api-documentation.md using OpenAPI/Swagger spec from all contracts
- [ ] T166 [P] Create developer documentation in backend/README.md and frontend/README.md with setup, architecture, deployment instructions
- [ ] T167 [P] Setup audit logging middleware in backend/src/middleware/audit.ts to create AuditLog entries for all Tier 2+ actions
- [ ] T168 [P] Add loading states and error boundaries in frontend/src/components/shared/LoadingSpinner.tsx and ErrorBoundary.tsx
- [ ] T169 [P] Implement responsive design improvements across all frontend pages for mobile devices (tablets, phones)
- [ ] T170 Create 404 and error pages in frontend/src/app/not-found.tsx and frontend/src/app/error.tsx
- [ ] T171 Add accessibility improvements (ARIA labels, keyboard navigation) across all frontend components
- [ ] T172 Implement rate limiting across all backend API endpoints using express-rate-limit middleware
- [ ] T173 Add input sanitization in backend/src/middleware/sanitize.ts to prevent XSS attacks
- [ ] T174 Create database backup script in backend/scripts/backup-database.sh
- [ ] T175 Run quickstart.md validation to ensure developer setup guide is accurate and complete
- [ ] T176 Create production environment configuration in backend/.env.production.example and frontend/.env.production.example
- [ ] T177 Update project README.md in repository root with feature overview, quick start link, branch information

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup (Phase 1) completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational (Phase 2) completion - foundational for all other stories
- **User Story 2 (Phase 4)**: Depends on Foundational (Phase 2) completion - can run parallel to US1 but typically follows it
- **User Story 3 (Phase 5)**: Depends on User Story 2 (Phase 4) completion - requires VolunteerService and PointsService foundations
- **User Story 4 (Phase 6)**: Depends on User Story 2 (Phase 4) completion - requires volunteer roles, uses PointsService from US3
- **User Story 5 (Phase 7)**: Depends on Foundational (Phase 2) completion - independent of user stories 1-4
- **User Story 6 (Phase 8)**: Depends on User Story 3 (Phase 5) completion - uses leaderboard and badge tier APIs
- **User Story 7 (Phase 9)**: Depends on User Story 2 (Phase 4) completion - requires volunteer roles
- **User Story 8 (Phase 10)**: Depends on Foundational (Phase 2) completion - independent of user stories 1-7
- **User Story 9 (Phase 11)**: Depends on User Stories 2-4 and 7 completion - requires events and admin tasks data
- **User Story 10 (Phase 12)**: Depends on User Stories 3 and 7 completion - triggers notifications from badge tiers and task completions
- **Polish (Phase 13)**: Depends on all desired user stories being complete

### User Story Independence

Most user stories can be implemented independently after Foundational phase:
- **US1 (Auth)**: Independent, foundational for all
- **US2 (Profiles)**: Independent after US1
- **US3 (Points)**: Requires US2 for volunteer context
- **US4 (Events)**: Requires US2 for roles, integrates with US3 for point awards
- **US5 (Activity Config)**: Independent, enhances US4
- **US6 (Leaderboard)**: Requires US3 for points data
- **US7 (Admin Tasks)**: Requires US2 for role assignments
- **US8 (Pack Config)**: Independent, affects US4 and US7 (year-end dates)
- **US9 (Reporting)**: Requires US2, US4, US7 for data
- **US10 (Notifications)**: Requires US3, US7 for triggering events

### Parallel Opportunities Within Phases

**Phase 1 (Setup)**: T003, T004, T006 can run parallel to T001-T002

**Phase 2 (Foundational)**: T009, T011, T012, T013, T015, T016, T017, T018, T019 can all run in parallel after T008 (Prisma schema)

**Phase 3 (User Story 1)**: T021, T022, T023 can run in parallel; T031, T032 can run in parallel

**Phase 4 (User Story 2)**: T038, T039, T040 can run in parallel; T048, T049 can run in parallel

**Phase 5 (User Story 3)**: T055, T056, T057, T058 can run in parallel; T065, T066 can run in parallel

**Phase 6 (User Story 4)**: T072, T073, T074 can run in parallel; T082, T083, T084 can run in parallel

**Phase 7 (User Story 5)**: T091, T092 can run in parallel; T097, T098 can run in parallel

**Phase 8 (User Story 6)**: T101 can be done independently

**Phase 9 (User Story 7)**: T106, T107 can run in parallel; T115, T116, T117 can run in parallel

**Phase 10 (User Story 8)**: T124, T125, T126 can run in parallel; T133, T134, T135 can run in parallel

**Phase 11 (User Story 9)**: T140, T141 can run in parallel; T144, T145, T146 can run in parallel

**Phase 12 (User Story 10)**: T152, T159, T160 can run in parallel

**Phase 13 (Polish)**: T165, T166, T167, T168, T169 can all run in parallel

---

## Implementation Strategy

### MVP First (User Stories 1 & 2 Only) ⭐ RECOMMENDED

1. Complete Phase 1: Setup (T001-T007)
2. Complete Phase 2: Foundational (T008-T020) ← CRITICAL BLOCKING PHASE
3. Complete Phase 3: User Story 1 - Authentication (T021-T037)
4. Complete Phase 4: User Story 2 - Profile Management (T038-T054)
5. **STOP and VALIDATE**: Test authentication and profile management independently
6. Deploy/demo if ready - volunteers can register, create profiles, select roles

**MVP Delivers**: Secure volunteer account management with role-based permissions (Tier 1, 2, 3)

### Incremental Delivery (Recommended Priority Order)

1. **Foundation** (Phases 1-2) → System infrastructure ready
2. **MVP** (Phases 3-4: US1-US2) → Authentication and profiles → Deploy ✅
3. **Core Value** (Phases 5-6: US3-US4) → Add points and events → Deploy ✅
4. **Enhanced Features** (Phases 7-10: US5-US8) → Add configuration and admin tasks → Deploy ✅
5. **Analytics** (Phase 11: US9) → Add reporting → Deploy ✅
6. **Engagement** (Phase 12: US10) → Add notifications → Deploy ✅
7. **Production Ready** (Phase 13) → Polish and harden → Final Deploy ✅

Each increment adds value without breaking previous functionality.

### Parallel Team Strategy

With multiple developers after Foundational phase completes:

- **Developer A**: User Story 1 (Auth) → User Story 3 (Points) → User Story 6 (Leaderboard)
- **Developer B**: User Story 2 (Profiles) → User Story 4 (Events) → User Story 5 (Activity Config)
- **Developer C**: User Story 7 (Admin Tasks) → User Story 8 (Pack Config) → User Story 9 (Reporting)
- **Developer D**: User Story 10 (Notifications) → Phase 13 (Polish)

Stories can be developed independently and integrated as completed.

---

## Summary Statistics

- **Total Tasks**: 177
- **Parallelizable Tasks**: 54 tasks marked with [P]
- **User Story Distribution**:
  - Setup (Phase 1): 7 tasks
  - Foundational (Phase 2): 13 tasks
  - US1 - Auth (P1): 17 tasks
  - US2 - Profiles (P1): 17 tasks
  - US3 - Points (P2): 17 tasks
  - US4 - Events (P2): 19 tasks
  - US5 - Activity Config (P3): 10 tasks
  - US6 - Leaderboard (P3): 5 tasks
  - US7 - Admin Tasks (P3): 19 tasks
  - US8 - Pack Config (P3): 16 tasks
  - US9 - Reporting (P4): 12 tasks
  - US10 - Notifications (P4): 13 tasks
  - Polish (Phase 13): 13 tasks

**MVP Scope** (US1-US2): 54 tasks (30% of total)
**Core Value** (US1-US4): 90 tasks (51% of total)
**Full Feature Set** (US1-US10): 164 tasks (93% of total)

---

## Notes

- All tasks follow strict checklist format: `- [ ] [TaskID] [P?] [Story?] Description with file path`
- [P] indicates different files with no dependencies - safe for parallel execution
- [Story] labels (US1-US10) map to user stories in spec.md for traceability
- Tests NOT included per template instructions (not explicitly requested in spec.md)
- Each user story phase is independently completable and testable
- File paths use web app conventions: backend/ and frontend/ at repository root
- Stop at any checkpoint to validate story delivery independently
- Commit after each task or logical group for version control
