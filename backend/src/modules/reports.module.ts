import { Module } from '@nestjs/common';
import { ReportsController } from '../api/reports.controller';
import { ReportsService } from '../services/reports.service';
import { AuthModule } from './auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
