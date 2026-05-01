/**
 * AdminTaskService
 * 
 * Handles administrative task CRUD operations, role assignment logic,
 * completion tracking, and recurring task year-end logic per User Story 7
 */

import { Injectable } from '@nestjs/common';
import prisma from '../utils/prisma';
import type { AuthTier } from '@prisma/client';

export interface CreateAdminTaskInput {
  name: string;
  description?: string;
  dueDate: string;
  completionSteps?: Array<{ step: string; url?: string }>;
  isPackWide?: boolean;
  assignedRoleIds?: string[];
  isRecurring?: boolean;
}

export interface UpdateAdminTaskInput {
  name?: string;
  description?: string;
  dueDate?: string;
  completionSteps?: Array<{ step: string; url?: string }>;
  isPackWide?: boolean;
  assignedRoleIds?: string[];
  isRecurring?: boolean;
}

export interface ListAdminTasksInput {
  page?: number;
  limit?: number;
  assignedToMe?: boolean;
  status?: 'complete' | 'incomplete' | 'overdue';
  taskId?: string;
}

@Injectable()
export class AdminTaskService {
  /**
   * Create a new administrative task
   * Auto-sets recurringEndDate from PackConfig if isRecurring=true
   */
  async createTask(data: CreateAdminTaskInput, createdById: string) {
    const { completionSteps, assignedRoleIds, ...taskData } = data;

    // Validate assigned roles exist if provided
    if (assignedRoleIds && assignedRoleIds.length > 0) {
      const existingRoles = await prisma.volunteerRole.findMany({
        where: {
          id: { in: assignedRoleIds },
          deletedAt: null,
        },
      });

      if (existingRoles.length !== assignedRoleIds.length) {
        throw new Error('One or more assigned roles do not exist');
      }
    }

    // Get recurring end date from pack config if recurring
    let recurringEndDate: Date | null = null;
    if (data.isRecurring) {
      const packConfig = await prisma.packConfig.findFirst();
      if (packConfig) {
        recurringEndDate = packConfig.yearEndDate;
      }
    }

    // Convert completionSteps to JSON string if provided
    const completionStepsJson = completionSteps ? JSON.stringify(completionSteps) : null;

    // Create task with role assignments
    const task = await prisma.adminTask.create({
      data: {
        ...taskData,
        dueDate: new Date(data.dueDate),
        completionSteps: completionStepsJson,
        recurringEndDate,
        createdById,
        assignedRoles: assignedRoleIds
          ? {
              create: assignedRoleIds.map(roleId => ({ roleId })),
            }
          : undefined,
      },
      include: {
        assignedRoles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Create audit log
    await this.createAuditLog(createdById, 'CREATE_ADMIN_TASK', 'AdminTask', task.id, {
      taskName: task.name,
    });

    return task;
  }

  /**
   * Update an existing administrative task
   */
  async updateTask(taskId: string, data: UpdateAdminTaskInput, updatedById: string) {
    // Check if task exists
    const existingTask = await prisma.adminTask.findUnique({
      where: { id: taskId, deletedAt: null },
    });

    if (!existingTask) {
      throw new Error('Task not found');
    }

    const { completionSteps, assignedRoleIds, ...taskData } = data;

    // Validate assigned roles if provided
    if (assignedRoleIds && assignedRoleIds.length > 0) {
      const existingRoles = await prisma.volunteerRole.findMany({
        where: {
          id: { in: assignedRoleIds },
          deletedAt: null,
        },
      });

      if (existingRoles.length !== assignedRoleIds.length) {
        throw new Error('One or more assigned roles do not exist');
      }

      // Delete existing role assignments and create new ones
      await prisma.adminTaskToRole.deleteMany({
        where: { taskId },
      });
    }

    // Update recurring end date if isRecurring changed
    let recurringEndDate: Date | null | undefined = undefined;
    if (data.isRecurring === true && !existingTask.recurringEndDate) {
      const packConfig = await prisma.packConfig.findFirst();
      if (packConfig) {
        recurringEndDate = packConfig.yearEndDate;
      }
    } else if (data.isRecurring === false) {
      recurringEndDate = null;
    }

    // Convert completionSteps to JSON string if provided
    const completionStepsJson = completionSteps ? JSON.stringify(completionSteps) : undefined;

    const task = await prisma.adminTask.update({
      where: { id: taskId },
      data: {
        ...taskData,
        ...(data.dueDate && { dueDate: new Date(data.dueDate) }),
        ...(completionStepsJson !== undefined && { completionSteps: completionStepsJson }),
        ...(recurringEndDate !== undefined && { recurringEndDate }),
        assignedRoles: assignedRoleIds
          ? {
              create: assignedRoleIds.map(roleId => ({ roleId })),
            }
          : undefined,
      },
      include: {
        assignedRoles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Create audit log
    await this.createAuditLog(updatedById, 'UPDATE_ADMIN_TASK', 'AdminTask', task.id, {
      taskName: task.name,
    });

    return task;
  }

  /**
   * List administrative tasks with filtering
   */
  async listTasks(
    volunteerId: string,
    volunteerTier: AuthTier,
    filters: ListAdminTasksInput = {}
  ) {
    const {
      page = 1,
      limit = 20,
      assignedToMe,
      status,
      taskId,
    } = filters;

    const skip = (page - 1) * limit;
    const now = new Date();

    // Build where clause
    const where: any = {
      deletedAt: null,
    };

    // Filter by task ID if provided
    if (taskId) {
      where.id = taskId;
    }

    // Filter by assignment if assignedToMe is specified
    // Default: true for PARENT tier, false for LEADER/ADMIN
    const shouldFilterByAssignment = assignedToMe ?? (volunteerTier === 'PARENT');

    if (shouldFilterByAssignment) {
      // Get volunteer's roles
      const volunteer = await prisma.volunteer.findUnique({
        where: { id: volunteerId },
        include: {
          volunteerRoles: {
            where: { removedAt: null },
            select: { roleId: true },
          },
        },
      });

      const roleIds = volunteer?.volunteerRoles.map(vr => vr.roleId) || [];

      // Tasks assigned to user's roles OR pack-wide tasks
      where.OR = [
        { isPackWide: true },
        {
          assignedRoles: {
            some: {
              roleId: { in: roleIds },
            },
          },
        },
      ];
    }

    // Get tasks with completion status
    const tasks = await prisma.adminTask.findMany({
      where,
      skip,
      take: limit,
      include: {
        assignedRoles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        completions: {
          where: {
            volunteerId,
          },
          select: {
            id: true,
            completedAt: true,
            isComplete: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        dueDate: 'asc',
      },
    });

    // Filter by status if specified
    let filteredTasks = tasks.map(task => {
      const currentUserCompletion = task.completions[0] || null;
      const isOverdue = task.dueDate < now && !currentUserCompletion;

      return {
        ...task,
        currentUserCompletion,
        isOverdue,
      };
    });

    if (status === 'complete') {
      filteredTasks = filteredTasks.filter(t => t.currentUserCompletion !== null);
    } else if (status === 'incomplete') {
      filteredTasks = filteredTasks.filter(t => t.currentUserCompletion === null);
    } else if (status === 'overdue') {
      filteredTasks = filteredTasks.filter(t => t.isOverdue);
    }

    // Get total count for pagination
    const total = await prisma.adminTask.count({ where });

    return {
      tasks: filteredTasks.map(task => ({
        id: task.id,
        name: task.name,
        description: task.description,
        dueDate: task.dueDate.toISOString(),
        isOverdue: task.isOverdue,
        completionSteps: task.completionSteps ? JSON.parse(task.completionSteps) : null,
        isPackWide: task.isPackWide,
        isRecurring: task.isRecurring,
        recurringEndDate: task.recurringEndDate?.toISOString() || null,
        assignedRoles: task.assignedRoles.map(ar => ar.role),
        currentUserCompletion: task.currentUserCompletion,
        createdBy: task.createdBy,
        createdAt: task.createdAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
      },
    };
  }

  /**
   * Get a single administrative task by ID
   */
  async getTaskById(taskId: string, volunteerId: string, volunteerTier: AuthTier) {
    const task = await prisma.adminTask.findUnique({
      where: { id: taskId, deletedAt: null },
      include: {
        assignedRoles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        completions: volunteerTier !== 'PARENT'
          ? {
              include: {
                volunteer: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            }
          : {
              where: { volunteerId },
              select: {
                id: true,
                volunteerId: true,  // Need this to find currentUserCompletion
                completedAt: true,
                isComplete: true,
              },
            },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!task) {
      throw new Error('Task not found');
    }

    const currentUserCompletion =
      task.completions.find((c: any) => c.volunteerId === volunteerId || c.volunteer?.id === volunteerId) || null;
    const isOverdue = task.dueDate < new Date() && !currentUserCompletion;

    return {
      id: task.id,
      name: task.name,
      description: task.description,
      dueDate: task.dueDate.toISOString(),
      isOverdue,
      completionSteps: task.completionSteps ? JSON.parse(task.completionSteps) : null,
      isPackWide: task.isPackWide,
      isRecurring: task.isRecurring,
      recurringEndDate: task.recurringEndDate?.toISOString() || null,
      assignedRoles: task.assignedRoles.map(ar => ar.role),
      completions: volunteerTier !== 'PARENT' ? task.completions : null,
      currentUserCompletion: currentUserCompletion ? { 
        id: currentUserCompletion.id, 
        completedAt: currentUserCompletion.completedAt.toISOString(), 
        isComplete: currentUserCompletion.isComplete 
      } : null,
      createdBy: task.createdBy,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    };
  }

  /**
   * Mark task as complete for current user
   */
  async completeTask(taskId: string, volunteerId: string) {
    // Check if task exists
    const task = await prisma.adminTask.findUnique({
      where: { id: taskId, deletedAt: null },
      include: {
        assignedRoles: true,
      },
    });

    if (!task) {
      throw new Error('Task not found');
    }

    // Check if task is assigned to user (either pack-wide or user has matching role)
    if (!task.isPackWide) {
      const volunteer = await prisma.volunteer.findUnique({
        where: { id: volunteerId },
        include: {
          volunteerRoles: {
            where: { removedAt: null },
            select: { roleId: true },
          },
        },
      });

      const userRoleIds = volunteer?.volunteerRoles.map(vr => vr.roleId) || [];
      const assignedRoleIds = task.assignedRoles.map(ar => ar.roleId);
      const hasMatchingRole = assignedRoleIds.some(roleId => userRoleIds.includes(roleId));

      if (!hasMatchingRole) {
        throw new Error('Task not assigned to your roles');
      }
    }

    // Check if already completed
    const existingCompletion = await prisma.taskCompletion.findUnique({
      where: {
        taskId_volunteerId: {
          taskId,
          volunteerId,
        },
      },
    });

    if (existingCompletion) {
      throw new Error('Task already marked complete');
    }

    // Create completion record
    const completion = await prisma.taskCompletion.create({
      data: {
        taskId,
        volunteerId,
        isComplete: true,
      },
    });

    // Create notification
    await prisma.notification.create({
      data: {
        volunteerId,
        type: 'TASK_COMPLETION',
        message: `You completed: ${task.name}`,
      },
    });

    return {
      id: completion.id,
      taskId: completion.taskId,
      volunteerId: completion.volunteerId,
      completedAt: completion.completedAt.toISOString(),
      isComplete: completion.isComplete,
    };
  }

  /**
   * Undo task completion for current user
   */
  async uncompleteTask(taskId: string, volunteerId: string) {
    // Check if task exists
    const task = await prisma.adminTask.findUnique({
      where: { id: taskId, deletedAt: null },
    });

    if (!task) {
      throw new Error('Task not found');
    }

    // Check if completion exists
    const completion = await prisma.taskCompletion.findUnique({
      where: {
        taskId_volunteerId: {
          taskId,
          volunteerId,
        },
      },
    });

    if (!completion) {
      throw new Error('Task completion not found');
    }

    // Delete the completion record
    await prisma.taskCompletion.delete({
      where: {
        taskId_volunteerId: {
          taskId,
          volunteerId,
        },
      },
    });
  }

  /**
   * Delete a task (soft delete)
   */
  async deleteTask(taskId: string, deletedById: string) {
    const task = await prisma.adminTask.findUnique({
      where: { id: taskId, deletedAt: null },
    });

    if (!task) {
      throw new Error('Task not found');
    }

    await prisma.adminTask.update({
      where: { id: taskId },
      data: {
        deletedAt: new Date(),
      },
    });

    // Create audit log
    await this.createAuditLog(deletedById, 'DELETE_ADMIN_TASK', 'AdminTask', task.id, {
      taskName: task.name,
    });
  }

  /**
   * Get task completions (for leaders/admins)
   */
  async getTaskCompletions(taskId: string) {
    const task = await prisma.adminTask.findUnique({
      where: { id: taskId, deletedAt: null },
      include: {
        assignedRoles: {
          include: {
            role: true,
          },
        },
        completions: {
          include: {
            volunteer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!task) {
      throw new Error('Task not found');
    }

    // Get all volunteers with matching roles who haven't completed
    const assignedRoleIds = task.assignedRoles.map(ar => ar.roleId);
    const assignedVolunteers = task.isPackWide
      ? await prisma.volunteer.findMany({
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
            email: true,
            volunteerRoles: {
              where: { removedAt: null },
              include: {
                role: {
                  select: { name: true },
                },
              },
            },
          },
        })
      : await prisma.volunteer.findMany({
          where: {
            deletedAt: null,
            volunteerRoles: {
              some: {
                roleId: { in: assignedRoleIds },
                removedAt: null,
              },
            },
          },
          select: {
            id: true,
            name: true,
            email: true,
            volunteerRoles: {
              where: { removedAt: null },
              include: {
                role: {
                  select: { name: true },
                },
              },
            },
          },
        });

    const completedVolunteerIds = task.completions.map(c => c.volunteerId);
    const incompleteVolunteers = assignedVolunteers.filter(
      v => !completedVolunteerIds.includes(v.id)
    );

    const totalAssigned = assignedVolunteers.length;
    const totalCompleted = task.completions.length;
    const completionRate = totalAssigned > 0 ? (totalCompleted / totalAssigned) * 100 : 0;

    return {
      task: {
        id: task.id,
        name: task.name,
        dueDate: task.dueDate.toISOString(),
      },
      completions: task.completions.map(c => ({
        id: c.id,
        volunteer: c.volunteer,
        completedAt: c.completedAt.toISOString(),
        isComplete: c.isComplete,
      })),
      assignedVolunteers: incompleteVolunteers.map(v => ({
        id: v.id,
        name: v.name,
        email: v.email,
        roles: v.volunteerRoles.map(vr => ({ name: vr.role.name })),
      })),
      stats: {
        totalAssigned,
        totalCompleted,
        completionRate: Math.round(completionRate),
      },
    };
  }

  /**
   * Helper to create audit log entries
   */
  private async createAuditLog(
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    changes?: any,
  ) {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action,
          entityType,
          entityId,
          changes: changes ? JSON.stringify(changes) : undefined,
        },
      });
    } catch (error) {
      // Log error but don't fail the operation
      console.error('Failed to create audit log:', error);
    }
  }
}
