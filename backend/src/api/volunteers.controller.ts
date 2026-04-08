import {
  Controller,
  Get,
  Put,
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
  ForbiddenException,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard, TierGuard, RequireTier } from '../middleware/auth';
import { VolunteerService } from '../services/volunteer.service';
import { PointsService } from '../services/points.service';
import {
  updateProfileSchema,
  assignRoleSchema,
  listVolunteersSchema,
  type UpdateProfileInput,
  type AssignRoleInput,
  type ListVolunteersInput,
} from '../utils/validation/volunteer.schema';
import { AuthTier, RoleType } from '@prisma/client';

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

@Controller('volunteers')
@UseGuards(AuthGuard)
export class VolunteersController {
  constructor(
    private readonly volunteerService: VolunteerService,
    private readonly pointsService: PointsService
  ) {}

  /**
   * GET /api/volunteers/me/profile
   * Get current volunteer's full profile
   */
  @Get('me/profile')
  @HttpCode(HttpStatus.OK)
  async getMyProfile(@Req() req: AuthenticatedRequest) {
    try {
      const userId = req.user!.userId;
      return await this.volunteerService.getProfile(userId);
    } catch (error: any) {
      if (error.message === 'Volunteer not found') {
        throw new NotFoundException('Volunteer not found');
      }
      throw error;
    }
  }

  /**
   * PUT /api/volunteers/me/profile
   * Update current volunteer's profile
   */
  @Put('me/profile')
  @HttpCode(HttpStatus.OK)
  async updateMyProfile(
    @Req() req: AuthenticatedRequest,
    @Body() body: UpdateProfileInput
  ) {
    try {
      // Validate request body
      const validatedData = updateProfileSchema.parse(body);

      const userId = req.user!.userId;
      return await this.volunteerService.updateProfile(userId, validatedData);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        throw new BadRequestException({
          error: 'Invalid input',
          details: error.issues?.map((e: any) => e.message) || [],
        });
      }

      if (error.message === 'Volunteer not found') {
        throw new NotFoundException('Volunteer not found');
      }

      if (error.message.includes('duplicate') || error.message.includes('Duplicate')) {
        throw new ConflictException('Duplicate children rank');
      }

      throw error;
    }
  }

  /**
   * POST /api/volunteers/me/roles
   * Self-assign a volunteer role
   */
  @Post('me/roles')
  @HttpCode(HttpStatus.CREATED)
  async assignRole(
    @Req() req: AuthenticatedRequest,
    @Body() body: AssignRoleInput
  ) {
    try {
      // Validate request body
      const validatedData = assignRoleSchema.parse(body);

      const userId = req.user!.userId;
      const result = await this.volunteerService.assignRole(
        userId,
        validatedData.roleId
      );

      // Award role assignment points if applicable (COMMITTEE or DEN_LEADER roles)
      // This will be handled in a future enhancement when role types are checked
      // For now, we award points for all LEADER-tier roles
      try {
        await this.pointsService.awardRoleAssignmentPoints(
          userId,
          result.id,
          userId // Self-assigned
        );
      } catch (pointError) {
        // Points award failed, but role assignment succeeded
        console.error('Failed to award role assignment points:', pointError);
      }

      return result;
    } catch (error: any) {
      if (error.name === 'ZodError') {
        throw new BadRequestException({
          error: 'Invalid input',
          details: error.issues?.map((e: any) => e.message) || [],
        });
      }

      if (error.message === 'Role not found or has been deleted') {
        throw new NotFoundException('Role not found or has been deleted');
      }

      if (error.message === 'Role already assigned to volunteer') {
        throw new ConflictException('Role already assigned to volunteer');
      }

      if (error.message === 'Volunteer not found') {
        throw new NotFoundException('Volunteer not found');
      }

      throw error;
    }
  }

  /**
   * DELETE /api/volunteers/me/roles/:roleAssignmentId
   * Remove a self-assigned role
   */
  @Delete('me/roles/:roleAssignmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeRole(
    @Req() req: AuthenticatedRequest,
    @Param('roleAssignmentId') roleAssignmentId: string
  ) {
    try {
      const userId = req.user!.userId;
      await this.volunteerService.removeRole(userId, roleAssignmentId);
    } catch (error: any) {
      if (
        error.message === 'Role assignment not found or not owned by volunteer' ||
        error.message === 'Role already removed'
      ) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  /**
   * GET /api/volunteers/roles/available
   * Get all available volunteer roles
   */
  @Get('roles/available')
  @HttpCode(HttpStatus.OK)
  async getAvailableRoles() {
    try {
      return await this.volunteerService.getAvailableRoles();
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * GET /api/volunteers
   * List all volunteers (admin/leader view)
   * Requires Tier 2+ (LEADER or ADMIN)
   */
  @Get()
  @UseGuards(TierGuard)
  @RequireTier('LEADER')
  @HttpCode(HttpStatus.OK)
  async listVolunteers(@Query() query: any) {
    try {
      // Validate and parse query parameters
      const validatedQuery = listVolunteersSchema.parse(query);

      return await this.volunteerService.listVolunteers(validatedQuery);
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
   * GET /api/volunteers/:id
   * Get specific volunteer details
   * Requires Tier 2+ OR accessing own profile
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getVolunteer(
    @Req() req: AuthenticatedRequest,
    @Param('id') volunteerId: string
  ) {
    try {
      const currentUserId = req.user!.userId;
      const currentUserTier = req.user!.authTier;

      // Check authorization: Tier 2+ or accessing own profile
      if (
        currentUserTier === AuthTier.PARENT &&
        currentUserId !== volunteerId
      ) {
        throw new ForbiddenException(
          'Insufficient permissions to view this volunteer'
        );
      }

      return await this.volunteerService.getVolunteerById(volunteerId);
    } catch (error: any) {
      if (error.message === 'Volunteer not found') {
        throw new NotFoundException('Volunteer not found');
      }

      if (error instanceof ForbiddenException) {
        throw error;
      }

      throw error;
    }
  }

  /**
   * DELETE /api/volunteers/:id
   * Delete a volunteer account (site admin only)
   * Requires Tier 3 (ADMIN)
   */
  @Delete(':id')
  @UseGuards(TierGuard)
  @RequireTier('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteVolunteer(@Param('id') volunteerId: string) {
    try {
      await this.volunteerService.deleteVolunteer(volunteerId);
    } catch (error: any) {
      if (error.message === 'Volunteer not found') {
        throw new NotFoundException('Volunteer not found');
      }
      throw error;
    }
  }
}
