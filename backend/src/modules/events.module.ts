import { Module } from '@nestjs/common';
import { EventsController } from '../api/events.controller';
import { ActivitySlotStepsController } from '../api/activity-slot-steps.controller';
import { EventService } from '../services/event.service';
import { SignupService } from '../services/signup.service';
import { ActivitySlotStepService } from '../services/activity-slot-step.service';
import { AuthModule } from './auth.module';
import { PointsModule } from './points.module';
import { NotificationsModule } from './notifications.module';

@Module({
  imports: [AuthModule, PointsModule, NotificationsModule],
  controllers: [EventsController, ActivitySlotStepsController],
  providers: [EventService, SignupService, ActivitySlotStepService],
  exports: [EventService, SignupService, ActivitySlotStepService],
})
export class EventsModule {}
