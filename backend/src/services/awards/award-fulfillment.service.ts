import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AwardState, ReconciliationStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import prisma from '../../utils/prisma';
import { AuthorizationService } from '../role-scope/authorization.service';
import { assertValidAwardTransition } from '../../utils/award-state-transition.validator';

@Injectable()
export class AwardFulfillmentService {
  constructor(private readonly authorizationService: AuthorizationService) {}

  private async assertCanAccessAward(
    userId: string,
    authTier: string,
    childScoutId: string,
  ): Promise<void> {
    if (authTier === 'ADMIN') {
      return;
    }

    if (authTier !== 'LEADER') {
      throw new ForbiddenException('Only leaders or admins can manage awards');
    }

    const canAccess = await this.authorizationService.canAccessChild(userId, childScoutId, authTier);
    if (!canAccess) {
      throw new ForbiddenException('You do not have access to this award item');
    }
  }

  private async assertAwardEligibility(awardItemId: string): Promise<void> {
    const award = await prisma.awardItem.findUnique({
      where: { id: awardItemId },
      select: {
        id: true,
        childScoutId: true,
        adventureId: true,
        specialAwardId: true,
      },
    });

    if (!award) {
      throw new NotFoundException('Award item not found');
    }

    if (award.specialAwardId) {
      return;
    }

    if (!award.adventureId) {
      throw new BadRequestException('Award item is missing both adventure and special award references');
    }

    const [totalRequirements, reconciledRequirements] = await Promise.all([
      prisma.requirement.count({ where: { adventureId: award.adventureId } }),
      prisma.requirementProgress.count({
        where: {
          childScoutId: award.childScoutId,
          adventureId: award.adventureId,
          scoutbookStatus: {
            in: [ReconciliationStatus.ENTERED, ReconciliationStatus.VERIFIED],
          },
        },
      }),
    ]);

    if (totalRequirements === 0 || reconciledRequirements < totalRequirements) {
      throw new BadRequestException(
        'Award is not eligible for approval until all adventure requirements are reconciled',
      );
    }
  }

  async getAwards(
    userId: string,
    authTier: string,
    filters: {
      state?: AwardState;
      childScoutId?: string;
      adventureId?: string;
      denId?: string;
    },
  ) {
    if (authTier === 'PARENT') {
      throw new ForbiddenException('Only leaders or admins can view awards');
    }

    const rows = await prisma.awardItem.findMany({
      where: {
        ...(filters.state ? { currentState: filters.state } : {}),
        ...(filters.childScoutId ? { childScoutId: filters.childScoutId } : {}),
        ...(filters.adventureId ? { adventureId: filters.adventureId } : {}),
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
          select: {
            id: true,
            firstName: true,
            lastName: true,
            currentRank: true,
          },
        },
        adventure: {
          select: {
            name: true,
          },
        },
        specialAward: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    let filteredRows = rows;
    if (authTier === 'LEADER' && !(await this.authorizationService.hasPackScope(userId))) {
      const checks = await Promise.all(
        rows.map((row) => this.authorizationService.canAccessChild(userId, row.childScoutId, authTier)),
      );
      filteredRows = rows.filter((_, index) => checks[index]);
    }

    return {
      data: filteredRows.map((row) => ({
        id: row.id,
        childScout: {
          id: row.childScout.id,
          name: `${row.childScout.firstName} ${row.childScout.lastName}`,
          currentRank: row.childScout.currentRank,
        },
        award: {
          type: row.specialAwardId ? 'SPECIAL' : 'ADVENTURE',
          name: row.specialAward?.name ?? row.adventure?.name ?? 'Unknown award',
        },
        currentState: row.currentState,
        quantityNeeded: row.quantityNeeded,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      })),
    };
  }

  async transitionAward(
    awardId: string,
    input: { toState: AwardState; notes?: string; batchId?: string },
    userId: string,
    authTier: string,
  ) {
    const award = await prisma.awardItem.findUnique({
      where: { id: awardId },
      select: {
        id: true,
        childScoutId: true,
        currentState: true,
      },
    });

    if (!award) {
      throw new NotFoundException('Award item not found');
    }

    await this.assertCanAccessAward(userId, authTier, award.childScoutId);

    assertValidAwardTransition(award.currentState, input.toState);

    if (award.currentState === AwardState.ELIGIBLE && input.toState === AwardState.APPROVED) {
      await this.assertAwardEligibility(award.id);
    }

    const [updatedAward] = await prisma.$transaction([
      prisma.awardItem.update({
        where: { id: award.id },
        data: {
          currentState: input.toState,
        },
      }),
      prisma.awardStateHistory.create({
        data: {
          awardItemId: award.id,
          fromState: award.currentState,
          toState: input.toState,
          changedBy: userId,
          notes: input.notes,
          batchId: input.batchId,
        },
      }),
    ]);

    const history = await prisma.awardStateHistory.findMany({
      where: { awardItemId: award.id },
      orderBy: { changedAt: 'desc' },
      take: 10,
    });

    return {
      id: updatedAward.id,
      currentState: updatedAward.currentState,
      history: history.map((item) => ({
        fromState: item.fromState,
        toState: item.toState,
        changedAt: item.changedAt.toISOString(),
        changedBy: item.changedBy,
        notes: item.notes ?? '',
      })),
    };
  }

  async batchTransition(
    input: { awardIds: string[]; toState: AwardState; notes?: string },
    userId: string,
    authTier: string,
  ) {
    if (authTier === 'PARENT') {
      throw new ForbiddenException('Only leaders or admins can transition awards');
    }

    const uniqueIds = [...new Set(input.awardIds)];
    const batchId = randomUUID();

    const results = await Promise.all(
      uniqueIds.map(async (awardId) => {
        try {
          await this.transitionAward(
            awardId,
            {
              toState: input.toState,
              notes: input.notes,
              batchId,
            },
            userId,
            authTier,
          );

          return {
            awardId,
            success: true,
          };
        } catch (error: any) {
          return {
            awardId,
            success: false,
            error: error?.message ?? 'Transition failed',
          };
        }
      }),
    );

    const successCount = results.filter((result) => result.success).length;

    return {
      batchId,
      successCount,
      failedCount: results.length - successCount,
      results,
    };
  }
}
