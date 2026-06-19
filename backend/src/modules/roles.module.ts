import { Module } from '@nestjs/common';
import { RolesController } from '../api/roles.controller';
import { RoleService } from '../services/roles/role.service';
import { AuthModule } from './auth.module';

@Module({
  imports: [AuthModule],
  controllers: [RolesController],
  providers: [RoleService],
  exports: [RoleService],
})
export class RolesModule {}
