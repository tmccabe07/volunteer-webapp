/**
 * Scope-based Authorization Guards for NestJS
 * 
 * Provides base class and decorators for role-scoped access control
 * per research.md section on RoleScope authorization patterns
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  SetMetadata
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JWTPayload } from './auth';
import { PrismaClient } from '@prisma/client';

/**
 * Metadata keys for scope requirements
 */
export const SCOPE_TYPE_KEY = 'scopeType';
export const REQUIRE_CHILD_LINK_KEY = 'requireChildLink';
export const REQUIRE_DEN_ASSIGNMENT_KEY = 'requireDenAssignment';

/**
 * Decorator to specify scope type requirement for a route
 * 
 * @example
 * @RequireScope('DEN')
 * @Get('dens/:denNumber')
 * getDen(@Param('denNumber') denNumber: string) { ... }
 */
export const RequireScope = (scopeType: 'PACK' | 'RANK' | 'DEN') =>
  SetMetadata(SCOPE_TYPE_KEY, scopeType);

/**
 * Decorator to require parent-child link for accessing child data
 * 
 * @example
 * @RequireChildLink()
 * @Get('children/:childId')
 * getChild(@Param('childId') childId: string) { ... }
 */
export const RequireChildLink = () => SetMetadata(REQUIRE_CHILD_LINK_KEY, true);

/**
 * Decorator to require den leader assignment for accessing den data
 * 
 * @example
 * @RequireDenAssignment()
 * @Get('dens/:denNumber/events')
 * getDenEvents(@Param('denNumber') denNumber: string) { ... }
 */
export const RequireDenAssignment = () => SetMetadata(REQUIRE_DEN_ASSIGNMENT_KEY, true);

/**
 * Base Guard for scope-based authorization
 * 
 * This guard validates that a user has the required role scope to access
 * a resource. Scope types (per research.md):
 * - PACK: Can access all ranks and dens
 * - RANK: Can access all dens within a rank
 * - DEN: Can access specific den only
 * 
 * Subclasses should override validateScope() to implement specific logic
 */
@Injectable()
export abstract class ScopeGuard implements CanActivate {
  constructor(
    protected reflector: Reflector,
    protected prisma: PrismaClient
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as JWTPayload;

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    // ADMIN tier has full access to all scopes
    if (user.authTier === 'ADMIN') {
      return true;
    }

    // Get scope requirements from metadata
    const scopeType = this.reflector.getAllAndOverride<string>(SCOPE_TYPE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!scopeType) {
      // No scope requirement specified, allow access
      return true;
    }

    // Validate user has required scope
    return this.validateScope(user, request, scopeType);
  }

  /**
   * Validate that user has the required scope for the resource
   * 
   * @param user - Authenticated user from JWT
   * @param request - HTTP request with route params
   * @param scopeType - Required scope type (PACK, RANK, DEN)
   * @returns true if user has required scope, false otherwise
   */
  protected abstract validateScope(
    user: JWTPayload,
    request: any,
    scopeType: string
  ): Promise<boolean>;

  /**
   * Get user's role assignments with scope information
   * 
   * @param userId - User ID from JWT
   * @returns Array of role assignments with scope details
   */
  protected async getUserRoleAssignments(userId: string) {
    return this.prisma.volunteerToRole.findMany({
      where: {
        volunteerId: userId,
        removedAt: null // Only active assignments
      },
      include: {
        role: true,
        den: true
      }
    });
  }

  /**
   * Check if user has PACK-level scope
   * 
   * @param userId - User ID from JWT
   * @returns true if user has PACK scope
   */
  protected async hasPackScope(userId: string): Promise<boolean> {
    const assignments = await this.getUserRoleAssignments(userId);
    return assignments.some(a => a.role.scopeType === 'PACK');
  }

  /**
   * Check if user has RANK-level scope for a specific rank
   * 
   * @param userId - User ID from JWT
   * @param rankLevel - Rank level to check
   * @returns true if user has RANK scope for the specified rank
   */
  protected async hasRankScope(userId: string, rankLevel: string): Promise<boolean> {
    const assignments = await this.getUserRoleAssignments(userId);
    return assignments.some(
      a => a.role.scopeType === 'RANK' && a.role.rankLevel === rankLevel
    );
  }

  /**
   * Check if user has DEN-level scope for a specific den
   * 
   * @param userId - User ID from JWT
   * @param denNumber - Den number to check
   * @returns true if user has DEN scope for the specified den
   */
  protected async hasDenScope(userId: string, denNumber: number): Promise<boolean> {
    const assignments = await this.getUserRoleAssignments(userId);
    const hasVolunteerScope = assignments.some(
      a => a.role.scopeType === 'DEN' && a.denNumber === denNumber
    );

    if (hasVolunteerScope) {
      return true;
    }

    // Den Chief support: when auth middleware includes denChiefId in request.user,
    // allow view scope through active DenChiefAssignment.
    const denChiefAssignments = await this.prisma.denChiefAssignment.findMany({
      where: {
        denChiefId: userId,
        validTo: null,
      },
      include: {
        den: {
          select: {
            denNumber: true,
          },
        },
      },
    });

    return denChiefAssignments.some((assignment) => assignment.den.denNumber === denNumber);
  }
}
