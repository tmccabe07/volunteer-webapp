import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { RankLevel } from '@prisma/client';
import prisma from '../../utils/prisma';
import type { CreateDenDto } from '../../models/den/create-den.dto';
import type { AssignDenMemberDto } from '../../models/den/assign-member.dto';

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
    await prisma.denMembership.updateMany({
      where: {
        childScoutId: dto.childScoutId,
        validTo: null,
      },
      data: {
        validTo: effectiveDate,
      },
    });

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

    return {
      message: 'Child removed from den successfully',
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
