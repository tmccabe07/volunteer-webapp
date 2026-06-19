import {
  BadRequestException,
  Body,
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
import { PromptCategory, PromptStatus } from '@prisma/client';
import { AuthGuard, RequireTier, TierGuard, type JWTPayload } from '../middleware/auth';
import {
  GeneratePromptsSchema,
  type GeneratePromptsDto,
} from '../models/hours-prompt/generate-prompts.dto';
import {
  UpdatePromptSchema,
  type UpdatePromptDto,
} from '../models/hours-prompt/update-prompt.dto';
import { ScoutbookPromptService } from '../services/hours-prompt/scoutbook-prompt.service';

interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

@Controller()
@UseGuards(AuthGuard, TierGuard)
export class ScoutbookPromptController {
  constructor(private readonly scoutbookPromptService: ScoutbookPromptService) {}

  @Post('events/:id/generate-prompts')
  @RequireTier('LEADER')
  @HttpCode(HttpStatus.CREATED)
  async generatePrompts(
    @Param('id') eventId: string,
    @Body() body: GeneratePromptsDto,
  ) {
    try {
      const validated = GeneratePromptsSchema.parse(body);
      return await this.scoutbookPromptService.generatePrompts(eventId, validated);
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'name' in error && (error as { name?: string }).name === 'ZodError') {
        const zodError = error as { issues?: Array<{ message: string }> };
        throw new BadRequestException({
          error: 'Invalid input',
          details: zodError.issues?.map((issue) => issue.message) || [],
        });
      }
      throw error;
    }
  }

  @Get('scoutbook-prompts')
  @HttpCode(HttpStatus.OK)
  async listPrompts(
    @Req() req: AuthenticatedRequest,
    @Query('childScoutId') childScoutId?: string,
    @Query('denId') denId?: string,
    @Query('status') status?: string,
    @Query('category') category?: string,
  ) {
    const parsedStatus = status ? PromptStatus[status as keyof typeof PromptStatus] : undefined;
    const parsedCategory = category ? PromptCategory[category as keyof typeof PromptCategory] : undefined;

    if (status && !parsedStatus) {
      throw new BadRequestException('Invalid prompt status');
    }

    if (category && !parsedCategory) {
      throw new BadRequestException('Invalid prompt category');
    }

    return this.scoutbookPromptService.listPrompts(req.user!.userId, req.user!.authTier, {
      childScoutId,
      denId,
      status: parsedStatus,
      category: parsedCategory,
    });
  }

  @Patch('scoutbook-prompts/:id/acknowledge')
  @RequireTier('PARENT')
  @HttpCode(HttpStatus.OK)
  async acknowledgePrompt(
    @Req() req: AuthenticatedRequest,
    @Param('id') promptId: string,
    @Body() body: UpdatePromptDto,
  ) {
    try {
      UpdatePromptSchema.parse(body || {});
      return await this.scoutbookPromptService.acknowledgePrompt(
        promptId,
        req.user!.userId,
        req.user!.authTier,
      );
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'name' in error && (error as { name?: string }).name === 'ZodError') {
        const zodError = error as { issues?: Array<{ message: string }> };
        throw new BadRequestException({
          error: 'Invalid input',
          details: zodError.issues?.map((issue) => issue.message) || [],
        });
      }
      throw error;
    }
  }

  @Patch('scoutbook-prompts/:id/dismiss')
  @RequireTier('PARENT')
  @HttpCode(HttpStatus.OK)
  async dismissPrompt(
    @Req() req: AuthenticatedRequest,
    @Param('id') promptId: string,
    @Body() body: UpdatePromptDto,
  ) {
    try {
      UpdatePromptSchema.parse(body || {});
      return await this.scoutbookPromptService.dismissPrompt(
        promptId,
        req.user!.userId,
        req.user!.authTier,
      );
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'name' in error && (error as { name?: string }).name === 'ZodError') {
        const zodError = error as { issues?: Array<{ message: string }> };
        throw new BadRequestException({
          error: 'Invalid input',
          details: zodError.issues?.map((issue) => issue.message) || [],
        });
      }
      throw error;
    }
  }
}
