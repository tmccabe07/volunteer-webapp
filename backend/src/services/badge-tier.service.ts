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

    // Create BADGE_ACHIEVEMENT notification (User Story 10)
    if (newTier) {
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
