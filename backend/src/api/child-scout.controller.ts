import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard, TierGuard, RequireTier } from '../middleware/auth';
import { ChildScoutService } from '../services/child-scout/child-scout.service';
import { AuthTier, RankLevel } from '@prisma/client';
import {
  CreateChildScoutSchema,
  type CreateChildScoutDto,
} from '../models/child-scout/create-child-scout.dto';
import {
  UpdateChildScoutSchema,
  type UpdateChildScoutDto,
} from '../models/child-scout/update-child-scout.dto';
import { z } from 'zod';

/**
 * Extend Express Request to include authenticated user info
 */
interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    authTier: AuthTier;
  };
}

/**
 * Query parameters for listing child scouts
 */
const ListChildScoutsQuerySchema = z.object({
  rankLevel: z.nativeEnum(RankLevel).optional(),
  denId: z.string().optional(),
  isActive: z
    .string()
    .transform(val => val === 'true')
    .or(z.boolean())
    .optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

/**
 * ChildScoutController handles child scout management endpoints
 * per contracts/api-endpoints.md
 */
@Controller('child-scouts')
@UseGuards(AuthGuard)
export class ChildScoutController {
  constructor(private readonly childScoutService: ChildScoutService) {}

  /**
   * POST /api/child-scouts
   * Create child scout (ADMIN only)
   */
  @Post()
  @UseGuards(TierGuard)
  @RequireTier(AuthTier.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createChildScout(
    @Req() req: AuthenticatedRequest,
    @Body() body: CreateChildScoutDto,
  ) {
    try {
      const validatedData = CreateChildScoutSchema.parse(body);
      const userId = req.user!.userId;
      
      return await this.childScoutService.createChildScout(validatedData, userId);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        throw new BadRequestException({
          error: 'Invalid input',
          details: error.issues?.map((e: any) => e.message) || [],
        });
      }
      throw error;
    }
  }

  /**
   * GET /api/child-scouts
   * List child scouts with filtering and pagination
   * 
   * Authorization:
   * - PARENT: Only linked children with approved status
   * - LEADER: Scope-based (PACK/RANK/DEN)
   * - ADMIN: All children
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async listChildScouts(
    @Req() req: AuthenticatedRequest,
    @Query() query: any,
  ) {
    try {
      const validatedQuery = ListChildScoutsQuerySchema.parse(query);
      const userId = req.user!.userId;
      
      return await this.childScoutService.listChildScouts(userId, validatedQuery);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        throw new BadRequestException({
          error: 'Invalid query parameters',
          details: error.issues?.map((e: any) => e.message) || [],
        });
      }
      throw error;
    }
  }

  /**
   * GET /api/child-scouts/:id
   * Get child scout details
   * 
   * Authorization: Must have access to child (parent link or leader scope or admin)
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getChildScout(
    @Req() req: AuthenticatedRequest,
    @Param('id') childId: string,
  ) {
    try {
      const userId = req.user!.userId;
      return await this.childScoutService.getChildScoutById(childId, userId);
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw error;
    }
  }

  /**
   * GET /api/child-scouts/:id/attendance
   * Get attendance history for child scout
   */
  @Get(':id/attendance')
  @HttpCode(HttpStatus.OK)
  async getChildAttendance(
    @Req() req: AuthenticatedRequest,
    @Param('id') childId: string,
  ) {
    try {
      const userId = req.user!.userId;
      return await this.childScoutService.getChildAttendanceHistory(childId, userId);
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw error;
    }
  }

  /**
   * PATCH /api/child-scouts/:id
   * Update child scout
   * 
   * Authorization: ADMIN or parent with approved link
   */
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async updateChildScout(
    @Req() req: AuthenticatedRequest,
    @Param('id') childId: string,
    @Body() body: UpdateChildScoutDto,
  ) {
    try {
      const validatedData = UpdateChildScoutSchema.parse(body);
      const userId = req.user!.userId;
      
      return await this.childScoutService.updateChildScout(
        childId,
        userId,
        validatedData,
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
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw error;
    }
  }

  /**
   * DELETE /api/child-scouts/:id
   * Soft delete child scout (ADMIN only)
   */
  @Delete(':id')
  @UseGuards(TierGuard)
  @RequireTier(AuthTier.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteChildScout(
    @Req() req: AuthenticatedRequest,
    @Param('id') childId: string,
  ) {
    try {
      const userId = req.user!.userId;
      await this.childScoutService.deleteChildScout(childId, userId);
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw error;
    }
  }
}
