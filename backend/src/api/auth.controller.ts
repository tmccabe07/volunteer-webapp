import { 
  Controller, 
  Post, 
  Get, 
  Body, 
  Res, 
  Req, 
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
  NotFoundException
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from '../services/auth.service';
import { PasswordResetService } from '../services/password-reset.service';
import { AuthGuard } from '../middleware/auth';
import {
  registerSchema,
  loginSchema,
  requestResetSchema,
  resetPasswordSchema,
  changePasswordSchema,
  type RegisterInput,
  type LoginInput,
  type RequestResetInput,
  type ResetPasswordInput,
  type ChangePasswordInput
} from '../utils/validation/auth.schema';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly passwordResetService: PasswordResetService
  ) {}

  /**
   * POST /api/auth/register
   * Register a new volunteer account
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() body: RegisterInput,
    @Res({ passthrough: true }) res: Response
  ) {
    try {
      // Validate request body
      const validatedData = registerSchema.parse(body);

      // Register volunteer
      const { volunteer, accessToken, refreshToken } = await this.authService.registerVolunteer(
        validatedData.email,
        validatedData.password,
        validatedData.name,
        validatedData.phone
      );

      // Set HttpOnly cookies
      res.cookie('access_token', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000 // 15 minutes
      });

      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      return {
        user: volunteer,
        accessToken,
        refreshToken
      };
    } catch (error: any) {
      if (error.name === 'ZodError') {
        throw new BadRequestException({
          error: 'Invalid input',
          details: error.issues?.map((e: any) => e.message) || []
        });
      }

      if (error.message === 'Email already in use') {
        throw new ConflictException('Email already in use');
      }

      throw error;
    }
  }

  /**
   * POST /api/auth/login
   * Authenticate existing volunteer
   * Rate limited: 5 requests per 15 minutes
   */
  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 15 * 60 * 1000 } })
  async login(
    @Body() body: LoginInput,
    @Res({ passthrough: true }) res: Response
  ) {
    try {
      // Validate request body
      const validatedData = loginSchema.parse(body);

      // Authenticate volunteer
      const result = await this.authService.loginVolunteer(
        validatedData.email,
        validatedData.password,
        validatedData.rememberMe || false
      );

      if (!result) {
        throw new UnauthorizedException('Invalid email or password');
      }

      const { volunteer, accessToken, refreshToken } = result;

      // Set HttpOnly cookies
      const refreshMaxAge = validatedData.rememberMe
        ? 30 * 24 * 60 * 60 * 1000 // 30 days
        : 7 * 24 * 60 * 60 * 1000; // 7 days

      res.cookie('access_token', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000 // 15 minutes
      });

      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: refreshMaxAge
      });

      return {
        user: volunteer,
        accessToken,
        refreshToken
      };
    } catch (error: any) {
      if (error.name === 'ZodError') {
        throw new BadRequestException({
          error: 'Invalid input',
          details: error.issues?.map((e: any) => e.message) || []
        });
      }

      throw error;
    }
  }

  /**
   * POST /api/auth/logout
   * Invalidate current session
   */
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Res({ passthrough: true }) res: Response) {
    // Clear cookies
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
  }

  /**
   * POST /api/auth/refresh
   * Refresh access token using refresh token
   */
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    try {
      const refreshToken = req.cookies.refresh_token;

      if (!refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Verify refresh token
      const { userId } = this.authService.verifyRefreshToken(refreshToken);

      // Get volunteer data to generate new access token
      const volunteer = await this.authService.getCurrentUser(userId);

      // Generate new tokens
      const newAccessToken = this.authService.generateAccessToken(
        volunteer.id,
        volunteer.email,
        volunteer.authTier
      );
      const newRefreshToken = this.authService.generateRefreshToken(userId, false);

      // Set new cookies
      res.cookie('access_token', newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000 // 15 minutes
      });

      res.cookie('refresh_token', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      };
    } catch (error: any) {
      if (error.message.includes('Invalid or expired')) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      throw error;
    }
  }

  /**
   * POST /api/auth/request-reset
   * Request password reset email
   * Rate limited: 3 requests per hour
   */
  @Post('request-reset')
  @Throttle({ default: { limit: 3, ttl: 60 * 60 * 1000 } })
  async requestReset(@Body() body: RequestResetInput) {
    try {
      // Validate request body
      const validatedData = requestResetSchema.parse(body);

      // Create reset request
      const token = await this.passwordResetService.createResetRequest(validatedData.email);

      // TODO: Send email with reset link
      // For now, log token in development (REMOVE IN PRODUCTION)
      if (process.env.NODE_ENV === 'development' && token) {
        console.log(`Password reset token for ${validatedData.email}: ${token}`);
        console.log(`Reset link: ${process.env.FRONTEND_URL}/auth/reset-password?token=${token}`);
      }

      // Always return success to prevent email enumeration
      return {
        message: 'If an account exists with that email, a password reset link has been sent.'
      };
    } catch (error: any) {
      if (error.name === 'ZodError') {
        throw new BadRequestException({
          error: 'Invalid input',
          details: error.issues?.map((e: any) => e.message) || []
        });
      }

      throw error;
    }
  }

  /**
   * POST /api/auth/reset-password
   * Reset password using token from email
   */
  @Post('reset-password')
  async resetPassword(@Body() body: ResetPasswordInput) {
    try {
      // Validate request body
      const validatedData = resetPasswordSchema.parse(body);

      // Hash new password
      const newPasswordHash = await this.authService.hashPassword(validatedData.newPassword);

      // Reset password
      const success = await this.passwordResetService.resetPassword(
        validatedData.token,
        newPasswordHash
      );

      if (!success) {
        throw new BadRequestException('Invalid or expired reset token');
      }

      return {
        message: 'Password reset successfully. You can now log in with your new password.'
      };
    } catch (error: any) {
      if (error.name === 'ZodError') {
        throw new BadRequestException({
          error: 'Invalid input',
          details: error.issues?.map((e: any) => e.message) || []
        });
      }

      throw error;
    }
  }

  /**
   * GET /api/auth/me
   * Get current authenticated user info
   */
  @Get('me')
  @UseGuards(AuthGuard)
  async getCurrentUser(@Req() req: Request) {
    try {
      // User info is attached by AuthGuard
      const userId = (req as any).user.userId;

      // Get full user data
      const user = await this.authService.getCurrentUser(userId);

      return user;
    } catch (error: any) {
      if (error.message === 'Volunteer not found') {
        throw new NotFoundException('Volunteer not found');
      }

      throw error;
    }
  }

  /**
   * POST /api/auth/change-password
   * Change password for authenticated user
   * Required after admin password reset
   */
  @Post('change-password')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Body() body: ChangePasswordInput,
    @Req() req: Request
  ) {
    try {
      // Validate request body
      const validatedData = changePasswordSchema.parse(body);

      // Get user ID from auth guard
      const userId = (req as any).user.userId;

      // Change password
      await this.authService.changePassword(
        userId,
        validatedData.currentPassword,
        validatedData.newPassword
      );

      return {
        success: true,
        message: 'Password changed successfully'
      };
    } catch (error: any) {
      if (error.name === 'ZodError') {
        throw new BadRequestException({
          message: 'Validation failed',
          errors: error.issues || []
        });
      }

      if (error.message === 'Current password is incorrect') {
        throw new UnauthorizedException('Current password is incorrect');
      }

      if (error.message === 'Volunteer not found') {
        throw new NotFoundException('Volunteer not found');
      }

      throw error;
    }
  }
}
