import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { AuthTier, RankLevel } from '@prisma/client';
import prisma from '../../utils/prisma';
import { AuthorizationService } from '../role-scope/authorization.service';
import type { CreateChildScoutDto } from '../../models/child-scout/create-child-scout.dto';
import type { UpdateChildScoutDto } from '../../models/child-scout/update-child-scout.dto';
import type { ChildScoutListResponse } from '../../models/child-scout/child-scout-response.dto';

/**
 * ChildScoutService handles child scout management per contracts/api-endpoints.md
 * 
 * Implements:
 * - CRUD operations for child scouts
 * - Scope-based access control (ADMIN, LEADER with scope, PARENT with links)
 * - Filtering and pagination
 */
@Injectable()
export class ChildScoutService {
  constructor(private readonly authorizationService: AuthorizationService) {}

  private readonly duplicateCubNameError =
    'Conflict. A cub scout record with the same first and last name already exists.';

  private async getEffectiveUserTier(
    userId: string,
    roleAssignments?: Awaited<ReturnType<AuthorizationService['getUserRoleAssignments']>>,
  ): Promise<AuthTier> {
    const [volunteer, assignments] = await Promise.all([
      prisma.volunteer.findFirst({
        where: { id: userId, deletedAt: null },
        select: { authTier: true },
      }),
      roleAssignments
        ? Promise.resolve(roleAssignments)
        : this.authorizationService.getUserRoleAssignments(userId),
    ]);

    const tierLevels: Record<AuthTier, number> = {
      PARENT: 1,
      LEADER: 2,
      ADMIN: 3,
    };

    const tierCandidates: AuthTier[] = [];
    if (volunteer?.authTier) {
      tierCandidates.push(volunteer.authTier);
    }
    for (const assignment of assignments) {
      const tier = assignment.grantsTier as AuthTier;
      if (tier in tierLevels) {
        tierCandidates.push(tier);
      }
    }

    if (tierCandidates.length === 0) {
      return 'PARENT';
    }

    return tierCandidates.reduce((highest, current) =>
      tierLevels[current] > tierLevels[highest] ? current : highest,
    );
  }

  /**
   * Create a new child scout (ADMIN only)
   */
  async createChildScout(
    dto: CreateChildScoutDto,
    createdByUserId: string,
  ) {
    const duplicateChild = await prisma.childScout.findFirst({
      where: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (duplicateChild) {
      throw new ConflictException({ error: this.duplicateCubNameError });
    }

    const child = await prisma.childScout.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        currentRank: dto.currentRank,
        scoutbookId: dto.scoutbookId,
        isActive: true,
        createdBy: createdByUserId,
      },
    });

    return {
      id: child.id,
      firstName: child.firstName,
      lastName: child.lastName,
      currentRank: child.currentRank,
      isActive: child.isActive,
      createdAt: child.createdAt.toISOString(),
      createdBy: child.createdBy!,
    };
  }

  /**
   * List child scouts with filtering and scope-based access
   */
  async listChildScouts(
    userId: string,
    filters: {
      rankLevel?: RankLevel;
      denId?: string;
      isActive?: boolean;
      page?: number;
      limit?: number;
    },
  ): Promise<ChildScoutListResponse> {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 50, 100);
    const skip = (page - 1) * limit;
    const isActive = filters.isActive ?? true;

    // Get user's role assignments to determine access scope
    const roleAssignments = await this.authorizationService.getUserRoleAssignments(userId);
    const userTier = await this.getEffectiveUserTier(userId, roleAssignments);
    const isAdmin = userTier === 'ADMIN';
    const isLeader = userTier === 'LEADER';

    // Build where clause based on user's access level
    const whereClause: any = {
      isActive,
      deletedAt: null,
    };

    // Apply rank filter if specified
    if (filters.rankLevel) {
      whereClause.currentRank = filters.rankLevel;
    }

    // Apply den filter if specified
    if (filters.denId) {
      whereClause.denMemberships = {
        some: {
          denId: filters.denId,
          validTo: null, // Current membership only
        },
      };
    }

    // Apply scope-based filtering
    if (!isAdmin) {
      if (isLeader) {
        // Leader: filter by scope
        const hasPackScope = await this.authorizationService.hasPackScope(userId);
        
        if (!hasPackScope) {
          // If not pack scope, need to filter by rank or den scope
          const denScopes = [...new Set(
            roleAssignments
              .filter((r) => r.scopeType === 'DEN' && typeof r.denNumber === 'number')
              .map((r) => r.denNumber as number)
          )];
          
          const rankScopes = [...new Set(
            roleAssignments
              .filter((r) => r.scopeType === 'RANK' && !!r.rankLevel)
              .map((r) => r.rankLevel as string)
          )];

          // Must be in one of the scoped dens or ranks
          const scopeFilters: any[] = [];
          
          if (denScopes.length > 0) {
            scopeFilters.push({
              denMemberships: {
                some: {
                  den: {
                    denNumber: { in: denScopes },
                  },
                  validTo: null,
                },
              },
            });
          }
          
          if (rankScopes.length > 0) {
            scopeFilters.push({
              currentRank: { in: rankScopes },
            });
          }

          if (scopeFilters.length > 0) {
            whereClause.OR = scopeFilters;
          } else {
            // No valid scope, return empty
            return {
              data: [],
              pagination: {
                page,
                limit,
                total: 0,
                totalPages: 0,
              },
            };
          }
        }
      } else {
        // Parent: only linked children with APPROVED status
        whereClause.parentLinks = {
          some: {
            parentId: userId,
            status: 'APPROVED',
          },
        };
      }
    }

    // Execute query with pagination
    const [children, total] = await Promise.all([
      prisma.childScout.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: [
          { lastName: 'asc' },
          { firstName: 'asc' },
        ],
        include: {
          denMemberships: {
            where: { validTo: null },
            include: {
              den: {
                select: {
                  id: true,
                  name: true,
                  denNumber: true,
                },
              },
            },
            take: 1,
          },
        },
      }),
      prisma.childScout.count({ where: whereClause }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: children.map(child => ({
        id: child.id,
        firstName: child.firstName,
        lastName: child.lastName,
        currentRank: child.currentRank,
        isActive: child.isActive,
        currentDen: child.denMemberships[0]
          ? {
              id: child.denMemberships[0].den.id,
              name: child.denMemberships[0].den.name,
              denNumber: child.denMemberships[0].den.denNumber,
            }
          : null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Get child scout by ID with access check
   */
  async getChildScoutById(childId: string, userId: string) {
    const userTier = await this.getEffectiveUserTier(userId);
    
    // Validate access first
    await this.authorizationService.validateChildAccess(userId, childId, userTier);

    const child = await prisma.childScout.findFirst({
      where: {
        id: childId,
        deletedAt: null,
      },
      include: {
        denMemberships: {
          where: { validTo: null },
          include: {
            den: {
              select: {
                id: true,
                name: true,
                denNumber: true,
                rankLevel: true,
              },
            },
          },
          take: 1,
        },
        parentLinks: {
          where: { status: 'APPROVED' },
          include: {
            parent: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!child) {
      throw new NotFoundException('Child scout not found');
    }

    return {
      id: child.id,
      firstName: child.firstName,
      lastName: child.lastName,
      currentRank: child.currentRank,
      isActive: child.isActive,
      scoutbookId: child.scoutbookId,
      currentDen: child.denMemberships[0]
        ? {
            id: child.denMemberships[0].den.id,
            name: child.denMemberships[0].den.name,
            denNumber: child.denMemberships[0].den.denNumber,
            rankLevel: child.denMemberships[0].den.rankLevel,
          }
        : null,
      parentLinks: child.parentLinks.map(link => ({
        id: link.id,
        parentName: link.parent.name,
        parentEmail: link.parent.email,
        relationshipType: link.relationshipType,
        status: link.status,
      })),
      createdAt: child.createdAt.toISOString(),
      updatedAt: child.updatedAt.toISOString(),
    };
  }

  /**
   * Get attendance history for a child scout with access check
   */
  async getChildAttendanceHistory(childId: string, userId: string) {
    const userTier = await this.getEffectiveUserTier(userId);

    await this.authorizationService.validateChildAccess(userId, childId, userTier);

    const child = await prisma.childScout.findFirst({
      where: {
        id: childId,
        deletedAt: null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!child) {
      throw new NotFoundException('Child scout not found');
    }

    const attendance = await prisma.childAttendance.findMany({
      where: {
        childScoutId: childId,
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            eventDate: true,
          },
        },
        coveredRequirements: {
          include: {
            adventure: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        recordedAt: 'desc',
      },
    });

    return {
      child,
      attendance: attendance.map(record => ({
        event: {
          id: record.event.id,
          title: record.event.title,
          eventDate: record.event.eventDate.toISOString(),
        },
        attendanceStatus: record.attendanceStatus,
        notes: record.notes,
        coveredRequirements: record.coveredRequirements.map(req => ({
          id: req.id,
          adventureName: req.adventure.name,
          requirementText: req.requirementText,
        })),
        recordedAt: record.recordedAt.toISOString(),
        recordedBy: record.recordedBy,
      })),
    };
  }

  /**
   * Update child scout (ADMIN or parent with approved link)
   */
  async updateChildScout(
    childId: string,
    userId: string,
    dto: UpdateChildScoutDto,
  ) {
    const userTier = await this.getEffectiveUserTier(userId);

    // If not admin, must be parent/leader with valid scope
    if (userTier !== 'ADMIN') {
      const canAccess = await this.authorizationService.canAccessChild(userId, childId, userTier);
      if (!canAccess) {
        throw new ForbiddenException('You do not have permission to update this child');
      }
    }

    const child = await prisma.childScout.findFirst({
      where: {
        id: childId,
        deletedAt: null,
      },
    });

    if (!child) {
      throw new NotFoundException('Child scout not found');
    }

    const nextFirstName = dto.firstName ?? child.firstName;
    const nextLastName = dto.lastName ?? child.lastName;
    const duplicateChild = await prisma.childScout.findFirst({
      where: {
        id: { not: childId },
        firstName: nextFirstName,
        lastName: nextLastName,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (duplicateChild) {
      throw new ConflictException({ error: this.duplicateCubNameError });
    }

    const updated = await prisma.childScout.update({
      where: { id: childId },
      data: {
        ...(dto.firstName && { firstName: dto.firstName }),
        ...(dto.lastName && { lastName: dto.lastName }),
        ...(dto.currentRank && { currentRank: dto.currentRank }),
      },
    });

    // Return full details
    return this.getChildScoutById(childId, userId);
  }

  /**
   * Soft delete child scout (ADMIN only)
   */
  async deleteChildScout(childId: string, userId: string): Promise<void> {
    const userTier = await this.getEffectiveUserTier(userId);
    if (userTier !== 'ADMIN') {
      throw new ForbiddenException('Only admins can delete Cub Scout records');
    }

    const child = await prisma.childScout.findFirst({
      where: {
        id: childId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!child) {
      throw new NotFoundException('Child scout not found');
    }

    await prisma.childScout.update({
      where: { id: childId },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });
  }
}
