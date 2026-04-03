/**
 * Points & Gamification Controller
 * 
 * Handles points history, leaderboard, and badge tier endpoints
 * per User Story 3
 */

import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Req
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard, TierGuard, RequireTier, type JWTPayload } from '../middleware/auth';
import { PointsService } from '../services/points.service';
import { BadgeTierService } from '../services/badge-tier.service';
import { LeaderboardService } from '../services/leaderboard.service';
import {
  revokePointsSchema,
  listPointsSchema,
  leaderboardSchema,
  type RevokePointsInput,
  type ListPointsQuery,
  type LeaderboardQuery
} from '../utils/validation/points.schema';
import prisma from '../utils/prisma';
import { AuthTier } from '@prisma/client';

interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

@Controller('points')
@UseGuards(AuthGuard)
export class PointsController {
  constructor(
    private readonly pointsService: PointsService,
    private readonly badgeTierService: BadgeTierService,
    private readonly leaderboardService: LeaderboardService
  ) {}

  /**
   * GET /api/points/me
   * Get current volunteer's point history
   */
  @Get('me')
  async getMyPoints(
    @Query() query: ListPointsQuery,
    @Req() req: AuthenticatedRequest
  ) {
    try {
      const validatedQuery = listPointsSchema.parse(query);
      const volunteerId = req.user!.userId;

      return await this.getPointsForVolunteer(volunteerId, validatedQuery);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        throw new BadRequestException({
          error: 'Invalid query parameters',
          details: error.errors.map((e: any) => e.message)
        });
      }
      throw error;
    }
  }

  /**
   * GET /api/points/volunteers/:volunteerId
   * Get specific volunteer's point history (Tier 2+ or self)
   */
  @Get('volunteers/:volunteerId')
  async getVolunteerPoints(
    @Param('volunteerId') volunteerId: string,
    @Query() query: ListPointsQuery,
    @Req() req: AuthenticatedRequest
  ) {
    try {
      const validatedQuery = listPointsSchema.parse(query);
      const currentUserId = req.user!.userId;
      const currentUserTier = req.user!.authTier;

      // Check authorization: Tier 2+ or viewing own points
      if (currentUserId !== volunteerId && currentUserTier === AuthTier.PARENT) {
        throw new ForbiddenException('Insufficient permissions to view this volunteer\'s points');
      }

      // Check if volunteer exists
      const volunteer = await prisma.volunteer.findUnique({
        where: { id: volunteerId, deletedAt: null }
      });

      if (!volunteer) {
        throw new NotFoundException('Volunteer not found');
      }

      return await this.getPointsForVolunteer(volunteerId, validatedQuery);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        throw new BadRequestException({
          error: 'Invalid query parameters',
          details: error.errors.map((e: any) => e.message)
        });
      }
      throw error;
    }
  }

  /**
   * Shared method to get points for a volunteer
   */
  private async getPointsForVolunteer(volunteerId: string, query: ListPointsQuery) {
    const { page, limit, year } = query;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      volunteerId,
    };

    // Add year filter if provided
    if (year) {
      const yearStart = new Date(year, 0, 1);
      const yearEnd = new Date(year + 1, 0, 1);
      where.createdAt = {
        gte: yearStart,
        lt: yearEnd,
      };
    }

    // Get point events
    const pointEvents = await prisma.pointEvent.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        activityType: {
          select: {
            name: true,
            pointValue: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Get total count
    const total = await prisma.pointEvent.count({ where });

    // Get balance and badge tier
    const pointBalance = await prisma.volunteerPointBalance.findUnique({
      where: { volunteerId },
    });

    const leaderboardEntry = await prisma.leaderboardCache.findUnique({
      where: { volunteerId },
    });

    return {
      balance: {
        totalPoints: pointBalance?.totalPoints || 0,
        currentYearPoints: pointBalance?.currentYearPoints || 0,
        badgeTier: leaderboardEntry?.badgeTier || null,
        rank: leaderboardEntry?.rank || null,
      },
      pointEvents: pointEvents.map((event) => ({
        id: event.id,
        points: event.points,
        eventType: event.eventType,
        reason: event.reason,
        activityType: event.activityType,
        createdBy: event.createdBy,
        createdAt: event.createdAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
      },
    };
  }

  /**
   * POST /api/points/revoke/:pointEventId
   * Revoke a previously awarded point event (Tier 2+ only)
   */
  @Post('revoke/:pointEventId')
  @UseGuards(TierGuard)
  @RequireTier(AuthTier.LEADER)
  @HttpCode(HttpStatus.CREATED)
  async revokePoints(
    @Param('pointEventId') pointEventId: string,
    @Body() body: RevokePointsInput,
    @Req() req: AuthenticatedRequest
  ) {
    try {
      const validatedData = revokePointsSchema.parse(body);
      const revokedById = req.user!.userId;

      // Check if point event exists
      const originalEvent = await prisma.pointEvent.findUnique({
        where: { id: pointEventId },
      });

      if (!originalEvent) {
        throw new NotFoundException('Point event not found');
      }

      // Check if already revoked
      if (originalEvent.points < 0 || originalEvent.eventType === 'ADMIN_REVOCATION') {
        throw new ConflictException('Point event already revoked');
      }

      // Revoke points
      await this.pointsService.revokePoints(pointEventId, validatedData.reason, revokedById);

      // Get updated balance
      const pointBalance = await prisma.volunteerPointBalance.findUnique({
        where: { volunteerId: originalEvent.volunteerId },
      });

      const leaderboardEntry = await prisma.leaderboardCache.findUnique({
        where: { volunteerId: originalEvent.volunteerId },
      });

      // Get the revocation event
      const revocationEvent = await prisma.pointEvent.findFirst({
        where: {
          referenceId: pointEventId,
          eventType: 'ADMIN_REVOCATION',
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return {
        revocationEvent: {
          id: revocationEvent!.id,
          volunteerId: revocationEvent!.volunteerId,
          points: revocationEvent!.points,
          eventType: revocationEvent!.eventType,
          reason: revocationEvent!.reason,
          referenceId: revocationEvent!.referenceId,
          createdById: revocationEvent!.createdById,
          createdAt: revocationEvent!.createdAt.toISOString(),
        },
        newBalance: {
          totalPoints: pointBalance?.totalPoints || 0,
          currentYearPoints: pointBalance?.currentYearPoints || 0,
          badgeTier: leaderboardEntry?.badgeTier || null,
        },
      };
    } catch (error: any) {
      if (error.name === 'ZodError') {
        throw new BadRequestException({
          error: 'Invalid input',
          details: error.errors.map((e: any) => e.message)
        });
      }
      throw error;
    }
  }
}

@Controller('leaderboard')
@UseGuards(AuthGuard)
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  /**
   * GET /api/leaderboard
   * Get current leaderboard rankings
   */
  @Get()
  async getLeaderboard(
    @Query() query: LeaderboardQuery,
    @Req() req: AuthenticatedRequest
  ) {
    try {
      const validatedQuery = leaderboardSchema.parse(query);
      const currentUserId = req.user!.userId;

      const { leaderboard, pagination } = await this.leaderboardService.getLeaderboard(
        validatedQuery.page,
        validatedQuery.limit
      );

      const currentUser = await this.leaderboardService.getCurrentUserPosition(currentUserId);

      return {
        leaderboard,
        currentUser,
        pagination,
      };
    } catch (error: any) {
      if (error.name === 'ZodError') {
        throw new BadRequestException({
          error: 'Invalid query parameters',
          details: error.errors.map((e: any) => e.message)
        });
      }
      throw error;
    }
  }
}

@Controller('badge-tiers')
@UseGuards(AuthGuard)
export class BadgeTierController {
  constructor(private readonly badgeTierService: BadgeTierService) {}

  /**
   * GET /api/badge-tiers
   * Get all badge tier definitions
   */
  @Get()
  async getAllTiers() {
    const tiers = await this.badgeTierService.getAllTiers();

    return {
      tiers: tiers.map((tier) => ({
        tierName: tier.tierName,
        minPoints: tier.minPoints,
        maxPoints: tier.maxPoints,
        displayOrder: tier.displayOrder,
        badgeColor: tier.badgeColor,
        iconPath: tier.iconPath,
      })),
    };
  }

  /**
   * GET /api/badge-tiers/me/history
   * Get current volunteer's badge tier progression history
   */
  @Get('me/history')
  async getMyHistory(@Req() req: AuthenticatedRequest) {
    const volunteerId = req.user!.userId;

    const history = await this.badgeTierService.getTierHistory(volunteerId);
    const currentTier = await this.badgeTierService.getCurrentTier(volunteerId);

    return {
      currentTier,
      history: history.map((entry) => ({
        id: entry.id,
        oldTier: entry.oldTier,
        newTier: entry.newTier,
        pointsAtChange: entry.pointsAtChange,
        achievedAt: entry.achievedAt.toISOString(),
      })),
    };
  }
}
