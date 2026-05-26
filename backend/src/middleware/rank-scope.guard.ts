/**
 * Rank Scope Guard for NestJS
 * 
 * Validates that rank-level leaders can only access data for their assigned rank(s)
 * per research.md section on rank-level authorization patterns
 */

import { Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaClient, RankLevel } from '@prisma/client';
import { ScopeGuard } from './scope.guard';
import { JWTPayload } from './auth';

/**
 * Guard to validate rank leader access to rank data
 * 
 * This guard ensures that:
 * 1. RANK-scoped leaders can only access data for their assigned rank(s)
 * 2. PACK-scoped leaders can access all ranks
 * 
 * Validates rank access for routes with rankLevel parameter
 * 
 * @example
 * @UseGuards(AuthGuard, TierGuard, RankScopeGuard)
 * @RequireScope('RANK')
 * @Get('ranks/:rankLevel/adventures')
 * getRankAdventures(@Param('rankLevel') rankLevel: string) { ... }
 */
@Injectable()
export class RankScopeGuard extends ScopeGuard {
  constructor(reflector: Reflector, prisma: PrismaClient) {
    super(reflector, prisma);
  }

  protected async validateScope(
    user: JWTPayload,
    request: any,
    scopeType: string
  ): Promise<boolean> {
    // Only validate for RANK scope type
    if (scopeType !== 'RANK') {
      return true;
    }

    // Get rank level from request params
    const rankLevel = (request.params?.rankLevel || request.body?.rankLevel) as RankLevel;

    if (!rankLevel) {
      throw new ForbiddenException('Rank level required for rank scope access');
    }

    // Validate rankLevel is a valid enum value
    const validRankLevels: RankLevel[] = ['LION', 'TIGER', 'WOLF', 'BEAR', 'WEBELOS', 'AOL'];
    if (!validRankLevels.includes(rankLevel)) {
      throw new ForbiddenException('Invalid rank level');
    }

    // Check PACK scope (access all ranks)
    if (await this.hasPackScope(user.userId)) {
      return true;
    }

    // Check RANK scope (access specific rank)
    if (await this.hasRankScope(user.userId, rankLevel)) {
      return true;
    }

    throw new ForbiddenException('Access denied: Rank not in your assigned scope');
  }
}
