import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { AuthTier } from '@prisma/client';
import { AuthGuard, RequireTier, TierGuard } from '../../middleware/auth';
import { ImportBatchService } from '../../services/admin/import-batch.service';
import { ImportLeadersService } from '../../services/admin/import-leaders.service';
import { ImportParentLinksService } from '../../services/admin/import-parent-links.service';
import { ImportAdventuresService } from '../../services/admin/import-adventures.service';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    authTier: AuthTier;
  };
}

@Controller()
@UseGuards(AuthGuard)
export class ImportController {
  constructor(
    private readonly importBatchService: ImportBatchService,
    private readonly importLeadersService: ImportLeadersService,
    private readonly importParentLinksService: ImportParentLinksService,
    private readonly importAdventuresService: ImportAdventuresService,
  ) {}

  @Post('child-scouts/import')
  @UseGuards(TierGuard)
  @RequireTier(AuthTier.ADMIN)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.ACCEPTED)
  async importChildScouts(
    @Req() req: AuthenticatedRequest,
    @UploadedFile() file?: { originalname?: string; buffer?: Buffer },
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('CSV file is required');
    }

    return this.importBatchService.processChildScoutCsv(
      file.originalname || 'child-scout-import.csv',
      file.buffer.toString('utf8'),
      req.user!.userId,
    );
  }

  @Post('leaders/import')
  @UseGuards(TierGuard)
  @RequireTier(AuthTier.ADMIN)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.ACCEPTED)
  async importLeaders(
    @Req() req: AuthenticatedRequest,
    @UploadedFile() file?: { originalname?: string; buffer?: Buffer },
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('CSV file is required');
    }

    return this.importLeadersService.processLeaderCsv(
      file.originalname || 'leaders-import.csv',
      file.buffer.toString('utf8'),
      req.user!.userId,
    );
  }

  @Post('parent-links/import')
  @UseGuards(TierGuard)
  @RequireTier(AuthTier.ADMIN)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.ACCEPTED)
  async importParentLinks(
    @Req() req: AuthenticatedRequest,
    @UploadedFile() file?: { originalname?: string; buffer?: Buffer },
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('CSV file is required');
    }

    return this.importParentLinksService.processParentLinkCsv(
      file.originalname || 'parent-links-import.csv',
      file.buffer.toString('utf8'),
      req.user!.userId,
    );
  }

  @Post('adventures/import')
  @UseGuards(TierGuard)
  @RequireTier(AuthTier.ADMIN)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.ACCEPTED)
  async importAdventures(
    @Req() req: AuthenticatedRequest,
    @UploadedFile() file?: { originalname?: string; buffer?: Buffer },
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('CSV file is required');
    }

    return this.importAdventuresService.processAdventureCsv(
      file.originalname || 'adventures-import.csv',
      file.buffer.toString('utf8'),
      req.user!.userId,
    );
  }

  @Get('imports/:batchId')
  @UseGuards(TierGuard)
  @RequireTier(AuthTier.ADMIN)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async getImportBatch(@Param('batchId') batchId: string) {
    return this.importBatchService.getImportBatch(batchId);
  }
}
