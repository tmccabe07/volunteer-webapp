/**
 * Admin Tasks Controller
 * 
 * Handles administrative task management, completion tracking,
 * and role assignments per User Story 7
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Req,
  Header
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard, TierGuard, RequireTier } from '../middleware/auth';
import { AdminTaskService } from '../services/admin-task.service';
import {
  createTaskSchema,
  updateTaskSchema,
  listTasksSchema,
  type ListAdminTasksInput,
  type CreateAdminTaskInput,
  type UpdateAdminTaskInput,
} from '../utils/validation/admin-task.schema';
import { AuthTier } from '@prisma/client';
import type { JWTPayload } from '../middleware/auth';

interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

@Controller('admin-tasks')
@UseGuards(AuthGuard)
export class AdminTasksController {
  constructor(private readonly adminTaskService: AdminTaskService) {}

  /**
   * GET /api/admin-tasks
   * List administrative tasks with filtering
   */
  @Get()
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  async listTasks(
    @Query() query: any,
    @Req() req: AuthenticatedRequest
  ) {
    try {
      const validatedQuery = listTasksSchema.parse(query);
      const currentUserId = req.user!.userId;
      const volunteerTier = req.user!.authTier as AuthTier;

      const result = await this.adminTaskService.listTasks(
        currentUserId,
        volunteerTier,
        validatedQuery
      );

      return result;
    } catch (error: any) {
      if (error.name === 'ZodError') {
        throw new BadRequestException({
          error: 'Invalid query parameters',
          details: error.issues?.map((e: any) => e.message) || []
        });
      }
      throw error;
    }
  }

  /**
   * GET /api/admin-tasks/:id
   * Get single administrative task details
   */
  @Get(':id')
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  async getTask(
    @Param('id') taskId: string,
    @Req() req: AuthenticatedRequest
  ) {
    try {
      const currentUserId = req.user!.userId;
      const volunteerTier = req.user!.authTier as AuthTier;

      const task = await this.adminTaskService.getTaskById(
        taskId,
        currentUserId,
        volunteerTier
      );

      return task;
    } catch (error: any) {
      if (error.message === 'Task not found') {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  /**
   * POST /api/admin-tasks
   * Create a new administrative task (Tier 2+ only)
   */
  @Post()
  @UseGuards(TierGuard)
  @RequireTier(AuthTier.LEADER)
  @HttpCode(HttpStatus.CREATED)
  async createTask(
    @Body() body: any,
    @Req() req: AuthenticatedRequest
  ) {
    try {
      const validatedData = createTaskSchema.parse(body);
      const createdById = req.user!.userId;

      const task = await this.adminTaskService.createTask(
        validatedData as CreateAdminTaskInput,
        createdById
      );

      // Transform response to match API contract
      return {
        id: task.id,
        name: task.name,
        description: task.description,
        dueDate: task.dueDate.toISOString(),
        completionSteps: task.completionSteps ? JSON.parse(task.completionSteps) : null,
        isPackWide: task.isPackWide,
        isRecurring: task.isRecurring,
        recurringEndDate: task.recurringEndDate?.toISOString() || null,
        assignedRoles: task.assignedRoles.map(ar => ar.role),
        createdById: task.createdById,
        createdAt: task.createdAt.toISOString(),
      };
    } catch (error: any) {
      if (error.name === 'ZodError') {
        throw new BadRequestException({
          error: 'Invalid input',
          details: error.issues?.map((e: any) => e.message) || []
        });
      }
      if (error.message?.includes('do not exist')) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  /**
   * PUT /api/admin-tasks/:id
   * Update an existing administrative task (Tier 2+ only)
   */
  @Put(':id')
  @UseGuards(TierGuard)
  @RequireTier(AuthTier.LEADER)
  async updateTask(
    @Param('id') taskId: string,
    @Body() body: any,
    @Req() req: AuthenticatedRequest
  ) {
    try {
      const validatedData = updateTaskSchema.parse(body);
      const updatedById = req.user!.userId;

      const task = await this.adminTaskService.updateTask(
        taskId,
        validatedData as UpdateAdminTaskInput,
        updatedById
      );

      // Transform response to match API contract
      return {
        id: task.id,
        name: task.name,
        description: task.description,
        dueDate: task.dueDate.toISOString(),
        completionSteps: task.completionSteps ? JSON.parse(task.completionSteps) : null,
        isPackWide: task.isPackWide,
        isRecurring: task.isRecurring,
        recurringEndDate: task.recurringEndDate?.toISOString() || null,
        assignedRoles: task.assignedRoles.map(ar => ar.role),
        createdById: task.createdById,
        createdAt: task.createdAt.toISOString(),
      };
    } catch (error: any) {
      if (error.name === 'ZodError') {
        throw new BadRequestException({
          error: 'Invalid input',
          details: error.issues?.map((e: any) => e.message) || []
        });
      }
      if (error.message === 'Task not found') {
        throw new NotFoundException(error.message);
      }
      if (error.message?.includes('do not exist')) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  /**
   * POST /api/admin-tasks/:id/complete
   * Mark task as complete for current user
   */
  @Post(':id/complete')
  @HttpCode(HttpStatus.CREATED)
  async completeTask(
    @Param('id') taskId: string,
    @Req() req: AuthenticatedRequest
  ) {
    try {
      const volunteerId = req.user!.userId;

      const completion = await this.adminTaskService.completeTask(taskId, volunteerId);

      return completion;
    } catch (error: any) {
      if (error.message === 'Task not found') {
        throw new NotFoundException(error.message);
      }
      if (error.message === 'Task not assigned to your roles') {
        throw new BadRequestException(error.message);
      }
      if (error.message === 'Task already marked complete') {
        throw new ConflictException(error.message);
      }
      throw error;
    }
  }

  /**
   * DELETE /api/admin-tasks/:id/complete
   * Undo task completion for current user
   */
  @Delete(':id/complete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async uncompleteTask(
    @Param('id') taskId: string,
    @Req() req: AuthenticatedRequest
  ) {
    try {
      const volunteerId = req.user!.userId;

      await this.adminTaskService.uncompleteTask(taskId, volunteerId);
    } catch (error: any) {
      if (error.message === 'Task not found') {
        throw new NotFoundException(error.message);
      }
      if (error.message === 'Task completion not found') {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  /**
   * DELETE /api/admin-tasks/:id
   * Delete a task (soft delete, Tier 2+ only)
   */
  @Delete(':id')
  @UseGuards(TierGuard)
  @RequireTier(AuthTier.LEADER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTask(
    @Param('id') taskId: string,
    @Req() req: AuthenticatedRequest
  ) {
    try {
      const deletedById = req.user!.userId;

      await this.adminTaskService.deleteTask(taskId, deletedById);
    } catch (error: any) {
      if (error.message === 'Task not found') {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  /**
   * GET /api/admin-tasks/:id/completions
   * Get all completion records for a task (Tier 2+ only)
   */
  @Get(':id/completions')
  @UseGuards(TierGuard)
  @RequireTier(AuthTier.LEADER)
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  async getTaskCompletions(@Param('id') taskId: string) {
    try {
      const completions = await this.adminTaskService.getTaskCompletions(taskId);

      return completions;
    } catch (error: any) {
      if (error.message === 'Task not found') {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }
}
