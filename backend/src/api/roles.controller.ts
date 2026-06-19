import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard, TierGuard, RequireTier } from '../middleware/auth';
import { RoleService } from '../services/roles/role.service';
import {
  AssignScopedRoleSchema,
  type AssignScopedRoleDto,
} from '../models/roles/assign-scoped-role.dto';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    authTier: 'PARENT' | 'LEADER' | 'ADMIN';
  };
}

@Controller('roles')
@UseGuards(AuthGuard, TierGuard)
export class RolesController {
  constructor(private readonly roleService: RoleService) {}

  @Post('assign-scoped')
  @RequireTier('ADMIN')
  @HttpCode(HttpStatus.CREATED)
  async assignScopedRole(@Body() body: AssignScopedRoleDto) {
    try {
      const validated = AssignScopedRoleSchema.parse(body);
      return await this.roleService.assignScopedRole(validated);
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

  @Get('assignments')
  @RequireTier('ADMIN')
  @HttpCode(HttpStatus.OK)
  async listAssignments(@Query('volunteerId') volunteerId?: string) {
    return this.roleService.listAssignments(volunteerId);
  }

  @Delete('assignments/:id')
  @RequireTier('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeAssignment(
    @Req() _req: AuthenticatedRequest,
    @Param('id') assignmentId: string,
  ) {
    await this.roleService.removeAssignment(assignmentId);
  }
}
