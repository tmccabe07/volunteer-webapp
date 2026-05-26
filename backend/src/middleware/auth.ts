/**
 * JWT Authentication Middleware for NestJS
 * 
 * Provides guards for JWT token verification and tier-based
 * authorization per research.md Decision 3.1
 */

import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';

/**
 * JWT Payload structure
 */
export interface JWTPayload {
  userId: string;
  email: string;
  authTier: string;
  iat?: number;
  exp?: number;
}

/**
 * Metadata key for tier requirements
 */
export const TIER_KEY = 'minimumTier';

/**
 * Decorator to specify minimum tier requirement for a route
 * 
 * @example
 * @RequireTier('LEADER')
 * @Get('reports')
 * getReports() { ... }
 */
export const RequireTier = (tier: string) => SetMetadata(TIER_KEY, tier);

/**
 * Guard to authenticate JWT tokens from HttpOnly cookies
 */
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = request.cookies?.access_token;

    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }

    try {
      const payload = jwt.verify(
        token,
        process.env.JWT_SECRET || 'your-secret-key-change-in-production'
      ) as JWTPayload;
      
      request.user = payload;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}

/**
 * Guard to require minimum authorization tier
 * 
 * Tiers (per data-model.md):
 * - PARENT: Parent/Guardian volunteers (Tier 1)
 * - LEADER: Den leaders, committee members (Tier 2)
 * - ADMIN: Site administrators (Tier 3)
 * 
 * Use with @RequireTier() decorator to specify minimum tier
 * 
 * @example
 * @UseGuards(AuthGuard, TierGuard)
 * @RequireTier('LEADER')
 * @Get('reports')
 * getReports() { ... }
 */
@Injectable()
export class TierGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredTier = this.reflector.getAllAndOverride<string>(TIER_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredTier) {
      // No tier requirement specified, allow access
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as JWTPayload;

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    const tierLevels = { PARENT: 1, LEADER: 2, ADMIN: 3 };
    const userLevel = tierLevels[user.authTier as keyof typeof tierLevels] || 0;
    const requiredLevel = tierLevels[requiredTier as keyof typeof tierLevels] || 0;

    if (userLevel < requiredLevel) {
      // Fallback to DB tier to handle stale access tokens after role/tier changes.
      const currentVolunteer = await prisma.volunteer.findFirst({
        where: {
          id: user.userId,
          deletedAt: null,
        },
        select: {
          authTier: true,
        },
      });

      const currentLevel = currentVolunteer
        ? tierLevels[currentVolunteer.authTier as keyof typeof tierLevels] || 0
        : 0;

      if (currentLevel < requiredLevel) {
        throw new ForbiddenException('Insufficient permissions');
      }

      // Keep request user tier in sync for downstream logic in this request.
      user.authTier = currentVolunteer!.authTier;
    }

    return true;
  }
}
