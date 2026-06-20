import { Module } from '@nestjs/common';
import { CalendarFeedController } from '../api/calendar-feed.controller';
import { CalendarFeedService } from '../services/calendar-feed.service';
import { CalendarFeedTokenService } from '../services/calendar-feed-token.service';

@Module({
  controllers: [CalendarFeedController],
  providers: [CalendarFeedService, CalendarFeedTokenService],
  exports: [CalendarFeedService, CalendarFeedTokenService],
})
export class CalendarFeedModule {}
