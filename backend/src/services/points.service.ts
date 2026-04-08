import { Injectable } from '@nestjs/common';
import { PointEventType } from '@prisma/client';
import prisma from '../utils/prisma';

/**
 * PointsService handles point event creation, balance updates,
 * badge tier calculations, and revocation logic per User Story 3
 */
@Injectable()
export class PointsService {
  /**
   * Award points to a volunteer for role assignment
   * Called when a volunteer is assigned a COMMITTEE or DEN_LEADER role (100 points)
   */
  async awardRoleAssignmentPoints(
    volunteerId: string,
    roleAssignmentId: string,
    createdById: string
  ): Promise<void> {
    const ROLE_ASSIGNMENT_POINTS = 100;

    // Create point event
    await prisma.pointEvent.create({
      data: {
        volunteerId,
        points: ROLE_ASSIGNMENT_POINTS,
        eventType: PointEventType.ROLE_ASSIGNMENT,
        referenceId: roleAssignmentId,
        createdById,
        reason: 'Role assignment bonus',
      },
    });

    // Update or create point balance
    await this.updatePointBalance(volunteerId, ROLE_ASSIGNMENT_POINTS);
  }

  /**
   * Award points for event participation
   * Called when an event is marked complete
   */
  async awardEventPoints(
    volunteerId: string,
    eventId: string,
    activityTypeId: string,
    pointValue: number,
    createdById: string
  ): Promise<void> {
    // Create point event
    await prisma.pointEvent.create({
      data: {
        volunteerId,
        points: pointValue,
        eventType: PointEventType.EVENT_PARTICIPATION,
        referenceId: eventId,
        activityTypeId,
        createdById,
        reason: 'Event participation',
      },
    });

    // Update point balance
    await this.updatePointBalance(volunteerId, pointValue);
  }

  /**
   * Award points for task completion
   * Called when an admin task is marked complete
   */
  async awardTaskPoints(
    volunteerId: string,
    taskId: string,
    pointValue: number,
    createdById: string
  ): Promise<void> {
    // Create point event
    await prisma.pointEvent.create({
      data: {
        volunteerId,
        points: pointValue,
        eventType: PointEventType.TASK_COMPLETION,
        referenceId: taskId,
        createdById,
        reason: 'Task completion',
      },
    });

    // Update point balance
    await this.updatePointBalance(volunteerId, pointValue);
  }

  /**
   * Revoke points from a volunteer (Tier 2+ only)
   * Used to correct errors or penalize point gaming
   */
  async revokePoints(
    pointEventId: string,
    reason: string,
    revokedById: string
  ): Promise<void> {
    // Get the original point event
    const originalEvent = await prisma.pointEvent.findUnique({
      where: { id: pointEventId },
    });

    if (!originalEvent) {
      throw new Error('Point event not found');
    }

    if (originalEvent.points < 0) {
      throw new Error('Cannot revoke a revocation');
    }

    // Create revocation event (negative points)
    await prisma.pointEvent.create({
      data: {
        volunteerId: originalEvent.volunteerId,
        points: -originalEvent.points,
        eventType: PointEventType.ADMIN_REVOCATION,
        referenceId: pointEventId,
        reason,
        createdById: revokedById,
      },
    });

    // Update point balance
    await this.updatePointBalance(
      originalEvent.volunteerId,
      -originalEvent.points
    );
  }

  /**
   * Update volunteer point balance
   * Increments totalPoints and currentYearPoints
   */
  private async updatePointBalance(
    volunteerId: string,
    pointDelta: number
  ): Promise<void> {
    // Upsert point balance
    const existingBalance = await prisma.volunteerPointBalance.findUnique({
      where: { volunteerId },
    });

    if (existingBalance) {
      await prisma.volunteerPointBalance.update({
        where: { volunteerId },
        data: {
          totalPoints: {
            increment: pointDelta,
          },
          currentYearPoints: {
            increment: pointDelta,
          },
        },
      });
    } else {
      await prisma.volunteerPointBalance.create({
        data: {
          volunteerId,
          totalPoints: Math.max(0, pointDelta),
          currentYearPoints: Math.max(0, pointDelta),
        },
      });
    }

    // Update leaderboard cache
    await this.updateLeaderboardCache(volunteerId);
  }

  /**
   * Update leaderboard cache for a volunteer
   * Calculates badge tier based on total points
   */
  private async updateLeaderboardCache(volunteerId: string): Promise<void> {
    const pointBalance = await prisma.volunteerPointBalance.findUnique({
      where: { volunteerId },
    });

    if (!pointBalance) {
      return;
    }

    // Calculate badge tier (every 20 points)
    const badgeTier = this.calculateBadgeTier(pointBalance.totalPoints);

    // Get volunteer to check leaderboardOptIn
    const volunteer = await prisma.volunteer.findUnique({
      where: { id: volunteerId },
    });

    if (!volunteer || !volunteer.leaderboardOptIn) {
      // Remove from leaderboard if opt-out
      await prisma.leaderboardCache.deleteMany({
        where: { volunteerId },
      });
      return;
    }

    // Upsert leaderboard cache
    await prisma.leaderboardCache.upsert({
      where: { volunteerId },
      create: {
        volunteerId,
        rank: null, // Will be calculated by leaderboard service
        totalPoints: pointBalance.totalPoints,
        badgeTier,
      },
      update: {
        totalPoints: pointBalance.totalPoints,
        badgeTier,
      },
    });
  }

  /**
   * Calculate badge tier based on total points
   * Badge tiers: Bronze (20), Silver (40), Gold (60), Platinum (80), Diamond (100+)
   */
  private calculateBadgeTier(totalPoints: number): string | null {
    if (totalPoints >= 100) return 'Diamond';
    if (totalPoints >= 80) return 'Platinum';
    if (totalPoints >= 60) return 'Gold';
    if (totalPoints >= 40) return 'Silver';
    if (totalPoints >= 20) return 'Bronze';
    return null; // No badge yet
  }

  /**
   * Reset annual points for all volunteers
   * Called at year-end per pack configuration
   */
  async resetAnnualPoints(): Promise<void> {
    // Reset currentYearPoints to 0 for all volunteers
    await prisma.volunteerPointBalance.updateMany({
      data: {
        currentYearPoints: 0,
      },
    });

    // Create snapshot for leaderboard history
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
