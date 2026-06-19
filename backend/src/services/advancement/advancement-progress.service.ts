import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import prisma from '../../utils/prisma';
import { AuthorizationService } from '../role-scope/authorization.service';

type CachedProgress = {
  expiresAt: number;
  value: unknown;
};

@Injectable()
export class AdvancementProgressService {
  private readonly progressCache = new Map<string, CachedProgress>();
  private readonly cacheTtlMs = 30_000;

  constructor(private readonly authorizationService: AuthorizationService) {}

  invalidateChildCache(childScoutId: string): void {
    this.progressCache.delete(childScoutId);
  }

  async getChildAdvancementProgress(
    childScoutId: string,
    userId: string,
    authTier: string,
  ) {
    const cachedProgress = this.progressCache.get(childScoutId);
    if (cachedProgress && cachedProgress.expiresAt > Date.now()) {
      return cachedProgress.value;
    }

    if (authTier !== 'ADMIN') {
      const canAccess = await this.authorizationService.canAccessChild(
        userId,
        childScoutId,
        authTier,
      );
      if (!canAccess) {
        throw new ForbiddenException('You do not have access to this Cub Scout');
      }
    }

    const childScout = await prisma.childScout.findFirst({
      where: { id: childScoutId, deletedAt: null },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        currentRank: true,
      },
    });

    if (!childScout) {
      throw new NotFoundException('Cub Scout not found');
    }

    const rank = await prisma.rank.findFirst({
      where: {
        rankLevel: childScout.currentRank,
        isActive: true,
      },
      select: {
        id: true,
        rankLevel: true,
        requiredAdventureCount: true,
        electiveAdventureCount: true,
      },
    });

    if (!rank) {
      throw new NotFoundException('Rank catalog not found for this Cub Scout');
    }

    const adventures = await prisma.adventure.findMany({
      where: {
        rankId: rank.id,
        isActive: true,
      },
      orderBy: { displayOrder: 'asc' },
      include: {
        requirements: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    const progressRows = await prisma.requirementProgress.findMany({
      where: {
        childScoutId,
      },
      select: {
        requirementId: true,
        completedAt: true,
        completedBy: true,
        completionType: true,
        scoutbookStatus: true,
      },
    });

    const progressByRequirement = new Map(
      progressRows.map(row => [row.requirementId, row]),
    );

    const adventureProgress = adventures.map(adventure => {
      const requirements = adventure.requirements.map(req => {
        const progress = progressByRequirement.get(req.id);
        return {
          id: req.id,
          displayOrder: req.displayOrder,
          requirementText: req.requirementText,
          isCompleted: !!progress,
          completedAt: progress?.completedAt?.toISOString(),
          completedBy: progress?.completedBy,
          completionType: progress?.completionType,
          scoutbookStatus: progress?.scoutbookStatus,
        };
      });

      const completedRequirements = requirements.filter(r => r.isCompleted).length;
      const totalRequirements = requirements.length;

      return {
        id: adventure.id,
        name: adventure.name,
        classification: adventure.classification,
        totalRequirements,
        completedRequirements,
        percentComplete:
          totalRequirements === 0
            ? 0
            : Math.round((completedRequirements / totalRequirements) * 100),
        isComplete: totalRequirements > 0 && completedRequirements === totalRequirements,
        requirements,
      };
    });

    const requiredCompleted = adventureProgress.filter(
      a => a.classification === 'REQUIRED' && a.isComplete,
    ).length;
    const electiveCompleted = adventureProgress.filter(
      a => a.classification === 'ELECTIVE' && a.isComplete,
    ).length;

    const result = {
      childScout: {
        id: childScout.id,
        name: `${childScout.firstName} ${childScout.lastName}`,
        currentRank: childScout.currentRank,
      },
      rankProgress: {
        rankLevel: rank.rankLevel,
        requiredAdventuresNeeded: rank.requiredAdventureCount,
        requiredAdventuresCompleted: requiredCompleted,
        electiveAdventuresNeeded: rank.electiveAdventureCount,
        electiveAdventuresCompleted: electiveCompleted,
        isRankEligible:
          requiredCompleted >= rank.requiredAdventureCount &&
          electiveCompleted >= rank.electiveAdventureCount,
      },
      adventures: adventureProgress,
    };

    this.progressCache.set(childScoutId, {
      expiresAt: Date.now() + this.cacheTtlMs,
      value: result,
    });

    return result;
  }
}
