import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard, RequireTier, TierGuard } from '../middleware/auth';
import type { JWTPayload } from '../middleware/auth';
import { EmailNotificationService } from '../services/email-notification.service';
import { NotifyMembersSchema } from '../models/email/email.dto';

interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

@Controller()
@UseGuards(AuthGuard, TierGuard)
export class EmailNotificationController {
  constructor(private readonly emailService: EmailNotificationService) {}

  @Get('events/:id/email-preview')
  @RequireTier('LEADER')
  async getEmailPreview(@Param('id') id: string) {
    return this.emailService.getEventEmailPreview(id);
  }

  @Post('events/:id/notify-members')
  @RequireTier('LEADER')
  async notifyMembers(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: AuthenticatedRequest,
  ) {
    const parsed = NotifyMembersSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);

    const senderId = req.user!.userId;
    try {
      return await this.emailService.notifyEventMembers(id, senderId, parsed.data.additionalRecipientIds);
    } catch (err) {
      if (err instanceof Error && err.message === 'Event not found') throw new NotFoundException('Event not found');
      if (err instanceof Error && err.message === 'No recipients with email addresses found for this event') {
        throw new BadRequestException('No recipients with email addresses found for this event');
      }
      throw err;
    }
  }

  @Post('events/:id/send-completion-summary')
  @RequireTier('LEADER')
  async sendCompletionSummary(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: AuthenticatedRequest,
  ) {
    const parsed = NotifyMembersSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);

    const senderId = req.user!.userId;
    try {
      return await this.emailService.sendCompletionSummary(id, senderId, parsed.data.additionalRecipientIds);
    } catch (err) {
      if (err instanceof Error && err.message === 'Event not found') throw new NotFoundException('Event not found');
      if (err instanceof Error && err.message === 'EVENT_NOT_COMPLETE') {
        throw new BadRequestException('Event is not marked complete');
      }
      throw err;
    }
  }

  @Post('admin-tasks/:id/send-reminder')
  @RequireTier('ADMIN')
  async sendTaskReminder(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const senderId = req.user!.userId;
    try {
      return await this.emailService.sendTaskReminder(id, senderId);
    } catch (err) {
      if (err instanceof Error && err.message === 'Task not found') throw new NotFoundException('Task not found');
      if (err instanceof Error && err.message === 'TASK_NOT_OVERDUE') {
        throw new BadRequestException('Reminders can only be sent for overdue or due-today tasks');
      }
      if (err instanceof Error && err.message === 'COOLDOWN') {
        const lastSentAt = (err as Error & { lastSentAt?: Date }).lastSentAt;
        throw new ConflictException({
          error: 'A reminder was already sent within the last 24 hours',
          lastSentAt: lastSentAt?.toISOString(),
        });
      }
      throw err;
    }
  }

  @Get('events/:id/email-logs')
  @RequireTier('LEADER')
  async getEmailLogs(@Param('id') id: string) {
    return this.emailService.getEventEmailLogs(id);
  }

  @Get('pack/members/search')
  @RequireTier('LEADER')
  async searchMembers(@Query('q') q: string) {
    if (!q || q.length < 2) throw new BadRequestException('q must be at least 2 characters');
    return this.emailService.searchPackMembers(q);
  }
}
