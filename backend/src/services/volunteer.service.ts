import { Injectable } from '@nestjs/common';
import { AuthTier, CalendarFeedRevokedReason, RankLevel, RoleType } from '@prisma/client';
import prisma from '../utils/prisma';
import { BadgeTierService } from './badge-tier.service';
import { PointsService } from './points.service';
import { CalendarFeedTokenService } from './calendar-feed-token.service';

/**
 * VolunteerService handles volunteer profile management, role assignments,
 * and tier upgrades/downgrades per contracts/volunteers-api.md
 */
@Injectable()
export class VolunteerService {
  constructor(
    private readonly badgeTierService: BadgeTierService,
    private readonly pointsService: PointsService,
    private readonly calendarFeedTokenService: CalendarFeedTokenService,
  ) {}
  /**
   * Get volunteer profile with roles, ranks, and point balance
   */
  async getProfile(volunteerId: string) {
    const volunteer = await prisma.volunteer.findFirst({
      where: { id: volunteerId, deletedAt: null },
      include: {
        volunteerRoles: {
          where: { removedAt: null },
          include: {
            role: {
              select: {
                id: true,
                name: true,
                roleType: true,
                specialty: true,
                rankLevel: true,
              },
            },
            den: {
              select: {
                id: true,
                name: true,
                denNumber: true,
                rankLevel: true,
              },
            },
          },
        },
        childrenRanks: {
          select: {
            id: true,
            rankLevel: true,
          },
        },
        pointBalance: {
          select: {
            totalPoints: true,
            currentYearPoints: true,
          },
        },
        leaderboardEntry: {
          select: {
            rank: true,
            badgeTier: true,
          },
        },
      },
    });

    if (!volunteer) {
      throw new Error('Volunteer not found');
    }

    const currentTotalPoints = volunteer.pointBalance?.totalPoints ?? 0;

    // Get badge tier info from BadgeTierService
    const badgeTier = await this.badgeTierService.getBadgeTierInfo(volunteerId, currentTotalPoints);

    // Get projected points from PointsService
    const projectedPoints = await this.pointsService.getProjectedPoints(volunteerId);

    // Map to API response format
    return {
      id: volunteer.id,
      email: volunteer.email,
      name: volunteer.name,
      phone: volunteer.phone,
      authTier: volunteer.authTier,
      leaderboardOptIn: volunteer.leaderboardOptIn,
      roles: volunteer.volunteerRoles.map((vr) => ({
        id: vr.id,
        roleId: vr.role.id,
        roleName: vr.role.name,
        roleType: vr.role.roleType,
        specialty: vr.role.specialty,
        rankLevel: vr.role.rankLevel,
        denId: vr.den?.id ?? null,
        denName: vr.den?.name ?? null,
        denNumber: vr.den?.denNumber ?? null,
        denRankLevel: vr.den?.rankLevel ?? null,
        assignedAt: vr.assignedAt.toISOString(),
      })),
      childrenRanks: volunteer.childrenRanks,
      pointBalance: {
        totalPoints: volunteer.pointBalance?.totalPoints ?? 0,
        currentYearPoints: volunteer.pointBalance?.currentYearPoints ?? 0,
        badgeTier: volunteer.leaderboardEntry?.badgeTier ?? null,
        rank: volunteer.leaderboardEntry?.rank ?? null,
      },
      badgeTier,
      projectedPoints,
      createdAt: volunteer.createdAt.toISOString(),
    };
  }

  /**
   * Update volunteer profile (name, phone, leaderboardOptIn)
   */
  async updateProfile(
    volunteerId: string,
    data: {
      name?: string;
      phone?: string | null;
      leaderboardOptIn?: boolean;
    }
  ) {
    const volunteer = await prisma.volunteer.findFirst({
      where: { id: volunteerId, deletedAt: null },
    });

    if (!volunteer) {
      throw new Error('Volunteer not found');
    }

    // Update profile fields
    const updatedVolunteer = await prisma.volunteer.update({
      where: { id: volunteerId },
      data: {
        name: data.name,
        phone: data.phone,
        leaderboardOptIn: data.leaderboardOptIn,
      },
    });

    return {
      id: updatedVolunteer.id,
      email: updatedVolunteer.email,
      name: updatedVolunteer.name,
      phone: updatedVolunteer.phone,
      leaderboardOptIn: updatedVolunteer.leaderboardOptIn,
    };
  }

  /**
   * Assign a role to a volunteer
   * Handles tier upgrades and point awards for LEADER roles
   */
  async assignRole(
    volunteerId: string,
    input: {
      roleId: string;
      denIds?: string[];
    }
  ) {
    const { roleId, denIds } = input;

    // Check if role exists and is active
    const role = await prisma.volunteerRole.findUnique({
      where: { id: roleId, deletedAt: null },
    });

    if (!role) {
      throw new Error('Role not found or has been deleted');
    }

    const denScopedRoleTypes: RoleType[] = [
      RoleType.DEN_LEADER,
      RoleType.ASSISTANT_DEN_LEADER,
      RoleType.LION_GUIDE,
    ];
    const isDenScopedRole = denScopedRoleTypes.includes(role.roleType);

    let assignments: Array<{
      id: string;
      roleId: string;
      roleName: string;
      denId: string | null;
      denNumber: number | null;
      assignedAt: string;
    }> = [];

    if (isDenScopedRole) {
      const uniqueDenIds = [...new Set(denIds ?? [])];
      if (uniqueDenIds.length === 0) {
        throw new Error('At least one den must be selected for this role');
      }

      const dens = await prisma.den.findMany({
        where: {
          id: { in: uniqueDenIds },
          isActive: true,
          deletedAt: null,
        },
        select: {
          id: true,
          denNumber: true,
        },
      });

      if (dens.length !== uniqueDenIds.length) {
        throw new Error('One or more selected dens are invalid or inactive');
      }

      const byId = new Map(dens.map((d) => [d.id, d]));

      for (const denId of uniqueDenIds) {
        const den = byId.get(denId)!;

        const existingAssignment = await prisma.volunteerToRole.findFirst({
          where: {
            volunteerId,
            roleId,
            denNumber: den.denNumber,
          },
          include: {
            role: true,
          },
        });

        if (existingAssignment && !existingAssignment.removedAt) {
          continue;
        }

        const assignment = existingAssignment
          ? await prisma.volunteerToRole.update({
              where: { id: existingAssignment.id },
              data: {
                denId,
                denNumber: den.denNumber,
                removedAt: null,
                assignedAt: new Date(),
              },
              include: { role: true },
            })
          : await prisma.volunteerToRole.create({
              data: {
                volunteerId,
                roleId,
                denId,
                denNumber: den.denNumber,
              },
              include: { role: true },
            });

        assignments.push({
          id: assignment.id,
          roleId: assignment.roleId,
          roleName: assignment.role.name,
          denId: assignment.denId,
          denNumber: assignment.denNumber,
          assignedAt: assignment.assignedAt.toISOString(),
        });
      }

      if (assignments.length === 0) {
        throw new Error('Role already assigned to volunteer for selected den(s)');
      }
    } else {
      // Check if already assigned (pack-wide role, denNumber = null)
      const existingAssignment = await prisma.volunteerToRole.findFirst({
        where: {
          volunteerId,
          roleId,
          denNumber: null,
          removedAt: null,
        },
      });

      if (existingAssignment && !existingAssignment.removedAt) {
        throw new Error('Role already assigned to volunteer');
      }

      // Create or reactivate role assignment
      const assignment = existingAssignment
        ? await prisma.volunteerToRole.update({
            where: { id: existingAssignment.id },
            data: {
              removedAt: null,
              assignedAt: new Date(),
            },
            include: { role: true },
          })
        : await prisma.volunteerToRole.create({
            data: {
              volunteerId,
              roleId,
            },
            include: { role: true },
          });

      assignments = [
        {
          id: assignment.id,
          roleId: assignment.roleId,
          roleName: assignment.role.name,
          denId: assignment.denId,
          denNumber: assignment.denNumber,
          assignedAt: assignment.assignedAt.toISOString(),
        },
      ];
    }

    // Check for tier upgrade (if role grants LEADER tier)
    const volunteer = await prisma.volunteer.findUnique({
      where: { id: volunteerId },
    });

    if (!volunteer) {
      throw new Error('Volunteer not found');
    }

    let tierUpgraded = false;
    if (role.grantsTier === AuthTier.LEADER && volunteer.authTier === AuthTier.PARENT) {
      await prisma.volunteer.update({
        where: { id: volunteerId },
        data: { authTier: AuthTier.LEADER },
      });
      tierUpgraded = true;
    }

    return {
      assignments,
      tierUpgraded,
    };
  }

  async getAssignableDens(rankLevel?: RankLevel) {
    return prisma.den.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        ...(rankLevel ? { rankLevel } : {}),
      },
      select: {
        id: true,
        name: true,
        denNumber: true,
        rankLevel: true,
      },
      orderBy: [{ denNumber: 'asc' }],
    });
  }

  /**
   * Remove a role assignment
   * Handles tier downgrades if removing last LEADER role
   */
  async removeRole(volunteerId: string, roleAssignmentId: string) {
    const assignment = await prisma.volunteerToRole.findUnique({
      where: { id: roleAssignmentId },
      include: { role: true },
    });

    if (!assignment || assignment.volunteerId !== volunteerId) {
      throw new Error('Role assignment not found or not owned by volunteer');
    }

    if (assignment.removedAt) {
      throw new Error('Role already removed');
    }

    // Soft delete the role assignment
    await prisma.volunteerToRole.update({
      where: { id: roleAssignmentId },
      data: { removedAt: new Date() },
    });

    // Check if we need to downgrade tier
    const remainingLeaderRoles = await prisma.volunteerToRole.count({
      where: {
        volunteerId,
        removedAt: null,
        role: {
          grantsTier: AuthTier.LEADER,
        },
      },
    });

    if (remainingLeaderRoles === 0) {
      // Downgrade to PARENT tier
      await prisma.volunteer.update({
        where: { id: volunteerId },
        data: { authTier: AuthTier.PARENT },
      });
    }
  }

  /**
   * List all volunteers with pagination and filtering (Tier 2+ only)
   */
  async listVolunteers(options: {
    page: number;
    limit: number;
    search?: string;
    tier?: AuthTier;
    roleId?: string;
  }) {
    const { page, limit, search, tier, roleId } = options;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      deletedAt: null,
    };

    if (search) {
      // Note: SQLite doesn't support mode: 'insensitive'
      // For case-insensitive search in production, use PostgreSQL or add COLLATE NOCASE to schema
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    if (tier) {
      where.authTier = tier;
    }

    if (roleId) {
      where.volunteerRoles = {
        some: {
          roleId,
          removedAt: null,
        },
      };
    }

    // Get total count
    const total = await prisma.volunteer.count({ where });

    // Get volunteers
    const volunteers = await prisma.volunteer.findMany({
      where,
      skip,
      take: limit,
      include: {
        volunteerRoles: {
          where: { removedAt: null },
          include: {
            role: {
              select: { name: true },
            },
          },
        },
        pointBalance: {
          select: {
            totalPoints: true,
            currentYearPoints: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      volunteers: volunteers.map((v) => ({
        id: v.id,
        email: v.email,
        name: v.name,
        authTier: v.authTier,
        roles: v.volunteerRoles.map((vr) => ({ roleName: vr.role.name })),
        pointBalance: {
          totalPoints: v.pointBalance?.totalPoints ?? 0,
          currentYearPoints: v.pointBalance?.currentYearPoints ?? 0,
        },
        createdAt: v.createdAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get specific volunteer details (Tier 2+ or self)
   */
  async getVolunteerById(volunteerId: string) {
    const volunteer = await prisma.volunteer.findFirst({
      where: { id: volunteerId, deletedAt: null },
      include: {
        volunteerRoles: {
          where: { removedAt: null },
          include: {
            role: {
              select: {
                name: true,
                roleType: true,
              },
            },
          },
        },
        childrenRanks: {
          select: {
            rankLevel: true,
          },
        },
        pointBalance: {
          select: {
            totalPoints: true,
            currentYearPoints: true,
          },
        },
        leaderboardEntry: {
          select: {
            rank: true,
            badgeTier: true,
          },
        },
        pointEvents: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 50,
          include: {
            activityType: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!volunteer) {
      throw new Error('Volunteer not found');
    }

    return {
      id: volunteer.id,
      email: volunteer.email,
      name: volunteer.name,
      phone: volunteer.phone,
      authTier: volunteer.authTier,
      leaderboardOptIn: volunteer.leaderboardOptIn,
      roles: volunteer.volunteerRoles.map((vr) => ({
        id: vr.id,
        roleName: vr.role.name,
        roleType: vr.role.roleType,
        assignedAt: vr.assignedAt.toISOString(),
      })),
      childrenRanks: volunteer.childrenRanks,
      pointBalance: {
        totalPoints: volunteer.pointBalance?.totalPoints ?? 0,
        currentYearPoints: volunteer.pointBalance?.currentYearPoints ?? 0,
        badgeTier: volunteer.leaderboardEntry?.badgeTier ?? null,
        rank: volunteer.leaderboardEntry?.rank ?? null,
      },
      pointHistory: volunteer.pointEvents.map((pe) => ({
        id: pe.id,
        points: pe.points,
        eventType: pe.eventType,
        reason: pe.reason,
        createdAt: pe.createdAt.toISOString(),
        activityType: pe.activityType ? { name: pe.activityType.name } : null,
      })),
      createdAt: volunteer.createdAt.toISOString(),
    };
  }

  /**
   * Soft delete a volunteer (Tier 3 only)
   */
  async deleteVolunteer(volunteerId: string) {
    const volunteer = await prisma.volunteer.findFirst({
      where: { id: volunteerId, deletedAt: null },
    });

    if (!volunteer) {
      throw new Error('Volunteer not found');
    }

    // Soft delete volunteer
    await prisma.volunteer.update({
      where: { id: volunteerId },
      data: { deletedAt: new Date() },
    });

    await this.calendarFeedTokenService.revokeAllForVolunteer(
      volunteerId,
      CalendarFeedRevokedReason.LEFT_PACK,
    );

    // Withdraw all future signups
    await prisma.signup.updateMany({
      where: {
        volunteerId,
        activitySlot: {
          event: {
            eventDate: {
              gte: new Date(),
            },
          },
        },
      },
      data: {
        withdrawn: true,
        withdrawnAt: new Date(),
      },
    });
  }

  /**
   * Get all available volunteer roles
   * Returns only non-deleted roles (excludes PARENT_GUARDIAN as it's the default role)
   */
  async getAvailableRoles() {
    const roles = await prisma.volunteerRole.findMany({
      where: { 
        deletedAt: null,
        roleType: { not: 'PARENT_GUARDIAN' } // Exclude default parent role
      },
      select: {
        id: true,
        name: true,
        description: true,
        roleType: true,
        specialty: true,
        rankLevel: true,
        grantsTier: true,
      },
      orderBy: [
        { roleType: 'asc' },
        { name: 'asc' },
      ],
    });

    return roles;
  }
}
