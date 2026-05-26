import { Module } from '@nestjs/common';
import { AwardController } from '../api/award.controller';
import { AwardFulfillmentService } from '../services/awards/award-fulfillment.service';
import { SpecialAwardService } from '../services/awards/special-award.service';
import { InventoryService } from '../services/awards/inventory.service';
import { AuthorizationService } from '../services/role-scope/authorization.service';
import { AuthModule } from './auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AwardController],
  providers: [AwardFulfillmentService, SpecialAwardService, InventoryService, AuthorizationService],
  exports: [AwardFulfillmentService, SpecialAwardService, InventoryService],
})
export class AwardModule {}
