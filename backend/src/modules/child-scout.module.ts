import { Module } from '@nestjs/common';
import { ChildScoutController } from '../api/child-scout.controller';
import { ChildScoutService } from '../services/child-scout/child-scout.service';
import { AuthorizationService } from '../services/role-scope/authorization.service';
import { AuthModule } from './auth.module';

/**
 * ChildScoutModule provides child scout management functionality
 * 
 * Exports:
 * - ChildScoutService for use in other modules
 */
@Module({
  imports: [AuthModule],
  controllers: [ChildScoutController],
  providers: [ChildScoutService, AuthorizationService],
  exports: [ChildScoutService],
})
export class ChildScoutModule {}
