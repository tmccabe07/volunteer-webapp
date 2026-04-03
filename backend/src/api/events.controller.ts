/**
 * Events Controller
 * 
 * Handles event creation, volunteer signups, and event completion
 * per User Story 4
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
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
  Req,
  Header
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard, TierGuard, RequireTier } from '../middleware/auth';
import { EventService } from '../services/event.service';
import { SignupService } from '../services/signup.service';
import {
  createEventSchema,
  updateEventSchema,
  completeEventSchema,
  listEventsSchema,
  type CreateEventInput,
  type UpdateEventInput,
  type CompleteEventInput,
  type ListEventsQuery
} from '../utils/validation/event.schema';
import prisma from '../utils/prisma';
import { AuthTier } from '@prisma/client';
import type { JWTPayload } from '../middleware/auth';

interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

@Controller('events')
@UseGuards(AuthGuard)
export class EventsController {
  constructor(
    private readonly eventService: EventService,
    private readonly signupService: SignupService
  ) {}

  /**
   * GET /api/events
   * List events with filtering and pagination
   */
  @Get()
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  async listEvents(
    @Query() query: ListEventsQuery,
    @Req() req: AuthenticatedRequest
  ) {
    try {
      const validatedQuery = listEventsSchema.parse(query);
      const currentUserId = req.user!.userId;

      // Get user's children's rank levels for filtering
      let userRankLevels: string[] = [];
      if (!validatedQuery.rankLevel) {
        const volunteer = await prisma.volunteer.findUnique({
          where: { id: currentUserId },
          include: {
            childrenRanks: {
              select: {
                rankLevel: true,
              },
            },
          },
        });

        userRankLevels = volunteer?.childrenRanks.map(cr => cr.rankLevel) || [];
      }

      const result = await this.eventService.listEvents(
        validatedQuery.page,
        validatedQuery.limit,
        {
          rankLevel: validatedQuery.rankLevel,
          upcoming: validatedQuery.upcoming,
          mySignups: validatedQuery.mySignups,
          userRankLevels,
        },
        currentUserId
      );

      return result;
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
   * GET /api/events/:id
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
   * Get single event details
   */
  @Get(':id')
  async getEvent(
    @Param('id') eventId: string,
    @Req() req: AuthenticatedRequest
  ) {
    const event = await this.eventService.getEventById(eventId, req.user!.userId);

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return event;
  }

  /**
   * POST /api/events
   * Create a new event (Tier 2+ only)
   */
  @Post()
  @UseGuards(TierGuard)
  @RequireTier(AuthTier.LEADER)
  @HttpCode(HttpStatus.CREATED)
  async createEvent(
    @Body() body: CreateEventInput,
    @Req() req: AuthenticatedRequest
  ) {
    try {
      console.log('Received event creation request:', JSON.stringify(body, null, 2));
      const validatedData = createEventSchema.parse(body);
      console.log('Validated data:', JSON.stringify(validatedData, null, 2));
      const createdById = req.user!.userId;

      const event = await this.eventService.createEvent(validatedData, createdById);

      return event;
    } catch (error: any) {
      if (error.name === 'ZodError' && error.errors) {
        throw new BadRequestException({
          error: 'Invalid input',
          details: error.errors.map((e: any) => e.message)
        });
      }
      if (error.message?.includes('future')) {
        throw new BadRequestException(error.message);
      }
      if (error.message?.includes('do not exist')) {
        throw new BadRequestException(error.message);
      }
      console.error('Event creation error:', error);
      throw error;
    }
  }

  /**
   * PUT /api/events/:id
   * Update an existing event (Tier 2+ only)
   */
  @Put(':id')
  @UseGuards(TierGuard)
  @RequireTier(AuthTier.LEADER)
  async updateEvent(
    @Param('id') eventId: string,
    @Body() body: UpdateEventInput,
    @Req() req: AuthenticatedRequest
  ) {
    try {
      const validatedData = updateEventSchema.parse(body);

      const event = await this.eventService.updateEvent(eventId, validatedData);

      return event;
    } catch (error: any) {
      if (error.name === 'ZodError') {
        throw new BadRequestException({
          error: 'Invalid input',
          details: error.errors.map((e: any) => e.message)
        });
      }
      if (error.message === 'Event not found') {
        throw new NotFoundException(error.message);
      }
      if (error.message.includes('completed')) {
        throw new ConflictException(error.message);
      }
      if (error.message.includes('future')) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  /**
   * POST /api/events/:id/complete
   * Mark event as complete and award points (Tier 2+ only)
   */
  @Post(':id/complete')
  @UseGuards(TierGuard)
  @RequireTier(AuthTier.LEADER)
  async completeEvent(
    @Param('id') eventId: string,
    @Body() body: CompleteEventInput,
    @Req() req: AuthenticatedRequest
  ) {
    try {
      const validatedData = completeEventSchema.parse(body);
      const completedById = req.user!.userId;

      const result = await this.eventService.completeEvent(eventId, validatedData, completedById);

      return result;
    } catch (error: any) {
      if (error.name === 'ZodError') {
        throw new BadRequestException({
          error: 'Invalid input',
          details: error.errors.map((e: any) => e.message)
        });
      }
      if (error.message === 'Event not found') {
        throw new NotFoundException(error.message);
      }
      if (error.message.includes('already')) {
        throw new ConflictException(error.message);
      }
      throw error;
    }
  }

  /**
   * POST /api/events/:eventId/slots/:slotId/signup
   * Sign up for an activity slot
   */
  @Post(':eventId/slots/:slotId/signup')
  @HttpCode(HttpStatus.CREATED)
  async signupForActivity(
    @Param('eventId') eventId: string,
    @Param('slotId') slotId: string,
    @Req() req: AuthenticatedRequest
  ) {
    try {
      const volunteerId = req.user!.userId;

      const signup = await this.signupService.signupForActivity(volunteerId, slotId);

      return signup;
    } catch (error: any) {
      if (error.message === 'Activity slot not found') {
        throw new NotFoundException(error.message);
      }
      if (error.message.includes('past') || error.message.includes('capacity') || error.message.includes('completed')) {
        throw new BadRequestException(error.message);
      }
      if (error.message.includes('Already')) {
        throw new ConflictException(error.message);
      }
      if (error.message.includes('re-signup')) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  /**
   * DELETE /api/events/:eventId/slots/:slotId/signup
   * Withdraw from an activity slot
   */
  @Delete(':eventId/slots/:slotId/signup')
  async withdrawFromActivity(
    @Param('eventId') eventId: string,
    @Param('slotId') slotId: string,
    @Req() req: AuthenticatedRequest
  ) {
    try {
      const volunteerId = req.user!.userId;

      const signup = await this.signupService.withdrawFromActivity(volunteerId, slotId);

      return signup;
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('withdrawn')) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }
}
