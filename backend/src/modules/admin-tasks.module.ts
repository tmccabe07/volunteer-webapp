import { Module } from '@nestjs/common';
import { AdminTasksController } from '../api/admin-tasks.controller';
import { AdminTaskService } from '../services/admin-task.service';
import { AuthModule } from './auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AdminTasksController],
  providers: [AdminTaskService],
  exports: [AdminTaskService],
})
export class AdminTasksModule {}
