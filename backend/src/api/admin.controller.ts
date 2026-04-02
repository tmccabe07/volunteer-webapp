import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  NotFoundException
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../middleware/auth';
import { AdminService } from '../services/admin.service';
import { AuthTier } from '@prisma/client';

/**
 * AdminController handles administrative operations
 * All endpoints require ADMIN tier authentication
 */
@Controller('admin')
@UseGuards(AuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * GET /api/admin/volunteers
   * List all volunteers (admin only)
   */
  @Get('volunteers')
  async listVolunteers(@Req() req: Request) {
    // Check if user is admin
    const user = (req as any).user;
    if (!user || user.authTier !== AuthTier.ADMIN) {
      throw new ForbiddenException('Admin access required');
    }

    const volunteers = await this.adminService.getAllVolunteers();
    
    return {
      success: true,
      data: volunteers
    };
  }

  /**
   * POST /api/admin/volunteers/:id/reset-password
   * Reset a volunteer's password (admin only)
   * Returns temporary password that must be changed on first login
   */
  @Post('volunteers/:id/reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Param('id') volunteerId: string,
    @Req() req: Request
  ) {
    // Check if user is admin
    const user = (req as any).user;
    if (!user || user.authTier !== AuthTier.ADMIN) {
      throw new ForbiddenException('Admin access required');
    }

    try {
      const result = await this.adminService.resetVolunteerPassword(
        volunteerId,
        user.userId
      );

      return {
        success: true,
        data: result,
        message: 'Password reset successfully. Share the temporary password with the volunteer.'
      };
    } catch (error) {
      if (error.message === 'Volunteer not found') {
        throw new NotFoundException('Volunteer not found');
      }
      if (error.message.includes('cannot reset their own password')) {
        throw new ForbiddenException(error.message);
      }
      throw error;
    }
  }
}
