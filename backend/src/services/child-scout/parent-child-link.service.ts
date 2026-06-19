import {
  Injectable,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AuthTier } from '@prisma/client';
import prisma from '../../utils/prisma';
import { AuthorizationService } from '../role-scope/authorization.service';
import type { RequestLinkDto } from '../../models/parent-link/request-link.dto';

@Injectable()
export class ParentChildLinkService {
  constructor(private readonly authorizationService: AuthorizationService) {}

  async getMyLinkedCubScouts(parentId: string) {
    const links = await prisma.parentChildLink.findMany({
      where: {
        parentId,
        status: 'APPROVED',
        childScout: {
          deletedAt: null,
          isActive: true,
        },
      },
      orderBy: [
        { childScout: { lastName: 'asc' } },
        { childScout: { firstName: 'asc' } },
      ],
      select: {
        childScout: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            currentRank: true,
            denMemberships: {
              where: { validTo: null },
              take: 1,
              select: {
                den: {
                  select: {
                    id: true,
                    name: true,
                    denNumber: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return {
      data: links.map((link) => ({
        id: link.childScout.id,
        firstName: link.childScout.firstName,
        lastName: link.childScout.lastName,
        currentRank: link.childScout.currentRank,
        currentDen: link.childScout.denMemberships[0]
          ? {
              id: link.childScout.denMemberships[0].den.id,
              name: link.childScout.denMemberships[0].den.name,
              denNumber: link.childScout.denMemberships[0].den.denNumber,
            }
          : null,
      })),
    };
  }

  async getRequestableCubScouts(parentId: string) {
    const rows = await prisma.childScout.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        NOT: {
          parentLinks: {
            some: {
              parentId,
              status: {
                in: ['PENDING', 'APPROVED'],
              },
            },
          },
        },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        currentRank: true,
        denMemberships: {
          where: { validTo: null },
          take: 1,
          select: {
            den: {
              select: {
                id: true,
                name: true,
                denNumber: true,
              },
            },
          },
        },
      },
    });

    return {
      data: rows.map((child) => ({
        id: child.id,
        firstName: child.firstName,
        lastName: child.lastName,
        currentRank: child.currentRank,
        currentDen: child.denMemberships[0]
          ? {
              id: child.denMemberships[0].den.id,
              name: child.denMemberships[0].den.name,
              denNumber: child.denMemberships[0].den.denNumber,
            }
          : null,
      })),
    };
  }

  private async getEffectiveUserTier(userId: string): Promise<AuthTier> {
    const [volunteer, assignments] = await Promise.all([
      prisma.volunteer.findFirst({
        where: { id: userId, deletedAt: null },
        select: { authTier: true },
      }),
      this.authorizationService.getUserRoleAssignments(userId),
    ]);

    const tierLevels: Record<AuthTier, number> = {
      PARENT: 1,
      LEADER: 2,
      DEN_CHIEF: 2,
      ADMIN: 3,
    };

    const candidates: AuthTier[] = [];
    if (volunteer?.authTier) {
      candidates.push(volunteer.authTier);
    }

    for (const assignment of assignments) {
      const tier = assignment.grantsTier as AuthTier;
      if (tier in tierLevels) {
        candidates.push(tier);
      }
    }

    if (candidates.length === 0) {
      return 'PARENT';
    }

    return candidates.reduce((highest, current) =>
      tierLevels[current] > tierLevels[highest] ? current : highest,
    );
  }

  async requestLink(parentId: string, dto: RequestLinkDto) {
    const cubScout = await prisma.childScout.findFirst({
      where: {
        id: dto.childScoutId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!cubScout) {
      throw new NotFoundException('Cub Scout not found');
    }

    const approved = await prisma.parentChildLink.findFirst({
      where: {
        parentId,
        childScoutId: dto.childScoutId,
        status: 'APPROVED',
      },
    });

    if (approved) {
      throw new ConflictException('Link is already approved');
    }

    const existingPending = await prisma.parentChildLink.findFirst({
      where: {
        parentId,
        childScoutId: dto.childScoutId,
        status: 'PENDING',
      },
    });

    if (existingPending) {
      return {
        id: existingPending.id,
        parentId: existingPending.parentId,
        childScoutId: existingPending.childScoutId,
        status: existingPending.status,
        relationshipType: existingPending.relationshipType ?? undefined,
        requestedAt: existingPending.requestedAt.toISOString(),
      };
    }

    const created = await prisma.parentChildLink.create({
      data: {
        parentId,
        childScoutId: dto.childScoutId,
        relationshipType: dto.relationshipType,
        status: 'PENDING',
        requestedBy: parentId,
      },
    });

    return {
      id: created.id,
      parentId: created.parentId,
      childScoutId: created.childScoutId,
      status: created.status,
      relationshipType: created.relationshipType ?? undefined,
      requestedAt: created.requestedAt.toISOString(),
    };
  }

  async getPendingLinks(userId: string, denId?: string) {
    const userTier = await this.getEffectiveUserTier(userId);
    if (userTier === 'PARENT') {
      throw new ForbiddenException('Only leaders or admins can view pending links');
    }

    const rows = await prisma.parentChildLink.findMany({
      where: {
        status: 'PENDING',
        childScout: {
          deletedAt: null,
          ...(denId
            ? {
                denMemberships: {
                  some: {
                    denId,
                    validTo: null,
                  },
                },
              }
            : {}),
        },
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        childScout: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            currentRank: true,
            denMemberships: {
              where: { validTo: null },
              include: {
                den: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
              take: 1,
            },
          },
        },
      },
      orderBy: { requestedAt: 'asc' },
    });

    let filtered = rows;
    if (userTier === 'LEADER' && !(await this.authorizationService.hasPackScope(userId))) {
      const checks = await Promise.all(
        rows.map(row =>
          this.authorizationService.canAccessChild(userId, row.childScoutId, 'LEADER'),
        ),
      );
      filtered = rows.filter((_, idx) => checks[idx]);
    }

    return {
      data: filtered.map(link => ({
        id: link.id,
        parent: {
          id: link.parent.id,
          name: link.parent.name,
          email: link.parent.email,
        },
        childScout: {
          id: link.childScout.id,
          firstName: link.childScout.firstName,
          lastName: link.childScout.lastName,
          currentRank: link.childScout.currentRank,
          denId: link.childScout.denMemberships[0]?.den.id,
          denName: link.childScout.denMemberships[0]?.den.name,
        },
        relationshipType: link.relationshipType ?? undefined,
        requestedAt: link.requestedAt.toISOString(),
      })),
    };
  }

  async getPendingFilterDens(userId: string) {
    const userTier = await this.getEffectiveUserTier(userId);
    if (userTier === 'PARENT') {
      throw new ForbiddenException('Only leaders or admins can view pending links');
    }

    if (userTier === 'ADMIN' || (await this.authorizationService.hasPackScope(userId))) {
      return {
        data: await prisma.den.findMany({
          where: {
            isActive: true,
            deletedAt: null,
          },
          select: {
            id: true,
            name: true,
            denNumber: true,
            rankLevel: true,
          },
          orderBy: [{ denNumber: 'asc' }],
        }),
      };
    }

    const assignments = await this.authorizationService.getUserRoleAssignments(userId);
    const denNumberSet = new Set<number>();
    const rankSet = new Set<string>();

    for (const assignment of assignments) {
      if (assignment.scopeType === 'DEN' && assignment.denNumber) {
        denNumberSet.add(assignment.denNumber);
      }

      if (assignment.scopeType === 'RANK' && assignment.rankLevel) {
        rankSet.add(assignment.rankLevel);
      }

      // Backward compatibility for legacy DEN-scoped rank roles.
      if (
        assignment.scopeType === 'DEN' &&
        !assignment.denNumber &&
        assignment.rankLevel
      ) {
        rankSet.add(assignment.rankLevel);
      }
    }

    const allowedDenNumbers = [...denNumberSet];
    const allowedRanks = [...rankSet];

    if (allowedDenNumbers.length === 0 && allowedRanks.length === 0) {
      return { data: [] };
    }

    return {
      data: await prisma.den.findMany({
        where: {
          isActive: true,
          deletedAt: null,
          OR: [
            ...(allowedDenNumbers.length > 0
              ? [{ denNumber: { in: allowedDenNumbers } }]
              : []),
            ...(allowedRanks.length > 0
              ? [{ rankLevel: { in: allowedRanks as any } }]
              : []),
          ],
        },
        select: {
          id: true,
          name: true,
          denNumber: true,
          rankLevel: true,
        },
        orderBy: [{ denNumber: 'asc' }],
      }),
    };
  }

  async approveLink(linkId: string, processedByUserId: string) {
    return this.processLink(linkId, processedByUserId, true);
  }

  async rejectLink(linkId: string, processedByUserId: string, reason: string) {
    return this.processLink(linkId, processedByUserId, false, reason);
  }

  private async processLink(
    linkId: string,
    processedByUserId: string,
    approve: boolean,
    reason?: string,
  ) {
    const link = await prisma.parentChildLink.findUnique({
      where: { id: linkId },
      include: {
        childScout: {
          select: { id: true, deletedAt: true },
        },
      },
    });

    if (!link || link.childScout.deletedAt) {
      throw new NotFoundException('Link request not found');
    }

    if (link.status !== 'PENDING') {
      throw new ConflictException('Link request already processed');
    }

    const userTier = await this.getEffectiveUserTier(processedByUserId);
    const isAdmin = userTier === 'ADMIN';
    if (!isAdmin) {
      const canAccess = await this.authorizationService.canAccessChild(
        processedByUserId,
        link.childScoutId,
        'LEADER',
      );
      if (!canAccess) {
        throw new ForbiddenException('You do not have permission to process this link');
      }
    }

    const updated = await prisma.parentChildLink.update({
      where: { id: linkId },
      data: {
        status: approve ? 'APPROVED' : 'REJECTED',
        processedAt: new Date(),
        processedBy: processedByUserId,
        rejectionReason: approve ? null : reason,
      },
    });

    return {
      id: updated.id,
      status: updated.status,
      rejectionReason: updated.rejectionReason ?? undefined,
      processedAt: updated.processedAt?.toISOString(),
      processedBy: updated.processedBy,
    };
  }
}
