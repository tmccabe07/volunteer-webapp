# Workflow Patterns Research
**Date**: May 22, 2026  
**Context**: NestJS + Prisma + TypeScript application

---

## Topic 1: Parent-Child Linking Workflow

### Overview
Approval-based parent-child linking with privacy controls is a common pattern in educational and youth organization systems. The key challenge is balancing security (preventing unauthorized access) with usability (streamlined approval process).

### Best Practices

#### 1. Database Schema Design

**Core Pattern**: Use a junction table with status tracking and full audit trail.

```prisma
// Existing User model (parent account)
model User {
  id              Int                @id @default(autoincrement())
  email           String             @unique
  name            String
  role            Role
  parentLinks     ParentChildLink[]  @relation("ParentUser")
  approvedLinks   ParentChildLink[]  @relation("Approver")
  // ... other fields
}

// Existing Volunteer model (the child/scout)
model Volunteer {
  id              Int                @id @default(autoincrement())
  firstName       String
  lastName        String
  parentLinks     ParentChildLink[]
  // ... other fields
}

model ParentChildLink {
  id              Int                      @id @default(autoincrement())
  parentId        Int
  parent          User                     @relation("ParentUser", fields: [parentId], references: [id], onDelete: Cascade)
  childId         Int
  child           Volunteer                @relation(fields: [childId], references: [id], onDelete: Cascade)
  status          LinkStatus               @default(PENDING)
  relationshipType String?                  // "mother", "father", "guardian", etc.
  
  // Audit trail
  requestedAt     DateTime                 @default(now())
  requestedBy     Int                      // Usually same as parentId, but could differ
  processedAt     DateTime?
  processedBy     Int?
  processor       User?                    @relation("Approver", fields: [processedBy], references: [id])
  rejectionReason String?
  
  // Prevent duplicate pending requests
  @@unique([parentId, childId, status])
  @@index([status, requestedAt])
  @@index([childId])
  @@index([parentId])
}

enum LinkStatus {
  PENDING
  APPROVED
  REJECTED
  REVOKED    // For removing previously approved links
}
```

**Key Design Decisions**:
- **Unique constraint on (parentId, childId, status)**: Prevents multiple pending requests but allows historical records
- **Cascade deletes**: If user or volunteer is deleted, links are cleaned up
- **Separate requestedBy field**: Handles case where admin creates link on behalf of parent
- **relationshipType**: Optional field for clarity in multi-parent scenarios
- **REVOKED status**: Allows soft deletion of approved links while maintaining audit trail

#### 2. Service Layer Methods

```typescript
// parent-child-link.service.ts
import { Injectable, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { LinkStatus } from '@prisma/client';

@Injectable()
export class ParentChildLinkService {
  constructor(private prisma: PrismaService) {}

  /**
   * Parent requests to link to their child
   * Idempotent: Returns existing pending request if found
   */
  async requestLink(
    parentId: number,
    childId: number,
    relationshipType?: string,
  ) {
    // Verify child exists
    const child = await this.prisma.volunteer.findUnique({
      where: { id: childId },
    });
    if (!child) {
      throw new NotFoundException('Child not found');
    }

    // Check for existing pending request (idempotency)
    const existingPending = await this.prisma.parentChildLink.findFirst({
      where: {
        parentId,
        childId,
        status: LinkStatus.PENDING,
      },
    });
    if (existingPending) {
      return existingPending; // Return existing request
    }

    // Check if already approved
    const existingApproved = await this.prisma.parentChildLink.findFirst({
      where: {
        parentId,
        childId,
        status: LinkStatus.APPROVED,
      },
    });
    if (existingApproved) {
      throw new ConflictException('Link already approved');
    }

    // Create new request
    return this.prisma.parentChildLink.create({
      data: {
        parentId,
        childId,
        relationshipType,
        requestedBy: parentId,
        status: LinkStatus.PENDING,
      },
      include: {
        parent: { select: { id: true, name: true, email: true } },
        child: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  /**
   * Den leader or admin approves link request
   */
  async approveLink(linkId: number, approverId: number) {
    const link = await this.prisma.parentChildLink.findUnique({
      where: { id: linkId },
      include: {
        parent: { select: { id: true, name: true, email: true } },
        child: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!link) {
      throw new NotFoundException('Link request not found');
    }

    if (link.status !== LinkStatus.PENDING) {
      throw new ConflictException(`Link already ${link.status.toLowerCase()}`);
    }

    return this.prisma.parentChildLink.update({
      where: { id: linkId },
      data: {
        status: LinkStatus.APPROVED,
        processedAt: new Date(),
        processedBy: approverId,
      },
      include: {
        parent: { select: { id: true, name: true, email: true } },
        child: { select: { id: true, firstName: true, lastName: true } },
        processor: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * Reject link request with reason
   */
  async rejectLink(
    linkId: number,
    approverId: number,
    reason: string,
  ) {
    const link = await this.prisma.parentChildLink.findUnique({
      where: { id: linkId },
    });

    if (!link) {
      throw new NotFoundException('Link request not found');
    }

    if (link.status !== LinkStatus.PENDING) {
      throw new ConflictException(`Link already ${link.status.toLowerCase()}`);
    }

    return this.prisma.parentChildLink.update({
      where: { id: linkId },
      data: {
        status: LinkStatus.REJECTED,
        processedAt: new Date(),
        processedBy: approverId,
        rejectionReason: reason,
      },
    });
  }

  /**
   * Revoke previously approved link (e.g., child transfers out)
   */
  async revokeLink(linkId: number, revokerId: number, reason: string) {
    const link = await this.prisma.parentChildLink.findUnique({
      where: { id: linkId },
    });

    if (!link) {
      throw new NotFoundException('Link not found');
    }

    if (link.status !== LinkStatus.APPROVED) {
      throw new ConflictException('Can only revoke approved links');
    }

    return this.prisma.parentChildLink.update({
      where: { id: linkId },
      data: {
        status: LinkStatus.REVOKED,
        processedAt: new Date(),
        processedBy: revokerId,
        rejectionReason: reason,
      },
    });
  }

  /**
   * Get all pending requests (for den leader/admin dashboard)
   */
  async getPendingRequests(denId?: number) {
    return this.prisma.parentChildLink.findMany({
      where: {
        status: LinkStatus.PENDING,
        ...(denId && {
          child: {
            denId, // Assuming Volunteer has denId field
          },
        }),
      },
      include: {
        parent: { select: { id: true, name: true, email: true } },
        child: { 
          select: { 
            id: true, 
            firstName: true, 
            lastName: true,
            denId: true,
          } 
        },
      },
      orderBy: { requestedAt: 'asc' },
    });
  }

  /**
   * Get all children accessible to a parent
   */
  async getAccessibleChildren(parentId: number) {
    const links = await this.prisma.parentChildLink.findMany({
      where: {
        parentId,
        status: LinkStatus.APPROVED,
      },
      include: {
        child: true,
      },
    });

    return links.map(link => link.child);
  }

  /**
   * Check if parent has access to specific child
   */
  async hasAccessToChild(parentId: number, childId: number): Promise<boolean> {
    const link = await this.prisma.parentChildLink.findFirst({
      where: {
        parentId,
        childId,
        status: LinkStatus.APPROVED,
      },
    });

    return !!link;
  }

  /**
   * Get all parents linked to a child
   */
  async getChildParents(childId: number) {
    const links = await this.prisma.parentChildLink.findMany({
      where: {
        childId,
        status: LinkStatus.APPROVED,
      },
      include: {
        parent: { select: { id: true, name: true, email: true } },
      },
    });

    return links.map(link => ({
      ...link.parent,
      relationshipType: link.relationshipType,
      linkedSince: link.processedAt,
    }));
  }
}
```

#### 3. Authorization Guard Pattern

```typescript
// parent-child-access.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ParentChildLinkService } from './parent-child-link.service';

/**
 * Guard to verify parent has access to child specified in request
 * Usage: @UseGuards(JwtAuthGuard, ParentChildAccessGuard)
 *        @RequireChildAccess() // Decorator to mark routes that need this check
 */
@Injectable()
export class ParentChildAccessGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private linkService: ParentChildLinkService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route requires child access check
    const requiresCheck = this.reflector.get<boolean>(
      'requireChildAccess',
      context.getHandler(),
    );
    if (!requiresCheck) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user; // From JWT
    const childId = this.extractChildId(request);

    if (!childId) {
      throw new ForbiddenException('Child ID not found in request');
    }

    // Admins and leaders can access all children
    if (['ADMIN', 'DEN_LEADER', 'CUBMASTER'].includes(user.role)) {
      return true;
    }

    // Parents can only access their linked children
    if (user.role === 'PARENT') {
      const hasAccess = await this.linkService.hasAccessToChild(
        user.userId,
        childId,
      );
      if (!hasAccess) {
        throw new ForbiddenException('Access denied to this child record');
      }
      return true;
    }

    return false;
  }

  private extractChildId(request: any): number | null {
    // Check various locations for childId
    return (
      parseInt(request.params.childId) ||
      parseInt(request.params.volunteerId) ||
      parseInt(request.query.childId) ||
      parseInt(request.body.childId) ||
      null
    );
  }
}

// Decorator to mark routes requiring child access check
import { SetMetadata } from '@nestjs/common';
export const RequireChildAccess = () => SetMetadata('requireChildAccess', true);
```

**Usage Example**:

```typescript
// volunteers.controller.ts
@Controller('volunteers')
export class VolunteersController {
  constructor(private volunteersService: VolunteersService) {}

  @Get(':volunteerId')
  @UseGuards(JwtAuthGuard, ParentChildAccessGuard)
  @RequireChildAccess()
  async getVolunteer(@Param('volunteerId') volunteerId: string) {
    return this.volunteersService.findOne(parseInt(volunteerId));
  }

  @Patch(':volunteerId')
  @UseGuards(JwtAuthGuard, ParentChildAccessGuard)
  @RequireChildAccess()
  async updateVolunteer(
    @Param('volunteerId') volunteerId: string,
    @Body() updateDto: UpdateVolunteerDto,
  ) {
    return this.volunteersService.update(parseInt(volunteerId), updateDto);
  }
}
```

#### 4. Notification Integration

```typescript
// After successful request creation:
await this.notificationService.create({
  recipientId: denLeaderId, // Get from child's den
  type: 'PARENT_LINK_REQUEST',
  title: 'New Parent Link Request',
  message: `${parent.name} has requested access to ${child.firstName} ${child.lastName}`,
  actionUrl: `/admin/link-requests/${link.id}`,
});

// After approval:
await this.notificationService.create({
  recipientId: parentId,
  type: 'PARENT_LINK_APPROVED',
  title: 'Parent Link Approved',
  message: `Your request to link to ${child.firstName} ${child.lastName} has been approved`,
  actionUrl: `/my-children/${childId}`,
});
```

#### 5. Edge Cases Handling

**Scenario: Parent leaves pack**
```typescript
// Revoke all parent's links
async revokeAllParentLinks(parentId: number, revokerId: number) {
  return this.prisma.parentChildLink.updateMany({
    where: {
      parentId,
      status: LinkStatus.APPROVED,
    },
    data: {
      status: LinkStatus.REVOKED,
      processedAt: new Date(),
      processedBy: revokerId,
      rejectionReason: 'Parent left pack',
    },
  });
}
```

**Scenario: Child transfers to different den**
```typescript
// Keep link active, but may need notification to new den leader
// No automatic revocation needed
```

**Scenario: Duplicate request (already handled via idempotency in requestLink)**

#### 6. API Endpoints

```typescript
// parent-link.controller.ts
@Controller('parent-links')
export class ParentLinkController {
  constructor(private linkService: ParentChildLinkService) {}

  // Parent requests link
  @Post('request')
  @UseGuards(JwtAuthGuard)
  async requestLink(
    @Body() dto: { childId: number; relationshipType?: string },
    @Req() req,
  ) {
    return this.linkService.requestLink(
      req.user.userId,
      dto.childId,
      dto.relationshipType,
    );
  }

  // Leader/admin views pending requests
  @Get('pending')
  @UseGuards(JwtAuthGuard, TierGuard)
  @RequireTier(Tier.DEN_LEADER)
  async getPendingRequests(@Query('denId') denId?: string) {
    return this.linkService.getPendingRequests(
      denId ? parseInt(denId) : undefined,
    );
  }

  // Leader/admin approves request
  @Post(':linkId/approve')
  @UseGuards(JwtAuthGuard, TierGuard)
  @RequireTier(Tier.DEN_LEADER)
  async approveLink(@Param('linkId') linkId: string, @Req() req) {
    return this.linkService.approveLink(parseInt(linkId), req.user.userId);
  }

  // Leader/admin rejects request
  @Post(':linkId/reject')
  @UseGuards(JwtAuthGuard, TierGuard)
  @RequireTier(Tier.DEN_LEADER)
  async rejectLink(
    @Param('linkId') linkId: string,
    @Body() dto: { reason: string },
    @Req() req,
  ) {
    return this.linkService.rejectLink(
      parseInt(linkId),
      req.user.userId,
      dto.reason,
    );
  }

  // Get my children (for parent view)
  @Get('my-children')
  @UseGuards(JwtAuthGuard)
  async getMyChildren(@Req() req) {
    return this.linkService.getAccessibleChildren(req.user.userId);
  }
}
```

---

## Topic 2: Scoutbook Reconciliation Tracking

### Overview
Manual reconciliation with external systems (Scoutbook) without API integration is a common challenge in systems-of-record scenarios. The key is tracking reconciliation state while maintaining data integrity and providing visibility for leadership.

### Best Practices

#### 1. Database Schema Design

**Pattern**: Add reconciliation metadata directly to records that need tracking.

```prisma
model BadgeHistory {
  id                    Int                  @id @default(autoincrement())
  volunteerId           Int
  volunteer             Volunteer            @relation(fields: [volunteerId], references: [id], onDelete: Cascade)
  badgeId               Int
  badge                 Badge                @relation(fields: [badgeId], references: [id])
  awardedAt             DateTime             @default(now())
  awardedBy             Int
  awarder               User                 @relation("Awarder", fields: [awardedBy], references: [id])
  
  // Scoutbook reconciliation fields
  scoutbookStatus       ReconciliationStatus @default(PENDING)
  scoutbookEnteredAt    DateTime?
  scoutbookEnteredBy    Int?
  scoutbookEntered      User?                @relation("ScoutbookReconciler", fields: [scoutbookEnteredBy], references: [id])
  scoutbookNotes        String?              // Optional: approval number, notes, etc.
  
  @@unique([volunteerId, badgeId])
  @@index([scoutbookStatus, awardedAt])
  @@index([volunteerId])
}

model RequirementProgress {
  id                    Int                  @id @default(autoincrement())
  volunteerId           Int
  volunteer             Volunteer            @relation(fields: [volunteerId], references: [id], onDelete: Cascade)
  requirementId         Int
  requirement           Requirement          @relation(fields: [requirementId], references: [id])
  completedAt           DateTime             @default(now())
  completedBy           Int
  completer             User                 @relation("Completer", fields: [completedBy], references: [id])
  
  // Scoutbook reconciliation fields
  scoutbookStatus       ReconciliationStatus @default(PENDING)
  scoutbookEnteredAt    DateTime?
  scoutbookEnteredBy    Int?
  scoutbookEntered      User?                @relation("ScoutbookReconciler", fields: [scoutbookEnteredBy], references: [id])
  scoutbookNotes        String?
  
  @@unique([volunteerId, requirementId])
  @@index([scoutbookStatus, completedAt])
}

enum ReconciliationStatus {
  PENDING           // Not yet entered in Scoutbook
  ENTERED           // Manually marked as entered in Scoutbook
  VERIFIED          // Optional: Double-checked by another leader
  NOT_NEEDED        // Optional: Doesn't require Scoutbook entry (e.g., internal-only tracking)
}
```

**Alternative Pattern**: Separate reconciliation audit table (use when many entities need tracking).

```prisma
model ReconciliationLog {
  id                Int                  @id @default(autoincrement())
  entityType        String               // "BadgeHistory", "RequirementProgress", etc.
  entityId          Int                  // ID of the record
  previousStatus    ReconciliationStatus
  newStatus         ReconciliationStatus
  changedAt         DateTime             @default(now())
  changedBy         Int
  changer           User                 @relation(fields: [changedBy], references: [id])
  notes             String?
  
  @@index([entityType, entityId])
  @@index([changedAt])
}
```

**Key Design Decisions**:
- **Embedded fields**: Reconciliation metadata lives with the record (simpler queries)
- **Status enum**: Clear progression from PENDING → ENTERED → VERIFIED
- **Nullable timestamps**: Only populated when action occurs
- **Notes field**: Captures Scoutbook approval numbers, special circumstances
- **NOT_NEEDED status**: Handles exceptions (local tracking only)
- **Indexes**: Fast filtering by status and date for dashboard queries

#### 2. Service Layer Methods

```typescript
// reconciliation.service.ts
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { ReconciliationStatus } from '@prisma/client';

@Injectable()
export class ReconciliationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Mark badge history as entered in Scoutbook
   */
  async markBadgeEnteredInScoutbook(
    badgeHistoryId: number,
    enteredBy: number,
    notes?: string,
  ) {
    const record = await this.prisma.badgeHistory.findUnique({
      where: { id: badgeHistoryId },
    });

    if (!record) {
      throw new NotFoundException('Badge history record not found');
    }

    if (record.scoutbookStatus !== ReconciliationStatus.PENDING) {
      throw new ConflictException(
        `Record already marked as ${record.scoutbookStatus}`,
      );
    }

    return this.prisma.badgeHistory.update({
      where: { id: badgeHistoryId },
      data: {
        scoutbookStatus: ReconciliationStatus.ENTERED,
        scoutbookEnteredAt: new Date(),
        scoutbookEnteredBy: enteredBy,
        scoutbookNotes: notes,
      },
      include: {
        volunteer: { select: { firstName: true, lastName: true } },
        badge: { select: { name: true } },
      },
    });
  }

  /**
   * Mark requirement as entered in Scoutbook
   */
  async markRequirementEnteredInScoutbook(
    progressId: number,
    enteredBy: number,
    notes?: string,
  ) {
    const record = await this.prisma.requirementProgress.findUnique({
      where: { id: progressId },
    });

    if (!record) {
      throw new NotFoundException('Requirement progress record not found');
    }

    if (record.scoutbookStatus !== ReconciliationStatus.PENDING) {
      throw new ConflictException(
        `Record already marked as ${record.scoutbookStatus}`,
      );
    }

    return this.prisma.requirementProgress.update({
      where: { id: progressId },
      data: {
        scoutbookStatus: ReconciliationStatus.ENTERED,
        scoutbookEnteredAt: new Date(),
        scoutbookEnteredBy: enteredBy,
        scoutbookNotes: notes,
      },
      include: {
        volunteer: { select: { firstName: true, lastName: true } },
        requirement: { select: { name: true } },
      },
    });
  }

  /**
   * Bulk mark multiple records as entered
   * Returns count of successful updates
   */
  async bulkMarkEntered(
    entityType: 'badge' | 'requirement',
    ids: number[],
    enteredBy: number,
    notes?: string,
  ) {
    const now = new Date();
    
    if (entityType === 'badge') {
      return this.prisma.badgeHistory.updateMany({
        where: {
          id: { in: ids },
          scoutbookStatus: ReconciliationStatus.PENDING,
        },
        data: {
          scoutbookStatus: ReconciliationStatus.ENTERED,
          scoutbookEnteredAt: now,
          scoutbookEnteredBy: enteredBy,
          scoutbookNotes: notes,
        },
      });
    } else {
      return this.prisma.requirementProgress.updateMany({
        where: {
          id: { in: ids },
          scoutbookStatus: ReconciliationStatus.PENDING,
        },
        data: {
          scoutbookStatus: ReconciliationStatus.ENTERED,
          scoutbookEnteredAt: now,
          scoutbookEnteredBy: enteredBy,
          scoutbookNotes: notes,
        },
      });
    }
  }

  /**
   * Get unresolved items (pending Scoutbook entry)
   */
  async getUnresolvedItems(options?: {
    olderThanDays?: number;
    volunteerId?: number;
    denId?: number;
  }) {
    const cutoffDate = options?.olderThanDays
      ? new Date(Date.now() - options.olderThanDays * 24 * 60 * 60 * 1000)
      : undefined;

    const badges = await this.prisma.badgeHistory.findMany({
      where: {
        scoutbookStatus: ReconciliationStatus.PENDING,
        ...(cutoffDate && { awardedAt: { lte: cutoffDate } }),
        ...(options?.volunteerId && { volunteerId: options.volunteerId }),
        ...(options?.denId && {
          volunteer: { denId: options.denId },
        }),
      },
      include: {
        volunteer: { select: { id: true, firstName: true, lastName: true, denId: true } },
        badge: { select: { name: true, category: true } },
        awarder: { select: { name: true } },
      },
      orderBy: { awardedAt: 'asc' },
    });

    const requirements = await this.prisma.requirementProgress.findMany({
      where: {
        scoutbookStatus: ReconciliationStatus.PENDING,
        ...(cutoffDate && { completedAt: { lte: cutoffDate } }),
        ...(options?.volunteerId && { volunteerId: options.volunteerId }),
        ...(options?.denId && {
          volunteer: { denId: options.denId },
        }),
      },
      include: {
        volunteer: { select: { id: true, firstName: true, lastName: true, denId: true } },
        requirement: { select: { name: true, badgeId: true } },
        completer: { select: { name: true } },
      },
      orderBy: { completedAt: 'asc' },
    });

    return {
      badges,
      requirements,
      summary: {
        totalBadges: badges.length,
        totalRequirements: requirements.length,
        oldestBadge: badges[0]?.awardedAt,
        oldestRequirement: requirements[0]?.completedAt,
      },
    };
  }

  /**
   * Get reconciliation statistics for dashboard
   */
  async getReconciliationStats(denId?: number) {
    const whereClause = denId
      ? { volunteer: { denId } }
      : {};

    const badgeStats = await this.prisma.badgeHistory.groupBy({
      by: ['scoutbookStatus'],
      where: whereClause,
      _count: true,
    });

    const requirementStats = await this.prisma.requirementProgress.groupBy({
      by: ['scoutbookStatus'],
      where: whereClause,
      _count: true,
    });

    // Get age of oldest pending items
    const oldestBadge = await this.prisma.badgeHistory.findFirst({
      where: {
        ...whereClause,
        scoutbookStatus: ReconciliationStatus.PENDING,
      },
      orderBy: { awardedAt: 'asc' },
      select: { awardedAt: true },
    });

    const oldestRequirement = await this.prisma.requirementProgress.findFirst({
      where: {
        ...whereClause,
        scoutbookStatus: ReconciliationStatus.PENDING,
      },
      orderBy: { completedAt: 'asc' },
      select: { completedAt: true },
    });

    return {
      badges: badgeStats,
      requirements: requirementStats,
      oldest: {
        badge: oldestBadge?.awardedAt,
        requirement: oldestRequirement?.completedAt,
      },
    };
  }

  /**
   * Get recently reconciled items (audit/verification)
   */
  async getRecentlyReconciled(days: number = 7) {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const badges = await this.prisma.badgeHistory.findMany({
      where: {
        scoutbookStatus: ReconciliationStatus.ENTERED,
        scoutbookEnteredAt: { gte: cutoffDate },
      },
      include: {
        volunteer: { select: { firstName: true, lastName: true } },
        badge: { select: { name: true } },
        scoutbookEntered: { select: { name: true } },
      },
      orderBy: { scoutbookEnteredAt: 'desc' },
    });

    const requirements = await this.prisma.requirementProgress.findMany({
      where: {
        scoutbookStatus: ReconciliationStatus.ENTERED,
        scoutbookEnteredAt: { gte: cutoffDate },
      },
      include: {
        volunteer: { select: { firstName: true, lastName: true } },
        requirement: { select: { name: true } },
        scoutbookEntered: { select: { name: true } },
      },
      orderBy: { scoutbookEnteredAt: 'desc' },
    });

    return { badges, requirements };
  }

  /**
   * Reset reconciliation status (e.g., if entry was incorrect)
   */
  async resetReconciliationStatus(
    entityType: 'badge' | 'requirement',
    id: number,
    resetBy: number,
  ) {
    if (entityType === 'badge') {
      return this.prisma.badgeHistory.update({
        where: { id },
        data: {
          scoutbookStatus: ReconciliationStatus.PENDING,
          scoutbookEnteredAt: null,
          scoutbookEnteredBy: null,
          scoutbookNotes: `Reset by user ${resetBy} at ${new Date().toISOString()}`,
        },
      });
    } else {
      return this.prisma.requirementProgress.update({
        where: { id },
        data: {
          scoutbookStatus: ReconciliationStatus.PENDING,
          scoutbookEnteredAt: null,
          scoutbookEnteredBy: null,
          scoutbookNotes: `Reset by user ${resetBy} at ${new Date().toISOString()}`,
        },
      });
    }
  }
}
```

#### 3. Dashboard Query Examples

**Leader Dashboard - Unresolved Items**:
```typescript
// Show items pending >7 days
const staleItems = await reconciliationService.getUnresolvedItems({
  olderThanDays: 7,
  denId: currentUserDenId,
});

// Group by scout for easier batch entry
const itemsByScout = {};
staleItems.badges.forEach(badge => {
  const key = `${badge.volunteer.firstName} ${badge.volunteer.lastName}`;
  if (!itemsByScout[key]) {
    itemsByScout[key] = { badges: [], requirements: [] };
  }
  itemsByScout[key].badges.push(badge);
});
staleItems.requirements.forEach(req => {
  const key = `${req.volunteer.firstName} ${req.volunteer.lastName}`;
  if (!itemsByScout[key]) {
    itemsByScout[key] = { badges: [], requirements: [] };
  }
  itemsByScout[key].requirements.push(req);
});
```

**Admin Dashboard - Pack-wide Stats**:
```typescript
const stats = await reconciliationService.getReconciliationStats();

// Calculate aging buckets
const agingBuckets = {
  current: 0,    // < 7 days
  warning: 0,    // 7-14 days
  overdue: 0,    // > 14 days
};

if (stats.oldest.badge) {
  const daysOld = Math.floor(
    (Date.now() - stats.oldest.badge.getTime()) / (24 * 60 * 60 * 1000)
  );
  // Categorize...
}
```

#### 4. API Endpoints

```typescript
// reconciliation.controller.ts
@Controller('reconciliation')
export class ReconciliationController {
  constructor(private reconciliationService: ReconciliationService) {}

  // Mark single badge as entered
  @Post('badges/:badgeHistoryId/entered')
  @UseGuards(JwtAuthGuard, TierGuard)
  @RequireTier(Tier.DEN_LEADER)
  async markBadgeEntered(
    @Param('badgeHistoryId') badgeHistoryId: string,
    @Body() dto: { notes?: string },
    @Req() req,
  ) {
    return this.reconciliationService.markBadgeEnteredInScoutbook(
      parseInt(badgeHistoryId),
      req.user.userId,
      dto.notes,
    );
  }

  // Bulk mark multiple items
  @Post('bulk-entered')
  @UseGuards(JwtAuthGuard, TierGuard)
  @RequireTier(Tier.DEN_LEADER)
  async bulkMarkEntered(
    @Body() dto: {
      type: 'badge' | 'requirement';
      ids: number[];
      notes?: string;
    },
    @Req() req,
  ) {
    return this.reconciliationService.bulkMarkEntered(
      dto.type,
      dto.ids,
      req.user.userId,
      dto.notes,
    );
  }

  // Get unresolved items
  @Get('unresolved')
  @UseGuards(JwtAuthGuard, TierGuard)
  @RequireTier(Tier.DEN_LEADER)
  async getUnresolved(
    @Query('olderThanDays') olderThanDays?: string,
    @Query('volunteerId') volunteerId?: string,
    @Query('denId') denId?: string,
  ) {
    return this.reconciliationService.getUnresolvedItems({
      olderThanDays: olderThanDays ? parseInt(olderThanDays) : undefined,
      volunteerId: volunteerId ? parseInt(volunteerId) : undefined,
      denId: denId ? parseInt(denId) : undefined,
    });
  }

  // Get reconciliation statistics
  @Get('stats')
  @UseGuards(JwtAuthGuard, TierGuard)
  @RequireTier(Tier.DEN_LEADER)
  async getStats(@Query('denId') denId?: string) {
    return this.reconciliationService.getReconciliationStats(
      denId ? parseInt(denId) : undefined,
    );
  }

  // Get recently reconciled (audit trail)
  @Get('recent')
  @UseGuards(JwtAuthGuard, TierGuard)
  @RequireTier(Tier.DEN_LEADER)
  async getRecent(@Query('days') days?: string) {
    return this.reconciliationService.getRecentlyReconciled(
      days ? parseInt(days) : 7,
    );
  }
}
```

#### 5. Reminder/Escalation Strategy

```typescript
// jobs/reconciliation-reminders.job.ts
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class ReconciliationRemindersJob {
  constructor(
    private reconciliationService: ReconciliationService,
    private notificationService: NotificationService,
  ) {}

  // Run every Monday at 9 AM
  @Cron('0 9 * * 1')
  async sendWeeklyReminders() {
    // Get items older than 7 days
    const staleItems = await this.reconciliationService.getUnresolvedItems({
      olderThanDays: 7,
    });

    // Group by den and send notification to den leader
    const itemsByDen = this.groupByDen(staleItems);

    for (const [denId, items] of Object.entries(itemsByDen)) {
      const denLeader = await this.getDenLeader(denId);
      
      await this.notificationService.create({
        recipientId: denLeader.id,
        type: 'RECONCILIATION_REMINDER',
        title: 'Scoutbook Entry Reminder',
        message: `You have ${items.badges.length} badges and ${items.requirements.length} requirements pending Scoutbook entry for over 7 days`,
        actionUrl: '/reconciliation/unresolved',
      });
    }
  }

  // Escalate items older than 30 days to cubmaster
  @Cron('0 9 1 * *') // First day of month at 9 AM
  async escalateOldItems() {
    const veryStaleItems = await this.reconciliationService.getUnresolvedItems({
      olderThanDays: 30,
    });

    if (veryStaleItems.badges.length > 0 || veryStaleItems.requirements.length > 0) {
      const cubmaster = await this.getCubmaster();
      
      await this.notificationService.create({
        recipientId: cubmaster.id,
        type: 'RECONCILIATION_ESCALATION',
        title: 'Overdue Scoutbook Entries',
        message: `${veryStaleItems.badges.length + veryStaleItems.requirements.length} items have been pending Scoutbook entry for over 30 days`,
        actionUrl: '/reconciliation/unresolved?olderThanDays=30',
      });
    }
  }
}
```

#### 6. Testing Strategy

```typescript
// reconciliation.service.spec.ts
describe('ReconciliationService', () => {
  it('should mark badge as entered in Scoutbook', async () => {
    const badge = await createTestBadgeHistory({
      scoutbookStatus: ReconciliationStatus.PENDING,
    });

    const result = await service.markBadgeEnteredInScoutbook(
      badge.id,
      testUser.id,
      'Approval #12345',
    );

    expect(result.scoutbookStatus).toBe(ReconciliationStatus.ENTERED);
    expect(result.scoutbookEnteredBy).toBe(testUser.id);
    expect(result.scoutbookEnteredAt).toBeInstanceOf(Date);
    expect(result.scoutbookNotes).toBe('Approval #12345');
  });

  it('should throw error if already marked as entered', async () => {
    const badge = await createTestBadgeHistory({
      scoutbookStatus: ReconciliationStatus.ENTERED,
    });

    await expect(
      service.markBadgeEnteredInScoutbook(badge.id, testUser.id),
    ).rejects.toThrow(ConflictException);
  });

  it('should retrieve unresolved items older than N days', async () => {
    // Create badges at different ages
    const oldBadge = await createTestBadgeHistory({
      awardedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
    });
    const newBadge = await createTestBadgeHistory({
      awardedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    });

    const result = await service.getUnresolvedItems({ olderThanDays: 7 });

    expect(result.badges).toHaveLength(1);
    expect(result.badges[0].id).toBe(oldBadge.id);
  });
});
```

---

## Topic 3: Concurrent Update Conflict Resolution

### Overview
Handling concurrent updates is critical in multi-user environments where two leaders might simultaneously mark the same item as reconciled. The goal is first-write-wins with graceful feedback to the second user.

### Best Practices

#### 1. Optimistic Locking with Version Field

**Pattern**: Add version counter that increments on each update.

```prisma
model BadgeHistory {
  id                    Int                  @id @default(autoincrement())
  volunteerId           Int
  volunteer             Volunteer            @relation(fields: [volunteerId], references: [id], onDelete: Cascade)
  badgeId               Int
  badge                 Badge                @relation(fields: [badgeId], references: [id])
  awardedAt             DateTime             @default(now())
  awardedBy             Int
  awarder               User                 @relation("Awarder", fields: [awardedBy], references: [id])
  
  // Scoutbook reconciliation fields
  scoutbookStatus       ReconciliationStatus @default(PENDING)
  scoutbookEnteredAt    DateTime?
  scoutbookEnteredBy    Int?
  scoutbookEntered      User?                @relation("ScoutbookReconciler", fields: [scoutbookEnteredBy], references: [id])
  scoutbookNotes        String?
  
  // Optimistic locking
  version               Int                  @default(1)
  updatedAt             DateTime             @updatedAt
  
  @@unique([volunteerId, badgeId])
}
```

**Alternative Pattern**: Use `updatedAt` timestamp for detection (less robust).

```prisma
// Check that updatedAt hasn't changed since read
model BadgeHistory {
  // ... other fields
  updatedAt             DateTime             @updatedAt
}
```

**Key Design Decisions**:
- **Version field**: Simple integer that increments on every update
- **updatedAt**: Automatic timestamp (Prisma `@updatedAt` directive)
- Version field is more explicit and easier to reason about
- updatedAt can have race conditions if updates happen within same second

#### 2. Service Method with Conflict Detection

```typescript
// reconciliation.service.ts
import { 
  Injectable, 
  NotFoundException, 
  ConflictException,
  PreconditionFailedException 
} from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { ReconciliationStatus, Prisma } from '@prisma/client';

@Injectable()
export class ReconciliationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Mark badge as entered with optimistic locking
   * Throws ConflictException if record was modified by another user
   */
  async markBadgeEnteredInScoutbook(
    badgeHistoryId: number,
    expectedVersion: number, // Client must send current version
    enteredBy: number,
    notes?: string,
  ) {
    try {
      // Attempt update with version check
      const updated = await this.prisma.badgeHistory.update({
        where: {
          id: badgeHistoryId,
          version: expectedVersion, // Fails if version doesn't match
        },
        data: {
          scoutbookStatus: ReconciliationStatus.ENTERED,
          scoutbookEnteredAt: new Date(),
          scoutbookEnteredBy: enteredBy,
          scoutbookNotes: notes,
          version: { increment: 1 }, // Increment version
        },
        include: {
          volunteer: { select: { firstName: true, lastName: true } },
          badge: { select: { name: true } },
          scoutbookEntered: { select: { name: true } },
        },
      });

      return updated;
    } catch (error) {
      // Check if update failed because no record matched
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        // Record not found with this ID + version combination
        // Fetch current state to return to user
        const currentState = await this.prisma.badgeHistory.findUnique({
          where: { id: badgeHistoryId },
          include: {
            volunteer: { select: { firstName: true, lastName: true } },
            badge: { select: { name: true } },
            scoutbookEntered: { select: { name: true } },
          },
        });

        if (!currentState) {
          throw new NotFoundException('Badge history record not found');
        }

        // Record exists but version mismatch = concurrent update
        throw new ConflictException({
          message: 'This record was modified by another user',
          currentState,
          expectedVersion,
          actualVersion: currentState.version,
        });
      }
      throw error;
    }
  }

  /**
   * Alternative: Check status before update (less robust)
   * Only prevents updates when status changed, not all concurrent modifications
   */
  async markBadgeEnteredSimple(
    badgeHistoryId: number,
    expectedStatus: ReconciliationStatus,
    enteredBy: number,
    notes?: string,
  ) {
    const record = await this.prisma.badgeHistory.findUnique({
      where: { id: badgeHistoryId },
    });

    if (!record) {
      throw new NotFoundException('Badge history record not found');
    }

    if (record.scoutbookStatus !== expectedStatus) {
      throw new ConflictException({
        message: `Record status changed from ${expectedStatus} to ${record.scoutbookStatus}`,
        currentState: record,
      });
    }

    return this.prisma.badgeHistory.update({
      where: { id: badgeHistoryId },
      data: {
        scoutbookStatus: ReconciliationStatus.ENTERED,
        scoutbookEnteredAt: new Date(),
        scoutbookEnteredBy: enteredBy,
        scoutbookNotes: notes,
      },
    });
  }

  /**
   * Bulk update with partial success reporting
   * Returns both successful and failed updates
   */
  async bulkMarkEnteredWithVersionCheck(
    items: Array<{ id: number; version: number }>,
    enteredBy: number,
    notes?: string,
  ) {
    const results = {
      succeeded: [],
      failed: [],
    };

    for (const item of items) {
      try {
        const updated = await this.markBadgeEnteredInScoutbook(
          item.id,
          item.version,
          enteredBy,
          notes,
        );
        results.succeeded.push(updated);
      } catch (error) {
        if (error instanceof ConflictException) {
          results.failed.push({
            id: item.id,
            reason: 'concurrent_update',
            details: error.getResponse(),
          });
        } else if (error instanceof NotFoundException) {
          results.failed.push({
            id: item.id,
            reason: 'not_found',
          });
        } else {
          results.failed.push({
            id: item.id,
            reason: 'unknown_error',
            error: error.message,
          });
        }
      }
    }

    return results;
  }

  /**
   * Get record with current version for client caching
   */
  async getBadgeHistoryWithVersion(id: number) {
    const record = await this.prisma.badgeHistory.findUnique({
      where: { id },
      include: {
        volunteer: { select: { firstName: true, lastName: true } },
        badge: { select: { name: true } },
      },
    });

    if (!record) {
      throw new NotFoundException('Badge history record not found');
    }

    return record;
  }
}
```

#### 3. Transaction-Based Alternative

```typescript
/**
 * Use Prisma transaction for atomic check-and-update
 * Ensures no updates happen between read and write
 */
async markBadgeEnteredTransactional(
  badgeHistoryId: number,
  enteredBy: number,
  notes?: string,
) {
  return this.prisma.$transaction(async (tx) => {
    // Read current state
    const record = await tx.badgeHistory.findUnique({
      where: { id: badgeHistoryId },
      select: { id: true, scoutbookStatus: true },
    });

    if (!record) {
      throw new NotFoundException('Badge history record not found');
    }

    if (record.scoutbookStatus !== ReconciliationStatus.PENDING) {
      // Fetch full current state to return
      const fullRecord = await tx.badgeHistory.findUnique({
        where: { id: badgeHistoryId },
        include: {
          volunteer: { select: { firstName: true, lastName: true } },
          badge: { select: { name: true } },
          scoutbookEntered: { select: { name: true } },
        },
      });

      throw new ConflictException({
        message: 'Record was already processed by another user',
        currentState: fullRecord,
      });
    }

    // Update
    return tx.badgeHistory.update({
      where: { id: badgeHistoryId },
      data: {
        scoutbookStatus: ReconciliationStatus.ENTERED,
        scoutbookEnteredAt: new Date(),
        scoutbookEnteredBy: enteredBy,
        scoutbookNotes: notes,
      },
      include: {
        volunteer: { select: { firstName: true, lastName: true } },
        badge: { select: { name: true } },
        scoutbookEntered: { select: { name: true } },
      },
    });
  });
}
```

#### 4. Frontend Integration

```typescript
// Frontend: React component with version tracking
interface BadgeHistoryItem {
  id: number;
  version: number; // Store version from server
  scoutbookStatus: ReconciliationStatus;
  // ... other fields
}

const handleMarkEntered = async (item: BadgeHistoryItem) => {
  try {
    const result = await api.post(`/reconciliation/badges/${item.id}/entered`, {
      version: item.version, // Send current version
      notes: notesInput,
    });

    // Success - update local state with new version
    setItems(prev => prev.map(i => 
      i.id === item.id ? { ...result, version: result.version } : i
    ));
    
    toast.success('Marked as entered in Scoutbook');
  } catch (error) {
    if (error.response?.status === 409) {
      // Conflict - another user updated this record
      const { currentState } = error.response.data;
      
      toast.error(
        `This item was already processed by ${currentState.scoutbookEntered?.name}`,
        { duration: 5000 }
      );

      // Update local state with current version from server
      setItems(prev => prev.map(i => 
        i.id === item.id ? currentState : i
      ));
    } else {
      toast.error('Failed to mark as entered');
    }
  }
};
```

#### 5. API Endpoint Updates

```typescript
// reconciliation.controller.ts
@Controller('reconciliation')
export class ReconciliationController {
  constructor(private reconciliationService: ReconciliationService) {}

  @Post('badges/:badgeHistoryId/entered')
  @UseGuards(JwtAuthGuard, TierGuard)
  @RequireTier(Tier.DEN_LEADER)
  async markBadgeEntered(
    @Param('badgeHistoryId') badgeHistoryId: string,
    @Body() dto: { 
      version: number;  // Required: optimistic locking version
      notes?: string;
    },
    @Req() req,
  ) {
    try {
      return await this.reconciliationService.markBadgeEnteredInScoutbook(
        parseInt(badgeHistoryId),
        dto.version,
        req.user.userId,
        dto.notes,
      );
    } catch (error) {
      if (error instanceof ConflictException) {
        // Return 409 Conflict with current state
        throw new HttpException(error.getResponse(), HttpStatus.CONFLICT);
      }
      throw error;
    }
  }

  @Post('bulk-entered')
  @UseGuards(JwtAuthGuard, TierGuard)
  @RequireTier(Tier.DEN_LEADER)
  async bulkMarkEntered(
    @Body() dto: {
      items: Array<{ id: number; version: number }>;
      notes?: string;
    },
    @Req() req,
  ) {
    const results = await this.reconciliationService.bulkMarkEnteredWithVersionCheck(
      dto.items,
      req.user.userId,
      dto.notes,
    );

    // Return partial success with details
    return {
      ...results,
      summary: {
        total: dto.items.length,
        succeeded: results.succeeded.length,
        failed: results.failed.length,
      },
    };
  }

  @Get('badges/:badgeHistoryId')
  @UseGuards(JwtAuthGuard, TierGuard)
  @RequireTier(Tier.DEN_LEADER)
  async getBadgeHistory(@Param('badgeHistoryId') badgeHistoryId: string) {
    // Always return version for client caching
    return this.reconciliationService.getBadgeHistoryWithVersion(
      parseInt(badgeHistoryId),
    );
  }
}
```

#### 6. Testing Concurrent Updates

```typescript
// reconciliation.service.spec.ts
describe('Concurrent Update Conflict Resolution', () => {
  it('should allow first update and reject second with conflict', async () => {
    const badge = await createTestBadgeHistory({
      scoutbookStatus: ReconciliationStatus.PENDING,
      version: 1,
    });

    const user1 = await createTestUser({ name: 'Leader 1' });
    const user2 = await createTestUser({ name: 'Leader 2' });

    // Both users read the same version
    const version = badge.version;

    // User 1 updates first (should succeed)
    const result1 = await service.markBadgeEnteredInScoutbook(
      badge.id,
      version,
      user1.id,
      'Entered by Leader 1',
    );

    expect(result1.scoutbookStatus).toBe(ReconciliationStatus.ENTERED);
    expect(result1.version).toBe(2); // Version incremented

    // User 2 attempts update with stale version (should fail)
    await expect(
      service.markBadgeEnteredInScoutbook(
        badge.id,
        version, // Stale version
        user2.id,
        'Entered by Leader 2',
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('should simulate true concurrent updates with Promise.all', async () => {
    const badge = await createTestBadgeHistory({
      scoutbookStatus: ReconciliationStatus.PENDING,
      version: 1,
    });

    const user1 = await createTestUser({ name: 'Leader 1' });
    const user2 = await createTestUser({ name: 'Leader 2' });

    // Simulate concurrent updates
    const [result1, result2] = await Promise.allSettled([
      service.markBadgeEnteredInScoutbook(
        badge.id,
        badge.version,
        user1.id,
        'User 1',
      ),
      service.markBadgeEnteredInScoutbook(
        badge.id,
        badge.version,
        user2.id,
        'User 2',
      ),
    ]);

    // One should succeed, one should fail
    const succeeded = [result1, result2].filter(r => r.status === 'fulfilled');
    const failed = [result1, result2].filter(r => r.status === 'rejected');

    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(1);

    // Verify failure is ConflictException
    const failedResult = failed[0] as PromiseRejectedResult;
    expect(failedResult.reason).toBeInstanceOf(ConflictException);
  });

  it('should return current state in conflict exception', async () => {
    const badge = await createTestBadgeHistory({
      scoutbookStatus: ReconciliationStatus.PENDING,
      version: 1,
    });

    const user1 = await createTestUser({ name: 'Leader 1' });
    const user2 = await createTestUser({ name: 'Leader 2' });

    // User 1 updates
    await service.markBadgeEnteredInScoutbook(
      badge.id,
      1,
      user1.id,
      'User 1 notes',
    );

    // User 2 attempts update
    try {
      await service.markBadgeEnteredInScoutbook(
        badge.id,
        1, // Stale version
        user2.id,
        'User 2 notes',
      );
      fail('Should have thrown ConflictException');
    } catch (error) {
      expect(error).toBeInstanceOf(ConflictException);
      const response = error.getResponse();
      expect(response.currentState).toBeDefined();
      expect(response.currentState.version).toBe(2);
      expect(response.currentState.scoutbookEnteredBy).toBe(user1.id);
      expect(response.expectedVersion).toBe(1);
      expect(response.actualVersion).toBe(2);
    }
  });
});
```

#### 7. Database Transaction Isolation Levels

**SQLite**: Default isolation is SERIALIZABLE, which prevents concurrent writes automatically.

**PostgreSQL**: Default isolation is READ COMMITTED. For stronger guarantees:

```typescript
// Use explicit transaction isolation
await this.prisma.$transaction(
  async (tx) => {
    // Your updates here
  },
  {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  }
);
```

**Recommendations**:
- SQLite: Version field sufficient (serializable by default)
- PostgreSQL: Version field + READ COMMITTED is usually enough
- Use SERIALIZABLE only if absolutely necessary (performance impact)

#### 8. Error Handling Best Practices

```typescript
// Custom exception filter for better error messages
@Catch(ConflictException)
export class ConflictExceptionFilter implements ExceptionFilter {
  catch(exception: ConflictException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const exceptionResponse = exception.getResponse();

    // Transform conflict exception into user-friendly format
    const message = typeof exceptionResponse === 'object' 
      ? (exceptionResponse as any).message
      : exceptionResponse;

    response.status(HttpStatus.CONFLICT).json({
      statusCode: HttpStatus.CONFLICT,
      error: 'Conflict',
      message,
      // Include current state for client to sync
      ...(typeof exceptionResponse === 'object' && exceptionResponse),
    });
  }
}
```

---

## Summary and Recommendations

### Topic 1: Parent-Child Linking
**Recommended Approach**: Junction table with status enum, full audit trail, and guard-based access control.

**Key Takeaways**:
- Use PENDING/APPROVED/REJECTED/REVOKED status enum
- Unique constraint on (parentId, childId, status) prevents duplicate pending requests
- Store complete audit trail (who requested, who approved, when)
- Implement authorization guard that checks approved links before data access
- Support multiple parents per child naturally through junction table
- Integrate with notification system for request/approval workflow

**Migration Path**: Add ParentChildLink table, create service layer, implement guard, add API endpoints, wire up notifications.

### Topic 2: Scoutbook Reconciliation
**Recommended Approach**: Embedded reconciliation fields on existing records with dashboard queries.

**Key Takeaways**:
- Add reconciliation status (PENDING/ENTERED/VERIFIED) directly to records
- Store timestamp and user who marked as entered
- Query unresolved items with age filtering for dashboard
- Implement scheduled reminders for stale items (>7 days)
- Support bulk operations for efficient batch entry
- Provide audit trail via "recently reconciled" view

**Migration Path**: Add reconciliation columns to BadgeHistory and RequirementProgress, update service methods, create dashboard queries, add scheduled jobs for reminders.

### Topic 3: Concurrent Update Resolution
**Recommended Approach**: Optimistic locking with version field.

**Key Takeaways**:
- Add integer `version` field that increments on each update
- Client must send expected version with update requests
- Prisma update fails if version doesn't match (P2025 error)
- Return current state in ConflictException for client sync
- Support partial success in bulk operations
- Test concurrent updates with Promise.all

**Migration Path**: Add version fields to tables, update service methods to accept and check version, update API contracts, modify frontend to track and send versions, add conflict handling.

### Implementation Priority
1. **Start with Topic 2 (Reconciliation)**: Foundational for tracking external system state, simpler to implement
2. **Then Topic 3 (Conflict Resolution)**: Add to reconciliation services as you build them
3. **Finally Topic 1 (Parent Linking)**: More complex workflow, builds on authorization patterns

### Testing Strategy
- Unit tests for service methods with various states
- Integration tests for concurrent scenarios (Promise.all)
- E2E tests for complete workflows (request → approve → access)
- Load testing for bulk operations and concurrent updates

### Documentation Needs
- User guide for parents: How to request child access
- Leader guide: Approving links, marking Scoutbook entries
- Technical docs: API contracts, error codes, version field usage
- Runbooks: Handling edge cases, fixing broken links, resolving stuck reconciliations
