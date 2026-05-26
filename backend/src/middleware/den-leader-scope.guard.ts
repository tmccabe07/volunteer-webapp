/**
 * Den Leader Scope Guard for NestJS
 * 
 * Validates that den leaders can only access data for their assigned dens
 * per research.md section on den-level authorization patterns
 */

import { Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaClient } from '@prisma/client';
import { ScopeGuard, REQUIRE_DEN_ASSIGNMENT_KEY } from './scope.guard';
import { JWTPayload } from './auth';

/**
 * Guard to validate den leader access to den data
 * 
 * This guard ensures that:
 * 1. DEN-scoped leaders can only access their assigned den(s)
 * 2. RANK-scoped leaders can access all dens within their rank
 * 3. PACK-scoped leaders can access all dens
 * 
 * Use with @RequireDenAssignment() decorator to enforce den assignment validation
 * 
 * @example
 * @UseGuards(AuthGuard, TierGuard, DenLeaderScopeGuard)
 * @RequireDenAssignment()
 * @Get('dens/:denNumber/events')
 * getDenEvents(@Param('denNumber') denNumber: string) { ... }
 */
@Injectable()
export class DenLeaderScopeGuard extends ScopeGuard {
  constructor(reflector: Reflector, prisma: PrismaClient) {
    super(reflector, prisma);
  }

  protected async validateScope(
    user: JWTPayload,
    request: any,
    _scopeType: string
  ): Promise<boolean> {
    // Check if route requires den assignment validation
    const requireDenAssignment = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_DEN_ASSIGNMENT_KEY,
      [request.route?.stack?.[0]?.handle, request.route?.stack?.[0]?.handle?.constructor]
    );

    if (!requireDenAssignment) {
      // No den assignment requirement, allow access
      return true;
    }

    // Get den number from request params
    const denNumber = request.params?.denNumber
      ? parseInt(request.params.denNumber, 10)
      : request.body?.denNumber;

    if (!denNumber) {
      throw new ForbiddenException('Den number required for den leader access');
    }

    // Check PACK scope (access all dens)
    if (await this.hasPackScope(user.userId)) {
      return true;
    }

    // Get den details to check rank
    const den = await this.prisma.den.findFirst({
      where: { denNumber: denNumber }
    });

    if (!den) {
      throw new ForbiddenException('Den not found');
    }

    // Check RANK scope (access all dens in rank)
    if (await this.hasRankScope(user.userId, den.rankLevel)) {
      return true;
    }

    // Check DEN scope (access specific den)
    if (await this.hasDenScope(user.userId, denNumber)) {
      return true;
    }

    throw new ForbiddenException('Access denied: Den not in your assigned scope');
  }
}
