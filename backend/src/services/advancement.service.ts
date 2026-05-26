import { Injectable, NotFoundException } from '@nestjs/common';
import { RankLevel } from '@prisma/client';
import prisma from '../utils/prisma';

@Injectable()
export class AdvancementService {
  private readonly cacheTtlMs = 60_000;
  private readonly cache = new Map<string, { expiresAt: number; data: unknown }>();

  private getCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  private setCache(key: string, data: unknown): void {
    this.cache.set(key, {
      expiresAt: Date.now() + this.cacheTtlMs,
      data,
    });
  }

  async getRanks() {
    const cacheKey = 'catalog:ranks';
    const cached = this.getCache<any[]>(cacheKey);
    if (cached) {
      return { data: cached };
    }

    const ranks = await prisma.rank.findMany({
      where: { isActive: true },
      orderBy: [{ displayOrder: 'asc' }],
      select: {
        id: true,
        rankLevel: true,
        displayName: true,
        displayOrder: true,
        requiredAdventureCount: true,
        electiveAdventureCount: true,
      },
    });

    this.setCache(cacheKey, ranks);
    return { data: ranks };
  }

  async getAdventures(rankLevel?: RankLevel) {
    const cacheKey = `catalog:adventures:${rankLevel || 'ALL'}`;
    const cached = this.getCache<any[]>(cacheKey);
    if (cached) {
      return { data: cached };
    }

    const adventures = await prisma.adventure.findMany({
      where: {
        isActive: true,
        rank: {
          isActive: true,
          ...(rankLevel ? { rankLevel } : {}),
        },
      },
      orderBy: [{ rank: { displayOrder: 'asc' } }, { displayOrder: 'asc' }],
      include: {
        rank: {
          select: {
            rankLevel: true,
          },
        },
      },
    });

    const data = adventures.map(adventure => ({
      id: adventure.id,
      rankId: adventure.rankId,
      rankLevel: adventure.rank.rankLevel,
      name: adventure.name,
      description: adventure.description ?? undefined,
      classification: adventure.classification,
      displayOrder: adventure.displayOrder,
    }));

    this.setCache(cacheKey, data);
    return { data };
  }

  async getRequirements(adventureId?: string) {
    const cacheKey = `catalog:requirements:${adventureId || 'ALL'}`;
    const cached = this.getCache<any[]>(cacheKey);
    if (cached) {
      return { data: cached };
    }

    const requirements = await prisma.requirement.findMany({
      where: {
        ...(adventureId ? { adventureId } : {}),
        adventure: {
          isActive: true,
          rank: {
            isActive: true,
          },
        },
      },
      orderBy: [
        { adventure: { rank: { displayOrder: 'asc' } } },
        { adventure: { displayOrder: 'asc' } },
        { displayOrder: 'asc' },
      ],
      include: {
        adventure: {
          select: {
            name: true,
            rank: {
              select: {
                rankLevel: true,
              },
            },
          },
        },
      },
    });

    const data = requirements.map(requirement => ({
      id: requirement.id,
      adventureId: requirement.adventureId,
      adventureName: requirement.adventure.name,
      rankLevel: requirement.adventure.rank.rankLevel,
      displayOrder: requirement.displayOrder,
      requirementText: requirement.requirementText,
    }));

    this.setCache(cacheKey, data);
    return { data };
  }

  async getAdventuresForRank(rankLevel: string) {
    const normalizedRank = rankLevel.toUpperCase() as RankLevel;

    const adventures = await prisma.adventure.findMany({
      where: {
        isActive: true,
        rank: {
          rankLevel: normalizedRank,
          isActive: true,
        },
      },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      include: {
        requirements: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    return {
      rankLevel: normalizedRank,
      adventures: adventures.map(adventure => ({
        id: adventure.id,
        rankId: adventure.rankId,
        name: adventure.name,
        description: adventure.description ?? undefined,
        classification: adventure.classification,
        displayOrder: adventure.displayOrder,
        requirements: adventure.requirements.map(requirement => ({
          id: requirement.id,
          adventureId: requirement.adventureId,
          adventureName: adventure.name,
          displayOrder: requirement.displayOrder,
          requirementText: requirement.requirementText,
        })),
      })),
    };
  }

  async getRequirement(requirementId: string) {
    const requirement = await prisma.requirement.findUnique({
      where: { id: requirementId },
      include: {
        adventure: {
          select: {
            id: true,
            name: true,
            rank: {
              select: {
                rankLevel: true,
              },
            },
          },
        },
      },
    });

    if (!requirement) {
      throw new NotFoundException('Requirement not found');
    }

    return {
      id: requirement.id,
      adventureId: requirement.adventure.id,
      adventureName: requirement.adventure.name,
      rankLevel: requirement.adventure.rank.rankLevel,
      displayOrder: requirement.displayOrder,
      requirementText: requirement.requirementText,
    };
  }
}
