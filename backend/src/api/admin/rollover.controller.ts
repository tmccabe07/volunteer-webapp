import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { AuthTier } from '@prisma/client';
import { z } from 'zod';
import { AuthGuard, RequireTier, TierGuard } from '../../middleware/auth';
import { RolloverService } from '../../services/admin/rollover.service';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    authTier: AuthTier;
  };
}

const RolloverRequestSchema = z.object({
  targetYear: z.string().min(1, 'Target year is required'),
  isDryRun: z.boolean().optional(),
});

@Controller('rollover')
@UseGuards(AuthGuard)
export class RolloverController {
  constructor(private readonly rolloverService: RolloverService) {}

  @Post('preview')
  @UseGuards(TierGuard)
  @RequireTier(AuthTier.ADMIN)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async previewRollover(@Body() body: unknown) {
    try {
      const validatedBody = RolloverRequestSchema.pick({ targetYear: true }).parse(body);
      return this.rolloverService.previewRollover(validatedBody.targetYear);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        throw new BadRequestException({
          error: 'Invalid input',
          details: error.issues?.map((issue: any) => issue.message) || [],
        });
      }
      throw error;
    }
  }

  @Post('execute')
  @UseGuards(TierGuard)
  @RequireTier(AuthTier.ADMIN)
  @Throttle({ default: { limit: 2, ttl: 60_000 } })
  @HttpCode(HttpStatus.ACCEPTED)
  async executeRollover(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    try {
      const validatedBody = RolloverRequestSchema.parse(body);
      return this.rolloverService.executeRollover(
        validatedBody.targetYear,
        req.user!.userId,
        validatedBody.isDryRun ?? false,
      );
    } catch (error: any) {
      if (error.name === 'ZodError') {
        throw new BadRequestException({
          error: 'Invalid input',
          details: error.issues?.map((issue: any) => issue.message) || [],
        });
      }
      throw error;
    }
  }

  @Get(':batchId')
  @UseGuards(TierGuard)
  @RequireTier(AuthTier.ADMIN)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async getRolloverBatch(@Param('batchId') batchId: string) {
    return this.rolloverService.getRolloverBatch(batchId);
  }
}