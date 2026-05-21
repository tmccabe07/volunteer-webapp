/**
 * Activity Slot Steps Controller
 * 
 * Handles step CRUD operations for activity slots:
 * - POST /api/activity-slots/:id/steps - Add a step
 * - DELETE /api/activity-slots/:slotId/steps/:stepId - Remove a step
 * - PATCH /api/activity-slots/:id/steps/reorder - Reorder steps
 * - GET /api/activity-slots/:id/steps - Get all steps for a slot
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard, TierGuard, RequireTier } from '../middleware/auth';
import { ActivitySlotStepService } from '../services/activity-slot-step.service';
import {
  createActivitySlotStepSchema,
  reorderActivitySlotStepsSchema,
  type CreateActivitySlotStepInput,
  type ReorderActivitySlotStepsInput,
} from '../utils/validation/activity-slot-step.schema';
import { AuthTier } from '@prisma/client';
import { ZodError } from 'zod';

@Controller('activity-slots')
@UseGuards(AuthGuard)
export class ActivitySlotStepsController {
  constructor(private readonly activitySlotStepService: ActivitySlotStepService) {}

  /**
   * POST /api/activity-slots/:id/steps
   * Add a new step to an activity slot
   * Requires LEADER tier
   */
  @Post(':id/steps')
  @UseGuards(TierGuard)
  @RequireTier(AuthTier.LEADER)
  @HttpCode(HttpStatus.CREATED)
  async addStep(
    @Param('id') activitySlotId: string,
    @Body() body: CreateActivitySlotStepInput
  ) {
    try {
      const validatedData = createActivitySlotStepSchema.parse(body);
      const step = await this.activitySlotStepService.addStep(
        activitySlotId,
        validatedData.stepText
      );

      return {
        message: 'Step added successfully',
        step,
      };
    } catch (error) {
      if (error instanceof ZodError) {
        const firstError = error.issues[0];
        throw new BadRequestException(firstError.message);
      }
      throw error;
    }
  }

  /**
   * GET /api/activity-slots/:id/steps
   * Get all steps for an activity slot in order
   */
  @Get(':id/steps')
  async getSteps(@Param('id') activitySlotId: string) {
    const steps = await this.activitySlotStepService.getStepsBySlot(activitySlotId);
    return {
      steps,
      total: steps.length,
    };
  }

  /**
   * DELETE /api/activity-slots/:slotId/steps/:stepId
   * Remove a step and renumber remaining steps
   * Requires LEADER tier
   */
  @Delete(':slotId/steps/:stepId')
  @UseGuards(TierGuard)
  @RequireTier(AuthTier.LEADER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeStep(
    @Param('slotId') activitySlotId: string,
    @Param('stepId') stepId: string
  ) {
    await this.activitySlotStepService.removeStep(stepId);
  }

  /**
   * PATCH /api/activity-slots/:id/steps/reorder
   * Reorder steps within an activity slot
   * Requires LEADER tier
   */
  @Patch(':id/steps/reorder')
  @UseGuards(TierGuard)
  @RequireTier(AuthTier.LEADER)
  async reorderSteps(
    @Param('id') activitySlotId: string,
    @Body() body: ReorderActivitySlotStepsInput
  ) {
    try {
      const validatedData = reorderActivitySlotStepsSchema.parse(body);
      const steps = await this.activitySlotStepService.reorderSteps(
        activitySlotId,
        validatedData.stepIds
      );

      return {
        message: 'Steps reordered successfully',
        steps,
      };
    } catch (error) {
      if (error instanceof ZodError) {
        const firstError = error.issues[0];
        throw new BadRequestException(firstError.message);
      }
      throw error;
    }
  }
}
