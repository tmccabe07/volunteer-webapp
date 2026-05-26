# Quick Start: Den Advancement Operations

**Feature**: `010-plan-md-spec`  
**Audience**: Developers implementing this feature

## Overview

This guide helps you get started implementing the Den Advancement Operations Workspace feature. It covers setup, architecture patterns, and development workflow.

## Prerequisites

Before starting implementation:

1. **Read Planning Documents**:
   - [spec.md](spec.md) - Full feature requirements
   - [plan.md](plan.md) - Technical approach and research summary
   - [research.md](research.md) - Detailed research findings
   - [data-model.md](data-model.md) - Complete entity definitions
   - [contracts/api-endpoints.md](contracts/api-endpoints.md) - API specifications
   - [contracts/event-schemas.md](contracts/event-schemas.md) - Notification events
   - [contracts/db-constraints.md](contracts/db-constraints.md) - Database constraints

2. **Existing Codebase Familiarity**:
   - NestJS module structure (`src/modules/`, `src/api/`, `src/services/`)
   - Prisma schema patterns (`backend/prisma/schema.prisma`)
   - Authentication & authorization (JWT, auth tiers, guards)
   - Testing patterns (Jest e2e, unit tests)
   - Frontend Next.js structure (`src/app/`, `src/components/`, `src/services/`)

3. **Development Environment**:
   ```bash
   # Node.js 20.x LTS
   node --version  # Should be 20.x
   
   # Install dependencies
   cd backend && npm install
   cd ../frontend && npm install
   
   # Run migrations (after creating them)
   cd backend && npx prisma migrate dev
   
   # Seed catalog data (after creating seed script)
   npx prisma db seed
   ```

---

## Architecture Overview

### Backend Structure

```
backend/
├── prisma/
│   ├── schema.prisma          # Add new entities here
│   ├── migrations/            # Generated migration files
│   └── seed.ts                # Seed adventure catalogs
├── src/
│   ├── modules/               # NestJS modules
│   │   ├── child-scout.module.ts
│   │   ├── den.module.ts
│   │   ├── advancement.module.ts
│   │   ├── awards.module.ts
│   │   └── parent-link.module.ts
│   ├── services/              # Business logic
│   │   ├── child-scout/
│   │   ├── den/
│   │   ├── advancement/
│   │   ├── awards/
│   │   └── authorization/     # Scope-based access control
│   ├── api/                   # REST controllers
│   │   ├── child-scout.controller.ts
│   │   ├── den.controller.ts
│   │   ├── advancement.controller.ts
│   │   └── awards.controller.ts
│   ├── middleware/            # Guards and middleware
│   │   ├── scope-auth.guard.ts
│   │   └── parent-link.guard.ts
│   └── utils/
│       └── prisma.ts          # Singleton Prisma instance
└── test/                      # E2E tests
    ├── child-scout.e2e-spec.ts
    ├── den-events.e2e-spec.ts
    └── advancement.e2e-spec.ts
```

### Frontend Structure

```
frontend/
├── src/
│   ├── app/                   # Next.js app router
│   │   ├── dens/              # Den management pages
│   │   ├── children/          # Child profiles & progress
│   │   ├── advancement/       # Requirement tracking
│   │   ├── awards/            # Award fulfillment
│   │   └── parent/            # Parent portal
│   ├── components/            # Reusable UI
│   │   ├── den/
│   │   ├── child/
│   │   ├── advancement/
│   │   └── awards/
│   ├── services/              # API clients
│   │   ├── childScoutService.ts
│   │   ├── denService.ts
│   │   ├── advancementService.ts
│   │   └── awardService.ts
│   └── test/                  # Component tests
│       └── components/
└── vitest.config.ts
```

---

## Development Workflow

### Phase 1: Core Entities (Week 1-2)

**Goal**: Establish child scout and den management foundation

**Tasks**:
1. **Database Schema**:
   ```bash
   # Edit backend/prisma/schema.prisma
   # Add: ChildScout, Den, DenMembership models
   
   npx prisma migrate dev --name add-child-scout-den
   ```

2. **NestJS Modules & Services**:
   ```typescript
   // src/modules/child-scout.module.ts
   @Module({
     imports: [PrismaModule],
     providers: [ChildScoutService],
     controllers: [ChildScoutController],
     exports: [ChildScoutService],
   })
   export class ChildScoutModule {}
   ```

3. **API Endpoints** (Test-First):
   ```bash
   # Write contract tests first
   # test/child-scout.e2e-spec.ts
   
   describe('POST /child-scouts', () => {
     it('should create child scout when admin authenticated');
     it('should return 403 when non-admin attempts');
   });
   
   npm run test:e2e -- child-scout
   ```

4. **Frontend Components**:
   ```bash
   # src/components/child/ChildScoutList.tsx
   # src/components/child/ChildScoutForm.tsx
   # src/app/children/page.tsx
   
   npm test -- ChildScoutList.test.tsx
   ```

**Deliverable**: Admin can create/view child scouts, assign to dens

**Den Split Scenario** (supported in Phase 1):
```typescript
// Example: Split Den 1 (30 kids) into Den 1, Den 10, Den 11

// 1. Create new dens
await createDen({ name: "Den 10 - Tigers", denNumber: 10, rankLevel: "TIGER" });
await createDen({ name: "Den 11 - Tigers", denNumber: 11, rankLevel: "TIGER" });

// 2. Use batch-assign endpoint for efficiency
await batchAssignChildren({
  assignments: [
    { childScoutId: "child1", fromDenId: "den1", toDenId: "den10" },
    { childScoutId: "child2", fromDenId: "den1", toDenId: "den10" },
    // ... 10 children to Den 10
    { childScoutId: "child11", fromDenId: "den1", toDenId: "den11" },
    // ... 10 children to Den 11
    // ... remaining 10 stay in Den 1
  ],
  reason: "Den Split - Balancing roster sizes"
});

// Historical membership preserved via DenMembership temporal columns
```

**Den Consolidation Scenario** (reverse of split - rare but supported):
```typescript
// Example: Combine Den 10 and Den 11 back into Den 1

// 1. Transfer all children from closing dens to target den
await batchAssignChildren({
  assignments: [
    { childScoutId: "child1", fromDenId: "den10", toDenId: "den1" },
    { childScoutId: "child2", fromDenId: "den10", toDenId: "den1" },
    // ... all 10 from Den 10
    { childScoutId: "child11", fromDenId: "den11", toDenId: "den1" },
    // ... all 10 from Den 11
  ],
  reason: "Den Consolidation - Reducing number of dens"
});

// 2. Mark empty dens as inactive
await deleteDen("den10");  // Soft delete
await deleteDen("den11");  // Soft delete

// Result: All 30 children back in Den 1, full history preserved
// Can still query: "Who was in Den 10 from Jan-May 2026?"
```

**Den Number Reuse** (common pattern with AOL graduation):
```typescript
// Spring: AOL Den 2 graduates, den is closed
await deleteDen("den2");  // AOL Den 2 marked inactive (May 2026)

// Fall: New cub scout year begins, reuse den number
await createDen({ 
  name: "Den 2 - Lions", 
  denNumber: 2,          // Reusing number from closed AOL den
  rankLevel: "LION" 
});

// Database constraint allows this because:
// - Old Den 2: (den_number=2, deleted_at='2026-05-15') - historical
// - New Den 2: (den_number=2, deleted_at=NULL) - active
// - UNIQUE(den_number, deleted_at) constraint satisfied

// Historical queries still work:
// "What was Den 2 in 2025-2026?" → AOL den with 12 scouts
// "What is Den 2 now?" → Lion den with 8 scouts
```

---

### Phase 2: Parent-Child Linking (Week 2-3)

**Goal**: Enable parent accounts to request and gain access to child records

**Tasks**:
1. **Schema**:
   ```prisma
   model ParentChildLink {
     // See data-model.md for full schema
   }
   ```

2. **Service Layer**:
   ```typescript
   // src/services/parent-link/parent-link.service.ts
   async requestLink(parentId: string, childScoutId: string) {
     // Check for existing pending
     // Create new request
     // Emit ParentChildLinkRequested event
   }
   
   async approveLink(linkId: string, approverId: string) {
     // Validate status
     // Update to APPROVED
     // Emit ParentChildLinkApproved event
   }
   ```

3. **Authorization Guard**:
   ```typescript
   // src/middleware/parent-link.guard.ts
   @Injectable()
   export class ParentChildAccessGuard implements CanActivate {
     async canActivate(context: ExecutionContext): Promise<boolean> {
       // Check if parent has approved link to child
     }
   }
   ```

4. **Frontend**:
   ```bash
   # Parent request UI
   # Leader approval dashboard
   # Notification integration
   ```

**Deliverable**: Parents can request links, leaders can approve, access control enforced

---

### Phase 3: Advancement Catalog (Week 3-4)

**Goal**: Load BSA adventure/requirement catalogs for progress tracking

**Tasks**:
1. **Schema**:
   ```prisma
   model Rank { /* ... */ }
   model Adventure { /* ... */ }
   model Requirement { /* ... */ }
   ```

2. **Seed Script**:
   ```typescript
   // backend/prisma/seed.ts
   async function seedAdvancementCatalog() {
     await prisma.rank.create({
       data: {
         rankLevel: 'WOLF',
         displayName: 'Wolf',
         displayOrder: 3,
         adventures: {
           create: [
             {
               name: 'Call of the Wild',
               classification: 'REQUIRED',
               displayOrder: 1,
               requirements: {
                 create: [
                   { displayOrder: 1, requirementText: '...' },
                   // ... more requirements
                 ],
               },
             },
             // ... more adventures
           ],
         },
       },
     });
   }
   ```

3. **Admin UI** (Optional):
   ```bash
   # src/app/admin/catalog/page.tsx
   # View/edit adventure catalogs
   ```

**Deliverable**: Complete BSA catalogs loaded, queryable by rank/adventure

---

### Phase 4: Attendance & Requirements (Week 4-5)

**Goal**: Track child attendance at events and requirement completion

**Tasks**:
1. **Schema**:
   ```prisma
   model ChildAttendance { /* ... */ }
   model RequirementProgress { /* ... */ }
   ```

2. **Event Extensions**:
   ```typescript
   // src/api/events.controller.ts
   @Patch(':id/child-attendance')
   @UseGuards(AuthGuard, TierGuard)
   @RequireTier(AuthTier.LEADER)
   async recordAttendance(@Param('id') eventId: string, @Body() dto: RecordAttendanceDto) {
     return this.eventsService.recordChildAttendance(eventId, dto);
   }
   ```

3. **Requirements Tracking**:
   ```typescript
   // src/services/advancement/requirement-progress.service.ts
   async markComplete(requirementId: string, childScoutId: string, completedBy: string) {
     // Create RequirementProgress record
     // Check if adventure complete
     // Emit events
   }
   ```

4. **Frontend**:
   ```bash
   # Attendance recording UI at event closeout
   # Parent requirement submission form
   # Progress dashboard for child
   ```

**Deliverable**: Leaders record attendance, parents/leaders mark requirements complete

---

### Phase 5: Scoutbook Reconciliation (Week 5-6)

**Goal**: Track which items need manual Scoutbook entry

**Tasks**:
1. **Add Reconciliation Fields**:
   ```prisma
   model RequirementProgress {
     // ... existing fields
     scoutbookStatus ReconciliationStatus @default(PENDING)
     scoutbookEnteredAt DateTime?
     scoutbookEnteredBy String?
     version Int @default(1)  // Optimistic locking
   }
   ```

2. **Reconciliation Service**:
   ```typescript
   // src/services/advancement/reconciliation.service.ts
   async markReconciled(progressId: string, expectedVersion: number, userId: string) {
     const result = await prisma.requirementProgress.updateMany({
       where: { id: progressId, version: expectedVersion },
       data: {
         scoutbookStatus: 'ENTERED',
         scoutbookEnteredBy: userId,
         scoutbookEnteredAt: new Date(),
         version: { increment: 1 },
       },
     });
     
     if (result.count === 0) {
       throw new ConflictException({ /* return current state */ });
     }
   }
   ```

3. **Leader Dashboard**:
   ```bash
   # src/app/advancement/reconciliation/page.tsx
   # List pending items
   # Mark reconciled button (handles 409 conflicts)
   ```

**Deliverable**: Leaders see unresolved items, mark Scoutbook entry complete

---

### Phase 6: Award Fulfillment (Week 6-7)

**Goal**: Track awards from eligibility through distribution

**Tasks**:
1. **Schema**:
   ```prisma
   model AwardItem { /* ... */ }
   model AwardStateHistory { /* ... */ }
   model SpecialAward { /* ... */ }
   ```

2. **State Machine Service**:
   ```typescript
   // src/services/awards/award-fulfillment.service.ts
   async transitionState(awardId: string, toState: AwardState, userId: string, notes?: string) {
     // Validate transition
     // Create history record
     // Update current state
     // Emit event
   }
   ```

3. **Frontend Workflows**:
   ```bash
   # Approval queue for eligible awards
   # Purchase queue with batch actions
   # Distribution tracking
   # Inventory integration (if needed)
   ```

**Deliverable**: Complete award lifecycle tracking with audit trail

---

### Phase 7: Scoutbook Hours Prompts (Week 7-8)

**Goal**: Generate category-specific prompts for parent Scoutbook entry

**Tasks**:
1. **Schema & Strategy Pattern**:
   ```typescript
   // src/services/hours-prompt/prompt-strategy.interface.ts
   interface PromptStrategy {
     validate(data: unknown): boolean;
     generateMessage(data: unknown, childName: string): string;
   }
   
   // src/services/hours-prompt/camping-strategy.ts
   class CampingPromptStrategy implements PromptStrategy { /* ... */ }
   ```

2. **Event Closeout Integration**:
   ```typescript
   // src/api/events.controller.ts
   @Post(':id/generate-prompts')
   async generateHoursPrompts(@Param('id') eventId: string, @Body() dto: GeneratePromptsDto) {
     return this.promptService.generatePrompts(eventId, dto);
   }
   ```

3. **Parent UI**:
   ```bash
   # src/app/parent/prompts/page.tsx
   # List pending prompts
   # "Mark Submitted in Scoutbook" button
   ```

**Deliverable**: Parents receive hours prompts, mark acknowledged

---

### Phase 8: Bulk Operations (Week 8-9)

**Goal**: CSV import and annual rank rollover

**Tasks**:
1. **CSV Import**:
   ```typescript
   // src/services/bulk/import.service.ts
   async processImport(file: Express.Multer.File, userId: string) {
     const parser = parse(fs.createReadStream(file.path));
     for await (const row of parser) {
       // Validate, create/update child, track errors
     }
   }
   ```

2. **Annual Rollover**:
   ```typescript
   // src/services/bulk/rollover.service.ts
   async executeRollover(targetYear: string, isDryRun: boolean) {
     // Phase 1: Advance dens (Tiger → Wolf, etc.; AOL dens close out)
     for (const den of dens) {
       if (den.rankLevel === 'AOL') {
         await markDenInactive(den.id);  // AOL is final rank
       } else {
         await updateDenRank(den.id, nextRank);
       }
     }
     
     // Phase 2: Advance children (AOL scouts graduate/marked inactive)
     for (const child of children) {
       await prisma.$transaction(async (tx) => {
         // Mark old advancement inactive
         // Create new rank assignment
         // Handle AOL graduation
       });
     }
   }
   ```
   
   **Note**: Den numbers persist across years (e.g., "Den 8" remains "Den 8" as it advances from Tigers → Wolves → Bears). AOL dens close out during rollover (marked inactive) as AOL is the final Cub Scout rank.

3. **Admin UI**:
   ```bash
   # Import wizard with progress tracking
   # Rollover preview and execution
   # Error reporting
   ```

**Deliverable**: Admin can import rosters, execute annual rollover

---

### Phase 9: Den Chief Support (Week 9)

**Goal**: Youth leader assignments to dens with login access

**Tasks**:
1. **DenChief Entity**:
   ```typescript
   // backend/prisma/schema.prisma
   model DenChief {
     id            String   @id @default(cuid())
     email         String   @unique
     firstName     String
     lastName      String
     passwordHash  String
     authTier      AuthTier @default(DEN_CHIEF)
     scoutbookId   String?  @unique
     isActive      Boolean  @default(true)
     
     denAssignments DenChiefAssignment[]
     eventVolunteering EventVolunteerSignup[]  // Can volunteer
     
     createdAt     DateTime @default(now())
     updatedAt     DateTime @updatedAt
     deletedAt     DateTime?
   }
   
   model DenChiefAssignment {
     id           String    @id @default(cuid())
     denChiefId   String
     denChief     DenChief  @relation(fields: [denChiefId], references: [id])
     denId        String
     den          Den       @relation(fields: [denId], references: [id])
     validFrom    DateTime  @default(now())
     validTo      DateTime?  // NULL = currently assigned
     assignedBy   String     // volunteerId
     notes        String?
     createdAt    DateTime  @default(now())
   }
   
   enum AuthTier {
     PARENT
     LEADER
     ADMIN
     DEN_CHIEF  // NEW: View-only access to assigned dens
   }
   ```

2. **API Endpoints**:
   ```typescript
   // src/api/den-chief/den-chief.controller.ts
   @Controller('den-chiefs')
   export class DenChiefController {
     @Post()
     @UseGuards(JwtAuthGuard, TierGuard)
     @RequireTier(AuthTier.ADMIN)
     async create(@Body() dto: CreateDenChiefDto) { }
     
     @Post(':id/assignments')
     @UseGuards(JwtAuthGuard, TierGuard)
     @RequireTier(AuthTier.LEADER, AuthTier.ADMIN)
     async assignToDen(@Param('id') id: string, @Body() dto: AssignmentDto) { }
   }
   ```

3. **Auth & Guards**:
   ```typescript
   // Update guards to handle DEN_CHIEF tier
   // DenChief can:
   //   - View assigned den rosters (read-only)
   //   - Volunteer for den/pack events
   //   - Receive event notifications
   // DenChief cannot:
   //   - Mark attendance
   //   - Enter advancement progress
   //   - Manage roster or events
   ```

4. **Frontend Components**:
   ```bash
   # Admin UI: Create den chief, assign to dens
   # Den Chief Dashboard: View assigned dens, upcoming events
   # Event volunteer signup (extend existing component)
   ```

5. **Example Scenario**:
   ```typescript
   // Create Den Chief (Admin)
   const sarah = await createDenChief({
     email: 'sarah@example.com',
     firstName: 'Sarah',
     lastName: 'Smith',
     password: 'ChangeMe123!',  // Must change on first login
     scoutbookId: 'SB12345'
   });
   
   // Assign to Bear Den 3 (Admin or Den Leader)
   await assignDenChief({
     denChiefId: sarah.id,
     denId: bearDen3.id,
     validFrom: new Date('2026-09-01'),  // Start of school year
     notes: 'Assisting with Tigers for fall semester'
   });
   
   // Sarah logs in, sees:
   // - Bear Den 3 roster (read-only)
   // - Upcoming Bear den meetings and pack events
   // - "Volunteer" button on events
   
   // Sarah volunteers for den meeting
   await volunteerForEvent(sarah.id, denMeetingId);
   
   // End assignment after 6 months (Admin or Den Leader)
   await endDenChiefAssignment(assignmentId, new Date('2027-03-01'));
   ```

**Deliverable**: Den Chiefs can log in, view assigned dens, volunteer for events

---

## Testing Strategy

### Test-First Development (BDD)

**For every feature**:
1. Write contract test first (Given-When-Then)
2. Watch it fail (RED)
3. Implement minimum code to pass (GREEN)
4. Refactor while keeping tests green (REFACTOR)

### Test Pyramid

```
           /\
          /  \  E2E Tests (few, critical paths)
         /____\
        /      \  Integration Tests (service + DB)
       /________\
      /          \  Unit Tests (many, fast)
     /____________\
```

**Example Test Structure**:
```typescript
// test/child-scout.e2e-spec.ts
describe('Child Scout Management', () => {
  describe('POST /child-scouts', () => {
    it('should create child scout when admin authenticated', async () => {
      // Given: admin JWT token
      const adminToken = await getAdminToken();
      
      // When: POST with valid child data
      const response = await request(app.getHttpServer())
        .post('/api/v1/child-scouts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'John',
          lastName: 'Doe',
          currentRank: 'TIGER',
        });
      
      // Then: 201 Created with child scout data
      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        id: expect.any(String),
        firstName: 'John',
        lastName: 'Doe',
        isActive: true,
      });
    });
    
    it('should return 403 when PARENT tier attempts creation', async () => {
      // Given: parent JWT token
      const parentToken = await getParentToken();
      
      // When: POST attempt
      const response = await request(app.getHttpServer())
        .post('/api/v1/child-scouts')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ /* ... */ });
      
      // Then: 403 Forbidden
      expect(response.status).toBe(403);
    });
  });
});
```

### Running Tests

```bash
# Backend unit tests
cd backend && npm test

# Backend e2e tests
npm run test:e2e

# Frontend component tests
cd frontend && npm test

# Run specific test file
npm test -- child-scout.e2e-spec.ts
```

---

## Common Patterns

### Service Layer Pattern

```typescript
@Injectable()
export class ChildScoutService {
  constructor(private prisma: PrismaService) {}
  
  async create(dto: CreateChildScoutDto, createdBy: string): Promise<ChildScout> {
    // Validate input
    // Create record
    // Emit domain event
    // Return result
  }
  
  async findAccessible(userId: string): Promise<ChildScout[]> {
    const scope = await this.authService.getAccessScope(userId);
    // Build WHERE clause based on scope
    // Return filtered results
  }
}
```

### Authorization Guard Usage

```typescript
@Controller('child-scouts')
@UseGuards(AuthGuard, ScopeGuard)
export class ChildScoutController {
  @Get(':id')
  @RequireChildAccess('id')  // Decorator checks access to specific child
  async getChild(@Param('id') id: string) {
    return this.childScoutService.findOne(id);
  }
  
  @Post()
  @RequireTier(AuthTier.ADMIN)  // Only admins can create
  async createChild(@Body() dto: CreateChildScoutDto, @Req() req) {
    return this.childScoutService.create(dto, req.user.userId);
  }
}
```

### Event Publishing

```typescript
// Emit domain event
this.eventEmitter.emit('requirement.completed', {
  eventType: 'RequirementCompletedByParent',
  aggregateId: progress.id,
  aggregateType: 'RequirementProgress',
  occurredAt: new Date(),
  payload: { /* ... */ },
});

// Subscribe in notification service
@OnEvent('requirement.completed')
async handleRequirementCompleted(event: RequirementCompletedEvent) {
  // Create notification records
  // Send emails
}
```

---

## Debugging Tips

### Database Queries

```typescript
// Enable Prisma query logging
// backend/src/utils/prisma.ts
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});
```

### VS Code Debug Configuration

```json
// .vscode/launch.json
{
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Backend Debug",
      "runtimeArgs": ["-r", "ts-node/register"],
      "args": ["${workspaceFolder}/backend/src/main.ts"],
      "cwd": "${workspaceFolder}/backend",
      "internalConsoleOptions": "openOnSessionStart"
    }
  ]
}
```

---

## Resources

### Internal Documentation
- [BDD Constitution](../../.specify/memory/constitution.md)
- [Testing Guide](../backend/TESTING.md)
- [API Documentation](../../docs/api-documentation.md)

### External References
- [NestJS Documentation](https://docs.nestjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Radix UI Components](https://www.radix-ui.com/)

### Research Documents
- [Temporal & Hierarchical Patterns](../../docs/temporal-hierarchical-patterns-research.md)
- [Workflow Patterns](../../docs/workflow-patterns-research.md)
- [Advanced Patterns](../../docs/advanced-patterns-research.md)
- [Bulk Operations](../../docs/bulk-operations-research.md)

---

## Getting Help

- **Stuck on implementation?** Review [research.md](research.md) for pattern examples
- **Authorization questions?** Check [advanced-patterns-research.md](../../docs/advanced-patterns-research.md) #Multi-Scope
- **Database schema questions?** See [data-model.md](data-model.md)
- **API contract unclear?** See [contracts/api-endpoints.md](contracts/api-endpoints.md)

---

## Next Steps

1. **Read all planning documents** (spec, plan, research, data-model, contracts)
2. **Set up development environment** (install dependencies, run migrations)
3. **Start with Phase 1** (Core Entities) - follow test-first approach
4. **Commit frequently** - small, focused commits with clear messages
5. **Run tests before pushing** - ensure all tests pass
6. **Update documentation** - keep quickstart and contracts up to date as you learn

**Good luck! 🚀**
