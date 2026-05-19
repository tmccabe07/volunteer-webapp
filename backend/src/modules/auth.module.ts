import { Module } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthController } from '../api/auth.controller';
import { AuthService } from '../services/auth.service';
import { PasswordResetService } from '../services/password-reset.service';
import { AuthGuard, TierGuard } from '../middleware/auth';

@Module({
  imports: [],
  controllers: [AuthController],
  providers: [
    AuthService, 
    PasswordResetService, 
    AuthGuard, 
    TierGuard,
    Reflector
  ],
  exports: [AuthService, AuthGuard, TierGuard],
})
export class AuthModule {}
