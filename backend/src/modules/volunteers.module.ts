import { Module } from '@nestjs/common';
import { VolunteersController } from '../api/volunteers.controller';
import { VolunteerService } from '../services/volunteer.service';
import { AuthModule } from './auth.module';
import { PointsModule } from './points.module';
import { CalendarFeedModule } from './calendar-feed.module';

@Module({
  imports: [AuthModule, PointsModule, CalendarFeedModule],
  controllers: [VolunteersController],
  providers: [VolunteerService],
  exports: [VolunteerService],
})
export class VolunteersModule {}
