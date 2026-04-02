import { Module } from '@nestjs/common';
import { VolunteersController } from '../api/volunteers.controller';
import { VolunteerService } from '../services/volunteer.service';
import { PointsService } from '../services/points.service';
import { AuthModule } from './auth.module';

@Module({
  imports: [AuthModule],
  controllers: [VolunteersController],
  providers: [VolunteerService, PointsService],
  exports: [VolunteerService, PointsService],
})
export class VolunteersModule {}
