import { Module } from '@nestjs/common';
import { 
  ActivityTypesController,
  PackConfigController,
  VolunteerRolesController
} from '../api/config.controller';
import { ActivityTypeService } from '../services/activity-type.service';
import { PackConfigService } from '../services/pack-config.service';
import { VolunteerRoleService } from '../services/volunteer-role.service';
import { AuthModule } from './auth.module';

@Module({
  imports: [AuthModule],
  controllers: [
    ActivityTypesController,
    PackConfigController,
    VolunteerRolesController
  ],
  providers: [
    ActivityTypeService,
    PackConfigService,
    VolunteerRoleService
  ],
  exports: [
    ActivityTypeService,
    PackConfigService,
    VolunteerRoleService
  ],
})
export class ConfigModule {}
