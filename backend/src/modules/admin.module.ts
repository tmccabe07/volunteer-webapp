import { Module } from '@nestjs/common';
import { AdminController } from '../api/admin.controller';
import { AdminService } from '../services/admin.service';
import { AuthModule } from './auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService]
})
export class AdminModule {}
