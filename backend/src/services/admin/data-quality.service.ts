import { Injectable } from '@nestjs/common';
import { AwardState, ReconciliationStatus } from '@prisma/client';
import prisma from '../../utils/prisma';

export interface DataQualityReport {
  summary: {
    olderThanDays: number;
    duplicateLinkCount: number;
    staleApprovalCount: number;
    awardReconciliationGapCount: number;
  };
  duplicateLinks: Array<{
    parentId: string;
    parentName: string;
    childScoutId: string;
    childName: string;
    relationshipType: string | null;
    status: string;
    duplicateCount: number;
  }>;
  staleApprovals: Array<{
    requirementProgressId: string;
    childScoutId: string;
    childName: string;
    adventureName: string;
    requirementText: string;
    completedAt: string;
    daysOld: number;
  }>;
  awardReconciliationGaps: Array<{
    awardItemId: string;
    childScoutId: string;
    childName: string;
    awardName: string;
    currentState: AwardState;
    completionRatio: string;
  }>;
}

@Injectable()
export class DataQualityService {
  async getReport(olderThanDays = 30): Promise<DataQualityReport> {
    const thresholdDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

    const duplicateLinks = await prisma.parentChildLink.groupBy({
      by: ['parentId', 'childScoutId', 'status', 'relationshipType'],
      _count: {
        id: true,
      },
      having: {
        id: {
          _count: {
            gt: 1,
          },
        },
      },
    });

    const duplicateLinkRows = await Promise.all(
      duplicateLinks.map(async link => {
        const [parent, child] = await Promise.all([
          prisma.volunteer.findUnique({
            where: { id: link.parentId },
            select: { name: true },
          }),
          prisma.childScout.findUnique({
            where: { id: link.childScoutId },
            select: { firstName: true, lastName: true },
          }),
        ]);

        return {
          parentId: link.parentId,
          parentName: parent?.name || 'Unknown parent',
          childScoutId: link.childScoutId,
          childName: child ? `${child.firstName} ${child.lastName}` : 'Unknown child',
          relationshipType: link.relationshipType,
          status: link.status,
          duplicateCount: link._count.id,
        };
      }),
    );

    const staleRows = await prisma.requirementProgress.findMany({
      where: {
        scoutbookStatus: ReconciliationStatus.PENDING,
        completedAt: {
          lte: thresholdDate,
        },
      },
      include: {
        childScout: {
          select: { firstName: true, lastName: true },
        },
        requirement: {
          select: {
            requirementText: true,
            adventure: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { completedAt: 'asc' },
    });

    const awardCandidates = await prisma.awardItem.findMany({
      where: {
        adventureId: {
          not: null,
        },
        currentState: {
          in: [AwardState.APPROVED, AwardState.PURCHASED, AwardState.DISTRIBUTED],
        },
      },
      select: {
        id: true,
        childScoutId: true,
        currentState: true,
        childScout: {
          select: { firstName: true, lastName: true },
        },
        adventure: {
          select: {
            id: true,
            name: true,
            requirements: {
              select: { id: true },
            },
          },
        },
      },
    });

    const awardReconciliationGaps = [] as DataQualityReport['awardReconciliationGaps'];
    for (const award of awardCandidates) {
      if (!award.adventure) {
        continue;
      }

      const [totalRequirements, reconciledRequirements] = await Promise.all([
        prisma.requirement.count({ where: { adventureId: award.adventure.id } }),
        prisma.requirementProgress.count({
          where: {
            childScoutId: award.childScoutId,
            adventureId: award.adventure.id,
            scoutbookStatus: {
              in: [ReconciliationStatus.ENTERED, ReconciliationStatus.VERIFIED],
            },
          },
        }),
      ]);

      if (totalRequirements > 0 && reconciledRequirements < totalRequirements) {
        awardReconciliationGaps.push({
          awardItemId: award.id,
          childScoutId: award.childScoutId,
          childName: `${award.childScout.firstName} ${award.childScout.lastName}`,
          awardName: award.adventure.name,
          currentState: award.currentState,
          completionRatio: `${reconciledRequirements}/${totalRequirements}`,
        });
      }
    }

    return {
      summary: {
        olderThanDays,
        duplicateLinkCount: duplicateLinkRows.length,
        staleApprovalCount: staleRows.length,
        awardReconciliationGapCount: awardReconciliationGaps.length,
      },
      duplicateLinks: duplicateLinkRows,
      staleApprovals: staleRows.map(row => ({
        requirementProgressId: row.id,
        childScoutId: row.childScoutId,
        childName: `${row.childScout.firstName} ${row.childScout.lastName}`,
        adventureName: row.requirement.adventure.name,
        requirementText: row.requirement.requirementText,
        completedAt: row.completedAt.toISOString(),
        daysOld: Math.floor((Date.now() - row.completedAt.getTime()) / (24 * 60 * 60 * 1000)),
      })),
      awardReconciliationGaps,
    };
  }
}