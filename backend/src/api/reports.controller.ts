/**
 * Reports Controller
 * 
 * Handles volunteer participation and administrative task reporting
 * Feature: 001-volunteer-management - User Story 9
 * Authorization: Tier 2+ (Den leaders and committee members)
 */

import {
  Controller,
  Get,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard, TierGuard, RequireTier } from '../middleware/auth';
import { ReportsService } from '../services/reports.service';
import {
  participationReportSchema,
  adminTaskReportSchema,
  upcomingEventsReportSchema,
  type ParticipationReportQuery,
  type AdminTaskReportQuery,
  type UpcomingEventsReportQuery,
} from '../utils/validation/reports.schema';

@Controller('reports')
@UseGuards(AuthGuard, TierGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * GET /api/reports/participation
   * Generate volunteer participation report with event signups and points earned
   */
  @Get('participation')
  @RequireTier('LEADER')
  async getParticipationReport(@Query() query: ParticipationReportQuery) {
    try {
      const validatedQuery = participationReportSchema.parse(query);
      return await this.reportsService.generateParticipationReport(
        validatedQuery
      );
    } catch (error: any) {
      if (error.name === 'ZodError') {
        throw new BadRequestException({
          error: 'Invalid query parameters',
          details: error.issues?.map((e: any) => ({
            path: e.path.join('.'),
            message: e.message,
          })) || [],
        });
      }
      throw error;
    }
  }

  /**
   * GET /api/reports/administrative-tasks
   * Generate administrative task completion report
   */
  @Get('administrative-tasks')
  @RequireTier('LEADER')
  async getAdminTaskReport(@Query() query: AdminTaskReportQuery) {
    try {
      const validatedQuery = adminTaskReportSchema.parse(query);
      return await this.reportsService.generateAdminTaskReport(validatedQuery);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        throw new BadRequestException({
          error: 'Invalid query parameters',
          details: error.issues?.map((e: any) => ({
            path: e.path.join('.'),
            message: e.message,
          })) || [],
        });
      }
      throw error;
    }
  }

  /**
   * GET /api/reports/upcoming-events
   * Generate upcoming events report with volunteer signups
   */
  @Get('upcoming-events')
  @RequireTier('LEADER')
  async getUpcomingEventsReport(@Query() query: UpcomingEventsReportQuery) {
    try {
      const validatedQuery = upcomingEventsReportSchema.parse(query);
      return await this.reportsService.generateUpcomingEventsReport(validatedQuery);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        throw new BadRequestException({
          error: 'Invalid query parameters',
          details: error.issues?.map((e: any) => ({
            path: e.path.join('.'),
            message: e.message,
          })) || [],
        });
      }
      throw error;
    }
  }
}
