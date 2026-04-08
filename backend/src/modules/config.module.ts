import { Module } from '@nestjs/common';
import { ActivityTypesController } from '../api/config.controller';
import { ActivityTypeService } from '../services/activity-type.service';
import { AuthModule } from './auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ActivityTypesController],
  providers: [ActivityTypeService],
  exports: [ActivityTypeService],
})
export class ConfigModule {}
