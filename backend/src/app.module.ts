import { Module } from '@nestjs/common';
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

@Module({
  imports: [AuthModule, PointsModule, VolunteersModule, AdminModule, EventsModule, ConfigModule, AdminTasksModule, ReportsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
