/**
 * Parent Scope Guard for NestJS
 * 
 * Validates that parent users can only access data for their linked children
 * per research.md section on parent authorization patterns
 */

import { Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaClient } from '@prisma/client';
import { ScopeGuard, REQUIRE_CHILD_LINK_KEY } from './scope.guard';
import { JWTPayload } from './auth';

/**
 * Guard to validate parent access to child data
 * 
 * This guard ensures that:
 * 1. PARENT tier users can only access their approved linked children
 * 2. LEADER and ADMIN tiers have broader access per their role scope
 * 
 * Use with @RequireChildLink() decorator to enforce parent-child link validation
 * 
 * @example
 * @UseGuards(AuthGuard, TierGuard, ParentScopeGuard)
 * @RequireChildLink()
 * @Get('children/:childId')
 * getChild(@Param('childId') childId: string) { ... }
 */
@Injectable()
export class ParentScopeGuard extends ScopeGuard {
  constructor(reflector: Reflector, prisma: PrismaClient) {
    super(reflector, prisma);
  }

  protected async validateScope(
    user: JWTPayload,
    request: any,
    _scopeType: string
  ): Promise<boolean> {
    // Check if route requires child link validation
    const requireChildLink = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_CHILD_LINK_KEY,
      [request.route?.stack?.[0]?.handle, request.route?.stack?.[0]?.handle?.constructor]
    );

    if (!requireChildLink) {
      // No child link requirement, allow access
      return true;
    }

    // PARENT tier users must have approved link to access child data
    if (user.authTier === 'PARENT') {
      const childId = request.params?.childId || request.body?.childId;

      if (!childId) {
        throw new ForbiddenException('Child ID required for parent access');
      }

      // Verify parent has approved link to this child
      const link = await this.prisma.parentChildLink.findFirst({
        where: {
          parentId: user.userId,
          childScoutId: childId,
          status: 'APPROVED'
        }
      });

      if (!link) {
        throw new ForbiddenException('Access denied: No approved link to this child');
      }

      return true;
    }

    // LEADER and ADMIN tiers have broader access
    // Validate based on their role scope
    if (user.authTier === 'LEADER') {
      // Leaders can access children in their den(s) or rank(s)
      const childId = request.params?.childId || request.body?.childId;

      if (!childId) {
        throw new ForbiddenException('Child ID required for leader access');
      }

      const child = await this.prisma.childScout.findUnique({
        where: { id: childId },
        include: {
          denMemberships: {
            where: {
              validTo: null // Current membership
            },
            include: {
              den: true
            }
          }
        }
      });

      if (!child) {
        throw new ForbiddenException('Child not found');
      }

      // Check if leader has scope to access this child's den or rank
      for (const membership of child.denMemberships) {
        // Check PACK scope (access all)
        if (await this.hasPackScope(user.userId)) {
          return true;
        }

        // Check RANK scope
        if (membership.den && await this.hasRankScope(user.userId, membership.den.rankLevel)) {
          return true;
        }

        // Check DEN scope
        if (membership.den && membership.den.denNumber && await this.hasDenScope(user.userId, membership.den.denNumber)) {
          return true;
        }
      }

      throw new ForbiddenException('Access denied: Child not in your assigned scope');
    }

    // ADMIN tier already handled by base class
    return true;
  }
}
