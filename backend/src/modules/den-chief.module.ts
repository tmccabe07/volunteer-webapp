import { Module } from '@nestjs/common';
import { DenChiefController } from '../api/den-chief.controller';
import { DenChiefService } from '../services/den/den-chief.service';
import { AuthModule } from './auth.module';

@Module({
  imports: [AuthModule],
  controllers: [DenChiefController],
  providers: [DenChiefService],
  exports: [DenChiefService],
})
export class DenChiefModule {}
