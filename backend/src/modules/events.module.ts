import { Module } from '@nestjs/common';
import { EventsController } from '../api/events.controller';
import { EventService } from '../services/event.service';
import { SignupService } from '../services/signup.service';
import { AuthModule } from './auth.module';
import { PointsModule } from './points.module';

@Module({
  imports: [AuthModule, PointsModule],
  controllers: [EventsController],
  providers: [EventService, SignupService],
  exports: [EventService, SignupService],
})
export class EventsModule {}
