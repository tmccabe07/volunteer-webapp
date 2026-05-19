/**
 * BadgeTierService
 * 
 * Handles badge tier threshold checking, tier upgrades/downgrades,
 * and badge tier history tracking per User Story 3
 */

import { Injectable } from '@nestjs/common';
import prisma from '../utils/prisma';
import { NotificationService } from './notification.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class BadgeTierService {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * Get all badge tier definitions
   * Ordered by displayOrder (ascending)
   */
  async getAllTiers() {
    return await prisma.badgeTier.findMany({
      orderBy: {
        displayOrder: 'asc',
      },
    });
  }

  /**
   * Determine badge tier for given point total
   * Returns tier name or null if below minimum threshold
   */
  async calculateBadgeTierForPoints(totalPoints: number): Promise<string | null> {
    const tiers = await this.getAllTiers();

    // Find the appropriate tier
    for (let i = tiers.length - 1; i >= 0; i--) {
      const tier = tiers[i];
      if (
        totalPoints >= tier.minPoints &&
        (tier.maxPoints === null || totalPoints <= tier.maxPoints)
      ) {
        return tier.tierName;
      }
    }

    return null; // Below minimum tier threshold
  }

  /**
   * Check and update badge tier for a volunteer
   * Records tier change in history if tier has changed
   * 
   * @param volunteerId - ID of volunteer to check
   * @param newTotalPoints - Updated point total after point event
   * @returns true if tier changed, false otherwise
   */
  async checkAndUpdateBadgeTier(
    volunteerId: string,
    newTotalPoints: number
  ): Promise<boolean> {
    // Get current badge tier from leaderboard cache
    const leaderboardEntry = await prisma.leaderboardCache.findUnique({
      where: { volunteerId },
    });

    const currentTier = leaderboardEntry?.badgeTier || null;
    const newTier = await this.calculateBadgeTierForPoints(newTotalPoints);

    // Check if tier has changed
    if (currentTier === newTier) {
      return false; // No change
    }

    // Determine if this is an upgrade (higher displayOrder) or downgrade
    let isUpgrade = false;
    if (newTier && currentTier) {
      const currentTierData = await prisma.badgeTier.findUnique({
        where: { tierName: currentTier },
      });
      const newTierData = await prisma.badgeTier.findUnique({
        where: { tierName: newTier },
      });
      
      if (currentTierData && newTierData) {
        isUpgrade = newTierData.displayOrder > currentTierData.displayOrder;
      }
    } else if (newTier && !currentTier) {
      // First tier achievement is always an upgrade
      isUpgrade = true;
    }

    // Record tier change in history
    await prisma.badgeTierHistory.create({
      data: {
        volunteerId,
        oldTier: currentTier,
        newTier: newTier || '', // Empty string if dropped below threshold
        pointsAtChange: newTotalPoints,
      },
    });

    // Update leaderboard cache with new tier
    await prisma.leaderboardCache.update({
      where: { volunteerId },
      data: {
        badgeTier: newTier,
      },
    });

    // Create BADGE_ACHIEVEMENT notification only for upgrades (User Story 10)
    if (newTier && isUpgrade) {
      const message = `Congratulations! You've achieved the ${newTier} badge tier with ${newTotalPoints} points!`;
      await this.notificationService.createNotification({
        volunteerId,
        type: NotificationType.BADGE_ACHIEVEMENT,
        message,
      });
    }

    return true; // Tier changed
  }

  /**
   * Get badge tier progression history for a volunteer
   * Returns all tier changes ordered by achievement date
   */
  async getTierHistory(volunteerId: string) {
    return await prisma.badgeTierHistory.findMany({
      where: { volunteerId },
      orderBy: {
        achievedAt: 'desc',
      },
    });
  }

  /**
   * Get current badge tier for a volunteer
   */
  async getCurrentTier(volunteerId: string): Promise<string | null> {
    const leaderboardEntry = await prisma.leaderboardCache.findUnique({
      where: { volunteerId },
    });

    return leaderboardEntry?.badgeTier || null;
  }

  /**
   * Get detailed badge tier information including next tier progression
   * Returns current tier details, next tier info, and points needed
   */
  async getBadgeTierInfo(volunteerId: string, totalPoints: number) {
    const allTiers = await this.getAllTiers();
    // Calculate tier based on current points, not just leaderboard cache
    const currentBadgeTier = await this.calculateBadgeTierForPoints(totalPoints);

    type TierType = typeof allTiers[0];
    let currentTierDetails: TierType | undefined = undefined;
    let nextTier: TierType | undefined = undefined;
    let pointsToNextTier: number | null = null;

    if (currentBadgeTier) {
      currentTierDetails = allTiers.find(t => t.tierName === currentBadgeTier);
      if (currentTierDetails) {
        // Find the next tier (higher displayOrder)
        nextTier = allTiers.find(t => t.displayOrder === currentTierDetails!.displayOrder + 1);
      }
    } else {
      // No tier qualifies (below minimum), use the first tier as next tier
      nextTier = allTiers[0];
    }

    if (nextTier) {
      pointsToNextTier = nextTier.minPoints - totalPoints;
    }

    return {
      current: currentBadgeTier,
      currentTierDetails: currentTierDetails ? {
        tierName: currentTierDetails.tierName,
        minPoints: currentTierDetails.minPoints,
        maxPoints: currentTierDetails.maxPoints,
        badgeColor: currentTierDetails.badgeColor
      } : null,
      nextTier: nextTier ? {
        tierName: nextTier.tierName,
        minPoints: nextTier.minPoints,
        badgeColor: nextTier.badgeColor
      } : null,
      pointsToNextTier
    };
  }

  /**
   * Seed default badge tiers on initial setup
   * Only creates tiers if none exist
   */
  async seedDefaultTiers(): Promise<void> {
    const existingCount = await prisma.badgeTier.count();

    if (existingCount > 0) {
      return; // Tiers already seeded
    }

    const defaultTiers = [
      {
        tierName: 'Bronze',
        minPoints: 20,
        maxPoints: 39,
        displayOrder: 1,
        badgeColor: '#CD7F32',
        iconPath: null,
      },
      {
        tierName: 'Silver',
        minPoints: 40,
        maxPoints: 59,
        displayOrder: 2,
        badgeColor: '#C0C0C0',
        iconPath: null,
      },
      {
        tierName: 'Gold',
        minPoints: 60,
        maxPoints: 79,
        displayOrder: 3,
        badgeColor: '#FFD700',
        iconPath: null,
      },
      {
        tierName: 'Platinum',
        minPoints: 80,
        maxPoints: 99,
        displayOrder: 4,
        badgeColor: '#E5E4E2',
        iconPath: null,
      },
      {
        tierName: 'Diamond',
        minPoints: 100,
        maxPoints: null, // No upper limit
        displayOrder: 5,
        badgeColor: '#B9F2FF',
        iconPath: null,
      },
    ];

    await prisma.badgeTier.createMany({
      data: defaultTiers,
    });
  }
}
