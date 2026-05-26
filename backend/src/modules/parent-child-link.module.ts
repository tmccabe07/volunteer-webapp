import { Module } from '@nestjs/common';
import { ParentChildLinkController } from '../api/parent-child-link.controller';
import { ParentChildLinkService } from '../services/child-scout/parent-child-link.service';
import { AuthorizationService } from '../services/role-scope/authorization.service';
import { AuthModule } from './auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ParentChildLinkController],
  providers: [ParentChildLinkService, AuthorizationService],
  exports: [ParentChildLinkService],
})
export class ParentChildLinkModule {}
