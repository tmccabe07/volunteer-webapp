import { Module } from '@nestjs/common';
import { AdminController } from '../api/admin.controller';
import { ImportController } from '../api/admin/import.controller';
import { DataQualityController } from '../api/admin/data-quality.controller';
import { RolloverController } from '../api/admin/rollover.controller';
import { AdminService } from '../services/admin.service';
import { DataQualityService } from '../services/admin/data-quality.service';
import { ImportBatchService } from '../services/admin/import-batch.service';
import { ImportLeadersService } from '../services/admin/import-leaders.service';
import { ImportParentLinksService } from '../services/admin/import-parent-links.service';
import { ImportAdventuresService } from '../services/admin/import-adventures.service';
import { RolloverService } from '../services/admin/rollover.service';
import { AuthModule } from './auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AdminController, ImportController, RolloverController, DataQualityController],
  providers: [
    AdminService,
    ImportBatchService,
    ImportLeadersService,
    ImportParentLinksService,
    ImportAdventuresService,
    RolloverService,
    DataQualityService,
  ],
  exports: [
    AdminService,
    ImportBatchService,
    ImportLeadersService,
    ImportParentLinksService,
    ImportAdventuresService,
    RolloverService,
    DataQualityService,
  ],
})
export class AdminModule {}
