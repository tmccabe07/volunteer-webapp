import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { CalendarFeedRevokedReason, CalendarFeedScope, RankLevel } from '@prisma/client';
import prisma from '../../utils/prisma';
import type { CreateDenDto } from '../../models/den/create-den.dto';
import type { AssignDenMemberDto } from '../../models/den/assign-member.dto';
import type { TransferChildDto } from '../../models/den/transfer-child.dto';
import { CalendarFeedTokenService } from '../calendar-feed-token.service';

/**
 * DenService handles den management and membership operations
 * per contracts/api-endpoints.md
 * 
 * Implements:
 * - Den CRUD operations
 * - Den number uniqueness validation
 * - Temporal membership management (validFrom/validTo)
 * - Den roster queries
 */
@Injectable()
export class DenService {
  constructor(private readonly calendarFeedTokenService: CalendarFeedTokenService) {}

  private async revokeParentDenTokensForChild(denId: string, childScoutId: string) {
    const approvedParents = await prisma.parentChildLink.findMany({
      where: {
        childScoutId,
        status: 'APPROVED',
      },
      select: {
        parentId: true,
      },
    });

    for (const parent of approvedParents) {
      await this.calendarFeedTokenService.revokeScopeToken(
        parent.parentId,
        'PARENT',
        CalendarFeedScope.DEN,
        denId,
        CalendarFeedRevokedReason.ACCESS_REMOVED,
      );
    }
  }

  private async validateTransferTargets(
    childScoutId: string,
    fromDenId: string | null | undefined,
    toDenId: string,
  ) {
    const [destinationDen, child] = await Promise.all([
      prisma.den.findFirst({ where: { id: toDenId, deletedAt: null } }),
      prisma.childScout.findFirst({ where: { id: childScoutId, deletedAt: null } }),
    ]);

    if (!destinationDen) {
      throw new NotFoundException('Destination den not found');
    }

    if (!child) {
      throw new NotFoundException('Child scout not found');
    }

    if (child.currentRank !== destinationDen.rankLevel) {
      throw new BadRequestException(
        `Cannot assign ${child.currentRank} scout to ${destinationDen.rankLevel} den. Scout rank must match den rank.`,
      );
    }

    const currentMembership = await prisma.denMembership.findFirst({
      where: {
        childScoutId,
        validTo: null,
      },
    });

    if (fromDenId && currentMembership?.denId !== fromDenId) {
      throw new BadRequestException('Child is not currently assigned to the specified source den');
    }

    if (!fromDenId && currentMembership) {
      throw new ConflictException('Child already has an active den assignment');
    }

    if (currentMembership?.denId === toDenId) {
      throw new ConflictException('Child is already assigned to this den');
    }

    return { destinationDen, child, currentMembership };
  }

  /**
   * Create a new den with uniqueness validation
   * T061: Den number must be unique among active dens
   */
  async createDen(dto: CreateDenDto, createdByUserId: string) {
    // Check if den number is already in use by an active den
    const existingDen = await prisma.den.findFirst({
      where: {
        denNumber: dto.denNumber,
        isActive: true,
      },
    });

    if (existingDen) {
      throw new ConflictException(
        `Den number ${dto.denNumber} is already in use by an active den`,
      );
    }

    const den = await prisma.den.create({
      data: {
        name: dto.name,
        denNumber: dto.denNumber,
        rankLevel: dto.rankLevel,
        isActive: true,
      },
    });

    return {
      id: den.id,
      name: den.name,
      denNumber: den.denNumber,
      rankLevel: den.rankLevel,
      isActive: den.isActive,
      createdAt: den.createdAt.toISOString(),
    };
  }

  /**
   * List dens with filters
   */
  async listDens(filters: { rankLevel?: RankLevel; isActive?: boolean }) {
    const isActive = filters.isActive ?? true;

    const dens = await prisma.den.findMany({
      where: {
        isActive,
        ...(filters.rankLevel && { rankLevel: filters.rankLevel }),
      },
      orderBy: [{ rankLevel: 'asc' }, { denNumber: 'asc' }],
      include: {
        members: {
          where: { validTo: null },
          select: { id: true },
        },
        leaderAssignments: {
          where: { removedAt: null },
          include: {
            volunteer: {
              select: {
                id: true,
                name: true,
              },
            },
            role: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    return {
      data: dens.map(den => ({
        id: den.id,
        name: den.name,
        denNumber: den.denNumber,
        rankLevel: den.rankLevel,
        isActive: den.isActive,
        currentMemberCount: den.members.length,
        leaders: den.leaderAssignments.map(vr => ({
          id: vr.volunteer.id,
          name: vr.volunteer.name,
          role: vr.role.name,
        })),
      })),
    };
  }

  /**
   * Get den roster with member details
   */
  async getDenRoster(denId: string) {
    const den = await prisma.den.findUnique({
      where: { id: denId },
      include: {
        members: {
          where: { validTo: null }, // Only current members
          orderBy: { validFrom: 'asc' },
          include: {
            childScout: {
              include: {
                parentLinks: {
                  where: { status: 'APPROVED' },
                  include: {
                    parent: {
                      select: {
                        name: true,
                        email: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!den) {
      throw new NotFoundException('Den not found');
    }

    return {
      den: {
        id: den.id,
        name: den.name,
        denNumber: den.denNumber,
        rankLevel: den.rankLevel,
      },
      members: den.members.map(membership => ({
        id: membership.childScout.id,
        firstName: membership.childScout.firstName,
        lastName: membership.childScout.lastName,
        memberSince: membership.validFrom.toISOString(),
        parents: membership.childScout.parentLinks.map(link => ({
          name: link.parent.name,
          email: link.parent.email,
          relationshipType: link.relationshipType,
        })),
      })),
    };
  }

  /**
   * Assign child to den with temporal membership logic
   * T062: Close existing membership and create new one
   */
  async assignChildToDen(
    denId: string,
    dto: AssignDenMemberDto,
    assignedByUserId: string,
  ) {
    const den = await prisma.den.findUnique({ where: { id: denId } });
    if (!den) {
      throw new NotFoundException('Den not found');
    }

    const child = await prisma.childScout.findUnique({
      where: { id: dto.childScoutId },
    });
    if (!child) {
      throw new NotFoundException('Child scout not found');
    }

    if (child.currentRank !== den.rankLevel) {
      throw new BadRequestException(
        `Cannot assign ${child.currentRank} scout to ${den.rankLevel} den. Scout rank must match den rank.`,
      );
    }

    const effectiveDate = dto.effectiveDate || new Date();

    // Check if child already has current membership in this den
    const existingMembership = await prisma.denMembership.findFirst({
      where: {
        childScoutId: dto.childScoutId,
        denId: denId,
        validTo: null,
      },
    });

    if (existingMembership) {
      throw new ConflictException(
        'Child is already assigned to this den',
      );
    }

    // T062: Close any existing current membership in another den
    const currentMemberships = await prisma.denMembership.findMany({
      where: {
        childScoutId: dto.childScoutId,
        validTo: null,
      },
      select: {
        denId: true,
      },
    });

    await prisma.denMembership.updateMany({
      where: {
        childScoutId: dto.childScoutId,
        validTo: null,
      },
      data: {
        validTo: effectiveDate,
      },
    });

    for (const membership of currentMemberships) {
      await this.revokeParentDenTokensForChild(membership.denId, dto.childScoutId);
    }

    // Create new membership
    const membership = await prisma.denMembership.create({
      data: {
        childScoutId: dto.childScoutId,
        denId: denId,
        validFrom: effectiveDate,
        assignedBy: assignedByUserId,
        reason: dto.reason,
      },
    });

    return {
      id: membership.id,
      denId: membership.denId,
      childScoutId: membership.childScoutId,
      validFrom: membership.validFrom.toISOString(),
      validTo: membership.validTo?.toISOString() || null,
      assignedBy: membership.assignedBy!,
      reason: membership.reason,
    };
  }

  /**
   * Remove child from den (closes membership)
   */
  async removeChildFromDen(denId: string, childScoutId: string, removedAt?: Date) {
    const membership = await prisma.denMembership.findFirst({
      where: {
        childScoutId: childScoutId,
        denId: denId,
        validTo: null,
      },
    });

    if (!membership) {
      throw new NotFoundException('Child is not currently a member of this den');
    }

    const effectiveDate = removedAt || new Date();

    await prisma.denMembership.update({
      where: { id: membership.id },
      data: {
        validTo: effectiveDate,
      },
    });

    await this.revokeParentDenTokensForChild(denId, childScoutId);

    return {
      message: 'Child removed from den successfully',
    };
  }

  /**
   * Transfer a child from one den to another in a single atomic operation.
   */
  async transferChild(dto: TransferChildDto, actedByUserId: string) {
    const effectiveDate = dto.effectiveDate || new Date();
    const { currentMembership } = await this.validateTransferTargets(
      dto.childScoutId,
      dto.fromDenId,
      dto.toDenId,
    );

    const result = await prisma.$transaction(async tx => {
      if (currentMembership) {
        await tx.denMembership.update({
          where: { id: currentMembership.id },
          data: { validTo: effectiveDate },
        });
      }

      const newMembership = await tx.denMembership.create({
        data: {
          childScoutId: dto.childScoutId,
          denId: dto.toDenId,
          validFrom: effectiveDate,
          assignedBy: actedByUserId,
          reason: dto.reason,
        },
      });

      return { currentMembership, newMembership };
    });

    if (result.currentMembership) {
      await this.revokeParentDenTokensForChild(result.currentMembership.denId, dto.childScoutId);
    }

    return {
      oldMembership: result.currentMembership
        ? {
            id: result.currentMembership.id,
            denId: result.currentMembership.denId,
            validFrom: result.currentMembership.validFrom.toISOString(),
            validTo: effectiveDate.toISOString(),
          }
        : null,
      newMembership: {
        id: result.newMembership.id,
        denId: result.newMembership.denId,
        validFrom: result.newMembership.validFrom.toISOString(),
        validTo: null,
        reason: result.newMembership.reason,
      },
    };
  }

  /**
   * Bulk assign multiple children to dens.
   */
  async batchAssignChildren(
    dto: {
      assignments: Array<{
        childScoutId: string;
        fromDenId?: string | null;
        toDenId: string;
      }>;
      effectiveDate?: Date;
      reason: string;
    },
    actedByUserId: string,
  ) {
    const effectiveDate = dto.effectiveDate || new Date();
    const results: Array<{
      childScoutId: string;
      status: 'success' | 'error';
      error?: string;
      oldMembership?: { denId: string; validTo: string };
      newMembership?: { denId: string; validFrom: string };
    }> = [];

    for (const assignment of dto.assignments) {
      try {
        const outcome = await this.transferChild(
          {
            childScoutId: assignment.childScoutId,
            fromDenId: assignment.fromDenId ?? null,
            toDenId: assignment.toDenId,
            effectiveDate,
            reason: dto.reason,
          },
          actedByUserId,
        );

        results.push({
          childScoutId: assignment.childScoutId,
          status: 'success',
          oldMembership: outcome.oldMembership
            ? { denId: outcome.oldMembership.denId, validTo: outcome.oldMembership.validTo }
            : undefined,
          newMembership: {
            denId: outcome.newMembership.denId,
            validFrom: outcome.newMembership.validFrom,
          },
        });
      } catch (error: any) {
        results.push({
          childScoutId: assignment.childScoutId,
          status: 'error',
          error: error instanceof Error ? error.message : 'Failed to assign child',
        });
      }
    }

    return {
      successful: results.filter(result => result.status === 'success').length,
      failed: results.filter(result => result.status === 'error').length,
      results,
    };
  }

  /**
   * Soft delete a den (mark as inactive)
   */
  async deleteDen(denId: string) {
    const den = await prisma.den.findUnique({
      where: { id: denId },
      include: {
        members: {
          where: { validTo: null },
        },
      },
    });

    if (!den) {
      throw new NotFoundException('Den not found');
    }

    // Cannot delete den with active members
    if (den.members.length > 0) {
      throw new BadRequestException(
        'Cannot delete den with active members. Transfer children to another den first.',
      );
    }

    const updated = await prisma.den.update({
      where: { id: denId },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      denNumber: updated.denNumber,
      rankLevel: updated.rankLevel,
      isActive: updated.isActive,
      deletedAt: updated.deletedAt!.toISOString(),
    };
  }
}
