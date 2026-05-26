import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AwardState, CompletionType, CoverageSource, ReconciliationStatus } from '@prisma/client';
import prisma from '../../utils/prisma';
import { AuthorizationService } from '../role-scope/authorization.service';

@Injectable()
export class RequirementProgressService {
  constructor(private readonly authorizationService: AuthorizationService) {}

  private async createEligibleAwardItemIfAdventureFullyReconciled(
    childScoutId: string,
    adventureId: string,
    userId: string,
  ): Promise<void> {
    const [totalRequirements, reconciledRequirements] = await Promise.all([
      prisma.requirement.count({
        where: { adventureId },
      }),
      prisma.requirementProgress.count({
        where: {
          childScoutId,
          adventureId,
          scoutbookStatus: {
            in: [ReconciliationStatus.ENTERED, ReconciliationStatus.VERIFIED],
          },
        },
      }),
    ]);

    if (totalRequirements === 0 || reconciledRequirements < totalRequirements) {
      return;
    }

    const existingAward = await prisma.awardItem.findFirst({
      where: {
        childScoutId,
        adventureId,
      },
      select: {
        id: true,
      },
    });

    if (existingAward) {
      return;
    }

    const createdAward = await prisma.awardItem.create({
      data: {
        childScoutId,
        adventureId,
        currentState: AwardState.ELIGIBLE,
        quantityNeeded: 1,
      },
      select: {
        id: true,
      },
    });

    await prisma.awardStateHistory.create({
      data: {
        awardItemId: createdAward.id,
        fromState: null,
        toState: AwardState.ELIGIBLE,
        changedBy: userId,
        notes: 'Adventure fully reconciled in Scoutbook',
      },
    });
  }

  private async assertCanAccessCubScout(
    userId: string,
    authTier: string,
    childScoutId: string,
  ): Promise<void> {
    if (authTier === 'ADMIN') {
      return;
    }

    const canAccess = await this.authorizationService.canAccessChild(
      userId,
      childScoutId,
      authTier,
    );

    if (!canAccess) {
      throw new ForbiddenException('You do not have access to this Cub Scout');
    }
  }

  async completeRequirement(
    requirementId: string,
    input: {
      childScoutId: string;
      completionType: CompletionType;
      notes?: string;
    },
    userId: string,
    authTier: string,
  ) {
    const [requirement, cubScout] = await Promise.all([
      prisma.requirement.findUnique({
        where: { id: requirementId },
        include: {
          adventure: {
            select: { id: true },
          },
        },
      }),
      prisma.childScout.findFirst({
        where: { id: input.childScoutId, deletedAt: null },
        select: { id: true },
      }),
    ]);

    if (!requirement) {
      throw new NotFoundException('Requirement not found');
    }

    if (!cubScout) {
      throw new NotFoundException('Cub Scout not found');
    }

    await this.assertCanAccessCubScout(userId, authTier, input.childScoutId);

    try {
      const created = await prisma.requirementProgress.create({
        data: {
          childScoutId: input.childScoutId,
          requirementId,
          adventureId: requirement.adventure.id,
          completedBy: userId,
          completionType: input.completionType,
          notes: input.notes,
          scoutbookStatus: ReconciliationStatus.PENDING,
        },
      });

      return {
        id: created.id,
        requirementId: created.requirementId,
        childScoutId: created.childScoutId,
        completedAt: created.completedAt.toISOString(),
        completedBy: created.completedBy,
        completionType: created.completionType,
        scoutbookStatus: created.scoutbookStatus,
        version: created.version,
        duplicateLogged: false,
      };
    } catch (error: any) {
      if (error?.code === 'P2002') {
        const existing = await prisma.requirementProgress.findFirst({
          where: {
            childScoutId: input.childScoutId,
            requirementId,
          },
          select: {
            id: true,
            requirementId: true,
            childScoutId: true,
            completedAt: true,
            completedBy: true,
            completionType: true,
            scoutbookStatus: true,
            version: true,
            adventureId: true,
          },
        });

        if (!existing) {
          throw new ConflictException('Requirement has already been completed for this Cub Scout');
        }

        await prisma.requirementCoverageOccurrence.create({
          data: {
            childScoutId: input.childScoutId,
            requirementId,
            adventureId: existing.adventureId,
            completionType: input.completionType,
            notes: input.notes,
            recordedBy: userId,
            source: CoverageSource.MANUAL_COMPLETION,
          },
        });

        return {
          id: existing.id,
          requirementId: existing.requirementId,
          childScoutId: existing.childScoutId,
          completedAt: existing.completedAt.toISOString(),
          completedBy: existing.completedBy,
          completionType: existing.completionType,
          scoutbookStatus: existing.scoutbookStatus,
          version: existing.version,
          duplicateLogged: true,
        };
      }
      throw error;
    }
  }

  async getPendingReconciliation(
    userId: string,
    authTier: string,
    filters: {
      denId?: string;
      olderThanDays?: number;
      completionType?: CompletionType;
    },
  ) {
    if (authTier === 'PARENT') {
      throw new ForbiddenException('Only leaders or admins can view reconciliation queue');
    }

    const dateThreshold =
      filters.olderThanDays && filters.olderThanDays > 0
        ? new Date(Date.now() - filters.olderThanDays * 24 * 60 * 60 * 1000)
        : undefined;

    const rows = await prisma.requirementProgress.findMany({
      where: {
        scoutbookStatus: ReconciliationStatus.PENDING,
        ...(filters.completionType ? { completionType: filters.completionType } : {}),
        ...(dateThreshold ? { completedAt: { lte: dateThreshold } } : {}),
        childScout: {
          deletedAt: null,
          ...(filters.denId
            ? {
                denMemberships: {
                  some: {
                    denId: filters.denId,
                    validTo: null,
                  },
                },
              }
            : {}),
        },
      },
      include: {
        childScout: {
          include: {
            denMemberships: {
              where: { validTo: null },
              include: {
                den: {
                  select: {
                    name: true,
                  },
                },
              },
              take: 1,
            },
          },
        },
        requirement: {
          include: {
            adventure: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { completedAt: 'asc' },
    });

    let filteredRows = rows;
    if (authTier === 'LEADER' && !(await this.authorizationService.hasPackScope(userId))) {
      const checks = await Promise.all(
        rows.map(row => this.authorizationService.canAccessChild(userId, row.childScoutId, 'LEADER')),
      );
      filteredRows = rows.filter((_, idx) => checks[idx]);
    }

    return {
      data: filteredRows.map(row => ({
        id: row.id,
        version: row.version,
        childScout: {
          id: row.childScout.id,
          name: `${row.childScout.firstName} ${row.childScout.lastName}`,
          currentRank: row.childScout.currentRank,
          denName: row.childScout.denMemberships[0]?.den.name || '',
        },
        requirement: {
          id: row.requirement.id,
          adventureName: row.requirement.adventure.name,
          requirementText: row.requirement.requirementText,
        },
        completedAt: row.completedAt.toISOString(),
        completionType: row.completionType,
        daysSinceCompletion: Math.floor(
          (Date.now() - row.completedAt.getTime()) / (24 * 60 * 60 * 1000),
        ),
      })),
    };
  }

  async reconcileRequirement(
    progressId: string,
    userId: string,
    authTier: string,
    input: { version: number; notes?: string },
  ) {
    const existing = await prisma.requirementProgress.findUnique({
      where: { id: progressId },
      select: {
        id: true,
        childScoutId: true,
        adventureId: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Requirement progress not found');
    }

    if (authTier === 'PARENT') {
      throw new ForbiddenException('Only leaders or admins can reconcile requirements');
    }

    await this.assertCanAccessCubScout(userId, authTier, existing.childScoutId);

    const result = await prisma.requirementProgress.updateMany({
      where: {
        id: progressId,
        version: input.version,
      },
      data: {
        scoutbookStatus: ReconciliationStatus.ENTERED,
        scoutbookEnteredAt: new Date(),
        scoutbookEnteredBy: userId,
        scoutbookNotes: input.notes,
        version: { increment: 1 },
      },
    });

    if (result.count === 0) {
      const current = await prisma.requirementProgress.findUnique({
        where: { id: progressId },
        select: {
          id: true,
          scoutbookStatus: true,
          version: true,
        },
      });

      throw new ConflictException({
        error: 'Conflict: requirement progress was updated by another request',
        current,
      });
    }

    const updated = await prisma.requirementProgress.findUniqueOrThrow({
      where: { id: progressId },
      select: {
        id: true,
        scoutbookStatus: true,
        scoutbookEnteredAt: true,
        scoutbookEnteredBy: true,
        version: true,
      },
    });

    await this.createEligibleAwardItemIfAdventureFullyReconciled(
      existing.childScoutId,
      existing.adventureId,
      userId,
    );

    return {
      id: updated.id,
      scoutbookStatus: updated.scoutbookStatus,
      scoutbookEnteredAt: updated.scoutbookEnteredAt?.toISOString(),
      scoutbookEnteredBy: updated.scoutbookEnteredBy,
      version: updated.version,
    };
  }
}
