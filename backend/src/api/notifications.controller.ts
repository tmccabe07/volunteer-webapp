import {
  Controller,
  Get,
  Put,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../middleware/auth';
import { NotificationService } from '../services/notification.service';
import { AuthTier } from '@prisma/client';

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

@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * GET /api/notifications
   * Fetch user notifications with unread count and pagination
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async getNotifications(
    @Req() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('unreadOnly') unreadOnly?: string
  ) {
    try {
      const userId = req.user!.userId;
      
      const options = {
        limit: limit ? parseInt(limit, 10) : 20,
        offset: offset ? parseInt(offset, 10) : 0,
        unreadOnly: unreadOnly === 'true',
      };

      // Validate pagination parameters
      if (isNaN(options.limit) || options.limit < 1 || options.limit > 100) {
        throw new BadRequestException('Limit must be between 1 and 100');
      }

      if (isNaN(options.offset) || options.offset < 0) {
        throw new BadRequestException('Offset must be non-negative');
      }

      return await this.notificationService.getNotifications(userId, options);
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to fetch notifications');
    }
  }

  /**
   * PUT /api/notifications/:id/read
   * Mark a specific notification as read
   */
  @Put(':id/read')
  @HttpCode(HttpStatus.OK)
  async markAsRead(
    @Req() req: AuthenticatedRequest,
    @Param('id') notificationId: string
  ) {
    try {
      const userId = req.user!.userId;
      const notification = await this.notificationService.markAsRead(
        notificationId,
        userId
      );
      
      return {
        message: 'Notification marked as read',
        notification,
      };
    } catch (error: any) {
      if (error.message === 'Notification not found or access denied') {
        throw new NotFoundException(error.message);
      }
      throw new BadRequestException('Failed to mark notification as read');
    }
  }

  /**
   * PUT /api/notifications/read-all
   * Mark all notifications as read for the current user
   */
  @Put('read-all')
  @HttpCode(HttpStatus.OK)
  async markAllAsRead(@Req() req: AuthenticatedRequest) {
    try {
      const userId = req.user!.userId;
      const result = await this.notificationService.markAllAsRead(userId);
      
      return {
        message: 'All notifications marked as read',
        count: result.count,
      };
    } catch (error: any) {
      throw new BadRequestException('Failed to mark all notifications as read');
    }
  }
}
