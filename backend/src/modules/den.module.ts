import { Module } from '@nestjs/common';
import { DenController } from '../api/den.controller';
import { DenService } from '../services/den/den.service';
import { AuthModule } from './auth.module';
import { CalendarFeedModule } from './calendar-feed.module';

/**
 * DenModule provides den management functionality
 * 
 * Exports:
 * - DenService for use in other modules
 */
@Module({
  imports: [AuthModule, CalendarFeedModule],
  controllers: [DenController],
  providers: [DenService],
  exports: [DenService],
})
export class DenModule {}
