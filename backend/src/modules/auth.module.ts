import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';
import { AuthController } from '../api/auth.controller';
import { AuthService } from '../services/auth.service';
import { PasswordResetService } from '../services/password-reset.service';
import { AuthGuard, TierGuard } from '../middleware/auth';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000, // 60 seconds
      limit: 10, // 10 requests per minute default
    }]),
  ],
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
