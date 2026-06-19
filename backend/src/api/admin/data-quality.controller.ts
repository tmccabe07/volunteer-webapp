import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import { AuthTier } from '@prisma/client';
import { AuthGuard, RequireTier, TierGuard } from '../../middleware/auth';
import { DataQualityService } from '../../services/admin/data-quality.service';

const DataQualityQuerySchema = z.object({
  olderThanDays: z
    .string()
    .transform(value => Number(value))
    .pipe(z.number().int().positive())
    .optional(),
});

@Controller('admin')
@UseGuards(AuthGuard)
export class DataQualityController {
  constructor(private readonly dataQualityService: DataQualityService) {}

  @Get('data-quality')
  @UseGuards(TierGuard)
  @RequireTier(AuthTier.ADMIN)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async getReport(@Query() query: unknown) {
    const parsed = DataQualityQuerySchema.parse(query);
    return this.dataQualityService.getReport(parsed.olderThanDays ?? 30);
  }
}