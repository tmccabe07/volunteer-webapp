import { Module } from '@nestjs/common';
import { NotificationsController } from '../api/notifications.controller';
import { NotificationService } from '../services/notification.service';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationsModule {}
