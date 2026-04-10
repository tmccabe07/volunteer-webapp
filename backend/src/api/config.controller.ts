/**
 * Pack Configuration Controller
 * 
 * Handles activity types and pack configuration endpoints
 * per User Stories 5 and 8
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Req
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard, TierGuard, RequireTier, type JWTPayload } from '../middleware/auth';
import { ActivityTypeService } from '../services/activity-type.service';
import { PackConfigService } from '../services/pack-config.service';
import { VolunteerRoleService } from '../services/volunteer-role.service';
import {
  createActivitySchema,
  updateActivitySchema,
  type CreateActivityInput,
  type UpdateActivityInput
} from '../utils/validation/activity.schema';
import {
  updatePackConfigSchema,
  createVolunteerRoleSchema,
  updateVolunteerRoleSchema,
  type UpdatePackConfigInput,
  type CreateVolunteerRoleInput,
  type UpdateVolunteerRoleInput
} from '../utils/validation/config.schema';
import { AuthTier } from '@prisma/client';

interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

/**
 * Activity Types Controller
 * Manages volunteer activity types and point values
 */
@Controller('pack-config/activity-types')
@UseGuards(AuthGuard)
export class ActivityTypesController {
  constructor(private readonly activityTypeService: ActivityTypeService) {}

  /**
   * GET /api/pack-config/activity-types
   * Get all active activity types
   * Authorization: Tier 1+ (all authenticated users)
   */
  @Get()
  async getAllActivityTypes() {
    return await this.activityTypeService.getAllActivityTypes();
  }

  /**
   * POST /api/pack-config/activity-types
   * Create a new activity type
   * Authorization: Tier 3 (Admin) only
   */
  @Post()
  @UseGuards(TierGuard)
  @RequireTier(AuthTier.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createActivityType(
    @Body() body: CreateActivityInput,
    @Req() req: AuthenticatedRequest
  ) {
    try {
      const validatedData = createActivitySchema.parse(body);
      const createdById = req.user!.userId;

      return await this.activityTypeService.createActivityType(validatedData, createdById);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        throw new BadRequestException({
          error: 'Invalid input',
          details: error.issues?.map((e: any) => e.message) || []
        });
      }
      if (error instanceof ConflictException) {
        throw error;
      }
      throw error;
    }
  }

  /**
   * PUT /api/pack-config/activity-types/:id
   * Update an existing activity type
   * Authorization: Tier 3 (Admin) only
   */
  @Put(':id')
  @UseGuards(TierGuard)
  @RequireTier(AuthTier.ADMIN)
  async updateActivityType(
    @Param('id') id: string,
    @Body() body: UpdateActivityInput,
    @Req() req: AuthenticatedRequest
  ) {
    try {
      const validatedData = updateActivitySchema.parse(body);
      const updatedById = req.user!.userId;

      return await this.activityTypeService.updateActivityType(id, validatedData, updatedById);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        throw new BadRequestException({
          error: 'Invalid input',
          details: error.issues?.map((e: any) => e.message) || []
        });
      }
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      throw error;
    }
  }

  /**
   * DELETE /api/pack-config/activity-types/:id
   * Soft delete an activity type
   * Authorization: Tier 3 (Admin) only
   */
  @Delete(':id')
  @UseGuards(TierGuard)
  @RequireTier(AuthTier.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteActivityType(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest
  ) {
    try {
      const deletedById = req.user!.userId;
      await this.activityTypeService.deleteActivityType(id, deletedById);
    } catch (error: any) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      throw error;
    }
  }
}

/**
 * Pack Configuration Controller
 * Manages pack settings and configuration
 */
@Controller('pack-config')
@UseGuards(AuthGuard)
export class PackConfigController {
  constructor(private readonly packConfigService: PackConfigService) {}

  /**
   * GET /api/pack-config
   * Get current pack configuration
   * Authorization: Tier 1+ (all authenticated users)
   */
  @Get()
  async getPackConfig() {
    return await this.packConfigService.getPackConfig();
  }

  /**
   * PUT /api/pack-config
   * Update pack configuration
   * Authorization: Tier 3 (Admin) only
   * 
   * Side effects:
   * - Updates recurringEndDate for all recurring events/tasks if yearEndDate changes
   * - Creates audit log entry
   */
  @Put()
  @UseGuards(TierGuard)
  @RequireTier(AuthTier.ADMIN)
  async updatePackConfig(
    @Body() body: UpdatePackConfigInput,
    @Req() req: AuthenticatedRequest
  ) {
    try {
      const validatedData = updatePackConfigSchema.parse(body);
      const updatedById = req.user!.userId;

      return await this.packConfigService.updatePackConfig(validatedData, updatedById);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        throw new BadRequestException({
          error: 'Invalid input',
          details: error.issues?.map((e: any) => e.message) || []
        });
      }
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw error;
    }
  }
}

/**
 * Volunteer Roles Controller
 * Manages volunteer role definitions
 */
@Controller('pack-config/volunteer-roles')
@UseGuards(AuthGuard)
export class VolunteerRolesController {
  constructor(private readonly volunteerRoleService: VolunteerRoleService) {}

  /**
   * GET /api/pack-config/volunteer-roles
   * Get all active volunteer roles
   * Authorization: Tier 1+ (all authenticated users)
   */
  @Get()
  async getAllVolunteerRoles() {
    const roles = await this.volunteerRoleService.getAllVolunteerRoles();
    return { roles };
  }

  /**
   * POST /api/pack-config/volunteer-roles
   * Create a new volunteer role
   * Authorization: Tier 3 (Admin) only
   */
  @Post()
  @UseGuards(TierGuard)
  @RequireTier(AuthTier.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createVolunteerRole(
    @Body() body: CreateVolunteerRoleInput,
    @Req() req: AuthenticatedRequest
  ) {
    try {
      const validatedData = createVolunteerRoleSchema.parse(body);
      const createdById = req.user!.userId;

      return await this.volunteerRoleService.createVolunteerRole(validatedData, createdById);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        throw new BadRequestException({
          error: 'Invalid input',
          details: error.issues?.map((e: any) => e.message) || []
        });
      }
      if (error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      throw error;
    }
  }

  /**
   * PUT /api/pack-config/volunteer-roles/:id
   * Update volunteer role description
   * Authorization: Tier 3 (Admin) only
   */
  @Put(':id')
  @UseGuards(TierGuard)
  @RequireTier(AuthTier.ADMIN)
  async updateVolunteerRole(
    @Param('id') id: string,
    @Body() body: UpdateVolunteerRoleInput,
    @Req() req: AuthenticatedRequest
  ) {
    try {
      const validatedData = updateVolunteerRoleSchema.parse(body);
      const updatedById = req.user!.userId;

      return await this.volunteerRoleService.updateVolunteerRole(id, validatedData, updatedById);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        throw new BadRequestException({
          error: 'Invalid input',
          details: error.issues?.map((e: any) => e.message) || []
        });
      }
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      throw error;
    }
  }

  /**
   * DELETE /api/pack-config/volunteer-roles/:id
   * Delete a volunteer role (soft delete)
   * Authorization: Tier 3 (Admin) only
   */
  @Delete(':id')
  @UseGuards(TierGuard)
  @RequireTier(AuthTier.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteVolunteerRole(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest
  ) {
    try {
      const deletedById = req.user!.userId;
      await this.volunteerRoleService.deleteVolunteerRole(id, deletedById);
    } catch (error: any) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      throw error;
    }
  }
}
