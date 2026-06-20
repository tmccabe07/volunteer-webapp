import { Module } from '@nestjs/common';
import { DenChiefController } from '../api/den-chief.controller';
import { DenChiefService } from '../services/den/den-chief.service';
import { AuthModule } from './auth.module';
import { CalendarFeedModule } from './calendar-feed.module';

@Module({
  imports: [AuthModule, CalendarFeedModule],
  controllers: [DenChiefController],
  providers: [DenChiefService],
  exports: [DenChiefService],
})
export class DenChiefModule {}
