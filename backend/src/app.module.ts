import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth.module';
import { AdminModule } from './modules/admin.module';
import { VolunteersModule } from './modules/volunteers.module';
import { PointsModule } from './modules/points.module';
import { EventsModule } from './modules/events.module';
import { ConfigModule } from './modules/config.module';
import { AdminTasksModule } from './modules/admin-tasks.module';
import { ReportsModule } from './modules/reports.module';
import { NotificationsModule } from './modules/notifications.module';
import { ChildScoutModule } from './modules/child-scout.module';
import { DenModule } from './modules/den.module';
import { AdvancementModule } from './modules/advancement.module';
import { ParentChildLinkModule } from './modules/parent-child-link.module';
import { AwardModule } from './modules/award.module';
import { RolesModule } from './modules/roles.module';
import { DenChiefModule } from './modules/den-chief.module';
import { CalendarFeedModule } from './modules/calendar-feed.module';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const THROTTLE_DISABLED = process.env.DISABLE_THROTTLE === 'true';
const DEFAULT_THROTTLE_LIMIT = IS_PRODUCTION ? 100 : 10000;
const THROTTLE_LIMIT = THROTTLE_DISABLED
  ? 1_000_000
  : Number(process.env.THROTTLE_LIMIT ?? DEFAULT_THROTTLE_LIMIT);
const THROTTLE_TTL_MS = Number(process.env.THROTTLE_TTL_MS ?? 60_000);

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: Number.isFinite(THROTTLE_TTL_MS) ? THROTTLE_TTL_MS : 60_000,
      limit: Number.isFinite(THROTTLE_LIMIT) ? THROTTLE_LIMIT : DEFAULT_THROTTLE_LIMIT,
    }]),
    AuthModule, 
    PointsModule, 
    VolunteersModule, 
    AdminModule, 
    EventsModule, 
    ConfigModule, 
    AdminTasksModule, 
    ReportsModule, 
    NotificationsModule,
    ChildScoutModule,
    DenModule,
    AdvancementModule,
    ParentChildLinkModule,
    AwardModule,
    RolesModule,
    DenChiefModule,
    CalendarFeedModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
