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

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000, // 60 seconds
      limit: process.env.NODE_ENV === 'development' ? 10000 : 100, // Very high in dev, reasonable in prod
    }]),
    AuthModule, 
    PointsModule, 
    VolunteersModule, 
    AdminModule, 
    EventsModule, 
    ConfigModule, 
    AdminTasksModule, 
    ReportsModule, 
    NotificationsModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
