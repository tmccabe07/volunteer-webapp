/**
 * Authorization Service for Role-Scoped Access Control
 * 
 * Provides methods for validating user access to resources based on
 * role scope patterns (PACK, RANK, DEN) per research.md
 */

import { Injectable, ForbiddenException } from '@nestjs/common';
import { RankLevel } from '@prisma/client';
import prisma from '../../utils/prisma';

export interface UserRoleAssignment {
  roleId: string;
  roleName: string;
  grantsTier: string;
  scopeType: 'PACK' | 'RANK' | 'DEN';
  rankLevel?: RankLevel;
  denNumber?: number;
  denId?: string;
}

@Injectable()
export class AuthorizationService {
  /**
   * Get all active role assignments for a user
   * 
   * @param userId - User ID to fetch assignments for
   * @returns Array of role assignments with scope details
   */
  async getUserRoleAssignments(userId: string): Promise<UserRoleAssignment[]> {
    const assignments = await prisma.volunteerToRole.findMany({
      where: {
        volunteerId: userId,
        removedAt: null
      },
      include: {
        role: true,
        den: true
      }
    });

    return assignments.map(a => ({
      roleId: a.roleId,
      roleName: a.role.roleType,
      grantsTier: a.role.grantsTier,
      scopeType: a.role.scopeType,
      rankLevel: a.role.rankLevel || undefined,
      denNumber: a.denNumber || undefined,
      denId: a.denId || undefined
    }));
  }

  /**
   * Check if user has PACK-level scope (access to all ranks and dens)
   * 
   * @param userId - User ID to check
   * @returns true if user has PACK scope
   */
  async hasPackScope(userId: string): Promise<boolean> {
    const assignments = await this.getUserRoleAssignments(userId);
    return assignments.some(a => a.scopeType === 'PACK');
  }

  /**
   * Check if user has RANK-level scope for a specific rank
   * 
   * @param userId - User ID to check
   * @param rankLevel - Rank level to validate
   * @returns true if user has RANK scope for the specified rank
   */
  async hasRankScope(userId: string, rankLevel: RankLevel): Promise<boolean> {
    const assignments = await this.getUserRoleAssignments(userId);
    return assignments.some((a) => {
      // Primary path: explicit rank-scoped roles
      if (a.scopeType === 'RANK' && a.rankLevel === rankLevel) {
        return true;
      }

      // Backward compatibility path:
      // some seeded den-leader roles were created as DEN scope with a rankLevel,
      // but no explicit denNumber assignment. Treat these as rank-scoped.
      if (a.scopeType === 'DEN' && !a.denNumber && a.rankLevel === rankLevel) {
        return true;
      }

      return false;
    });
  }

  /**
   * Check if user has DEN-level scope for a specific den
   * 
   * @param userId - User ID to check
   * @param denNumber - Den number to validate
   * @returns true if user has DEN scope for the specified den
   */
  async hasDenScope(userId: string, denNumber: number): Promise<boolean> {
    const assignments = await this.getUserRoleAssignments(userId);
    return assignments.some(
      a => a.scopeType === 'DEN' && a.denNumber === denNumber
    );
  }

  /**
   * Check if user can access a specific child
   * 
   * Parents can access their approved linked children
   * Leaders can access children in their scope (den/rank/pack)
   * Admins can access all children
   * 
   * @param userId - User ID to check
   * @param childId - Child ID to validate access for
   * @param userTier - User's auth tier (PARENT, LEADER, ADMIN)
   * @returns true if user can access the child
   */
  async canAccessChild(
    userId: string,
    childId: string,
    userTier: string
  ): Promise<boolean> {
    // Admin can access all children
    if (userTier === 'ADMIN') {
      return true;
    }

    // Parents can access their approved linked children
    if (userTier === 'PARENT') {
      const link = await prisma.parentChildLink.findFirst({
        where: {
          parentId: userId,
          childScoutId: childId,
          status: 'APPROVED'
        }
      });
      return !!link;
    }

    // Leaders can access children in their scope
    if (userTier === 'LEADER') {
      // Check if user has PACK scope (access all children)
      if (await this.hasPackScope(userId)) {
        return true;
      }

      // Get child's current den membership
      const child = await prisma.childScout.findUnique({
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
        return false;
      }

      // Check if leader has scope to any of child's dens
      for (const membership of child.denMemberships) {
        // Check RANK scope
        if (membership.den && await this.hasRankScope(userId, membership.den.rankLevel)) {
          return true;
        }

        // Check DEN scope
        if (membership.den && membership.den.denNumber && await this.hasDenScope(userId, membership.den.denNumber)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if user can access a specific den
   * 
   * @param userId - User ID to check
   * @param denNumber - Den number to validate access for
   * @returns true if user can access the den
   */
  async canAccessDen(userId: string, denNumber: number): Promise<boolean> {
    // Check PACK scope (access all dens)
    if (await this.hasPackScope(userId)) {
      return true;
    }

    // Get den details to check rank
    const den = await prisma.den.findFirst({
      where: { denNumber: denNumber }
    });

    if (!den) {
      return false;
    }

    // Check RANK scope
    if (await this.hasRankScope(userId, den.rankLevel)) {
      return true;
    }

    // Check DEN scope
    if (await this.hasDenScope(userId, denNumber)) {
      return true;
    }

    return false;
  }

  /**
   * Check if user can access rank-level data
   * 
   * @param userId - User ID to check
   * @param rankLevel - Rank level to validate access for
   * @returns true if user can access the rank
   */
  async canAccessRank(userId: string, rankLevel: RankLevel): Promise<boolean> {
    // Check PACK scope (access all ranks)
    if (await this.hasPackScope(userId)) {
      return true;
    }

    // Check RANK scope
    if (await this.hasRankScope(userId, rankLevel)) {
      return true;
    }

    return false;
  }

  /**
   * Validate user access to a child or throw ForbiddenException
   * 
   * @param userId - User ID to check
   * @param childId - Child ID to validate access for
   * @param userTier - User's auth tier
   * @throws ForbiddenException if access denied
   */
  async validateChildAccess(
    userId: string,
    childId: string,
    userTier: string
  ): Promise<void> {
    const canAccess = await this.canAccessChild(userId, childId, userTier);
    if (!canAccess) {
      throw new ForbiddenException('Access denied: No permission to access this child');
    }
  }

  /**
   * Validate user access to a den or throw ForbiddenException
   * 
   * @param userId - User ID to check
   * @param denNumber - Den number to validate access for
   * @throws ForbiddenException if access denied
   */
  async validateDenAccess(userId: string, denNumber: number): Promise<void> {
    const canAccess = await this.canAccessDen(userId, denNumber);
    if (!canAccess) {
      throw new ForbiddenException('Access denied: No permission to access this den');
    }
  }

  /**
   * Validate user access to rank-level data or throw ForbiddenException
   * 
   * @param userId - User ID to check
   * @param rankLevel - Rank level to validate access for
   * @throws ForbiddenException if access denied
   */
  async validateRankAccess(userId: string, rankLevel: RankLevel): Promise<void> {
    const canAccess = await this.canAccessRank(userId, rankLevel);
    if (!canAccess) {
      throw new ForbiddenException('Access denied: No permission to access this rank');
    }
  }
}
