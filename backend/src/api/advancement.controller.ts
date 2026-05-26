import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { RankLevel } from '@prisma/client';
import { AuthGuard, TierGuard, RequireTier } from '../middleware/auth';
import { AdvancementService } from '../services/advancement.service';

const validRankLevels = new Set<string>(Object.values(RankLevel));

@Controller('advancement')
@UseGuards(AuthGuard, TierGuard)
export class AdvancementController {
  constructor(private readonly advancementService: AdvancementService) {}

  @Get('ranks')
  @RequireTier('LEADER')
  async getRanks() {
    return this.advancementService.getRanks();
  }

  @Get('adventures')
  @RequireTier('LEADER')
  async getAdventures(@Query('rankLevel') rankLevel?: string) {
    if (!rankLevel) {
      return this.advancementService.getAdventures();
    }

    const normalizedRank = rankLevel.toUpperCase();
    if (!validRankLevels.has(normalizedRank)) {
      throw new BadRequestException('Invalid rank level');
    }

    return this.advancementService.getAdventures(normalizedRank as RankLevel);
  }

  @Get('requirements')
  @RequireTier('LEADER')
  async getRequirements(@Query('adventureId') adventureId?: string) {
    return this.advancementService.getRequirements(adventureId);
  }

  @Get('ranks/:rankLevel/adventures')
  @RequireTier('LEADER')
  async getAdventuresForRank(@Param('rankLevel') rankLevel: string) {
    const normalizedRank = rankLevel.toUpperCase();

    if (!validRankLevels.has(normalizedRank)) {
      throw new BadRequestException('Invalid rank level');
    }

    return this.advancementService.getAdventuresForRank(normalizedRank);
  }

  @Get('requirements/:requirementId')
  @RequireTier('LEADER')
  async getRequirement(@Param('requirementId') requirementId: string) {
    return this.advancementService.getRequirement(requirementId);
  }
}
