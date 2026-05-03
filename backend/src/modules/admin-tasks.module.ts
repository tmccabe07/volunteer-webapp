import { Module } from '@nestjs/common';
import { AdminTasksController } from '../api/admin-tasks.controller';
import { AdminTaskService } from '../services/admin-task.service';
import { NotificationService } from '../services/notification.service';
import { AuthModule } from './auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AdminTasksController],
  providers: [AdminTaskService, NotificationService],
  exports: [AdminTaskService],
})
export class AdminTasksModule {}
