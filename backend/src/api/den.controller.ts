import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard, TierGuard, RequireTier } from '../middleware/auth';
import { DenService } from '../services/den/den.service';
import { AuthTier, RankLevel } from '@prisma/client';
import {
  CreateDenSchema,
  type CreateDenDto,
} from '../models/den/create-den.dto';
import {
  AssignDenMemberSchema,
  type AssignDenMemberDto,
} from '../models/den/assign-member.dto';
import {
  TransferChildSchema,
  type TransferChildDto,
} from '../models/den/transfer-child.dto';
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
 * Query parameters for listing dens
 */
const ListDensQuerySchema = z.object({
  rankLevel: z.nativeEnum(RankLevel).optional(),
  isActive: z
    .string()
    .transform(val => val === 'true')
    .or(z.boolean())
    .optional(),
});

const BatchAssignSchema = z.object({
  assignments: z.array(
    z.object({
      childScoutId: z.string().min(1, 'Child scout ID is required'),
      fromDenId: z.string().min(1).nullable().optional(),
      toDenId: z.string().min(1, 'Destination den ID is required'),
    }),
  ).min(1, 'At least one assignment is required'),
  effectiveDate: z
    .string()
    .datetime('Invalid ISO 8601 date format')
    .optional()
    .transform(val => (val ? new Date(val) : undefined)),
  reason: z.string().min(1, 'Reason is required').max(200).trim(),
});

/**
 * DenController handles den management endpoints
 * per contracts/api-endpoints.md
 */
@Controller('dens')
@UseGuards(AuthGuard)
export class DenController {
  constructor(private readonly denService: DenService) {}

  /**
   * POST /api/dens
   * Create den (ADMIN only)
   */
  @Post()
  @UseGuards(TierGuard)
  @RequireTier(AuthTier.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createDen(
    @Req() req: AuthenticatedRequest,
    @Body() body: CreateDenDto,
  ) {
    try {
      const validatedData = CreateDenSchema.parse(body);
      const userId = req.user!.userId;
      
      return await this.denService.createDen(validatedData, userId);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        throw new BadRequestException({
          error: 'Invalid input',
          details: error.issues?.map((e: any) => e.message) || [],
        });
      }
      if (error instanceof ConflictException) {
        throw error;
      }
      throw error;
    }
  }

  /**
   * GET /api/dens
   * List dens with filtering
   * 
   * Authorization: LEADER or ADMIN
   */
  @Get()
  @UseGuards(TierGuard)
  @RequireTier(AuthTier.LEADER)
  @HttpCode(HttpStatus.OK)
  async listDens(@Query() query: any) {
    try {
      const validatedQuery = ListDensQuerySchema.parse(query);
      return await this.denService.listDens(validatedQuery);
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
   * GET /api/dens/:id/roster
   * Get den roster with member details
   * 
   * Authorization: LEADER with scope or ADMIN
   */
  @Get(':id/roster')
  @UseGuards(TierGuard)
  @RequireTier(AuthTier.LEADER)
  @HttpCode(HttpStatus.OK)
  async getDenRoster(@Param('id') denId: string) {
    try {
      return await this.denService.getDenRoster(denId);
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw error;
    }
  }

  /**
   * POST /api/dens/:id/members
   * Assign child to den
   * 
   * Authorization: LEADER with scope or ADMIN
   */
  @Post(':id/members')
  @UseGuards(TierGuard)
  @RequireTier(AuthTier.LEADER)
  @HttpCode(HttpStatus.CREATED)
  async assignChildToDen(
    @Req() req: AuthenticatedRequest,
    @Param('id') denId: string,
    @Body() body: AssignDenMemberDto,
  ) {
    try {
      const validatedData = AssignDenMemberSchema.parse(body);
      const userId = req.user!.userId;
      
      return await this.denService.assignChildToDen(denId, validatedData, userId);
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
      if (error instanceof ConflictException) {
        throw error;
      }
      throw error;
    }
  }

  /**
   * DELETE /api/dens/:id/members/:childScoutId
   * Remove child from den (closes current membership)
   *
   * Authorization: LEADER with scope or ADMIN
   */
  @Delete(':id/members/:childScoutId')
  @UseGuards(TierGuard)
  @RequireTier(AuthTier.LEADER)
  @HttpCode(HttpStatus.OK)
  async removeChildFromDen(
    @Param('id') denId: string,
    @Param('childScoutId') childScoutId: string,
  ) {
    try {
      return await this.denService.removeChildFromDen(denId, childScoutId);
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw error;
    }
  }

  /**
   * POST /api/dens/transfer-child
   * Transfer a child from one den to another atomically.
   *
   * Authorization: ADMIN only
   */
  @Post('transfer-child')
  @UseGuards(TierGuard)
  @RequireTier(AuthTier.ADMIN)
  @HttpCode(HttpStatus.OK)
  async transferChild(
    @Req() req: AuthenticatedRequest,
    @Body() body: TransferChildDto,
  ) {
    try {
      const validatedData = TransferChildSchema.parse(body);
      return await this.denService.transferChild(validatedData, req.user!.userId);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        throw new BadRequestException({
          error: 'Invalid input',
          details: error.issues?.map((e: any) => e.message) || [],
        });
      }
      if (error instanceof NotFoundException || error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      throw error;
    }
  }

  /**
   * POST /api/dens/batch-assign
   * Bulk assign multiple children to dens.
   *
   * Authorization: ADMIN only
   */
  @Post('batch-assign')
  @UseGuards(TierGuard)
  @RequireTier(AuthTier.ADMIN)
  @HttpCode(HttpStatus.OK)
  async batchAssignChildren(
    @Req() req: AuthenticatedRequest,
    @Body() body: unknown,
  ) {
    try {
      const validatedBody = BatchAssignSchema.parse(body);
      return await this.denService.batchAssignChildren(validatedBody, req.user!.userId);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        throw new BadRequestException({
          error: 'Invalid input',
          details: error.issues?.map((e: any) => e.message) || [],
        });
      }
      if (error instanceof NotFoundException || error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      throw error;
    }
  }

  /**
   * DELETE /api/dens/:id
   * Soft delete a den (mark as inactive)
   * 
   * Authorization: ADMIN only
   */
  @Delete(':id')
  @UseGuards(TierGuard)
  @RequireTier(AuthTier.ADMIN)
  @HttpCode(HttpStatus.OK)
  async deleteDen(@Param('id') denId: string) {
    try {
      return await this.denService.deleteDen(denId);
    } catch (error: any) {
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
