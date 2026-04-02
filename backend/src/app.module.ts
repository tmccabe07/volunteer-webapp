import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth.module';
import { AdminModule } from './modules/admin.module';
import { VolunteersModule } from './modules/volunteers.module';

@Module({
  imports: [AuthModule, AdminModule, VolunteersModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
