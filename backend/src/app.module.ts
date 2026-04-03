import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth.module';
import { AdminModule } from './modules/admin.module';
import { VolunteersModule } from './modules/volunteers.module';
import { PointsModule } from './modules/points.module';
import { EventsModule } from './modules/events.module';
import { ConfigModule } from './modules/config.module';

@Module({
  imports: [AuthModule, PointsModule, VolunteersModule, AdminModule, EventsModule, ConfigModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
