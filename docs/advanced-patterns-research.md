# Advanced Patterns Research
## Multi-Scope Role Assignments, State Machines, and Configurable Prompts

*Generated: 2026-05-22*  
*Topics: Hierarchical Authorization, Award Fulfillment State Machine, Category-Specific Prompts*

This document provides research and recommendations for three advanced architectural patterns in the volunteer management system.

---

## Topic 1: Multi-Scope Role Assignments

### Context & Requirements

**Problem**: Users need role assignments at different hierarchical scopes:
- **Pack-wide**: Committee chairs can see all children and events
- **Rank-level**: Advancement chair sees all Tigers across all dens
- **Den-specific**: Den leader sees only children in Den 3 Tigers

**Key Requirements**:
- A user can hold multiple roles with different scopes simultaneously
- Authorization queries must efficiently determine "all accessible children"
- Support both registered BSA roles (Den Leader) and standing positions (Advancement Chair)
- Hierarchy: Pack > Rank > Den (higher scope inherits lower scope access)

---

### Decision 1.1: Scope-Based Authorization with Hierarchical Access

**Rationale**: Extend existing `VolunteerRole` model with scope information. Use explicit scope columns rather than computed authorization to maintain query performance. This pattern is common in multi-tenant and hierarchical RBAC systems (see: AWS IAM resource-level permissions, Kubernetes RBAC with namespaces).

**Implementation**:

#### Enhanced Prisma Schema

```prisma
model VolunteerRole {
  id              String      @id @default(cuid())
  name            String      @unique
  description     String?
  roleType        RoleType
  specialty       String?     // For committee roles (e.g., "treasurer", "advancement")
  rankLevel       RankLevel?  // For rank-scoped roles (e.g., TIGER, WOLF)
  grantsTier      AuthTier    @default(PARENT)
  
  // NEW: Scope configuration
  scopeType       RoleScope   @default(DEN) // Defines access level granted
  
  volunteers      VolunteerToRole[]
  adminTasks      AdminTaskToRole[]
  
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  deletedAt       DateTime?
  
  @@index([deletedAt])
  @@index([roleType])
  @@index([scopeType, rankLevel]) // Query roles by scope efficiently
}

// NEW: Enum defining authorization scope hierarchy
enum RoleScope {
  PACK      // Can access all ranks and dens
  RANK      // Can access all dens within a rank (requires rankLevel)
  DEN       // Can access specific den only (requires rankLevel + denNumber)
}

model VolunteerToRole {
  id              String        @id @default(cuid())
  volunteerId     String
  volunteer       Volunteer     @relation(fields: [volunteerId], references: [id], onDelete: Cascade)
  roleId          String
  role            VolunteerRole @relation(fields: [roleId], references: [id], onDelete: Restrict)
  
  // NEW: Instance-specific scope data
  denNumber       Int?          // Required if role.scopeType = DEN (e.g., 3 for "Den 3")
  
  assignedAt      DateTime      @default(now())
  removedAt       DateTime?
  
  @@unique([volunteerId, roleId, denNumber]) // Allow same role, different dens
  @@index([volunteerId])
  @@index([roleId])
  @@index([denNumber]) // Query by den number
}

// NEW: Track which den a child belongs to
model ChildRank {
  id              String      @id @default(cuid())
  volunteerId     String
  volunteer       Volunteer   @relation(fields: [volunteerId], references: [id], onDelete: Cascade)
  rankLevel       RankLevel
  denNumber       Int?        // NEW: Which den within the rank (1, 2, 3, etc.)
  
  createdAt       DateTime    @default(now())
  
  @@unique([volunteerId, rankLevel, denNumber]) // Prevent duplicate assignments
  @@index([volunteerId])
  @@index([rankLevel, denNumber]) // Query children by rank/den
}
```

#### Authorization Service Methods

```typescript
// src/services/authorization.service.ts
import { Injectable } from '@nestjs/common';
import { RoleScope, RankLevel } from '@prisma/client';
import prisma from '../utils/prisma';

export interface AccessScope {
  canAccessPack: boolean;
  accessibleRanks: RankLevel[]; // Empty = all ranks
  accessibleDens: Array<{ rank: RankLevel; denNumber: number }>; // Empty = all dens in ranks
}

@Injectable()
export class AuthorizationService {
  /**
   * Calculate all access scopes for a volunteer based on their role assignments
   * Implements hierarchical inheritance: PACK > RANK > DEN
   */
  async getAccessScope(volunteerId: string): Promise<AccessScope> {
    const roleAssignments = await prisma.volunteerToRole.findMany({
      where: {
        volunteerId,
        removedAt: null,
        role: {
          deletedAt: null,
        },
      },
      include: {
        role: {
          select: {
            scopeType: true,
            rankLevel: true,
          },
        },
      },
    });

    // Check for pack-wide access (highest privilege)
    const hasPackAccess = roleAssignments.some(
      (ra) => ra.role.scopeType === RoleScope.PACK
    );

    if (hasPackAccess) {
      return {
        canAccessPack: true,
        accessibleRanks: [],
        accessibleDens: [],
      };
    }

    // Collect rank-level access
    const rankAccess = roleAssignments
      .filter((ra) => ra.role.scopeType === RoleScope.RANK && ra.role.rankLevel)
      .map((ra) => ra.role.rankLevel!);

    // Collect den-level access
    const denAccess = roleAssignments
      .filter(
        (ra) =>
          ra.role.scopeType === RoleScope.DEN &&
          ra.role.rankLevel &&
          ra.denNumber !== null
      )
      .map((ra) => ({
        rank: ra.role.rankLevel!,
        denNumber: ra.denNumber!,
      }));

    return {
      canAccessPack: false,
      accessibleRanks: [...new Set(rankAccess)],
      accessibleDens: denAccess,
    };
  }

  /**
   * Get all children this volunteer can access based on their role scopes
   * Optimized query with early exit for pack-level access
   */
  async getAccessibleChildren(volunteerId: string): Promise<string[]> {
    const scope = await this.getAccessScope(volunteerId);

    // Pack-wide access: all children
    if (scope.canAccessPack) {
      const allChildren = await prisma.childRank.findMany({
        select: { volunteerId: true },
      });
      return [...new Set(allChildren.map((c) => c.volunteerId))];
    }

    // Build WHERE clause for rank + den access
    const rankConditions = scope.accessibleRanks.map((rank) => ({
      rankLevel: rank,
    }));

    const denConditions = scope.accessibleDens.map((den) => ({
      rankLevel: den.rank,
      denNumber: den.denNumber,
    }));

    // Combine conditions with OR
    const children = await prisma.childRank.findMany({
      where: {
        OR: [...rankConditions, ...denConditions],
      },
      select: { volunteerId: true },
    });

    return [...new Set(children.map((c) => c.volunteerId))];
  }

  /**
   * Check if volunteer can access a specific child
   * Used in individual record access control
   */
  async canAccessChild(
    volunteerId: string,
    childVolunteerId: string
  ): Promise<boolean> {
    const scope = await this.getAccessScope(volunteerId);

    if (scope.canAccessPack) {
      return true;
    }

    const childRanks = await prisma.childRank.findMany({
      where: { volunteerId: childVolunteerId },
      select: { rankLevel: true, denNumber: true },
    });

    // Check if any child rank matches accessible scopes
    return childRanks.some((childRank) => {
      // Check rank-level access
      if (scope.accessibleRanks.includes(childRank.rankLevel)) {
        return true;
      }

      // Check den-level access
      return scope.accessibleDens.some(
        (den) =>
          den.rank === childRank.rankLevel &&
          den.denNumber === childRank.denNumber
      );
    });
  }

  /**
   * Filter events by user's access scope
   * Returns events user can manage based on rank/den scope
   */
  async getAccessibleEvents(volunteerId: string) {
    const scope = await this.getAccessScope(volunteerId);

    if (scope.canAccessPack) {
      // Pack access sees all events
      return prisma.event.findMany({
        where: { deletedAt: null },
        orderBy: { eventDate: 'asc' },
      });
    }

    // Build OR conditions for accessible ranks/dens
    const conditions: any[] = [];

    // Add rank-level event access
    if (scope.accessibleRanks.length > 0) {
      conditions.push({
        rankLevel: {
          in: scope.accessibleRanks,
        },
      });
    }

    // Note: If events need den-level granularity, add denNumber to Event model
    // For now, rank-level access sees all events for that rank

    return prisma.event.findMany({
      where: {
        deletedAt: null,
        OR: conditions.length > 0 ? conditions : undefined,
      },
      orderBy: { eventDate: 'asc' },
    });
  }
}
```

#### Guard Implementation

```typescript
// src/middleware/scope-auth.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthorizationService } from '../services/authorization.service';
import type { JWTPayload } from './auth';

/**
 * Metadata keys for scope requirements
 */
export const REQUIRE_PACK_ACCESS = 'requirePackAccess';
export const REQUIRE_RANK_ACCESS = 'requireRankAccess';
export const REQUIRE_CHILD_ACCESS = 'requireChildAccess';

/**
 * Decorators for scope-based authorization
 */
export const RequirePackAccess = () => SetMetadata(REQUIRE_PACK_ACCESS, true);
export const RequireRankAccess = () => SetMetadata(REQUIRE_RANK_ACCESS, true);
export const RequireChildAccess = (paramName: string = 'childId') =>
  SetMetadata(REQUIRE_CHILD_ACCESS, paramName);

/**
 * Guard to enforce scope-based access control
 * Use with decorators to specify scope requirements
 */
@Injectable()
export class ScopeGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private authService: AuthorizationService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requirePackAccess = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_PACK_ACCESS,
      [context.getHandler(), context.getClass()]
    );

    const requireChildAccess = this.reflector.getAllAndOverride<string>(
      REQUIRE_CHILD_ACCESS,
      [context.getHandler(), context.getClass()]
    );

    const request = context.switchToHttp().getRequest();
    const user = request.user as JWTPayload;

    // Check pack-level access
    if (requirePackAccess) {
      const scope = await this.authService.getAccessScope(user.userId);
      if (!scope.canAccessPack) {
        throw new ForbiddenException('Pack-wide access required');
      }
      return true;
    }

    // Check child-level access
    if (requireChildAccess) {
      const childId =
        request.params[requireChildAccess] || request.body[requireChildAccess];
      if (!childId) {
        throw new ForbiddenException('Child ID required for access check');
      }

      const canAccess = await this.authService.canAccessChild(
        user.userId,
        childId
      );
      if (!canAccess) {
        throw new ForbiddenException('Cannot access this child record');
      }
      return true;
    }

    return true;
  }
}
```

#### Controller Usage Examples

```typescript
// src/api/children.controller.ts
import {
  Controller,
  Get,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../middleware/auth';
import { ScopeGuard, RequireChildAccess } from '../middleware/scope-auth.guard';

@Controller('children')
@UseGuards(AuthGuard, ScopeGuard)
export class ChildrenController {
  constructor(
    private readonly authService: AuthorizationService,
    private readonly childrenService: ChildrenService
  ) {}

  /**
   * Get all children accessible to this user
   * Automatically filters by role scope
   */
  @Get()
  async getAccessibleChildren(@Req() req) {
    const childIds = await this.authService.getAccessibleChildren(
      req.user.userId
    );
    return this.childrenService.getChildrenByIds(childIds);
  }

  /**
   * Get specific child record
   * ScopeGuard validates access before reaching handler
   */
  @Get(':childId')
  @RequireChildAccess('childId')
  async getChild(@Param('childId') childId: string) {
    return this.childrenService.getChild(childId);
  }
}
```

---

### Seed Data Examples

```typescript
// backend/prisma/seed.ts - Role definitions with scopes

// Pack-wide roles
await prisma.volunteerRole.create({
  data: {
    name: 'Cubmaster',
    roleType: RoleType.COMMITTEE,
    scopeType: RoleScope.PACK,
    grantsTier: AuthTier.LEADER,
    description: 'Pack leader with access to all ranks and dens',
  },
});

await prisma.volunteerRole.create({
  data: {
    name: 'Advancement Chair',
    roleType: RoleType.COMMITTEE,
    specialty: 'advancement',
    scopeType: RoleScope.PACK,
    grantsTier: AuthTier.LEADER,
    description: 'Committee chair overseeing advancement for entire pack',
  },
});

// Rank-level roles
await prisma.volunteerRole.create({
  data: {
    name: 'Tiger Coordinator',
    roleType: RoleType.COMMITTEE,
    rankLevel: RankLevel.TIGER,
    scopeType: RoleScope.RANK,
    grantsTier: AuthTier.LEADER,
    description: 'Coordinator for all Tiger dens',
  },
});

// Den-level roles
await prisma.volunteerRole.create({
  data: {
    name: 'Tiger Den Leader',
    roleType: RoleType.DEN_LEADER,
    rankLevel: RankLevel.TIGER,
    scopeType: RoleScope.DEN,
    grantsTier: AuthTier.LEADER,
    description: 'Leader of a specific Tiger den',
  },
});

// Assigning roles with den number
await prisma.volunteerToRole.create({
  data: {
    volunteerId: denLeader.id,
    roleId: tigerDenLeaderRole.id,
    denNumber: 3, // Den 3 Tigers
  },
});
```

---

### Decision 1.2: Eager Scope Loading with Request Context

**Rationale**: Loading scope information on every authorization check is expensive. Cache the scope in request context after initial authentication for the request lifecycle.

**Implementation**:

```typescript
// src/middleware/scope-context.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuthorizationService } from '../services/authorization.service';
import type { JWTPayload } from './auth';

/**
 * Middleware to load and cache access scope in request context
 * Runs after AuthGuard but before route handlers
 */
@Injectable()
export class ScopeContextMiddleware implements NestMiddleware {
  constructor(private authService: AuthorizationService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const user = (req as any).user as JWTPayload;

    if (user?.userId) {
      // Load scope once and cache in request object
      const scope = await this.authService.getAccessScope(user.userId);
      (req as any).accessScope = scope;
    }

    next();
  }
}

// Register in app.module.ts
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(ScopeContextMiddleware)
      .forRoutes('*'); // Apply to all routes after auth
  }
}
```

---

### Query Optimization Patterns

**Pattern 1: Pack-level access early exit**
```typescript
// Skip expensive queries if user has pack access
const scope = req.accessScope; // Cached from middleware
if (scope.canAccessPack) {
  return allRecordsQuery();
}
```

**Pattern 2: Rank-level batching**
```typescript
// Single query for multiple ranks
where: {
  rankLevel: { in: scope.accessibleRanks }
}
```

**Pattern 3: Composite den filtering**
```typescript
// OR conditions for den-specific access
where: {
  OR: scope.accessibleDens.map(den => ({
    rankLevel: den.rank,
    denNumber: den.denNumber
  }))
}
```

---

### Alternatives Considered

**Alternative 1: Computed authorization at query time**
- ❌ Performance: N+1 queries for each authorization check
- ❌ Complexity: Business logic scattered across multiple services
- ✅ Flexibility: Easier to add new permission rules

**Alternative 2: Role-based access control without scopes**
- ✅ Simpler schema and queries
- ❌ Cannot model "Advancement Chair sees all Tigers" requirement
- ❌ Forces pack-wide access for all committee members

**Alternative 3: Separate tables per scope level**
- ❌ Schema complexity: `PackRole`, `RankRole`, `DenRole` tables
- ❌ Query complexity: UNION queries across tables
- ✅ Type safety: Each scope has dedicated structure

**Decision: Proceed with Decision 1.1** - Best balance of performance, flexibility, and query simplicity.

---

## Topic 2: Award Fulfillment State Machine

### Context & Requirements

**Problem**: Awards (belt loops, pins, badges) go through a lifecycle from eligibility through physical distribution. Need to track state transitions, prevent invalid operations, and maintain audit trail.

**States**: `ELIGIBLE` → `APPROVED` → `PURCHASED` → `DISTRIBUTED` → `RECONCILED`

**Key Requirements**:
- Prevent invalid transitions (e.g., distribute before purchase)
- Audit trail: who performed transition and when
- Batch operations (purchasing 20 belt loops at once)
- Rollback scenarios for corrections
- Query efficiency: "show all items awaiting purchase"

---

### Decision 2.1: Enum-Based State with Transition History Table

**Rationale**: Prisma enums provide type safety and efficient indexing. Separate history table maintains full audit trail without complicating main table. This pattern is standard in e-commerce order fulfillment systems (see: Shopify order state management, Stripe payment lifecycle).

**Implementation**:

#### Prisma Schema

```prisma
model Award {
  id                String              @id @default(cuid())
  scoutVolunteerId  String              // The child receiving the award
  scoutVolunteer    Volunteer           @relation("ScoutAwards", fields: [scoutVolunteerId], references: [id])
  awardType         String              // "Tiger belt loop", "Bobcat badge", etc.
  awardCategory     AwardCategory
  
  // State management
  currentState      AwardState          @default(ELIGIBLE)
  
  // Metadata
  earnedDate        DateTime            // When scout completed requirements
  eventId           String?             // Event where requirements met
  event             Event?              @relation(fields: [eventId], references: [id], onDelete: SetNull)
  
  // Fulfillment tracking
  approvedBy        String?
  approver          Volunteer?          @relation("AwardApprover", fields: [approvedBy], references: [id])
  purchasedBy       String?
  purchaser         Volunteer?          @relation("AwardPurchaser", fields: [purchasedBy], references: [id])
  distributedBy     String?
  distributor       Volunteer?          @relation("AwardDistributor", fields: [distributedBy], references: [id])
  reconciledBy      String?
  reconciler        Volunteer?          @relation("AwardReconciler", fields: [reconciledBy], references: [id])
  
  purchaseOrderId   String?             // Group purchases together
  scoutbookEntryId  String?             // External reference for reconciliation
  
  // Audit trail
  stateHistory      AwardStateHistory[]
  
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt
  deletedAt         DateTime?
  
  @@index([currentState, awardCategory])  // "All belt loops awaiting purchase"
  @@index([scoutVolunteerId, currentState]) // "Awards for this scout"
  @@index([purchaseOrderId])                // Batch queries
  @@index([earnedDate])
}

enum AwardState {
  ELIGIBLE      // Scout has met requirements
  APPROVED      // Leader approved award
  PURCHASED     // Physical award purchased
  DISTRIBUTED   // Award given to scout
  RECONCILED    // Confirmed in Scoutbook
  CANCELLED     // Revoked or corrected
}

enum AwardCategory {
  RANK_BADGE       // Lion, Tiger, Wolf, Bear, Webelos, AOL
  BELT_LOOP        // Activity belt loops
  ADVENTURE_PIN    // Adventure completion pins
  SPECIAL          // Special awards (World Conservation, etc.)
}

model AwardStateHistory {
  id              String      @id @default(cuid())
  awardId         String
  award           Award       @relation(fields: [awardId], references: [id], onDelete: Cascade)
  
  fromState       AwardState?  // NULL for initial state
  toState         AwardState
  transitionedBy  String       // User who performed transition
  transitioner    Volunteer   @relation(fields: [transitionedBy], references: [id])
  
  reason          String?      // Optional explanation (required for CANCELLED)
  metadata        Json?        // Flexible storage (purchase details, reconciliation notes)
  
  transitionedAt  DateTime    @default(now())
  
  @@index([awardId, transitionedAt]) // Audit trail retrieval
  @@index([transitionedBy])           // User activity tracking
}
```

#### State Transition Service

```typescript
// src/services/award-fulfillment.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { AwardState } from '@prisma/client';
import prisma from '../utils/prisma';

/**
 * Defines valid state transitions
 * Key: current state, Value: allowed next states
 */
const VALID_TRANSITIONS: Record<AwardState, AwardState[]> = {
  [AwardState.ELIGIBLE]: [AwardState.APPROVED, AwardState.CANCELLED],
  [AwardState.APPROVED]: [
    AwardState.PURCHASED,
    AwardState.CANCELLED,
    AwardState.ELIGIBLE, // Rollback
  ],
  [AwardState.PURCHASED]: [
    AwardState.DISTRIBUTED,
    AwardState.CANCELLED,
    AwardState.APPROVED, // Rollback
  ],
  [AwardState.DISTRIBUTED]: [
    AwardState.RECONCILED,
    AwardState.CANCELLED,
    AwardState.PURCHASED, // Rollback
  ],
  [AwardState.RECONCILED]: [AwardState.CANCELLED], // Terminal state, only cancel
  [AwardState.CANCELLED]: [], // Terminal state
};

@Injectable()
export class AwardFulfillmentService {
  /**
   * Validate if transition is allowed
   */
  private validateTransition(from: AwardState, to: AwardState): void {
    const allowedStates = VALID_TRANSITIONS[from];
    if (!allowedStates.includes(to)) {
      throw new BadRequestException(
        `Invalid transition from ${from} to ${to}. Allowed: ${allowedStates.join(', ')}`
      );
    }
  }

  /**
   * Transition a single award to new state
   * Creates audit trail entry
   */
  async transitionAward(
    awardId: string,
    toState: AwardState,
    userId: string,
    reason?: string,
    metadata?: any
  ) {
    return prisma.$transaction(async (tx) => {
      // Lock record for update
      const award = await tx.award.findUnique({
        where: { id: awardId },
      });

      if (!award) {
        throw new BadRequestException('Award not found');
      }

      if (award.deletedAt) {
        throw new BadRequestException('Award has been deleted');
      }

      // Validate transition
      this.validateTransition(award.currentState, toState);

      // Require reason for cancellations
      if (toState === AwardState.CANCELLED && !reason) {
        throw new BadRequestException('Reason required for cancellation');
      }

      // Update award state
      const updateData: any = {
        currentState: toState,
        updatedAt: new Date(),
      };

      // Set actor fields based on state
      if (toState === AwardState.APPROVED) updateData.approvedBy = userId;
      if (toState === AwardState.PURCHASED) updateData.purchasedBy = userId;
      if (toState === AwardState.DISTRIBUTED) updateData.distributedBy = userId;
      if (toState === AwardState.RECONCILED) updateData.reconciledBy = userId;

      const updatedAward = await tx.award.update({
        where: { id: awardId },
        data: updateData,
      });

      // Create audit trail entry
      await tx.awardStateHistory.create({
        data: {
          awardId,
          fromState: award.currentState,
          toState,
          transitionedBy: userId,
          reason,
          metadata: metadata ? metadata : undefined,
        },
      });

      return updatedAward;
    });
  }

  /**
   * Batch transition multiple awards
   * Useful for purchasing or distributing many awards at once
   */
  async batchTransitionAwards(
    awardIds: string[],
    toState: AwardState,
    userId: string,
    metadata?: any
  ) {
    const results = await Promise.allSettled(
      awardIds.map((id) => this.transitionAward(id, toState, userId, undefined, metadata))
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected');

    return {
      total: awardIds.length,
      succeeded,
      failed: failed.length,
      errors: failed.map((f) =>
        f.status === 'rejected' ? f.reason?.message : 'Unknown error'
      ),
    };
  }

  /**
   * Mark batch purchase with purchase order ID
   * Groups multiple awards under single purchase transaction
   */
  async createPurchaseOrder(awardIds: string[], userId: string, purchaseDetails: any) {
    const purchaseOrderId = `PO-${Date.now()}`;

    // Transition all to PURCHASED and link to purchase order
    return prisma.$transaction(async (tx) => {
      const results = [];
      for (const awardId of awardIds) {
        const award = await this.transitionAward(
          awardId,
          AwardState.PURCHASED,
          userId,
          undefined,
          { purchaseOrderId, ...purchaseDetails }
        );
        
        // Link to purchase order
        await tx.award.update({
          where: { id: awardId },
          data: { purchaseOrderId },
        });
        
        results.push(award);
      }
      return { purchaseOrderId, awards: results };
    });
  }

  /**
   * Get awards by state for workflow views
   */
  async getAwardsByState(state: AwardState) {
    return prisma.award.findMany({
      where: {
        currentState: state,
        deletedAt: null,
      },
      include: {
        scoutVolunteer: {
          select: {
            id: true,
            name: true,
            childrenRanks: {
              select: { rankLevel: true, denNumber: true },
            },
          },
        },
      },
      orderBy: { earnedDate: 'asc' },
    });
  }

  /**
   * Get full state transition history for an award
   */
  async getAwardHistory(awardId: string) {
    return prisma.awardStateHistory.findMany({
      where: { awardId },
      include: {
        transitioner: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { transitionedAt: 'asc' },
    });
  }

  /**
   * Rollback award to previous state
   * Only allowed for specific transitions (see VALID_TRANSITIONS)
   */
  async rollbackAward(awardId: string, userId: string, reason: string) {
    const award = await prisma.award.findUnique({
      where: { id: awardId },
    });

    if (!award) {
      throw new BadRequestException('Award not found');
    }

    // Determine rollback state
    const rollbackMap: Partial<Record<AwardState, AwardState>> = {
      [AwardState.APPROVED]: AwardState.ELIGIBLE,
      [AwardState.PURCHASED]: AwardState.APPROVED,
      [AwardState.DISTRIBUTED]: AwardState.PURCHASED,
    };

    const rollbackState = rollbackMap[award.currentState];
    if (!rollbackState) {
      throw new BadRequestException(
        `Cannot rollback from state ${award.currentState}`
      );
    }

    return this.transitionAward(awardId, rollbackState, userId, reason);
  }
}
```

#### Controller Endpoints

```typescript
// src/api/awards.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, TierGuard, RequireTier } from '../middleware/auth';
import { AwardFulfillmentService } from '../services/award-fulfillment.service';
import { AwardState } from '@prisma/client';

@Controller('awards')
@UseGuards(AuthGuard)
export class AwardsController {
  constructor(private awardService: AwardFulfillmentService) {}

  /**
   * Get awards by workflow state
   * Query param: ?state=ELIGIBLE
   */
  @Get()
  @UseGuards(TierGuard)
  @RequireTier('LEADER')
  async getAwards(@Query('state') state?: AwardState) {
    if (state) {
      return this.awardService.getAwardsByState(state);
    }
    // Return all states grouped
    const states = Object.values(AwardState);
    const grouped = await Promise.all(
      states.map(async (s) => ({
        state: s,
        count: await prisma.award.count({ where: { currentState: s } }),
      }))
    );
    return grouped;
  }

  /**
   * Approve a single award
   */
  @Patch(':id/approve')
  @UseGuards(TierGuard)
  @RequireTier('LEADER')
  async approveAward(@Param('id') id: string, @Req() req) {
    return this.awardService.transitionAward(
      id,
      AwardState.APPROVED,
      req.user.userId
    );
  }

  /**
   * Mark awards as purchased (batch)
   */
  @Post('purchase-order')
  @UseGuards(TierGuard)
  @RequireTier('LEADER')
  async createPurchaseOrder(
    @Body() body: { awardIds: string[]; vendor?: string; cost?: number },
    @Req() req
  ) {
    return this.awardService.createPurchaseOrder(
      body.awardIds,
      req.user.userId,
      { vendor: body.vendor, cost: body.cost }
    );
  }

  /**
   * Distribute awards (batch)
   */
  @Post('distribute')
  @UseGuards(TierGuard)
  @RequireTier('LEADER')
  async distributeAwards(
    @Body() body: { awardIds: string[]; event?: string },
    @Req() req
  ) {
    return this.awardService.batchTransitionAwards(
      body.awardIds,
      AwardState.DISTRIBUTED,
      req.user.userId,
      { distributionEvent: body.event }
    );
  }

  /**
   * Get state transition history
   */
  @Get(':id/history')
  @UseGuards(TierGuard)
  @RequireTier('LEADER')
  async getHistory(@Param('id') id: string) {
    return this.awardService.getAwardHistory(id);
  }

  /**
   * Rollback to previous state
   */
  @Post(':id/rollback')
  @UseGuards(TierGuard)
  @RequireTier('ADMIN')
  async rollback(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Req() req
  ) {
    return this.awardService.rollbackAward(id, req.user.userId, reason);
  }
}
```

---

### Decision 2.2: State Visualization for Workflow Dashboards

**Rationale**: Leaders need visual workflow dashboards showing award pipeline status. Pre-aggregate counts by state for fast dashboard rendering.

**Implementation**:

```typescript
// Dashboard query pattern
async getWorkflowSummary() {
  const summary = await prisma.award.groupBy({
    by: ['currentState', 'awardCategory'],
    where: { deletedAt: null },
    _count: true,
  });

  // Format for dashboard
  return {
    pipeline: {
      eligible: summary.filter(s => s.currentState === 'ELIGIBLE')
        .reduce((sum, s) => sum + s._count, 0),
      approved: summary.filter(s => s.currentState === 'APPROVED')
        .reduce((sum, s) => sum + s._count, 0),
      purchased: summary.filter(s => s.currentState === 'PURCHASED')
        .reduce((sum, s) => sum + s._count, 0),
      distributed: summary.filter(s => s.currentState === 'DISTRIBUTED')
        .reduce((sum, s) => sum + s._count, 0),
      reconciled: summary.filter(s => s.currentState === 'RECONCILED')
        .reduce((sum, s) => sum + s._count, 0),
    },
    byCategory: summary.map(s => ({
      category: s.awardCategory,
      state: s.currentState,
      count: s._count,
    })),
  };
}
```

---

### Alternatives Considered

**Alternative 1: Table-based state definitions**
```prisma
model AwardStateDefinition {
  state         String   @id
  allowedNext   String[] // JSON array
  isTerminal    Boolean
}
```
- ✅ Flexibility: Change transitions without code deploy
- ❌ Performance: Join queries for validation
- ❌ Type safety: Lose Prisma enum validation
- **Use case**: If state transitions change frequently based on pack policy

**Alternative 2: Separate tables per state**
- ❌ Schema explosion: `EligibleAward`, `ApprovedAward`, etc.
- ❌ Complex queries: UNION across tables
- ✅ Data isolation: Each state has specific fields

**Alternative 3: Event sourcing pattern**
- Store only events, compute current state
- ✅ Complete audit trail by design
- ❌ Query complexity: Aggregate events for current state
- ❌ Performance: Slower for "all approved awards" queries

**Decision: Proceed with Decision 2.1** - Enum-based state with history table balances performance, type safety, and audit requirements.

---

## Topic 3: Category-Specific Prompt System

### Context & Requirements

**Problem**: After certain event types (Camping, Hiking, Service), prompt parents to enter hours in Scoutbook. Different categories require different data fields.

**Categories**:
- **Camping**: Nights camped (integer)
- **Hiking**: Miles hiked (decimal)
- **Service**: Hours served (decimal)

**Key Requirements**:
- Event templates provide default suggested values
- Leaders can override defaults during event closeout
- Track prompt status (sent, acknowledged, dismissed)
- System does NOT store authoritative totals (Scoutbook is source of truth)
- Extensible for future categories (Outdoor Ethics, Conservation, etc.)

---

### Decision 3.1: Strategy Pattern with JSON Configuration

**Rationale**: Use Prisma JSON fields for flexible category-specific data, combined with TypeScript strategy pattern for type-safe business logic. This approach is common in notification systems with varying payload structures (see: Stripe webhooks, GitHub Actions).

**Implementation**:

#### Prisma Schema

```prisma
model ScoutbookPrompt {
  id                String              @id @default(cuid())
  scoutVolunteerId  String              // The child
  scoutVolunteer    Volunteer           @relation("ScoutPrompts", fields: [scoutVolunteerId], references: [id])
  parentVolunteerId String?             // Parent to prompt (optional, can derive from scout)
  parentVolunteer   Volunteer?          @relation("ParentPrompts", fields: [parentVolunteerId], references: [id])
  
  eventId           String
  event             Event               @relation(fields: [eventId], references: [id], onDelete: Cascade)
  
  // Category configuration
  category          PromptCategory
  categoryData      Json                // Category-specific suggested values
  
  // Lifecycle tracking
  status            PromptStatus        @default(PENDING)
  sentAt            DateTime?
  acknowledgedAt    DateTime?
  dismissedAt       DateTime?
  dismissReason     String?
  
  // Generation metadata
  generatedBy       String              // Leader who closed out event
  generator         Volunteer           @relation("PromptGenerator", fields: [generatedBy], references: [id])
  
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt
  
  @@index([scoutVolunteerId, status])    // "My pending prompts"
  @@index([parentVolunteerId, status])   // Parent view
  @@index([eventId])                      // Event-based queries
  @@index([category, status])             // Category workflows
}

enum PromptCategory {
  CAMPING
  HIKING
  SERVICE
  CONSERVATION   // Future extensibility
  OUTDOOR_ETHICS // Future extensibility
}

enum PromptStatus {
  PENDING       // Generated but not sent
  SENT          // Delivered to parent
  ACKNOWLEDGED  // Parent confirmed entry in Scoutbook
  DISMISSED     // Parent declined/already entered
}

model EventTemplate {
  id                String              @id @default(cuid())
  name              String
  description       String?
  defaultRankLevel  RankLevel?
  
  // Prompt defaults
  generatePrompts   Boolean             @default(false)
  promptCategory    PromptCategory?
  promptDefaults    Json?               // Default suggested values
  
  // Used to create events
  events            Event[]
  
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt
  deletedAt         DateTime?
}

// Add to Event model
model Event {
  // ... existing fields ...
  
  templateId        String?
  template          EventTemplate?      @relation(fields: [templateId], references: [id], onDelete: SetNull)
  
  // Prompt generation (overrides template defaults)
  generatePrompts   Boolean             @default(false)
  promptCategory    PromptCategory?
  promptSuggestions Json?               // Leader-overridden suggestions
  
  prompts           ScoutbookPrompt[]
}
```

#### Category-Specific Type Definitions

```typescript
// src/types/prompt-categories.ts

export enum PromptCategory {
  CAMPING = 'CAMPING',
  HIKING = 'HIKING',
  SERVICE = 'SERVICE',
  CONSERVATION = 'CONSERVATION',
  OUTDOOR_ETHICS = 'OUTDOOR_ETHICS',
}

/**
 * Base interface for category-specific data
 */
export interface CategoryData {
  category: PromptCategory;
}

/**
 * Camping category: track nights
 */
export interface CampingData extends CategoryData {
  category: PromptCategory.CAMPING;
  suggestedNights: number; // e.g., 2
  notes?: string; // e.g., "Weekend campout at state park"
}

/**
 * Hiking category: track miles
 */
export interface HikingData extends CategoryData {
  category: PromptCategory.HIKING;
  suggestedMiles: number; // e.g., 3.5
  trailName?: string;
  difficulty?: 'EASY' | 'MODERATE' | 'DIFFICULT';
  notes?: string;
}

/**
 * Service category: track hours
 */
export interface ServiceData extends CategoryData {
  category: PromptCategory.SERVICE;
  suggestedHours: number; // e.g., 2.5
  projectName?: string;
  organization?: string; // e.g., "Local food bank"
  notes?: string;
}

/**
 * Union type for all category data
 */
export type PromptCategoryData = CampingData | HikingData | ServiceData;

/**
 * Type guard functions
 */
export function isCampingData(data: any): data is CampingData {
  return data?.category === PromptCategory.CAMPING;
}

export function isHikingData(data: any): data is HikingData {
  return data?.category === PromptCategory.HIKING;
}

export function isServiceData(data: any): data is ServiceData {
  return data?.category === PromptCategory.SERVICE;
}
```

#### Strategy Pattern Service

```typescript
// src/services/scoutbook-prompt.service.ts
import { Injectable } from '@nestjs/common';
import { PromptCategory, PromptStatus } from '@prisma/client';
import prisma from '../utils/prisma';
import {
  PromptCategoryData,
  CampingData,
  HikingData,
  ServiceData,
  isCampingData,
  isHikingData,
  isServiceData,
} from '../types/prompt-categories';

/**
 * Strategy interface for category-specific logic
 */
interface CategoryStrategy {
  generatePromptData(event: any, overrides?: Partial<PromptCategoryData>): PromptCategoryData;
  validatePromptData(data: any): boolean;
  formatNotificationMessage(data: PromptCategoryData, eventTitle: string): string;
}

/**
 * Camping category strategy
 */
class CampingStrategy implements CategoryStrategy {
  generatePromptData(event: any, overrides?: Partial<CampingData>): CampingData {
    const defaults: CampingData = {
      category: PromptCategory.CAMPING,
      suggestedNights: event.template?.promptDefaults?.suggestedNights ?? 1,
      notes: event.description,
    };
    return { ...defaults, ...overrides };
  }

  validatePromptData(data: any): boolean {
    return (
      isCampingData(data) &&
      typeof data.suggestedNights === 'number' &&
      data.suggestedNights > 0
    );
  }

  formatNotificationMessage(data: CampingData, eventTitle: string): string {
    return `Don't forget to log ${data.suggestedNights} night(s) of camping from "${eventTitle}" in Scoutbook!`;
  }
}

/**
 * Hiking category strategy
 */
class HikingStrategy implements CategoryStrategy {
  generatePromptData(event: any, overrides?: Partial<HikingData>): HikingData {
    const defaults: HikingData = {
      category: PromptCategory.HIKING,
      suggestedMiles: event.template?.promptDefaults?.suggestedMiles ?? 1.0,
      trailName: event.location,
      notes: event.description,
    };
    return { ...defaults, ...overrides };
  }

  validatePromptData(data: any): boolean {
    return (
      isHikingData(data) &&
      typeof data.suggestedMiles === 'number' &&
      data.suggestedMiles > 0
    );
  }

  formatNotificationMessage(data: HikingData, eventTitle: string): string {
    const trail = data.trailName ? ` on ${data.trailName}` : '';
    return `Remember to log ${data.suggestedMiles} miles hiked${trail} from "${eventTitle}" in Scoutbook!`;
  }
}

/**
 * Service category strategy
 */
class ServiceStrategy implements CategoryStrategy {
  generatePromptData(event: any, overrides?: Partial<ServiceData>): ServiceData {
    const defaults: ServiceData = {
      category: PromptCategory.SERVICE,
      suggestedHours: event.template?.promptDefaults?.suggestedHours ?? 1.0,
      projectName: event.title,
      notes: event.description,
    };
    return { ...defaults, ...overrides };
  }

  validatePromptData(data: any): boolean {
    return (
      isServiceData(data) &&
      typeof data.suggestedHours === 'number' &&
      data.suggestedHours > 0
    );
  }

  formatNotificationMessage(data: ServiceData, eventTitle: string): string {
    const org = data.organization ? ` with ${data.organization}` : '';
    return `Please log ${data.suggestedHours} hours of service${org} from "${eventTitle}" in Scoutbook.`;
  }
}

/**
 * Strategy registry
 */
const CATEGORY_STRATEGIES: Record<PromptCategory, CategoryStrategy> = {
  [PromptCategory.CAMPING]: new CampingStrategy(),
  [PromptCategory.HIKING]: new HikingStrategy(),
  [PromptCategory.SERVICE]: new ServiceStrategy(),
  [PromptCategory.CONSERVATION]: new ServiceStrategy(), // Reuse for now
  [PromptCategory.OUTDOOR_ETHICS]: new ServiceStrategy(), // Reuse for now
};

@Injectable()
export class ScoutbookPromptService {
  /**
   * Get strategy for a category
   */
  private getStrategy(category: PromptCategory): CategoryStrategy {
    return CATEGORY_STRATEGIES[category];
  }

  /**
   * Generate prompts for all attendees when event is closed out
   */
  async generatePromptsForEvent(eventId: string, leaderId: string, overrides?: any) {
    // Get event with attendees
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        activitySlots: {
          include: {
            signups: {
              where: { withdrawn: false },
              include: {
                volunteer: {
                  include: {
                    childrenRanks: true,
                  },
                },
              },
            },
          },
        },
        template: true,
      },
    });

    if (!event) {
      throw new Error('Event not found');
    }

    if (!event.generatePrompts || !event.promptCategory) {
      throw new Error('Event not configured for prompt generation');
    }

    // Get strategy for category
    const strategy = this.getStrategy(event.promptCategory);

    // Collect unique scouts (children)
    const scoutIds = new Set<string>();
    event.activitySlots.forEach((slot) => {
      slot.signups.forEach((signup) => {
        if (signup.volunteer.childrenRanks.length > 0) {
          scoutIds.add(signup.volunteerId);
        }
      });
    });

    // Generate prompt for each scout
    const prompts = await Promise.all(
      Array.from(scoutIds).map(async (scoutId) => {
        // Generate category-specific data
        const categoryData = strategy.generatePromptData(event, overrides);

        return prisma.scoutbookPrompt.create({
          data: {
            scoutVolunteerId: scoutId,
            eventId,
            category: event.promptCategory!,
            categoryData: categoryData as any, // Prisma Json type
            status: PromptStatus.PENDING,
            generatedBy: leaderId,
          },
        });
      })
    );

    return {
      generated: prompts.length,
      prompts,
    };
  }

  /**
   * Send pending prompts (creates notifications)
   */
  async sendPendingPrompts(eventId: string) {
    const prompts = await prisma.scoutbookPrompt.findMany({
      where: {
        eventId,
        status: PromptStatus.PENDING,
      },
      include: {
        scoutVolunteer: {
          select: { id: true, name: true },
        },
        event: {
          select: { id: true, title: true },
        },
      },
    });

    // Create notifications and update status
    for (const prompt of prompts) {
      const strategy = this.getStrategy(prompt.category);
      const message = strategy.formatNotificationMessage(
        prompt.categoryData as PromptCategoryData,
        prompt.event.title
      );

      // Create in-app notification
      await prisma.notification.create({
        data: {
          volunteerId: prompt.scoutVolunteerId,
          type: 'SCOUTBOOK_PROMPT', // Add to enum
          message,
          link: `/prompts/${prompt.id}`,
        },
      });

      // Update prompt status
      await prisma.scoutbookPrompt.update({
        where: { id: prompt.id },
        data: {
          status: PromptStatus.SENT,
          sentAt: new Date(),
        },
      });
    }

    return { sent: prompts.length };
  }

  /**
   * Acknowledge prompt (parent confirmed entry)
   */
  async acknowledgePrompt(promptId: string, userId: string) {
    return prisma.scoutbookPrompt.update({
      where: { id: promptId },
      data: {
        status: PromptStatus.ACKNOWLEDGED,
        acknowledgedAt: new Date(),
      },
    });
  }

  /**
   * Dismiss prompt (already entered or declined)
   */
  async dismissPrompt(promptId: string, userId: string, reason?: string) {
    return prisma.scoutbookPrompt.update({
      where: { id: promptId },
      data: {
        status: PromptStatus.DISMISSED,
        dismissedAt: new Date(),
        dismissReason: reason,
      },
    });
  }

  /**
   * Get prompts for a scout
   */
  async getPromptsForScout(scoutId: string, status?: PromptStatus) {
    return prisma.scoutbookPrompt.findMany({
      where: {
        scoutVolunteerId: scoutId,
        ...(status && { status }),
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            eventDate: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
```

#### Event Template Configuration

```typescript
// Example seed data for event templates
await prisma.eventTemplate.create({
  data: {
    name: 'Weekend Campout',
    description: 'Standard weekend camping trip',
    defaultRankLevel: null, // Pack-wide
    generatePrompts: true,
    promptCategory: PromptCategory.CAMPING,
    promptDefaults: {
      suggestedNights: 2,
      notes: 'Remember to log camping nights in Scoutbook!',
    },
  },
});

await prisma.eventTemplate.create({
  data: {
    name: 'Service Project',
    description: 'Community service activity',
    generatePrompts: true,
    promptCategory: PromptCategory.SERVICE,
    promptDefaults: {
      suggestedHours: 2.0,
      notes: 'Track your service hours in Scoutbook',
    },
  },
});

await prisma.eventTemplate.create({
  data: {
    name: 'Nature Hike',
    description: 'Outdoor hiking activity',
    generatePrompts: true,
    promptCategory: PromptCategory.HIKING,
    promptDefaults: {
      suggestedMiles: 2.5,
      difficulty: 'MODERATE',
    },
  },
});
```

#### Controller Usage

```typescript
// src/api/scoutbook-prompts.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard, TierGuard, RequireTier } from '../middleware/auth';
import { ScoutbookPromptService } from '../services/scoutbook-prompt.service';
import { PromptStatus } from '@prisma/client';

@Controller('scoutbook-prompts')
@UseGuards(AuthGuard)
export class ScoutbookPromptsController {
  constructor(private promptService: ScoutbookPromptService) {}

  /**
   * Leader: Generate prompts during event closeout
   */
  @Post('events/:eventId/generate')
  @UseGuards(TierGuard)
  @RequireTier('LEADER')
  async generatePrompts(
    @Param('eventId') eventId: string,
    @Body() overrides: any,
    @Req() req
  ) {
    return this.promptService.generatePromptsForEvent(
      eventId,
      req.user.userId,
      overrides
    );
  }

  /**
   * Leader: Send pending prompts
   */
  @Post('events/:eventId/send')
  @UseGuards(TierGuard)
  @RequireTier('LEADER')
  async sendPrompts(@Param('eventId') eventId: string) {
    return this.promptService.sendPendingPrompts(eventId);
  }

  /**
   * Parent: Get my child's prompts
   */
  @Get('scouts/:scoutId')
  async getScoutPrompts(
    @Param('scoutId') scoutId: string,
    @Req() req
  ) {
    // TODO: Add authorization check - must be parent of scout
    return this.promptService.getPromptsForScout(scoutId);
  }

  /**
   * Parent: Acknowledge prompt
   */
  @Patch(':promptId/acknowledge')
  async acknowledgePrompt(@Param('promptId') promptId: string, @Req() req) {
    return this.promptService.acknowledgePrompt(promptId, req.user.userId);
  }

  /**
   * Parent: Dismiss prompt
   */
  @Patch(':promptId/dismiss')
  async dismissPrompt(
    @Param('promptId') promptId: string,
    @Body('reason') reason: string,
    @Req() req
  ) {
    return this.promptService.dismissPrompt(promptId, req.user.userId, reason);
  }
}
```

---

### Decision 3.2: Adding New Categories

**Pattern for Extensibility**:

1. **Add enum value**:
```prisma
enum PromptCategory {
  CAMPING
  HIKING
  SERVICE
  CONSERVATION   // NEW
}
```

2. **Define TypeScript interface**:
```typescript
export interface ConservationData extends CategoryData {
  category: PromptCategory.CONSERVATION;
  suggestedProjects: number;
  projectType?: 'RECYCLING' | 'WILDLIFE' | 'ENERGY';
  notes?: string;
}
```

3. **Create strategy class**:
```typescript
class ConservationStrategy implements CategoryStrategy {
  generatePromptData(event: any, overrides?: Partial<ConservationData>): ConservationData {
    return {
      category: PromptCategory.CONSERVATION,
      suggestedProjects: event.template?.promptDefaults?.suggestedProjects ?? 1,
      ...overrides,
    };
  }

  validatePromptData(data: any): boolean {
    return data?.category === PromptCategory.CONSERVATION &&
           typeof data.suggestedProjects === 'number';
  }

  formatNotificationMessage(data: ConservationData, eventTitle: string): string {
    return `Log your conservation project from "${eventTitle}" in Scoutbook.`;
  }
}
```

4. **Register strategy**:
```typescript
const CATEGORY_STRATEGIES: Record<PromptCategory, CategoryStrategy> = {
  // ... existing ...
  [PromptCategory.CONSERVATION]: new ConservationStrategy(),
};
```

---

### Alternatives Considered

**Alternative 1: Separate table per category**
```prisma
model CampingPrompt {
  id             String @id
  suggestedNights Int
  // ...
}
model HikingPrompt {
  id             String @id
  suggestedMiles Float
  // ...
}
```
- ✅ Type safety at database level
- ❌ Schema explosion, complex queries
- ❌ Difficult to add categories dynamically

**Alternative 2: Hardcoded switch statements**
```typescript
if (category === 'CAMPING') {
  // camping logic
} else if (category === 'HIKING') {
  // hiking logic
}
```
- ✅ Simple, no abstraction overhead
- ❌ Violates Open/Closed Principle
- ❌ Hard to test individual categories

**Alternative 3: Plugin system with dynamic imports**
- ✅ Ultimate flexibility, hot-reload categories
- ❌ Complexity overkill for small category set
- ❌ Type safety challenges

**Decision: Proceed with Decision 3.1** - Strategy pattern with JSON provides best balance of flexibility, type safety, and simplicity.

---

## Summary & Recommendations

### Topic 1: Multi-Scope Role Assignments
**Recommendation**: Implement hierarchical scope model with Pack/Rank/Den scopes
- **Schema**: Add `scopeType` enum and `denNumber` to role assignments
- **Authorization**: Create `AuthorizationService` with scope calculation
- **Optimization**: Cache scope in request context middleware
- **Queries**: Use early exit for pack access, OR conditions for rank/den filtering

### Topic 2: Award Fulfillment State Machine
**Recommendation**: Use Prisma enum states with separate history table
- **Schema**: `Award` with `currentState` enum, `AwardStateHistory` for audit trail
- **Service**: `AwardFulfillmentService` validates transitions, creates history records
- **Batch ops**: `batchTransitionAwards()` and `createPurchaseOrder()` methods
- **Rollback**: Support specific rollback transitions with reason tracking

### Topic 3: Category-Specific Prompt System
**Recommendation**: Strategy pattern with JSON category data
- **Schema**: `ScoutbookPrompt` with `category` enum and `categoryData` JSON
- **Strategy**: TypeScript strategy classes for each category's logic
- **Extensibility**: Add new categories by creating interface + strategy class
- **Templates**: `EventTemplate` stores default category configurations

---

## Next Steps

1. **Review** this research with the team
2. **Decide** which topics to implement in which order
3. **Create specs** for chosen features (see specs/ folder structure)
4. **Implement** following TDD approach with comprehensive test coverage
5. **Document** any deviations or lessons learned in bugs.md

---

*Research complete. Ready for feature specification phase.*
