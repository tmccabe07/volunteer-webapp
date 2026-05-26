import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AwardState, Prisma, ReconciliationStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import prisma from '../../utils/prisma';
import { AuthorizationService } from '../role-scope/authorization.service';
import { assertValidAwardTransition } from '../../utils/award-state-transition.validator';

type AwardQueueType = 'TO_PURCHASE' | 'TO_AWARD' | 'SCOUTBOOK_FOLLOW_UP';

@Injectable()
export class AwardFulfillmentService {
  constructor(private readonly authorizationService: AuthorizationService) {}

  private getAwardItemName(award: {
    adventure?: { name: string } | null;
    specialAward?: { name: string } | null;
  }): string {
    return award.specialAward?.name ?? award.adventure?.name ?? 'Unknown award';
  }

  private async canViewAsPurchaseCoordinator(userId: string, authTier: string): Promise<boolean> {
    if (authTier === 'ADMIN') {
      return true;
    }

    if (authTier !== 'LEADER') {
      return false;
    }

    const advancementRoles = await prisma.volunteerRole.findMany({
      where: {
        deletedAt: null,
        roleType: 'COMMITTEE',
        OR: [{ specialty: 'advancement' }, { name: { contains: 'Advancement Chair' } }],
      },
      select: { id: true },
    });

    const roleIds =
      advancementRoles.length > 0
        ? advancementRoles.map((role) => role.id)
        : (
            await prisma.volunteerRole.findMany({
              where: {
                deletedAt: null,
                roleType: 'COMMITTEE',
                specialty: 'chair',
              },
              select: { id: true },
            })
          ).map((role) => role.id);

    if (roleIds.length === 0) {
      return false;
    }

    const assignment = await prisma.volunteerToRole.findFirst({
      where: {
        volunteerId: userId,
        removedAt: null,
        roleId: { in: roleIds },
      },
      select: { id: true },
    });

    return !!assignment;
  }

  private async ensureInventoryItemAndAdjustForPurchase(
    tx: Prisma.TransactionClient,
    award: {
      childScout: { currentRank: any };
      quantityNeeded: number;
      adventure?: { name: string } | null;
      specialAward?: { name: string } | null;
    },
    userId: string,
    linkedBatchId?: string,
    inventoryItemId?: string,
  ): Promise<void> {
    const itemName = this.getAwardItemName(award);

    let resolvedInventoryItemId = inventoryItemId;
    if (!resolvedInventoryItemId) {
      const inventoryItem = await tx.inventoryItem.upsert({
        where: {
          itemName_rankLevel: {
            itemName,
            rankLevel: award.childScout.currentRank,
          },
        },
        update: {
          onHandQuantity: {
            increment: award.quantityNeeded,
          },
        },
        create: {
          itemName,
          rankLevel: award.childScout.currentRank,
          onHandQuantity: award.quantityNeeded,
        },
        select: {
          id: true,
        },
      });

      resolvedInventoryItemId = inventoryItem.id;
    } else {
      await tx.inventoryItem.update({
        where: { id: resolvedInventoryItemId },
        data: {
          onHandQuantity: {
            increment: award.quantityNeeded,
          },
        },
      });
    }

    await tx.inventoryAdjustment.create({
      data: {
        inventoryItemId: resolvedInventoryItemId,
        quantityChange: award.quantityNeeded,
        reason: 'Purchase',
        adjustedBy: userId,
        linkedBatchId,
        notes: 'Inventory increased via award purchase transition',
      },
    });
  }

  private async adjustInventoryForDistribution(
    tx: Prisma.TransactionClient,
    award: {
      childScout: { currentRank: any };
      quantityNeeded: number;
      adventure?: { name: string } | null;
      specialAward?: { name: string } | null;
    },
    userId: string,
    linkedBatchId?: string,
    inventoryItemId?: string,
  ): Promise<void> {
    const itemName = this.getAwardItemName(award);

    const inventoryItem = inventoryItemId
      ? await tx.inventoryItem.findUnique({
          where: { id: inventoryItemId },
          select: {
            id: true,
            onHandQuantity: true,
          },
        })
      : await tx.inventoryItem.findUnique({
          where: {
            itemName_rankLevel: {
              itemName,
              rankLevel: award.childScout.currentRank,
            },
          },
          select: {
            id: true,
            onHandQuantity: true,
          },
        });

    if (!inventoryItem) {
      throw new BadRequestException(
        `No inventory item found for ${itemName} (${award.childScout.currentRank}). Add inventory or purchase first.`,
      );
    }

    if (inventoryItem.onHandQuantity < award.quantityNeeded) {
      throw new BadRequestException(
        `Insufficient inventory for ${itemName}. On hand: ${inventoryItem.onHandQuantity}, needed: ${award.quantityNeeded}.`,
      );
    }

    await tx.inventoryItem.update({
      where: { id: inventoryItem.id },
      data: {
        onHandQuantity: {
          decrement: award.quantityNeeded,
        },
      },
    });

    await tx.inventoryAdjustment.create({
      data: {
        inventoryItemId: inventoryItem.id,
        quantityChange: -award.quantityNeeded,
        reason: 'Distribution',
        adjustedBy: userId,
        linkedBatchId,
        notes: 'Inventory decremented via award distribution transition',
      },
    });
  }

  private async assertOnHandInventoryAvailable(
    tx: Prisma.TransactionClient,
    award: {
      childScout: { currentRank: any };
      quantityNeeded: number;
      adventure?: { name: string } | null;
      specialAward?: { name: string } | null;
    },
    inventoryItemId?: string,
  ): Promise<void> {
    const itemName = this.getAwardItemName(award);

    const inventoryItem = inventoryItemId
      ? await tx.inventoryItem.findUnique({
          where: { id: inventoryItemId },
          select: { id: true, onHandQuantity: true },
        })
      : await tx.inventoryItem.findUnique({
          where: {
            itemName_rankLevel: {
              itemName,
              rankLevel: award.childScout.currentRank,
            },
          },
          select: { id: true, onHandQuantity: true },
        });

    if (!inventoryItem) {
      throw new BadRequestException(
        `No on-hand inventory found for ${itemName} (${award.childScout.currentRank}). Purchase first or select a valid inventory item.`,
      );
    }

    if (inventoryItem.onHandQuantity < award.quantityNeeded) {
      throw new BadRequestException(
        `Insufficient on-hand inventory for ${itemName}. On hand: ${inventoryItem.onHandQuantity}, needed: ${award.quantityNeeded}.`,
      );
    }
  }

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
      queueType?: AwardQueueType;
    },
  ) {
    if (authTier === 'PARENT') {
      throw new ForbiddenException('Only leaders or admins can view awards');
    }

    const rows = await prisma.awardItem.findMany({
      where: {
        ...(filters.queueType === 'TO_PURCHASE'
          ? { currentState: AwardState.APPROVED }
          : filters.queueType === 'TO_AWARD'
          ? { currentState: AwardState.PURCHASED }
          : filters.queueType === 'SCOUTBOOK_FOLLOW_UP'
          ? { currentState: AwardState.DISTRIBUTED }
          : {}),
        ...(filters.state ? { currentState: filters.state } : {}),
        ...(filters.childScoutId ? { childScoutId: filters.childScoutId } : {}),
        ...(filters.adventureId ? { adventureId: filters.adventureId } : {}),
        childScout: {
          deletedAt: null,
          denMemberships: {
            some: {
              validTo: null,
            },
          },
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
    const canViewPurchaseQueueAsCoordinator =
      filters.queueType === 'TO_PURCHASE' && (await this.canViewAsPurchaseCoordinator(userId, authTier));

    if (
      authTier === 'LEADER' &&
      !canViewPurchaseQueueAsCoordinator &&
      !(await this.authorizationService.hasPackScope(userId))
    ) {
      const checks = await Promise.all(
        rows.map((row) => this.authorizationService.canAccessChild(userId, row.childScoutId, authTier)),
      );
      filteredRows = rows.filter((_, index) => checks[index]);
    }

    const purchaseSummaryMap = new Map<
      string,
      {
        denId: string | null;
        denName: string;
        awardName: string;
        rankLevel: string;
        quantity: number;
        onHandQuantity: number;
      }
    >();

    const inventoryCache = new Map<string, number>();

    for (const row of filteredRows) {
      if (row.currentState !== AwardState.APPROVED) {
        continue;
      }

      const denMembership = row.childScout.denMemberships[0];
      const denId = denMembership?.den.id ?? null;
      const denName = denMembership?.den.name ?? 'Pack-Wide';
      const awardName = row.specialAward?.name ?? row.adventure?.name ?? 'Unknown award';
      const rankLevel = String(row.childScout.currentRank);
      const inventoryKey = `${awardName}::${rankLevel}`;

      if (!inventoryCache.has(inventoryKey)) {
        const inventoryItem = await prisma.inventoryItem.findUnique({
          where: {
            itemName_rankLevel: {
              itemName: awardName,
              rankLevel: row.childScout.currentRank,
            },
          },
          select: { onHandQuantity: true },
        });
        inventoryCache.set(inventoryKey, inventoryItem?.onHandQuantity ?? 0);
      }

      const summaryKey = `${denId ?? 'PACK'}::${awardName}::${rankLevel}`;

      const existing = purchaseSummaryMap.get(summaryKey);
      if (existing) {
        existing.quantity += row.quantityNeeded;
      } else {
        purchaseSummaryMap.set(summaryKey, {
          denId,
          denName,
          awardName,
          rankLevel,
          quantity: row.quantityNeeded,
          onHandQuantity: inventoryCache.get(inventoryKey) || 0,
        });
      }
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
        den: row.childScout.denMemberships[0]
          ? {
              id: row.childScout.denMemberships[0].den.id,
              name: row.childScout.denMemberships[0].den.name,
              denNumber: row.childScout.denMemberships[0].den.denNumber,
            }
          : null,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      })),
      purchaseSummary:
        filters.queueType === 'TO_PURCHASE'
          ? Array.from(purchaseSummaryMap.values())
              .map((item) => ({
                ...item,
                netToPurchase: Math.max(0, item.quantity - item.onHandQuantity),
              }))
              .sort((a, b) => {
              if (a.denName === b.denName) {
                return a.awardName.localeCompare(b.awardName);
              }
              return a.denName.localeCompare(b.denName);
            })
          : undefined,
    };
  }

  async transitionAward(
    awardId: string,
    input: {
      toState: AwardState;
      notes?: string;
      batchId?: string;
      inventoryItemId?: string;
      procurementSource?: 'PURCHASE' | 'ON_HAND';
    },
    userId: string,
    authTier: string,
  ) {
    const award = await prisma.awardItem.findUnique({
      where: { id: awardId },
      include: {
        childScout: {
          select: {
            id: true,
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
    });

    if (!award) {
      throw new NotFoundException('Award item not found');
    }

    await this.assertCanAccessAward(userId, authTier, award.childScout.id);

    assertValidAwardTransition(award.currentState, input.toState);

    if (award.currentState === AwardState.ELIGIBLE && input.toState === AwardState.APPROVED) {
      await this.assertAwardEligibility(award.id);
    }

    const updatedAward = await prisma.$transaction(async (tx) => {
      const nextAward = await tx.awardItem.update({
        where: { id: award.id },
        data: {
          currentState: input.toState,
        },
      });

      await tx.awardStateHistory.create({
        data: {
          awardItemId: award.id,
          fromState: award.currentState,
          toState: input.toState,
          changedBy: userId,
          notes: input.notes,
          batchId: input.batchId,
        },
      });

      if (input.toState === AwardState.PURCHASED) {
        if ((input.procurementSource || 'PURCHASE') === 'ON_HAND') {
          await this.assertOnHandInventoryAvailable(tx, award, input.inventoryItemId);
        } else {
          await this.ensureInventoryItemAndAdjustForPurchase(
            tx,
            award,
            userId,
            input.batchId,
            input.inventoryItemId,
          );
        }
      }

      if (input.toState === AwardState.DISTRIBUTED) {
        await this.adjustInventoryForDistribution(
          tx,
          award,
          userId,
          input.batchId,
          input.inventoryItemId,
        );
      }

      return nextAward;
    });

    const history = await prisma.awardStateHistory.findMany({
      where: { awardItemId: award.id },
      orderBy: { changedAt: 'desc' },
      take: 10,
    });

    return {
      id: updatedAward.id,
      currentState: updatedAward.currentState,
      requiresScoutbookAwardFollowUp: updatedAward.currentState === AwardState.DISTRIBUTED,
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
    input: {
      awardIds: string[];
      toState: AwardState;
      notes?: string;
      inventoryItemId?: string;
      procurementSource?: 'PURCHASE' | 'ON_HAND';
    },
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
              inventoryItemId: input.inventoryItemId,
              procurementSource: input.procurementSource,
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
