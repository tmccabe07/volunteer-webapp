import { Module } from '@nestjs/common';
import { AdvancementController } from '../api/advancement.controller';
import { AdvancementWorkflowController } from '../api/advancement-workflow.controller';
import { AdvancementService } from '../services/advancement.service';
import { RequirementProgressService } from '../services/advancement/requirement-progress.service';
import { AdvancementProgressService } from '../services/advancement/advancement-progress.service';
import { AuthorizationService } from '../services/role-scope/authorization.service';
import { NotificationsModule } from './notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [AdvancementController, AdvancementWorkflowController],
  providers: [
    AdvancementService,
    RequirementProgressService,
    AdvancementProgressService,
    AuthorizationService,
  ],
  exports: [
    AdvancementService,
    RequirementProgressService,
    AdvancementProgressService,
    AuthorizationService,
  ],
})
export class AdvancementModule {}
