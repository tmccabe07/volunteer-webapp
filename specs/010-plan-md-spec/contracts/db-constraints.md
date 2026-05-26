# Database Constraints & Validation Rules

**Feature**: Den Advancement Operations Workspace  
**Version**: 1.0  
**Database**: PostgreSQL (production), SQLite (development)

## Overview

This document defines all database-level constraints, validation rules, and data integrity checks for the advancement operations feature.

## Constraint Categories

1. **NOT NULL** - Required fields
2. **UNIQUE** - Uniqueness constraints
3. **CHECK** - Value constraints
4. **FOREIGN KEY** - Referential integrity
5. **INDEX** - Query performance
6. **TRIGGER** - Business logic enforcement (if needed)

---

## ChildScout Constraints

### Primary Constraints
```sql
-- Primary key
ALTER TABLE child_scout ADD CONSTRAINT pk_child_scout PRIMARY KEY (id);

-- Required fields (NOT NULL)
ALTER TABLE child_scout ALTER COLUMN first_name SET NOT NULL;
ALTER TABLE child_scout ALTER COLUMN last_name SET NOT NULL;
ALTER TABLE child_scout ALTER COLUMN current_rank SET NOT NULL;
ALTER TABLE child_scout ALTER COLUMN is_active SET NOT NULL DEFAULT true;
ALTER TABLE child_scout ALTER COLUMN created_by SET NOT NULL;

-- String length constraints
ALTER TABLE child_scout ADD CONSTRAINT chk_first_name_length 
  CHECK (char_length(first_name) >= 1 AND char_length(first_name) <= 50);

ALTER TABLE child_scout ADD CONSTRAINT chk_last_name_length 
  CHECK (char_length(last_name) >= 1 AND char_length(last_name) <= 50);

-- Soft delete constraint
ALTER TABLE child_scout ADD CONSTRAINT chk_deleted_at_after_created 
  CHECK (deleted_at IS NULL OR deleted_at >= created_at);
```

### Indexes
```sql
CREATE INDEX idx_child_scout_rank_active ON child_scout(current_rank, is_active);
CREATE INDEX idx_child_scout_name ON child_scout(last_name, first_name);
CREATE INDEX idx_child_scout_deleted ON child_scout(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_child_scout_scoutbook_id ON child_scout(scoutbook_id) WHERE scoutbook_id IS NOT NULL;
```

**Rationale**:
- `idx_child_scout_rank_active`: Filter active children by rank (common query)
- `idx_child_scout_name`: Alphabetical roster sorting
- `idx_child_scout_deleted`: Partial index for soft-deleted records (exclude NULL)
- `idx_child_scout_scoutbook_id`: External system lookups

---

## Den Constraints

### Primary Constraints
```sql
ALTER TABLE den ADD CONSTRAINT pk_den PRIMARY KEY (id);

-- Required fields
ALTER TABLE den ALTER COLUMN name SET NOT NULL;
ALTER TABLE den ALTER COLUMN den_number SET NOT NULL;
ALTER TABLE den ALTER COLUMN rank_level SET NOT NULL;

-- Unique den number among active dens (allows reuse after deletion)
ALTER TABLE den ADD CONSTRAINT uq_den_number 
  UNIQUE (den_number, deleted_at);

-- Den number must be positive
ALTER TABLE den ADD CONSTRAINT chk_den_number_positive 
  CHECK (den_number > 0);

-- Rank level cannot be PACK_WIDE
ALTER TABLE den ADD CONSTRAINT chk_den_rank_not_pack 
  CHECK (rank_level != 'PACK_WIDE');
```

### Indexes
```sql
CREATE INDEX idx_den_rank_active ON den(rank_level, is_active);
CREATE INDEX idx_den_number ON den(den_number);  -- Den number lookups
CREATE INDEX idx_den_deleted ON den(deleted_at) WHERE deleted_at IS NOT NULL;
```

**Rationale**:
- Den numbers are persistent pack-wide identifiers (e.g., "Den 8")
- Den rank level advances annually during rollover (Tigers → Wolves → Bears, etc.)
- Unique constraint `(den_number, deleted_at)` allows den number reuse:
  - Only ONE active den (deleted_at = NULL) can have a given number
  - After closing a den (e.g., AOL Den 2), the number becomes available for reuse
  - Common pattern: AOL dens close in spring; numbers reassigned to new Lion dens in fall
  - Historical dens preserve their numbers with different deletion timestamps

---

## DenMembership Constraints

### Primary Constraints
```sql
ALTER TABLE den_membership ADD CONSTRAINT pk_den_membership PRIMARY KEY (id);

-- Foreign keys
ALTER TABLE den_membership ADD CONSTRAINT fk_den_membership_den 
  FOREIGN KEY (den_id) REFERENCES den(id) ON DELETE CASCADE;

ALTER TABLE den_membership ADD CONSTRAINT fk_den_membership_child 
  FOREIGN KEY (child_scout_id) REFERENCES child_scout(id) ON DELETE CASCADE;

-- Required fields
ALTER TABLE den_membership ALTER COLUMN den_id SET NOT NULL;
ALTER TABLE den_membership ALTER COLUMN child_scout_id SET NOT NULL;
ALTER TABLE den_membership ALTER COLUMN valid_from SET NOT NULL;

-- Temporal constraints
ALTER TABLE den_membership ADD CONSTRAINT chk_valid_dates 
  CHECK (valid_to IS NULL OR valid_to >= valid_from);

ALTER TABLE den_membership ADD CONSTRAINT chk_valid_from_not_future 
  CHECK (valid_from <= CURRENT_TIMESTAMP);
```

### Business Logic Constraints
```sql
-- Application-level enforcement (service layer):
-- Only one current membership (valid_to = NULL) per child at any time
-- Validated in service method before insert
```

### Indexes
```sql
CREATE INDEX idx_den_membership_child_current 
  ON den_membership(child_scout_id, valid_to);

CREATE INDEX idx_den_membership_den_current 
  ON den_membership(den_id, valid_to);

CREATE INDEX idx_den_membership_date_range 
  ON den_membership(valid_from, valid_to);

-- Partial index for current memberships (highly selective)
CREATE INDEX idx_den_membership_current 
  ON den_membership(child_scout_id) WHERE valid_to IS NULL;
```

**Rationale**:
- `idx_den_membership_child_current`: "Current den for child" query
- `idx_den_membership_den_current`: "Current roster for den" query
- `idx_den_membership_date_range`: Historical queries ("Who was in den on date X?")
- `idx_den_membership_current`: Partial index optimizes NULL checks

---

## ParentChildLink Constraints

### Primary Constraints
```sql
ALTER TABLE parent_child_link ADD CONSTRAINT pk_parent_child_link PRIMARY KEY (id);

-- Foreign keys
ALTER TABLE parent_child_link ADD CONSTRAINT fk_link_parent 
  FOREIGN KEY (parent_id) REFERENCES volunteer(id) ON DELETE CASCADE;

ALTER TABLE parent_child_link ADD CONSTRAINT fk_link_child 
  FOREIGN KEY (child_scout_id) REFERENCES child_scout(id) ON DELETE CASCADE;

ALTER TABLE parent_child_link ADD CONSTRAINT fk_link_processor 
  FOREIGN KEY (processed_by) REFERENCES volunteer(id);

-- Prevent duplicate pending requests
ALTER TABLE parent_child_link ADD CONSTRAINT uq_parent_child_status 
  UNIQUE (parent_id, child_scout_id, status);

-- Conditional constraints
ALTER TABLE parent_child_link ADD CONSTRAINT chk_processed_fields 
  CHECK (
    (status = 'PENDING' AND processed_at IS NULL AND processed_by IS NULL) OR
    (status != 'PENDING' AND processed_at IS NOT NULL AND processed_by IS NOT NULL)
  );

ALTER TABLE parent_child_link ADD CONSTRAINT chk_rejection_reason 
  CHECK (
    (status = 'REJECTED' AND rejection_reason IS NOT NULL) OR
    (status != 'REJECTED')
  );

-- String length
ALTER TABLE parent_child_link ADD CONSTRAINT chk_relationship_type_length 
  CHECK (char_length(relationship_type) <= 50);
```

### Indexes
```sql
CREATE INDEX idx_link_status_date ON parent_child_link(status, requested_at);
CREATE INDEX idx_link_child ON parent_child_link(child_scout_id);
CREATE INDEX idx_link_parent ON parent_child_link(parent_id);
```

---

## ChildAttendance Constraints

### Primary Constraints
```sql
ALTER TABLE child_attendance ADD CONSTRAINT pk_child_attendance PRIMARY KEY (id);

-- Foreign keys
ALTER TABLE child_attendance ADD CONSTRAINT fk_attendance_event 
  FOREIGN KEY (event_id) REFERENCES event(id) ON DELETE CASCADE;

ALTER TABLE child_attendance ADD CONSTRAINT fk_attendance_child 
  FOREIGN KEY (child_scout_id) REFERENCES child_scout(id) ON DELETE CASCADE;

-- Unique attendance per child per event
ALTER TABLE child_attendance ADD CONSTRAINT uq_child_event 
  UNIQUE (event_id, child_scout_id);

-- Notes length
ALTER TABLE child_attendance ADD CONSTRAINT chk_attendance_notes_length 
  CHECK (char_length(notes) <= 500);
```

### Indexes
```sql
CREATE INDEX idx_attendance_child ON child_attendance(child_scout_id, attendance_status);
CREATE INDEX idx_attendance_event ON child_attendance(event_id);
```

---

## Rank, Adventure, Requirement Constraints

### Rank
```sql
ALTER TABLE rank ADD CONSTRAINT pk_rank PRIMARY KEY (id);

-- Unique rank level
ALTER TABLE rank ADD CONSTRAINT uq_rank_level UNIQUE (rank_level);

-- Unique display order
ALTER TABLE rank ADD CONSTRAINT uq_rank_display_order UNIQUE (display_order);

-- Required adventure counts must be non-negative
ALTER TABLE rank ADD CONSTRAINT chk_rank_required_count 
  CHECK (required_adventure_count >= 0);

ALTER TABLE rank ADD CONSTRAINT chk_rank_elective_count 
  CHECK (elective_adventure_count >= 0);
```

### Adventure
```sql
ALTER TABLE adventure ADD CONSTRAINT pk_adventure PRIMARY KEY (id);

-- Foreign key
ALTER TABLE adventure ADD CONSTRAINT fk_adventure_rank 
  FOREIGN KEY (rank_id) REFERENCES rank(id) ON DELETE CASCADE;

-- Unique adventure name per rank per catalog year
ALTER TABLE adventure ADD CONSTRAINT uq_adventure_rank_name_year 
  UNIQUE (rank_id, name, catalog_year);

-- Display order must be positive
ALTER TABLE adventure ADD CONSTRAINT chk_adventure_display_order 
  CHECK (display_order > 0);
```

### Requirement
```sql
ALTER TABLE requirement ADD CONSTRAINT pk_requirement PRIMARY KEY (id);

-- Foreign key
ALTER TABLE requirement ADD CONSTRAINT fk_requirement_adventure 
  FOREIGN KEY (adventure_id) REFERENCES adventure(id) ON DELETE CASCADE;

-- Unique display order per adventure
ALTER TABLE requirement ADD CONSTRAINT uq_requirement_display_order 
  UNIQUE (adventure_id, display_order);

-- Display order must be positive
ALTER TABLE requirement ADD CONSTRAINT chk_requirement_display_order 
  CHECK (display_order > 0);

-- Requirement text cannot be empty
ALTER TABLE requirement ADD CONSTRAINT chk_requirement_text_not_empty 
  CHECK (char_length(requirement_text) > 0);
```

### Catalog Indexes
```sql
-- Rank
CREATE INDEX idx_rank_catalog ON rank(catalog_year, is_active);
CREATE INDEX idx_rank_display ON rank(display_order);

-- Adventure
CREATE INDEX idx_adventure_rank_class ON adventure(rank_id, classification);
CREATE INDEX idx_adventure_catalog ON adventure(catalog_year, is_active);

-- Requirement
CREATE INDEX idx_requirement_adventure_order ON requirement(adventure_id, display_order);
```

---

## RequirementProgress Constraints

### Primary Constraints
```sql
ALTER TABLE requirement_progress ADD CONSTRAINT pk_requirement_progress PRIMARY KEY (id);

-- Foreign keys
ALTER TABLE requirement_progress ADD CONSTRAINT fk_progress_child 
  FOREIGN KEY (child_scout_id) REFERENCES child_scout(id) ON DELETE CASCADE;

ALTER TABLE requirement_progress ADD CONSTRAINT fk_progress_requirement 
  FOREIGN KEY (requirement_id) REFERENCES requirement(id) ON DELETE RESTRICT;

-- Unique progress per child + requirement
ALTER TABLE requirement_progress ADD CONSTRAINT uq_child_requirement 
  UNIQUE (child_scout_id, requirement_id);

-- Notes length
ALTER TABLE requirement_progress ADD CONSTRAINT chk_progress_notes_length 
  CHECK (char_length(notes) <= 1000);

-- Scoutbook reconciliation fields
ALTER TABLE requirement_progress ADD CONSTRAINT chk_scoutbook_entered_fields 
  CHECK (
    (scoutbook_status IN ('ENTERED', 'VERIFIED') AND scoutbook_entered_at IS NOT NULL AND scoutbook_entered_by IS NOT NULL) OR
    (scoutbook_status = 'PENDING')
  );

-- Version field (optimistic locking)
ALTER TABLE requirement_progress ADD CONSTRAINT chk_version_positive 
  CHECK (version >= 1);
```

### Indexes
```sql
CREATE INDEX idx_progress_child ON requirement_progress(child_scout_id);
CREATE INDEX idx_progress_requirement ON requirement_progress(requirement_id);
CREATE INDEX idx_progress_scoutbook_status ON requirement_progress(scoutbook_status, completed_at);
```

---

## AwardItem Constraints

### Primary Constraints
```sql
ALTER TABLE award_item ADD CONSTRAINT pk_award_item PRIMARY KEY (id);

-- Foreign keys
ALTER TABLE award_item ADD CONSTRAINT fk_award_child 
  FOREIGN KEY (child_scout_id) REFERENCES child_scout(id) ON DELETE CASCADE;

ALTER TABLE award_item ADD CONSTRAINT fk_award_adventure 
  FOREIGN KEY (adventure_id) REFERENCES adventure(id) ON DELETE RESTRICT;

ALTER TABLE award_item ADD CONSTRAINT fk_award_special 
  FOREIGN KEY (special_award_id) REFERENCES special_award(id) ON DELETE RESTRICT;

-- XOR constraint: exactly one of adventure_id or special_award_id must be set
ALTER TABLE award_item ADD CONSTRAINT chk_award_type_xor 
  CHECK (
    (adventure_id IS NOT NULL AND special_award_id IS NULL) OR
    (adventure_id IS NULL AND special_award_id IS NOT NULL)
  );

-- Quantity must be positive
ALTER TABLE award_item ADD CONSTRAINT chk_award_quantity_positive 
  CHECK (quantity_needed > 0);
```

### Indexes
```sql
CREATE INDEX idx_award_state ON award_item(current_state);
CREATE INDEX idx_award_child_state ON award_item(child_scout_id, current_state);
CREATE INDEX idx_award_adventure ON award_item(adventure_id) WHERE adventure_id IS NOT NULL;
CREATE INDEX idx_award_special ON award_item(special_award_id) WHERE special_award_id IS NOT NULL;
```

---

## AwardStateHistory Constraints

### Primary Constraints
```sql
ALTER TABLE award_state_history ADD CONSTRAINT pk_award_history PRIMARY KEY (id);

-- Foreign key
ALTER TABLE award_state_history ADD CONSTRAINT fk_history_award 
  FOREIGN KEY (award_item_id) REFERENCES award_item(id) ON DELETE CASCADE;

-- Changed by must be valid volunteer
ALTER TABLE award_state_history ADD CONSTRAINT fk_history_changed_by 
  FOREIGN KEY (changed_by) REFERENCES volunteer(id);

-- Notes length
ALTER TABLE award_state_history ADD CONSTRAINT chk_history_notes_length 
  CHECK (char_length(notes) <= 1000);
```

### Indexes
```sql
CREATE INDEX idx_history_award_date ON award_state_history(award_item_id, changed_at);
CREATE INDEX idx_history_batch ON award_state_history(batch_id) WHERE batch_id IS NOT NULL;
```

---

## SpecialAward Constraints

### Primary Constraints
```sql
ALTER TABLE special_award ADD CONSTRAINT pk_special_award PRIMARY KEY (id);

-- Unique name
ALTER TABLE special_award ADD CONSTRAINT uq_special_award_name UNIQUE (name);

-- Category cannot be empty
ALTER TABLE special_award ADD CONSTRAINT chk_special_award_category 
  CHECK (char_length(category) > 0 AND char_length(category) <= 100);
```

### Indexes
```sql
CREATE INDEX idx_special_award_category ON special_award(category);
CREATE INDEX idx_special_award_deleted ON special_award(deleted_at) WHERE deleted_at IS NOT NULL;
```

---

## InventoryItem Constraints

### Primary Constraints
```sql
ALTER TABLE inventory_item ADD CONSTRAINT pk_inventory_item PRIMARY KEY (id);

-- Unique item per rank
ALTER TABLE inventory_item ADD CONSTRAINT uq_inventory_item_rank 
  UNIQUE (item_name, rank_level);

-- Quantity constraints
ALTER TABLE inventory_item ADD CONSTRAINT chk_inventory_quantity_nonnegative 
  CHECK (on_hand_quantity >= 0);

ALTER TABLE inventory_item ADD CONSTRAINT chk_inventory_reorder_positive 
  CHECK (reorder_point IS NULL OR reorder_point > 0);

-- Unit cost non-negative
ALTER TABLE inventory_item ADD CONSTRAINT chk_inventory_cost_nonnegative 
  CHECK (unit_cost IS NULL OR unit_cost >= 0);
```

### Indexes
```sql
CREATE INDEX idx_inventory_low_stock ON inventory_item(on_hand_quantity, reorder_point) 
  WHERE reorder_point IS NOT NULL AND on_hand_quantity <= reorder_point;

CREATE INDEX idx_inventory_deleted ON inventory_item(deleted_at) WHERE deleted_at IS NOT NULL;
```

**Rationale**:
- `idx_inventory_low_stock`: Alert dashboard for reorder needs

---

## ScoutbookPrompt Constraints

### Primary Constraints
```sql
ALTER TABLE scoutbook_prompt ADD CONSTRAINT pk_scoutbook_prompt PRIMARY KEY (id);

-- Foreign keys
ALTER TABLE scoutbook_prompt ADD CONSTRAINT fk_prompt_child 
  FOREIGN KEY (child_scout_id) REFERENCES child_scout(id) ON DELETE CASCADE;

ALTER TABLE scoutbook_prompt ADD CONSTRAINT fk_prompt_event 
  FOREIGN KEY (event_id) REFERENCES event(id) ON DELETE CASCADE;

-- Required fields
ALTER TABLE scoutbook_prompt ALTER COLUMN category SET NOT NULL;
ALTER TABLE scoutbook_prompt ALTER COLUMN category_data SET NOT NULL;
```

### Indexes
```sql
CREATE INDEX idx_prompt_child_status ON scoutbook_prompt(child_scout_id, status);
CREATE INDEX idx_prompt_category_status ON scoutbook_prompt(category, status);
CREATE INDEX idx_prompt_event ON scoutbook_prompt(event_id);

-- For reminder job: prompts sent but not acknowledged after 7 days
CREATE INDEX idx_prompt_stale ON scoutbook_prompt(sent_at) 
  WHERE status = 'SENT' AND acknowledged_at IS NULL;
```

---

## Bulk Operation Constraints

### ImportBatch
```sql
ALTER TABLE import_batch ADD CONSTRAINT pk_import_batch PRIMARY KEY (id);

-- Counts must be non-negative and sum correctly
ALTER TABLE import_batch ADD CONSTRAINT chk_import_counts_nonnegative 
  CHECK (total_rows >= 0 AND success_rows >= 0 AND failed_rows >= 0);

ALTER TABLE import_batch ADD CONSTRAINT chk_import_counts_sum 
  CHECK (success_rows + failed_rows <= total_rows);
```

### RolloverBatch
```sql
ALTER TABLE rollover_batch ADD CONSTRAINT pk_rollover_batch PRIMARY KEY (id);

-- Counts must be non-negative
ALTER TABLE rollover_batch ADD CONSTRAINT chk_rollover_counts_nonnegative 
  CHECK (dens_processed >= 0 AND children_processed >= 0 AND children_failed >= 0);
```

---

## Extended Event Constraints

```sql
-- Event already has primary key and foreign keys

-- Hours prompt defaults must be valid JSON
-- (Enforced at application layer via Zod validation)

-- sendPostMeetingNotification default
ALTER TABLE event ALTER COLUMN send_post_meeting_notification SET DEFAULT true;
```

---

## Extended VolunteerRole & VolunteerToRole Constraints

### VolunteerRole
```sql
-- scopeType default
ALTER TABLE volunteer_role ALTER COLUMN scope_type SET DEFAULT 'DEN';

-- Validation: RANK scope requires rankLevel
ALTER TABLE volunteer_role ADD CONSTRAINT chk_role_rank_scope 
  CHECK (
    (scope_type = 'RANK' AND rank_level IS NOT NULL) OR
    (scope_type != 'RANK')
  );
```

### VolunteerToRole
```sql
-- Updated unique constraint to allow same role, different dens
ALTER TABLE volunteer_to_role DROP CONSTRAINT IF EXISTS volunteer_to_role_volunteer_id_role_id_key;
ALTER TABLE volunteer_to_role ADD CONSTRAINT uq_volunteer_role_den 
  UNIQUE (volunteer_id, role_id, den_number);

-- Validation: DEN scope requires denNumber
ALTER TABLE volunteer_to_role ADD CONSTRAINT chk_role_den_number 
  CHECK (
    (den_number IS NOT NULL) OR
    (den_number IS NULL)
    -- Actual validation in service layer via role.scopeType check
  );

CREATE INDEX idx_volunteer_role_den ON volunteer_to_role(den_number) WHERE den_number IS NOT NULL;
```

---

## Den Chief Constraints

### DenChief
```sql
-- Primary key
ALTER TABLE den_chief ADD CONSTRAINT pk_den_chief PRIMARY KEY (id);

-- Required fields
ALTER TABLE den_chief ALTER COLUMN email SET NOT NULL;
ALTER TABLE den_chief ALTER COLUMN first_name SET NOT NULL;
ALTER TABLE den_chief ALTER COLUMN last_name SET NOT NULL;
ALTER TABLE den_chief ALTER COLUMN password_hash SET NOT NULL;
ALTER TABLE den_chief ALTER COLUMN auth_tier SET NOT NULL DEFAULT 'DEN_CHIEF';
ALTER TABLE den_chief ALTER COLUMN is_active SET NOT NULL DEFAULT true;

-- Unique constraints
ALTER TABLE den_chief ADD CONSTRAINT uq_den_chief_email UNIQUE (email);
ALTER TABLE den_chief ADD CONSTRAINT uq_den_chief_scoutbook_id UNIQUE (scoutbook_id) WHERE scoutbook_id IS NOT NULL;

-- String length constraints
ALTER TABLE den_chief ADD CONSTRAINT chk_den_chief_first_name_length 
  CHECK (char_length(first_name) >= 1 AND char_length(first_name) <= 50);

ALTER TABLE den_chief ADD CONSTRAINT chk_den_chief_last_name_length 
  CHECK (char_length(last_name) >= 1 AND char_length(last_name) <= 50);

ALTER TABLE den_chief ADD CONSTRAINT chk_den_chief_email_format 
  CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$');

-- Auth tier must be DEN_CHIEF
ALTER TABLE den_chief ADD CONSTRAINT chk_den_chief_auth_tier 
  CHECK (auth_tier = 'DEN_CHIEF');
```

### Indexes
```sql
CREATE INDEX idx_den_chief_email ON den_chief(email);
CREATE INDEX idx_den_chief_scoutbook_id ON den_chief(scoutbook_id) WHERE scoutbook_id IS NOT NULL;
CREATE INDEX idx_den_chief_active ON den_chief(is_active);
CREATE INDEX idx_den_chief_deleted ON den_chief(deleted_at) WHERE deleted_at IS NOT NULL;
```

---

### DenChiefAssignment
```sql
-- Primary key
ALTER TABLE den_chief_assignment ADD CONSTRAINT pk_den_chief_assignment PRIMARY KEY (id);

-- Foreign keys
ALTER TABLE den_chief_assignment ADD CONSTRAINT fk_den_chief_assignment_den_chief 
  FOREIGN KEY (den_chief_id) REFERENCES den_chief(id) ON DELETE CASCADE;

ALTER TABLE den_chief_assignment ADD CONSTRAINT fk_den_chief_assignment_den 
  FOREIGN KEY (den_id) REFERENCES den(id) ON DELETE CASCADE;

ALTER TABLE den_chief_assignment ADD CONSTRAINT fk_den_chief_assignment_assigner 
  FOREIGN KEY (assigned_by) REFERENCES volunteer(id) ON DELETE SET NULL;

-- Required fields
ALTER TABLE den_chief_assignment ALTER COLUMN den_chief_id SET NOT NULL;
ALTER TABLE den_chief_assignment ALTER COLUMN den_id SET NOT NULL;
ALTER TABLE den_chief_assignment ALTER COLUMN valid_from SET NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Temporal constraints
ALTER TABLE den_chief_assignment ADD CONSTRAINT chk_den_chief_assignment_dates 
  CHECK (valid_to IS NULL OR valid_to > valid_from);

-- Prevent duplicate active assignments (same den chief + den)
-- Note: This is enforced at service layer, not DB constraint
-- Multiple den chiefs per den is allowed
-- One den chief to multiple dens is allowed
```

### Indexes
```sql
CREATE INDEX idx_den_chief_assignment_chief_active ON den_chief_assignment(den_chief_id, valid_to);
CREATE INDEX idx_den_chief_assignment_den_active ON den_chief_assignment(den_id, valid_to);
CREATE INDEX idx_den_chief_assignment_dates ON den_chief_assignment(valid_from, valid_to);
```

**Rationale**:
- DenChief email must be unique (login credential)
- Temporal assignment tracking with validFrom/validTo (NULL = active)
- One den chief can be assigned to multiple dens simultaneously
- One den can have multiple den chiefs simultaneously
- `WHERE valid_to IS NULL` queries for current assignments (highly efficient with index)

---

## Performance Optimization: Partial Indexes

**PostgreSQL Partial Indexes** (not supported in SQLite):

```sql
-- Current den memberships (highly selective)
CREATE INDEX idx_den_membership_current_pg 
  ON den_membership(child_scout_id) WHERE valid_to IS NULL;

-- Active children
CREATE INDEX idx_child_scout_active_pg 
  ON child_scout(current_rank) WHERE is_active = true;

-- Pending reconciliation items
CREATE INDEX idx_progress_pending_pg 
  ON requirement_progress(scoutbook_status, completed_at) 
  WHERE scoutbook_status = 'PENDING';

-- Awards needing action
CREATE INDEX idx_award_approved_pg 
  ON award_item(created_at) WHERE current_state = 'APPROVED';

-- Stale prompts for reminders
CREATE INDEX idx_prompt_stale_pg 
  ON scoutbook_prompt(sent_at) 
  WHERE status = 'SENT' AND acknowledged_at IS NULL;
```

---

## Database Functions & Triggers

**Minimal use of triggers** - prefer application-level logic for testability.

**Potential trigger use cases** (if needed):
1. Update `award_item.current_state` when `award_state_history` inserted (denormalization)
2. Auto-populate `updated_at` timestamps
3. Prevent invalid state transitions in `award_state_history`

**Current decision**: Handle in service layer for:
- Better testability
- Clearer business logic
- Cross-database compatibility (SQLite vs PostgreSQL)

---

## Migration Strategy

**Phase 1**: Core tables with basic constraints
- ChildScout, Den, DenMembership
- Primary keys, foreign keys, NOT NULL

**Phase 2**: Additional constraints
- CHECK constraints
- Unique constraints
- Validation rules

**Phase 3**: Indexes
- Start with essential indexes
- Add performance indexes based on query patterns

**Phase 4**: Partial indexes (PostgreSQL only)
- Deploy to production
- Monitor query performance
- Add partial indexes for high-frequency queries

---

## Constraint Naming Conventions

- Primary Key: `pk_{table_name}`
- Foreign Key: `fk_{table_name}_{referenced_table}`
- Unique: `uq_{table_name}_{column(s)}`
- Check: `chk_{table_name}_{constraint_description}`
- Index: `idx_{table_name}_{column(s)}`

---

## Testing Requirements

**All constraints MUST have tests**:
1. Unit tests for CHECK constraint validation
2. Integration tests for foreign key cascades
3. Performance tests for index effectiveness
4. Edge case tests (NULL handling, boundary values)

**Test Coverage**:
- Valid data passes all constraints
- Invalid data rejected with appropriate error
- Cascading deletes work correctly
- Unique constraints prevent duplicates
- Temporal constraints enforce valid date ranges
