import {
  BadRequestException,
  Body,
  Controller,
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
import { AwardState, AuthTier } from '@prisma/client';
import { AuthGuard, RequireTier, TierGuard, type JWTPayload } from '../middleware/auth';
import { AwardFulfillmentService } from '../services/awards/award-fulfillment.service';
import {
  TransitionAwardSchema,
  type TransitionAwardDto,
} from '../models/awards/transition-award.dto';
import {
  BatchTransitionSchema,
  type BatchTransitionDto,
} from '../models/awards/batch-transition.dto';
import {
  AdjustInventorySchema,
  type AdjustInventoryDto,
} from '../models/awards/adjust-inventory.dto';
import {
  CreateInventoryItemSchema,
  type CreateInventoryItemDto,
} from '../models/awards/create-inventory-item.dto';
import {
  CreateSpecialAwardSchema,
  type CreateSpecialAwardDto,
} from '../models/awards/create-special-award.dto';
import { InventoryService } from '../services/awards/inventory.service';
import { SpecialAwardService } from '../services/awards/special-award.service';

interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

type AwardQueueType = 'TO_PURCHASE' | 'TO_AWARD' | 'SCOUTBOOK_FOLLOW_UP';

@Controller()
@UseGuards(AuthGuard, TierGuard)
@RequireTier(AuthTier.LEADER)
export class AwardController {
  constructor(
    private readonly awardFulfillmentService: AwardFulfillmentService,
    private readonly inventoryService: InventoryService,
    private readonly specialAwardService: SpecialAwardService,
  ) {}

  @Get('awards')
  @HttpCode(HttpStatus.OK)
  async getAwards(
    @Req() req: AuthenticatedRequest,
    @Query('state') state?: string,
    @Query('childScoutId') childScoutId?: string,
    @Query('adventureId') adventureId?: string,
    @Query('denId') denId?: string,
    @Query('queueType') queueType?: string,
  ) {
    const parsedState = state ? AwardState[state as keyof typeof AwardState] : undefined;
    if (state && !parsedState) {
      throw new BadRequestException('Invalid award state');
    }

    const parsedQueueType = queueType as AwardQueueType | undefined;
    if (
      queueType &&
      parsedQueueType !== 'TO_PURCHASE' &&
      parsedQueueType !== 'TO_AWARD' &&
      parsedQueueType !== 'SCOUTBOOK_FOLLOW_UP'
    ) {
      throw new BadRequestException('Invalid queue type');
    }

    return this.awardFulfillmentService.getAwards(req.user!.userId, req.user!.authTier, {
      state: parsedState,
      childScoutId,
      adventureId,
      denId,
      queueType: parsedQueueType,
    });
  }

  @Post('awards/:id/transition')
  @HttpCode(HttpStatus.OK)
  async transitionAward(
    @Req() req: AuthenticatedRequest,
    @Param('id') awardId: string,
    @Body() body: TransitionAwardDto,
  ) {
    try {
      const validated = TransitionAwardSchema.parse(body);
      const result = await this.awardFulfillmentService.transitionAward(
        awardId,
        validated,
        req.user!.userId,
        req.user!.authTier,
      );

      if (validated.toState === AwardState.PURCHASED) {
        return {
          ...result,
          reimbursementReminder:
            'Remember to submit the pack reimbursement form for this purchase transition.',
        };
      }

      return result;
    } catch (error: any) {
      if (error.name === 'ZodError') {
        throw new BadRequestException({
          error: 'Invalid input',
          details: error.issues?.map((issue: any) => issue.message) || [],
        });
      }
      throw error;
    }
  }

  @Post('awards/batch-transition')
  @HttpCode(HttpStatus.OK)
  async batchTransition(
    @Req() req: AuthenticatedRequest,
    @Body() body: BatchTransitionDto,
  ) {
    try {
      const validated = BatchTransitionSchema.parse(body);
      return await this.awardFulfillmentService.batchTransition(
        validated,
        req.user!.userId,
        req.user!.authTier,
      );
    } catch (error: any) {
      if (error.name === 'ZodError') {
        throw new BadRequestException({
          error: 'Invalid input',
          details: error.issues?.map((issue: any) => issue.message) || [],
        });
      }
      throw error;
    }
  }

  @Get('inventory')
  @HttpCode(HttpStatus.OK)
  async getInventory() {
    return this.inventoryService.getInventory();
  }

  @Post('inventory')
  @HttpCode(HttpStatus.CREATED)
  async createInventoryItem(@Body() body: CreateInventoryItemDto) {
    try {
      const validated = CreateInventoryItemSchema.parse(body);
      return await this.inventoryService.createInventoryItem(validated);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        throw new BadRequestException({
          error: 'Invalid input',
          details: error.issues?.map((issue: any) => issue.message) || [],
        });
      }
      throw error;
    }
  }

  @Post('inventory/adjust')
  @HttpCode(HttpStatus.OK)
  async adjustInventory(@Req() req: AuthenticatedRequest, @Body() body: AdjustInventoryDto) {
    try {
      const validated = AdjustInventorySchema.parse(body);
      return await this.inventoryService.adjustInventory(validated, req.user!.userId);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        throw new BadRequestException({
          error: 'Invalid input',
          details: error.issues?.map((issue: any) => issue.message) || [],
        });
      }
      throw error;
    }
  }

  @Post('special-awards')
  @HttpCode(HttpStatus.CREATED)
  async createSpecialAward(@Body() body: CreateSpecialAwardDto) {
    try {
      const validated = CreateSpecialAwardSchema.parse(body);
      return await this.specialAwardService.createSpecialAward(validated);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        throw new BadRequestException({
          error: 'Invalid input',
          details: error.issues?.map((issue: any) => issue.message) || [],
        });
      }
      throw error;
    }
  }
}
