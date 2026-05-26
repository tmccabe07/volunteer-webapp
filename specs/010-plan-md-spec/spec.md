# Feature Specification: Den Advancement Operations Workspace

**Feature Branch**: `010-plan-md-spec`  
**Created**: 2026-05-21  
**Status**: Draft  
**Input**: User description: "memory file plan.md"

## Clarifications

### Session 2026-05-21

- Q: Can more than one den leader manage the same den? -> A: Yes, multiple den leaders can co-manage a den.
- Q: If two den leaders act on the same pending item at nearly the same time, how should conflicts resolve? -> A: First successful action wins; later action sees already-processed state.
- Q: How should camping, hiking, and service hours be handled if parents must submit official hours in Scoutbook? -> A: Use category-specific suggested prompts only (Camping, Hiking, Service) with no authoritative in-app hour ledger.
- Q: How are child records created? -> A: Only admins can create child records, either by importing Scoutbook roster export data or by manual transfer-in entry.
- Q: How should leader approvals for parent-submitted completions be handled? -> A: Leaders approve in Scoutbook; this app provides reminders and reconciliation tracking rather than in-app authoritative approval processing.
- Q: How is award fulfillment evaluated? -> A: Evaluate in this app using app-tracked requirement progress plus Scoutbook reconciliation status; do not require recurring Scoutbook report checks to drive purchasing and inventory workflows.
- Q: For User Story 5, who sets category-specific suggested values? -> A: Leaders set suggested values during event closeout after attendance, with event-type/template defaults prefilled.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Record Den Meeting Outcomes (Priority: P1)

As a den leader, I can create den-scoped meetings, take Cub Scout attendance, and mark which requirements were covered so the pack has an accurate operational record immediately after each meeting.

**Why this priority**: Meeting attendance and covered-requirement capture is the foundation for all approval, purchasing, and Scoutbook reconciliation work.

**Independent Test**: Can be fully tested by creating a den meeting, marking attendance for multiple Cub Scouts, recording covered requirements, and verifying child records update without affecting volunteer point credit logic.

**Acceptance Scenarios**:

1. **Given** a den leader assigned to one den, **When** they open event creation, **Then** the event scope defaults to that den and rank.
2. **Given** a den leader assigned to multiple dens, **When** they create an event, **Then** they must explicitly choose one assigned den or choose pack-wide scope.
3. **Given** a den meeting event, **When** attendance is recorded, **Then** attendance is stored per Cub Scout and does not award volunteer points.
4. **Given** covered requirements are recorded for attendees, **When** the meeting is saved, **Then** parent/leader requirement workflows can proceed for each affected Cub Scout.

---

### User Story 2 - Parent Completion and Leader Approval (Priority: P2)

As a parent, I can mark my linked child requirements as completed outside meetings, and as a leader I can use reminders to complete Scoutbook approvals and record reconciliation status.

**Why this priority**: Advancement happens both during and outside meetings; parent-submitted completions must be captured while preserving Scoutbook as the official approval location.

**Independent Test**: Can be fully tested by linking parent-child accounts, submitting parent-completed requirements with optional notes, generating leader reminder items, and recording Scoutbook reconciliation outcomes.

**Acceptance Scenarios**:

1. **Given** a parent is linked to a child, **When** they mark a requirement completed, **Then** the item enters a pending Scoutbook-approval reminder queue.
2. **Given** a pending reminder item, **When** a den leader or advancement role completes approval in Scoutbook and marks it reconciled in this app, **Then** the item status updates and contributes to progress and award fulfillment.
3. **Given** a pending reminder item, **When** a leader declines reconciliation, **Then** the parent sees feedback and the item remains unresolved.
4. **Given** an override is required, **When** advancement chair or committee chair performs an override, **Then** the system records override reason and actor.
5. **Given** two eligible den leaders submit reconciliation updates for the same pending reminder item at nearly the same time, **When** the first update is committed, **Then** the second leader receives an already-processed message with the current final state.

---

### User Story 3 - Fulfill and Reconcile Awards (Priority: P3)

As an advancement-focused leader, I can track approved awards through purchase and distribution, including special awards, and reconcile completion entry with Scoutbook.

**Why this priority**: Without purchase/distribution tracking, approved items are frequently delayed or missed; a unified queue reduces operational gaps.

**Independent Test**: Can be fully tested by progressing award items through approved, purchased, and distributed states, viewing inventory impact, and marking reconciliation status for Scoutbook entry.

**Acceptance Scenarios**:

1. **Given** app-tracked requirement progress and reconciliation status indicate an adventure is eligible, **When** award fulfillment is evaluated, **Then** an award item is generated or updated for that child and adventure.
2. **Given** a special award nomination, **When** it is approved, **Then** it follows the same purchase/distribution lifecycle as adventure awards.
3. **Given** a purchase action, **When** a purchaser records it, **Then** the system prompts/reminds them to use the existing reimbursement Google Form.
4. **Given** an item is distributed, **When** reconciliation is updated, **Then** it appears as entered or pending for Scoutbook manual entry tracking.

---

### User Story 5 - Prompt Scoutbook Hour Entry (Priority: P3)

As a parent, I receive category-specific suggested values after relevant events so I can submit official Camping, Hiking, and Service hours in Scoutbook.

**Why this priority**: This reduces missed or inconsistent hour entry while preserving Scoutbook as the source of record.

**Independent Test**: Can be fully tested by marking event attendance for a child, triggering category-specific prompts, and verifying no authoritative in-app hour totals are created.

**Acceptance Scenarios**:

1. **Given** a qualifying campout event attendance, **When** post-event prompts are generated, **Then** parents receive suggested camping days/nights for Scoutbook submission.
2. **Given** a qualifying hike attendance, **When** prompts are generated, **Then** parents receive suggested hiking values for Scoutbook submission.
3. **Given** a qualifying service participation event, **When** prompts are generated, **Then** parents receive suggested service hours for Scoutbook submission.
4. **Given** a qualifying event is being closed out, **When** the leader reviews hours prompts, **Then** category-specific suggested values are prefilled from event-type/template defaults and can be adjusted before prompts are sent.
5. **Given** any hours prompt, **When** the parent completes the action, **Then** the app records prompt/reconciliation status only and does not store authoritative submitted hour totals.

---

### User Story 4 - Role Scope and Privacy Control (Priority: P3)

As a pack administrator, I can manage registered and standing roles with den scope so users can do assigned work without gaining excessive permissions.

**Why this priority**: Role scoping and privacy controls are required for safe parent access, den autonomy, and pack-wide oversight.

**Independent Test**: Can be fully tested by assigning scoped roles, verifying access for parent/den leader/pack-level roles, and confirming unauthorized records/actions are blocked.

**Acceptance Scenarios**:

1. **Given** a parent account, **When** they view youth data, **Then** they can only access linked child records.
2. **Given** a den leader assignment, **When** they view youth records, **Then** they can access children in assigned dens only.
3. **Given** a Cubmaster or Committee Chair role, **When** they view records, **Then** they can access all child records pack-wide.
4. **Given** a standing unregistered duty role, **When** the user performs actions, **Then** only explicitly granted capabilities are available.
5. **Given** multiple den leaders are assigned to the same den, **When** they access den operations, **Then** each assigned leader can perform den-scoped actions based on role permissions.

### Edge Cases

- Parent attempts to mark completion for a non-linked child.
- Non-admin user attempts to create or import child records.
- Den leader attempts to create an event for an unassigned den.
- Two den leaders update the same pending approval item at nearly the same time.
- Child changes dens after historical attendance and advancement records already exist.
- Den split mid-year (e.g., Den 1 with 30 kids splits into Den 1, Den 10, Den 11); system must preserve historical membership and advancement records for all affected children.
- Den consolidation mid-year (e.g., Den 10 and Den 11 combined back into Den 1); system must preserve full membership history for all affected children.
- Annual rollover advances rank while unfinished prior-rank adventures remain incomplete and non-awardable.
- Duplicate parent-child link requests for the same child.
- Duplicate purchase/distribution actions on the same award item.
- Meeting post-notification is disabled for a specific event while den default is enabled.
- Scoutbook-approval reminder items age without reconciliation; reminders continue without auto-approval.
- Parent ignores a generated hours prompt; system must remind without creating synthetic hour entries.
- Event closeout occurs with missing default suggested values; leader must set explicit values before prompts are issued.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support den-scoped events with explicit distinction between den events and pack-wide events.
- **FR-002**: System MUST default event scope to the user's single active den-leader assignment when exactly one exists.
- **FR-003**: System MUST require explicit den selection when a user has multiple active den assignments.
- **FR-004**: System MUST always allow users with pack event permission to switch an event to pack-wide scope.
- **FR-005**: System MUST record attendance per Cub Scout independent of volunteer signup and point workflows.
- **FR-006**: System MUST keep volunteer point-credit behavior in Complete Event separate from Cub Scout attendance behavior.
- **FR-007**: System MUST allow linked parents/guardians to mark requirements completed at any time, including outside meetings.
- **FR-008**: System MUST provide a leader reminder and reconciliation queue for parent-completed requirements requiring Scoutbook approval.
- **FR-009**: System MUST restrict override actions to advancement chair and committee chair roles and record required override reasons.
- **FR-010**: System MUST maintain requirement status progression compatible with Completed, Approved, and Awarded reconciliation states.
- **FR-011**: System MUST track internal award fulfillment states for purchase and distribution between Approved and Awarded.
- **FR-012**: System MUST support special awards that are not tied to standard adventure completion while using the same fulfillment workflow.
- **FR-013**: System MUST model award inventory by rank plus adventure/special award name and track quantity adjustments.
- **FR-014**: System MUST provide a purchase-time reminder/CTA to the existing reimbursement Google Form.
- **FR-015**: System MUST support parent-child linking through a leader approval workflow.
- **FR-016**: System MUST enforce visibility boundaries: parents only linked children, den leaders assigned dens, Cubmaster/Committee Chair pack-wide.
- **FR-016a**: System MUST support multiple active den-leader assignments to the same den without reducing authorized access for assigned leaders.
- **FR-017**: System MUST keep advancement history associated with each child regardless of den changes.
- **FR-018**: System MUST implement annual rollover that advances all active dens to the next rank level and advances all children to the next rank regardless of rank completion status.
- **FR-019**: System MUST prevent unfinished adventures from being automatically purchased or awarded during rollover.
- **FR-020**: System MUST provide configurable parent notifications for post-meeting updates with default enabled.
- **FR-021**: System MUST allow ad-hoc den leader communications to parents.
- **FR-022**: System MUST provide rank progress visibility including required adventure completion and elective minimum progress.
- **FR-023**: System MUST surface rank eligibility when required and elective thresholds are met.
- **FR-024**: System MUST track Scoutbook reconciliation state as pending vs entered for relevant advancement and award items.
- **FR-025**: System MUST include data quality controls for duplicate linkage, duplicate award actions, stale approvals, and reconciliation gaps.
- **FR-026**: System MUST support transfer-in/out operational handling while treating Scoutbook as the historical source of record.
- **FR-027**: System MUST enforce first-write-wins conflict handling for concurrent reconciliation updates on the same pending reminder item and return the latest persisted state to subsequent conflicting actions.
- **FR-028**: System MUST generate category-specific post-event hour prompts for Camping, Hiking, and Service participation when eligible event attendance exists.
- **FR-029**: System MUST direct parents to submit official hour values in Scoutbook and MUST NOT treat in-app suggested values as authoritative records of submitted hours.
- **FR-030**: System MUST allow configurable reminder notifications for unresolved Camping/Hiking/Service prompt actions.
- **FR-030a**: System MUST require leader review of category-specific suggested Camping/Hiking/Service values during event closeout before parent prompts are issued.
- **FR-030b**: System MUST prefill suggested Camping/Hiking/Service values from event-type or template defaults and allow leader adjustment at closeout time.
- **FR-031**: System MUST restrict child-record creation to admin users only.
- **FR-032**: System MUST support admin child-record creation via bulk Scoutbook roster export import.
- **FR-033**: System MUST support admin manual child-record entry for transfer-in scenarios during the program year.
- **FR-034**: System MUST evaluate adventure award eligibility using app-tracked requirement progress combined with Scoutbook reconciliation state tracked in this app.
- **FR-035**: System MUST create and maintain award-needed records in this app to drive inventory reconciliation, purchasing, and distribution workflows.
- **FR-036**: System MUST NOT require recurring manual Scoutbook report checks as the primary trigger for award-needed record generation.
- **FR-037**: System MUST support den splits and restructuring by allowing admins to create new dens mid-year and transfer children between dens while preserving membership history.
- **FR-037a**: System MUST support den consolidation (combining multiple dens) by transferring all children to a target den and marking source dens as inactive.
- **FR-038**: System MUST support Den Chief youth leader accounts with login access and view-only permissions for assigned den information.
- **FR-038a**: System MUST allow Den Chiefs to volunteer for den and pack-level events through the volunteer signup system.
- **FR-038b**: System MUST support time-bounded Den Chief assignments to dens (e.g., 6 months or full scout year) with assignment and unassignment workflows.
- **FR-038c**: System MUST allow one Den Chief to be assigned to multiple dens simultaneously, and one den to have multiple Den Chiefs.
- **FR-038d**: System MUST restrict Den Chief assignment management to pack admins and den leaders.
- **FR-038e**: System MUST send event notifications to Den Chiefs assigned to the den for den-scoped and pack-wide events.

### Key Entities *(include if feature involves data)*

- **Den**: A persistent group with a pack-wide unique den number that advances through rank levels annually. Den numbers remain constant (e.g., "Den 8") while the rank level changes (Tigers → Wolves → Bears → Webelos → AOL). AOL dens close out during rollover as AOL is the final Cub Scout rank. Den numbers can be reused after a den is closed (e.g., AOL Den 2 closes in spring, number reassigned to Lion Den 2 in fall).
- **ChildScout**: A youth record used for attendance, advancement status, award fulfillment, and rank rollover.
- **ChildImportBatch**: Admin-run import job record for Scoutbook roster export processing, including source file metadata, run status, and row-level results.
- **ParentChildLink**: Relationship between volunteer account and child record, with approval state and audit history.
- **DenMembership**: Time-bounded child-to-den assignment history.
- **DenEvent**: A den or pack activity definition with scope, schedule, and post-meeting communication settings.
- **ChildAttendance**: Per-event per-child attendance record and attendance outcome.
- **AdventureDefinition**: Catalog entry for a rank-specific required/elective/special elective adventure.
- **DenChief**: Scouting America youth leader profile with login credentials, email, and Scoutbook ID for helping with den activities.
- **DenChiefAssignment**: Time-bounded assignment relationship between Den Chief and Den with audit trail.
- **RequirementDefinition**: Requirement metadata under an adventure, including display order and text.
- **RequirementProgress**: Child-specific requirement state with completer, approver, timestamps, and optional notes/evidence.
- **AwardItemFulfillment**: Child-specific award logistics record for adventure or special awards, including internal lifecycle states.
- **SpecialAwardDefinition**: Catalog entry for non-standard awards with category and optional verification expectations.
- **InventoryItem**: Stock tracking by rank and award name with on-hand quantity and adjustment history.
- **ReconciliationRecord**: Tracking state for manual Scoutbook entry and completion audit data.
- **HoursPrompt**: Parent-facing prompt record for Camping/Hiking/Service suggested values, reminder status, and Scoutbook submission reconciliation state.
- **ScopedRoleAssignment**: Role assignment with scope (pack/rank/den), registration status, capability set, and lifecycle metadata.

### Assumptions

- Scoutbook remains the official historical repository; this feature does not perform direct Scoutbook API integration.
- Reimbursement processing continues in the existing Google Form outside this system.
- Users with relevant leadership permissions can create pack-wide events even if they also hold den-scoped roles.
- Notification delivery channels use existing app notification infrastructure.
- Camping, Hiking, and Service hour submissions remain official only in Scoutbook; this app supports prompting and reconciliation tracking only.
- Child records are seeded and maintained operationally through admin-controlled import/manual entry; Scoutbook remains the historical source of truth.
- Award fulfillment decisions are operationally computed in this app from local progress and reconciliation markers, while Scoutbook remains the official record system.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 95% of den meetings have child attendance and covered requirements recorded within 24 hours of meeting end.
- **SC-002**: 90% of parent-submitted make-up requirement completions are reviewed by a leader within 14 days.
- **SC-003**: 100% of distributed award items have a recorded fulfillment trail (approved, purchased, distributed) and actor timestamps.
- **SC-004**: Less than 2% of monthly advancement records require manual correction due to duplicate or mismatched child/award data.
- **SC-005**: At least 90% of eligible rank advancements are flagged as eligible in-app before den leaders report completion in Scoutbook.
- **SC-006**: Access-control audits show zero unauthorized cross-child record views for parent-level accounts.
