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
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard, TierGuard, RequireTier } from '../middleware/auth';
import {
  CreateDenChiefSchema,
  type CreateDenChiefDto,
} from '../models/den-chief/create-den-chief.dto';
import {
  AssignDenChiefSchema,
  type AssignDenChiefDto,
} from '../models/den-chief/assign-den-chief.dto';
import { DenChiefService } from '../services/den/den-chief.service';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
  };
}

@Controller('den-chiefs')
@UseGuards(AuthGuard, TierGuard)
export class DenChiefController {
  constructor(private readonly denChiefService: DenChiefService) {}

  @Post()
  @RequireTier('ADMIN')
  @HttpCode(HttpStatus.CREATED)
  async createDenChief(@Body() body: CreateDenChiefDto) {
    try {
      const validated = CreateDenChiefSchema.parse(body);
      return await this.denChiefService.createDenChief(validated);
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

  @Get()
  @RequireTier('LEADER')
  @HttpCode(HttpStatus.OK)
  async listDenChiefs() {
    return this.denChiefService.listDenChiefs();
  }

  @Post(':id/assign-den')
  @RequireTier('ADMIN')
  @HttpCode(HttpStatus.CREATED)
  async assignDen(
    @Req() req: AuthenticatedRequest,
    @Param('id') denChiefId: string,
    @Body() body: AssignDenChiefDto,
  ) {
    try {
      const validated = AssignDenChiefSchema.parse(body);
      return await this.denChiefService.assignDen(
        denChiefId,
        validated,
        req.user!.userId,
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

  @Delete(':id/assignments/:assignmentId')
  @RequireTier('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeAssignment(
    @Param('id') denChiefId: string,
    @Param('assignmentId') assignmentId: string,
  ) {
    await this.denChiefService.removeAssignment(denChiefId, assignmentId);
  }
}
