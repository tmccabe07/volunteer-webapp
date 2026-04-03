import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import prisma from '../utils/prisma';
import { CreateActivityInput, UpdateActivityInput } from '../utils/validation/activity.schema';

/**
 * ActivityTypeService handles CRUD operations for activity types
 * per User Story 5 - Activity Configuration
 */
@Injectable()
export class ActivityTypeService {
  /**
   * Get all active (non-deleted) activity types
   * @returns List of activity types with id, name, pointValue, category, description
   */
  async getAllActivityTypes() {
    const activityTypes = await prisma.activityType.findMany({
      where: {
        deletedAt: null, // Only active activity types
      },
      select: {
        id: true,
        name: true,
        pointValue: true,
        category: true,
        description: true,
      },
      orderBy: {
        category: 'asc', // Sort by category for better UX
      },
    });

    return { activityTypes };
  }

  /**
   * Create a new activity type
   * @param data Activity type data (name, pointValue, category, description)
   * @param createdById User ID creating the activity type
   * @returns Created activity type
   * @throws ConflictException if activity type with the same name already exists
   */
  async createActivityType(data: CreateActivityInput, createdById: string) {
    // Check if activity type with same name already exists (including soft-deleted ones)
    const existing = await prisma.activityType.findUnique({
      where: { name: data.name },
    });

    if (existing && existing.deletedAt === null) {
      throw new ConflictException('Activity type with this name already exists');
    }

    // Create activity type
    const activityType = await prisma.activityType.create({
      data: {
        name: data.name,
        pointValue: data.pointValue,
        category: data.category,
        description: data.description || null,
      },
      select: {
        id: true,
        name: true,
        pointValue: true,
        category: true,
        description: true,
        createdAt: true,
      },
    });

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        userId: createdById,
        action: 'CREATE_ACTIVITY_TYPE',
        entityType: 'ActivityType',
        entityId: activityType.id,
        changes: data,
      },
    });

    return activityType;
  }

  /**
   * Update an existing activity type
   * @param id Activity type ID
   * @param data Updated fields (name, pointValue, category, description)
   * @param updatedById User ID updating the activity type
   * @returns Updated activity type
   * @throws NotFoundException if activity type does not exist
   * @throws ConflictException if updated name conflicts with existing activity type
   */
  async updateActivityType(id: string, data: UpdateActivityInput, updatedById: string) {
    // Check if activity type exists and is not deleted
    const existing = await prisma.activityType.findUnique({
      where: { id },
    });

    if (!existing || existing.deletedAt !== null) {
      throw new NotFoundException('Activity type not found');
    }

    // If name is being updated, check for conflicts
    if (data.name && data.name !== existing.name) {
      const nameConflict = await prisma.activityType.findUnique({
        where: { name: data.name },
      });

      if (nameConflict && nameConflict.id !== id && nameConflict.deletedAt === null) {
        throw new ConflictException('Activity type with this name already exists');
      }
    }

    // Update activity type
    const activityType = await prisma.activityType.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.pointValue !== undefined && { pointValue: data.pointValue }),
        ...(data.category && { category: data.category }),
        ...(data.description !== undefined && { description: data.description }),
      },
      select: {
        id: true,
        name: true,
        pointValue: true,
        category: true,
        description: true,
        createdAt: true,
      },
    });

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        userId: updatedById,
        action: 'UPDATE_ACTIVITY_TYPE',
        entityType: 'ActivityType',
        entityId: id,
        changes: data,
      },
    });

    return activityType;
  }

  /**
   * Soft delete an activity type
   * Prevents deletion if activity type is referenced by future events
   * @param id Activity type ID
   * @param deletedById User ID deleting the activity type
   * @throws NotFoundException if activity type does not exist
   * @throws ConflictException if activity type is in use by future events
   */
  async deleteActivityType(id: string, deletedById: string) {
    // Check if activity type exists and is not already deleted
    const existing = await prisma.activityType.findUnique({
      where: { id },
    });

    if (!existing || existing.deletedAt !== null) {
      throw new NotFoundException('Activity type not found');
    }

    // Check if activity type is in use by future events
    const futureEvents = await prisma.activitySlot.findFirst({
      where: {
        activityTypeId: id,
        event: {
          eventDate: {
            gte: new Date(), // Future events only
          },
        },
      },
    });

    if (futureEvents) {
      throw new ConflictException('Cannot delete activity type that is in use by future events');
    }

    // Soft delete the activity type
    await prisma.activityType.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        userId: deletedById,
        action: 'DELETE_ACTIVITY_TYPE',
        entityType: 'ActivityType',
        entityId: id,
        changes: { deletedAt: new Date() },
      },
    });
  }
}
