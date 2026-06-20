import { Module } from '@nestjs/common';
import { EmailNotificationController } from '../api/email-notification.controller';
import { EmailNotificationService } from '../services/email-notification.service';
import { MailService } from '../services/mail.service';
import { AuthModule } from './auth.module';

@Module({
  imports: [AuthModule],
  controllers: [EmailNotificationController],
  providers: [EmailNotificationService, MailService],
  exports: [MailService],
})
export class EmailNotificationModule {}
