import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, RankLevel, ReconciliationStatus, RolloverStatus } from '@prisma/client';
import prisma from '../../utils/prisma';

const RANK_ORDER: RankLevel[] = [
  RankLevel.LION,
  RankLevel.TIGER,
  RankLevel.WOLF,
  RankLevel.BEAR,
  RankLevel.WEBELOS,
  RankLevel.AOL,
];

function getNextRank(rank: RankLevel): RankLevel | null {
  const index = RANK_ORDER.indexOf(rank);
  if (index < 0 || index === RANK_ORDER.length - 1) {
    return null;
  }

  return RANK_ORDER[index + 1];
}

function groupChildrenByRank(children: Array<{ currentRank: RankLevel }>) {
  const counts = new Map<RankLevel, number>();

  for (const child of children) {
    counts.set(child.currentRank, (counts.get(child.currentRank) ?? 0) + 1);
  }

  return counts;
}

async function lockUnfinishedAdventures(
  tx: Prisma.TransactionClient,
  childScoutId: string,
  previousRank: RankLevel,
) {
  const adventures = await tx.adventure.findMany({
    where: {
      rank: {
        rankLevel: previousRank,
      },
    },
    select: {
      id: true,
      requirements: {
        select: {
          id: true,
        },
      },
    },
  });

  for (const adventure of adventures) {
    const [completedRequirements, awardableRequirements] = await Promise.all([
      tx.requirementProgress.count({
        where: {
          childScoutId,
          adventureId: adventure.id,
          scoutbookStatus: {
            in: [ReconciliationStatus.ENTERED, ReconciliationStatus.VERIFIED],
          },
        },
      }),
      tx.requirementProgress.count({
        where: {
          childScoutId,
          adventureId: adventure.id,
          awardable: true,
        },
      }),
    ]);

    if (completedRequirements > 0 && completedRequirements < adventure.requirements.length) {
      if (awardableRequirements > 0) {
        await tx.requirementProgress.updateMany({
          where: {
            childScoutId,
            adventureId: adventure.id,
            awardable: true,
          },
          data: {
            awardable: false,
          },
        });
      }
    }
  }
}

@Injectable()
export class RolloverService {
  async previewRollover(targetYear: string) {
    const [dens, children] = await Promise.all([
      prisma.den.findMany({
        where: { deletedAt: null, isActive: true },
        orderBy: { denNumber: 'asc' },
        select: { id: true, denNumber: true, name: true, rankLevel: true },
      }),
      prisma.childScout.findMany({
        where: { deletedAt: null, isActive: true },
        select: { id: true, currentRank: true },
      }),
    ]);

    const childCounts = groupChildrenByRank(children);

    return {
      previewSummary: {
        targetYear,
        totalDens: dens.length,
        denChanges: dens.map(den => ({
          denNumber: den.denNumber,
          denName: den.name,
          currentRank: den.rankLevel,
          nextRank: getNextRank(den.rankLevel) ?? 'CLOSED',
        })),
        totalChildren: children.length,
        byRank: RANK_ORDER.map(rank => ({
          currentRank: rank,
          count: childCounts.get(rank) ?? 0,
          nextRank: getNextRank(rank) ?? 'GRADUATED',
        })).filter(entry => entry.count > 0),
        graduatingScouts: childCounts.get(RankLevel.AOL) ?? 0,
      },
    };
  }

  async executeRollover(targetYear: string, executedBy: string, isDryRun = false) {
    const batch = await prisma.rolloverBatch.create({
      data: {
        executedBy,
        targetYear,
        isDryRun,
        status: RolloverStatus.PROCESSING,
      },
    });

    const preview = await this.previewRollover(targetYear);

    if (isDryRun) {
      await prisma.rolloverBatch.update({
        where: { id: batch.id },
        data: {
          status: RolloverStatus.COMPLETED,
          densProcessed: preview.previewSummary.totalDens,
          childrenProcessed: preview.previewSummary.totalChildren,
          childrenFailed: 0,
        },
      });

      return {
        batchId: batch.id,
        message: 'Rollover processing started',
      };
    }

    let densProcessed = 0;
    let childrenProcessed = 0;
    let childrenFailed = 0;

    const activeDens = await prisma.den.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: { denNumber: 'asc' },
      select: { id: true, rankLevel: true },
    });

    for (const den of activeDens) {
      const nextRank = getNextRank(den.rankLevel);
      if (nextRank) {
        await prisma.den.update({
          where: { id: den.id },
          data: { rankLevel: nextRank },
        });
      } else {
        await prisma.den.update({
          where: { id: den.id },
          data: {
            isActive: false,
            deletedAt: new Date(),
          },
        });
      }

      densProcessed += 1;
    }

    const activeChildren = await prisma.childScout.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, currentRank: true },
    });

    for (const child of activeChildren) {
      const previousRank = child.currentRank;
      const nextRank = getNextRank(child.currentRank);

      if (!nextRank) {
        childrenProcessed += 1;
        continue;
      }

      try {
        await prisma.$transaction(async tx => {
          await lockUnfinishedAdventures(tx, child.id, previousRank);

          await tx.childScout.update({
            where: { id: child.id },
            data: { currentRank: nextRank },
          });
        });
        childrenProcessed += 1;
      } catch (error: any) {
        childrenFailed += 1;
        await prisma.rolloverError.create({
          data: {
            batchId: batch.id,
            childScoutId: child.id,
            errorMessage: error instanceof Error ? error.message : 'Failed to advance child rank',
          },
        });
      }
    }

    const status = childrenFailed > 0 ? RolloverStatus.COMPLETED_WITH_ERRORS : RolloverStatus.COMPLETED;

    await prisma.rolloverBatch.update({
      where: { id: batch.id },
      data: {
        status,
        densProcessed,
        childrenProcessed,
        childrenFailed,
      },
    });

    return {
      batchId: batch.id,
      message: 'Rollover processing started',
    };
  }

  async getRolloverBatch(batchId: string) {
    const batch = await prisma.rolloverBatch.findUnique({
      where: { id: batchId },
      include: {
        errors: true,
      },
    });

    if (!batch) {
      throw new NotFoundException('Rollover batch not found');
    }

    const childIds = [...new Set(batch.errors.map(error => error.childScoutId))];
    const children = childIds.length
      ? await prisma.childScout.findMany({
          where: { id: { in: childIds } },
          select: { id: true, firstName: true, lastName: true },
        })
      : [];

    const childMap = new Map(children.map(child => [child.id, `${child.firstName} ${child.lastName}`]));

    return {
      id: batch.id,
      targetYear: batch.targetYear,
      status: batch.status,
      executedAt: batch.executedAt.toISOString(),
      executedBy: batch.executedBy,
      densProcessed: batch.densProcessed,
      childrenProcessed: batch.childrenProcessed,
      childrenFailed: batch.childrenFailed,
      isDryRun: batch.isDryRun,
      errors: batch.errors.map(error => ({
        childRankId: error.childScoutId,
        childName: childMap.get(error.childScoutId) ?? 'Unknown child',
        errorMessage: error.errorMessage,
      })),
    };
  }
}