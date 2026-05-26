import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthTier } from '@prisma/client';
import { AuthGuard, RequireTier, TierGuard } from '../middleware/auth';
import { ParentChildLinkService } from '../services/child-scout/parent-child-link.service';
import {
  RequestLinkSchema,
  type RequestLinkDto,
} from '../models/parent-link/request-link.dto';
import {
  ProcessLinkSchema,
  type ProcessLinkDto,
} from '../models/parent-link/process-link.dto';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    authTier: AuthTier;
  };
}

@Controller('parent-child-links')
@UseGuards(AuthGuard)
export class ParentChildLinkController {
  constructor(private readonly parentChildLinkService: ParentChildLinkService) {}

  @Get('my-cubs')
  @UseGuards(TierGuard)
  @RequireTier(AuthTier.PARENT)
  @HttpCode(HttpStatus.OK)
  async getMyLinkedCubScouts(@Req() req: AuthenticatedRequest) {
    return this.parentChildLinkService.getMyLinkedCubScouts(req.user!.userId);
  }

  @Get('requestable-cubs')
  @UseGuards(TierGuard)
  @RequireTier(AuthTier.PARENT)
  @HttpCode(HttpStatus.OK)
  async getRequestableCubScouts(@Req() req: AuthenticatedRequest) {
    return this.parentChildLinkService.getRequestableCubScouts(req.user!.userId);
  }

  @Post('request')
  @UseGuards(TierGuard)
  @RequireTier(AuthTier.PARENT)
  @HttpCode(HttpStatus.CREATED)
  async requestLink(
    @Req() req: AuthenticatedRequest,
    @Body() body: RequestLinkDto,
  ) {
    try {
      const validated = RequestLinkSchema.parse(body);
      return await this.parentChildLinkService.requestLink(req.user!.userId, validated);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        throw new BadRequestException({
          error: 'Invalid input',
          details: error.issues?.map((e: any) => e.message) || [],
        });
      }
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      throw error;
    }
  }

  @Get('pending')
  @UseGuards(TierGuard)
  @RequireTier(AuthTier.LEADER)
  @HttpCode(HttpStatus.OK)
  async getPendingLinks(
    @Req() req: AuthenticatedRequest,
    @Query('denId') denId?: string,
  ) {
    return this.parentChildLinkService.getPendingLinks(req.user!.userId, denId);
  }

  @Get('pending/filter-dens')
  @UseGuards(TierGuard)
  @RequireTier(AuthTier.LEADER)
  @HttpCode(HttpStatus.OK)
  async getPendingFilterDens(@Req() req: AuthenticatedRequest) {
    return this.parentChildLinkService.getPendingFilterDens(req.user!.userId);
  }

  @Post(':id/approve')
  @UseGuards(TierGuard)
  @RequireTier(AuthTier.LEADER)
  @HttpCode(HttpStatus.OK)
  async approveLink(
    @Req() req: AuthenticatedRequest,
    @Param('id') linkId: string,
  ) {
    return this.parentChildLinkService.approveLink(linkId, req.user!.userId);
  }

  @Post(':id/reject')
  @UseGuards(TierGuard)
  @RequireTier(AuthTier.LEADER)
  @HttpCode(HttpStatus.OK)
  async rejectLink(
    @Req() req: AuthenticatedRequest,
    @Param('id') linkId: string,
    @Body() body: ProcessLinkDto,
  ) {
    try {
      const validated = ProcessLinkSchema.parse(body);
      return this.parentChildLinkService.rejectLink(linkId, req.user!.userId, validated.reason);
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
}
