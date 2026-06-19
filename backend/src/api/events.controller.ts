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
  Patch,
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
import { ChildAttendanceService } from '../services/child-scout/child-attendance.service';
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
import {
  RecordAttendanceSchema,
  type RecordAttendanceDto,
} from '../models/attendance/record-attendance.dto';
import {
  PromptParentForRequirementSchema,
  type PromptParentForRequirementDto,
} from '../models/advancement/prompt-parent.dto';
import { AttendanceStatus } from '@prisma/client';
import { z } from 'zod';
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
    private readonly signupService: SignupService,
    private readonly childAttendanceService: ChildAttendanceService,
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
      const currentUserTier = req.user!.authTier as AuthTier;

      const accessibleDenIds = await this.getAccessibleDenIds(currentUserId, currentUserTier);
      const requestedDenIds = validatedQuery.denIds
        ? validatedQuery.denIds.split(',').map((denId) => denId.trim()).filter(Boolean)
        : [];

      if (requestedDenIds.length > 0) {
        const invalidDenIds = requestedDenIds.filter((denId) => !accessibleDenIds.includes(denId));
        if (invalidDenIds.length > 0) {
          throw new ForbiddenException('One or more selected dens are outside your scope');
        }
      }

      const denIdsForQuery = requestedDenIds.length > 0 ? requestedDenIds : accessibleDenIds;

      const result = await this.eventService.listEvents(
        validatedQuery.page,
        validatedQuery.limit,
        {
          scopeType: validatedQuery.scopeType,
          denIds: denIdsForQuery,
          upcoming: validatedQuery.upcoming,
          mySignups: validatedQuery.mySignups,
        },
        currentUserId
      );

      return result;
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'name' in error && (error as { name?: string }).name === 'ZodError') {
        const zodError = error as z.ZodError;
        throw new BadRequestException({
          error: 'Invalid query parameters',
          details: zodError.issues?.map((issue) => issue.message) || []
        });
      }
      throw error;
    }
  }

  private async getAccessibleDenIds(userId: string, authTier: AuthTier): Promise<string[]> {
    if (authTier === AuthTier.ADMIN) {
      const dens = await prisma.den.findMany({
        where: { isActive: true, deletedAt: null },
        select: { id: true },
      });
      return dens.map((den) => den.id);
    }

    const [volunteer, linkedCubs] = await Promise.all([
      prisma.volunteer.findFirst({
        where: { id: userId, deletedAt: null },
        select: {
          volunteerRoles: {
            where: { removedAt: null },
            select: {
              denId: true,
            },
          },
        },
      }),
      prisma.parentChildLink.findMany({
        where: {
          parentId: userId,
          status: 'APPROVED',
          childScout: {
            deletedAt: null,
            isActive: true,
          },
        },
        select: {
          childScout: {
            select: {
              denMemberships: {
                where: { validTo: null },
                take: 1,
                select: {
                  denId: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const denIds = new Set<string>();

    volunteer?.volunteerRoles.forEach((role) => {
      if (role.denId) {
        denIds.add(role.denId);
      }
    });

    linkedCubs.forEach((link) => {
      const denId = link.childScout.denMemberships[0]?.denId;
      if (denId) {
        denIds.add(denId);
      }
    });

    return Array.from(denIds);
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
      const validatedData = createEventSchema.parse(body);
      const createdById = req.user!.userId;
      const creatorTier = req.user!.authTier;

      const event = await this.eventService.createEvent(validatedData, createdById, creatorTier);

      return event;
    } catch (error: any) {
      if (error.name === 'ZodError') {
        throw new BadRequestException({
          error: 'Invalid input',
          details: error.issues?.map((e: any) => e.message) || []
        });
      }
      if (error.message?.includes('future')) {
        throw new BadRequestException({ error: error.message });
      }
      if (error.message?.includes('do not exist')) {
        throw new BadRequestException({ error: error.message });
      }
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
          details: error.issues?.map((e: any) => e.message) || []
        });
      }
      if (error.message === 'Event not found') {
        throw new NotFoundException(error.message);
      }
      if (error.message.includes('completed')) {
        throw new ConflictException(error.message);
      }
      if (error.message.includes('future')) {
        throw new BadRequestException({ error: error.message });
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
          details: error.issues?.map((e: any) => e.message) || []
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

  /**
   * PATCH /api/events/:id/child-attendance
   * Record child attendance for event
   * 
   * Authorization: LEADER with scope or ADMIN
   */
  @Patch(':id/child-attendance')
  @UseGuards(TierGuard)
  @RequireTier(AuthTier.LEADER)
  @HttpCode(HttpStatus.OK)
  async recordChildAttendance(
    @Param('id') eventId: string,
    @Body() body: RecordAttendanceDto,
    @Req() req: AuthenticatedRequest,
  ) {
    try {
      const validatedData = RecordAttendanceSchema.parse(body);
      const userId = req.user!.userId;
      
      return await this.childAttendanceService.recordAttendance(
        eventId,
        validatedData,
        userId,
      );
    } catch (error: any) {
      if (error.name === 'ZodError') {
        throw new BadRequestException({
          error: 'Invalid input',
          details: error.issues?.map((e: any) => e.message) || [],
        });
      }
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw error;
    }
  }

  /**
   * GET /api/events/:id/child-attendance
   * Get child attendance for event
   * 
   * Authorization: LEADER with scope or ADMIN
   */
  @Get(':id/child-attendance')
  @UseGuards(TierGuard)
  @RequireTier(AuthTier.LEADER)
  @HttpCode(HttpStatus.OK)
  async getChildAttendance(
    @Param('id') eventId: string,
    @Query('status') status?: string,
  ) {
    try {
      const statusFilter = status
        ? (status.toUpperCase() as AttendanceStatus)
        : undefined;
      
      return await this.childAttendanceService.getAttendanceByEvent(
        eventId,
        statusFilter,
      );
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw error;
    }
  }

  /**
   * POST /api/events/:id/prompt-requirements
   * Prompt linked parents to update Scoutbook for requirement progress
   * derived from this event's covered requirements.
   */
  @Post(':id/prompt-requirements')
  @UseGuards(TierGuard)
  @RequireTier(AuthTier.LEADER)
  @HttpCode(HttpStatus.OK)
  async promptRequirementParents(
    @Param('id') eventId: string,
    @Body() body: PromptParentForRequirementDto,
    @Req() req: AuthenticatedRequest,
  ) {
    try {
      const validated = PromptParentForRequirementSchema.parse(body || {});
      return await this.childAttendanceService.promptParentsForEventRequirements(
        eventId,
        req.user!.userId,
        req.user!.authTier,
        validated,
      );
    } catch (error: any) {
      if (error.name === 'ZodError') {
        throw new BadRequestException({
          error: 'Invalid input',
          details: error.issues?.map((e: any) => e.message) || [],
        });
      }
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw error;
    }
  }
}
