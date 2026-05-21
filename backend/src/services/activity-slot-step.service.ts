/**
 * ActivitySlotStepService
 * 
 * Handles CRUD operations for activity slot steps, including:
 * - Adding steps with auto-calculated orderIndex
 * - Removing steps with automatic renumbering
 * - Reordering steps with batch updates
 * - Validation of max 20 steps per slot
 */

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import prisma from '../utils/prisma';
import { MAX_STEPS_PER_ACTIVITY_SLOT } from '../utils/validation/activity-slot-step.schema';
import type { CreateActivitySlotStepInput } from '../utils/validation/activity-slot-step.schema';

@Injectable()
export class ActivitySlotStepService {
  /**
   * Add a new step to an activity slot
   * Automatically calculates orderIndex as max(existing) + 1
   * Validates max 20 steps per activity slot
   * 
   * @param activitySlotId - The activity slot ID to add step to
   * @param stepText - The step instruction text
   * @returns Created step with orderIndex
   * @throws BadRequestException if max steps exceeded or activity slot not found
   */
  async addStep(activitySlotId: string, stepText: string) {
    // Verify activity slot exists
    const activitySlot = await prisma.activitySlot.findUnique({
      where: { id: activitySlotId },
      include: {
        steps: {
          select: { orderIndex: true },
        },
      },
    });

    if (!activitySlot) {
      throw new NotFoundException(`Activity slot with ID ${activitySlotId} not found`);
    }

    // Check max steps constraint
    if (activitySlot.steps.length >= MAX_STEPS_PER_ACTIVITY_SLOT) {
      throw new BadRequestException(
        `Cannot add more than ${MAX_STEPS_PER_ACTIVITY_SLOT} steps per activity slot`
      );
    }

    // Calculate next orderIndex (0-based)
    const maxOrderIndex = activitySlot.steps.length > 0
      ? Math.max(...activitySlot.steps.map(s => s.orderIndex))
      : -1;
    const nextOrderIndex = maxOrderIndex + 1;

    // Create the step
    const step = await prisma.activitySlotStep.create({
      data: {
        activitySlotId,
        orderIndex: nextOrderIndex,
        stepText,
      },
    });

    return step;
  }

  /**
   * Remove a step from an activity slot
   * Automatically renumbers remaining steps to maintain sequential ordering
   * Uses a transaction to ensure atomicity
   * 
   * @param stepId - The step ID to remove
   * @returns void
   * @throws NotFoundException if step not found
   */
  async removeStep(stepId: string) {
    const step = await prisma.activitySlotStep.findUnique({
      where: { id: stepId },
    });

    if (!step) {
      throw new NotFoundException(`Step with ID ${stepId} not found`);
    }

    // Use transaction to delete step and renumber remaining steps atomically
    await prisma.$transaction(async (tx) => {
      // Delete the step
      await tx.activitySlotStep.delete({
        where: { id: stepId },
      });

      // Get remaining steps with orderIndex > deleted step's orderIndex
      const stepsToRenumber = await tx.activitySlotStep.findMany({
        where: {
          activitySlotId: step.activitySlotId,
          orderIndex: { gt: step.orderIndex },
        },
        orderBy: { orderIndex: 'asc' },
      });

      // Renumber remaining steps (decrement orderIndex by 1)
      for (const stepToRenumber of stepsToRenumber) {
        await tx.activitySlotStep.update({
          where: { id: stepToRenumber.id },
          data: { orderIndex: stepToRenumber.orderIndex - 1 },
        });
      }
    });
  }

  /**
   * Reorder steps within an activity slot
   * Updates orderIndex for all provided steps in a single transaction
   * Uses a two-phase approach to avoid unique constraint violations
   * 
   * @param activitySlotId - The activity slot ID
   * @param stepIds - Array of step IDs in desired order
   * @returns Updated steps in new order
   * @throws BadRequestException if step count mismatch or steps don't belong to slot
   */
  async reorderSteps(activitySlotId: string, stepIds: string[]) {
    // Verify activity slot exists
    const activitySlot = await prisma.activitySlot.findUnique({
      where: { id: activitySlotId },
      include: {
        steps: {
          select: { id: true },
        },
      },
    });

    if (!activitySlot) {
      throw new NotFoundException(`Activity slot with ID ${activitySlotId} not found`);
    }

    // Verify all provided step IDs belong to this activity slot
    const existingStepIds = new Set(activitySlot.steps.map(s => s.id));
    const invalidStepIds = stepIds.filter(id => !existingStepIds.has(id));

    if (invalidStepIds.length > 0) {
      throw new BadRequestException(
        `Steps ${invalidStepIds.join(', ')} do not belong to activity slot ${activitySlotId}`
      );
    }

    // Verify step count matches (all steps must be reordered)
    if (stepIds.length !== activitySlot.steps.length) {
      throw new BadRequestException(
        `Must provide all ${activitySlot.steps.length} step IDs for reordering`
      );
    }

    // Two-phase update to avoid unique constraint violations:
    // Phase 1: Set all steps to temporary negative orderIndex values
    // Phase 2: Set final orderIndex values
    await prisma.$transaction(async (tx) => {
      // Phase 1: Temporarily set all steps to negative indices
      for (let i = 0; i < stepIds.length; i++) {
        await tx.activitySlotStep.update({
          where: { id: stepIds[i] },
          data: { orderIndex: -(i + 1) }, // -1, -2, -3, etc.
        });
      }

      // Phase 2: Set final orderIndex values
      for (let i = 0; i < stepIds.length; i++) {
        await tx.activitySlotStep.update({
          where: { id: stepIds[i] },
          data: { orderIndex: i },
        });
      }
    });

    // Return reordered steps
    return this.getStepsBySlot(activitySlotId);
  }

  /**
   * Get all steps for an activity slot, ordered by orderIndex
   * 
   * @param activitySlotId - The activity slot ID
   * @returns Array of steps in order
   */
  async getStepsBySlot(activitySlotId: string) {
    const steps = await prisma.activitySlotStep.findMany({
      where: { activitySlotId },
      orderBy: { orderIndex: 'asc' },
    });

    return steps;
  }

  /**
   * Update a step's text
   * 
   * @param stepId - The step ID to update
   * @param stepText - The new step text
   * @returns Updated step
   * @throws NotFoundException if step not found
   */
  async updateStep(stepId: string, stepText: string) {
    const step = await prisma.activitySlotStep.findUnique({
      where: { id: stepId },
    });

    if (!step) {
      throw new NotFoundException(`Step with ID ${stepId} not found`);
    }

    return prisma.activitySlotStep.update({
      where: { id: stepId },
      data: { stepText },
    });
  }
}
