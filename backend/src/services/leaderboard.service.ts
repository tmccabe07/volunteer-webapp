/**
 * LeaderboardService
 * 
 * Handles leaderboard cache updates, ranking calculation,
 * and leaderboard queries per User Story 3
 */

import { Injectable } from '@nestjs/common';
import prisma from '../utils/prisma';

@Injectable()
export class LeaderboardService {
  /**
   * Recalculate ranks for all volunteers in leaderboard
   * Should be called periodically (daily background job)
   * or after significant point changes
   */
  async recalculateRanks(): Promise<void> {
    // Get all leaderboard entries ordered by total points descending, then by name ascending
    const entries = await prisma.leaderboardCache.findMany({
      include: {
        volunteer: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [
        {
          totalPoints: 'desc',
        },
        {
          volunteer: {
            name: 'asc',
          },
        },
      ],
    });

    // Assign ranks (1-indexed, handle ties)
    let currentRank = 1;
    let previousPoints: number | null = null;
    let sameRankCount = 0;

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];

      if (previousPoints !== null && entry.totalPoints < previousPoints) {
        // Points changed, advance rank by number of people with same rank
        currentRank += sameRankCount;
        sameRankCount = 1;
      } else {
        // Same points as previous, or first entry
        sameRankCount++;
      }

      // Update rank in database
      await prisma.leaderboardCache.update({
        where: { volunteerId: entry.volunteerId },
        data: { rank: currentRank },
      });

      previousPoints = entry.totalPoints;
    }
  }

  /**
   * Get leaderboard with pagination
   * Only returns volunteers who have opted in (leaderboardOptIn = true)
   * 
   * @param page - Page number (1-indexed)
   * @param limit - Number of results per page
   */
  async getLeaderboard(page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;

    // Get leaderboard entries ordered by points desc, then name asc
    const entries = await prisma.leaderboardCache.findMany({
      skip,
      take: limit,
      orderBy: [
        {
          totalPoints: 'desc',
        },
        {
          volunteer: {
            name: 'asc',
          },
        },
      ],
      include: {
        volunteer: {
          select: {
            id: true,
            name: true,
            leaderboardOptIn: true,
          },
        },
      },
    });

    // Filter to only opted-in volunteers
    const filteredEntries = entries.filter(
      (entry) => entry.volunteer.leaderboardOptIn
    );

    // Get total count of opted-in volunteers
    const total = await prisma.volunteer.count({
      where: {
        leaderboardOptIn: true,
        deletedAt: null,
        leaderboardEntry: {
          isNot: null,
        },
      },
    });

    return {
      leaderboard: filteredEntries.map((entry) => ({
        rank: entry.rank,
        volunteer: {
          id: entry.volunteer.id,
          name: entry.volunteer.name,
        },
        totalPoints: entry.totalPoints,
        badgeTier: entry.badgeTier,
      })),
      pagination: {
        page,
        limit,
        total,
      },
    };
  }

  /**
   * Get current user's position in leaderboard
   * Returns rank and total points even if user opted out
   * 
   * @param volunteerId - ID of volunteer to look up
   */
  async getCurrentUserPosition(volunteerId: string) {
    const entry = await prisma.leaderboardCache.findUnique({
      where: { volunteerId },
    });

    if (!entry) {
      return {
        rank: null,
        totalPoints: 0,
      };
    }

    return {
      rank: entry.rank,
      totalPoints: entry.totalPoints,
    };
  }

  /**
   * Update leaderboard entry for a specific volunteer
   * Creates entry if doesn't exist, updates if exists
   * Only includes volunteer if leaderboardOptIn = true
   * 
   * @param volunteerId - ID of volunteer to update
   */
  async updateVolunteerEntry(volunteerId: string): Promise<void> {
    const volunteer = await prisma.volunteer.findUnique({
      where: { id: volunteerId },
      include: {
        pointBalance: true,
      },
    });

    if (!volunteer) {
      return;
    }

    // If opted out, remove from leaderboard
    if (!volunteer.leaderboardOptIn) {
      await prisma.leaderboardCache.deleteMany({
        where: { volunteerId },
      });
      return;
    }

    // Get badge tier (PointsService handles this but we need it here too)
    const totalPoints = volunteer.pointBalance?.totalPoints || 0;

    // For simplicity, use same badge tier logic as PointsService
    // In production, consider extracting this to a shared utility
    let badgeTier: string | null = null;
    if (totalPoints >= 100) badgeTier = 'Diamond';
    else if (totalPoints >= 80) badgeTier = 'Platinum';
    else if (totalPoints >= 60) badgeTier = 'Gold';
    else if (totalPoints >= 40) badgeTier = 'Silver';
    else if (totalPoints >= 20) badgeTier = 'Bronze';

    // Upsert leaderboard entry
    await prisma.leaderboardCache.upsert({
      where: { volunteerId },
      create: {
        volunteerId,
        rank: null, // Will be calculated by recalculateRanks()
        totalPoints,
        badgeTier,
      },
      update: {
        totalPoints,
        badgeTier,
      },
    });

    // Trigger rank recalculation
    // Note: In production, this should be debounced/batched
    // For now, we'll recalculate immediately
    await this.recalculateRanks();
  }

  /**
   * Create annual leaderboard snapshot
   * Called at year-end per pack configuration
   */
  async createAnnualSnapshot(): Promise<void> {
    const leaderboardEntries = await prisma.leaderboardCache.findMany({
      orderBy: {
        rank: 'asc',
      },
    });

    const snapshotDate = new Date();

    await prisma.leaderboardSnapshot.createMany({
      data: leaderboardEntries.map((entry) => ({
        snapshotDate,
        volunteerId: entry.volunteerId,
        rank: entry.rank,
        totalPoints: entry.totalPoints,
        badgeTier: entry.badgeTier,
      })),
    });
  }
}
