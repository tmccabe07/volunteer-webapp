import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { CompletionType } from '@prisma/client';
import { AuthGuard, RequireTier, TierGuard } from '../middleware/auth';
import {
  CompleteRequirementSchema,
  type CompleteRequirementDto,
} from '../models/advancement/complete-requirement.dto';
import {
  ReconcileRequirementSchema,
  type ReconcileRequirementDto,
} from '../models/advancement/reconcile-requirement.dto';
import { RequirementProgressService } from '../services/advancement/requirement-progress.service';
import { AdvancementProgressService } from '../services/advancement/advancement-progress.service';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    authTier: string;
  };
}

@Controller()
@UseGuards(AuthGuard, TierGuard)
export class AdvancementWorkflowController {
  constructor(
    private readonly requirementProgressService: RequirementProgressService,
    private readonly advancementProgressService: AdvancementProgressService,
  ) {}

  @Post('requirements/:id/complete')
  @RequireTier('PARENT')
  @HttpCode(HttpStatus.CREATED)
  async completeRequirement(
    @Param('id') requirementId: string,
    @Body() body: CompleteRequirementDto,
    @Req() req: AuthenticatedRequest,
  ) {
    try {
      const validated = CompleteRequirementSchema.parse(body);
      return await this.requirementProgressService.completeRequirement(
        requirementId,
        validated,
        req.user!.userId,
        req.user!.authTier,
      );
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

  @Get('requirements/pending-reconciliation')
  @RequireTier('LEADER')
  @HttpCode(HttpStatus.OK)
  async getPendingReconciliation(
    @Req() req: AuthenticatedRequest,
    @Query('denId') denId?: string,
    @Query('olderThanDays') olderThanDays?: string,
    @Query('completionType') completionType?: CompletionType,
  ) {
    return this.requirementProgressService.getPendingReconciliation(
      req.user!.userId,
      req.user!.authTier,
      {
        denId,
        olderThanDays: olderThanDays ? Number(olderThanDays) : undefined,
        completionType,
      },
    );
  }

  @Patch('requirement-progress/:id/reconcile')
  @RequireTier('LEADER')
  @HttpCode(HttpStatus.OK)
  async reconcileRequirement(
    @Param('id') progressId: string,
    @Body() body: ReconcileRequirementDto,
    @Req() req: AuthenticatedRequest,
  ) {
    try {
      const validated = ReconcileRequirementSchema.parse(body);
      return await this.requirementProgressService.reconcileRequirement(
        progressId,
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
      if (error instanceof ConflictException) {
        throw error;
      }
      throw error;
    }
  }

  @Get('child-scouts/:id/advancement-progress')
  @RequireTier('PARENT')
  @HttpCode(HttpStatus.OK)
  async getCubScoutProgress(
    @Param('id') childScoutId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.advancementProgressService.getChildAdvancementProgress(
      childScoutId,
      req.user!.userId,
      req.user!.authTier,
    );
  }
}
