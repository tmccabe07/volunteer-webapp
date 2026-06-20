import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
  Body,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CalendarFeedScope } from '@prisma/client';
import type { Request, Response } from 'express';
import { AuthGuard } from '../middleware/auth';
import type { JWTPayload } from '../middleware/auth';
import {
  CalendarFeedRegenerateSchema,
} from '../models/calendar-feed/calendar-feed.dto';
import type { CalendarFeedRegenerateDto } from '../models/calendar-feed/calendar-feed.dto';
import { CalendarFeedService } from '../services/calendar-feed.service';

interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

@Controller()
export class CalendarFeedController {
  constructor(private readonly calendarFeedService: CalendarFeedService) {}

  private getBaseUrl(req: Request): string {
    if (process.env.BACKEND_PUBLIC_URL) {
      return process.env.BACKEND_PUBLIC_URL.replace(/\/$/, '');
    }

    const protocol = req.headers['x-forwarded-proto']?.toString() || req.protocol || 'http';
    const host = req.get('host') || 'localhost:3001';
    return `${protocol}://${host}`;
  }

  @Get('calendar/feeds/:feedToken.ics')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  async getIcsFeed(
    @Param('feedToken') feedToken: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const ics = await this.calendarFeedService.getFeedIcs(feedToken, {
      ip: req.ip,
      userAgent: req.get('user-agent') || undefined,
    });

    if (!ics) {
      throw new NotFoundException('Feed not found');
    }

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.send(ics);
  }

  @Get('me/calendar-feeds')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async listMyCalendarFeeds(@Req() req: AuthenticatedRequest) {
    const userId = req.user?.userId;
    const authTier = req.user?.authTier;

    if (!userId || !authTier) {
      throw new ForbiddenException('Authentication required');
    }

    const baseUrl = this.getBaseUrl(req);
    return this.calendarFeedService.getOrCreateFeedDescriptors(userId, authTier, baseUrl);
  }

  @Post('me/calendar-feeds/regenerate')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async regenerateCalendarFeed(
    @Req() req: AuthenticatedRequest,
    @Body() body: CalendarFeedRegenerateDto,
  ) {
    const userId = req.user?.userId;
    const authTier = req.user?.authTier;

    if (!userId || !authTier) {
      throw new ForbiddenException('Authentication required');
    }

    try {
      const parsed = CalendarFeedRegenerateSchema.parse(body);
      const rawToken = await this.calendarFeedService.regenerateToken(
        userId,
        authTier,
        parsed.scopeType,
        parsed.denId,
      );

      return {
        scopeType: parsed.scopeType,
        denId: parsed.scopeType === CalendarFeedScope.DEN ? parsed.denId || null : null,
        feedUrl: `${this.getBaseUrl(req)}/api/calendar/feeds/${rawToken}.ics`,
      };
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'name' in error && (error as { name?: string }).name === 'ZodError') {
        const zodError = error as { issues?: Array<{ message: string }> };
        throw new BadRequestException({
          error: 'Invalid regenerate request',
          details: zodError.issues?.map((issue) => issue.message) || [],
        });
      }

      if (error instanceof Error && error.message.includes('outside your scope')) {
        throw new ForbiddenException(error.message);
      }

      if (error instanceof Error && error.message.includes('required')) {
        throw new BadRequestException(error.message);
      }

      throw error;
    }
  }
}
