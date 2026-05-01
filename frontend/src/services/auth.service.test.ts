import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from '@/lib/axios';
import { authService, type AuthResponse, type User } from './auth.service';

vi.mock('@/lib/axios');

const mockAxios = axios as unknown as {
  post: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
};

describe('AuthApiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new volunteer with all fields', async () => {
      const mockResponse: AuthResponse = {
        user: {
          id: '1',
          email: 'new@test.com',
          name: 'New User',
          phone: '555-1234',
          authTier: 'PARENT',
          leaderboardOptIn: true,
        },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      mockAxios.post.mockResolvedValue({ data: mockResponse });

      const result = await authService.register({
        email: 'new@test.com',
        password: 'Password123!',
        name: 'New User',
        phone: '555-1234',
      });

      expect(mockAxios.post).toHaveBeenCalledWith('/auth/register', {
        email: 'new@test.com',
        password: 'Password123!',
        name: 'New User',
        phone: '555-1234',
      });
      expect(result).toEqual(mockResponse);
    });

    it('should register with minimal data (no phone)', async () => {
      const mockResponse: AuthResponse = {
        user: {
          id: '1',
          email: 'new@test.com',
          name: 'New User',
          phone: null,
          authTier: 'PARENT',
          leaderboardOptIn: true,
        },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      mockAxios.post.mockResolvedValue({ data: mockResponse });

      const result = await authService.register({
        email: 'new@test.com',
        password: 'Password123!',
        name: 'New User',
      });

      expect(result).toEqual(mockResponse);
    });

    it('should handle registration validation errors', async () => {
      mockAxios.post.mockRejectedValue({
        response: {
          status: 400,
          data: { message: 'Email already in use' },
        },
      });

      await expect(
        authService.register({
          email: 'duplicate@test.com',
          password: 'Password123!',
          name: 'User',
        })
      ).rejects.toMatchObject({
        response: { status: 400 },
      });
    });
  });

  describe('login', () => {
    it('should login with email and password', async () => {
      const mockResponse: AuthResponse = {
        user: {
          id: '1',
          email: 'user@test.com',
          name: 'Test User',
          phone: null,
          authTier: 'PARENT',
          leaderboardOptIn: true,
        },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      mockAxios.post.mockResolvedValue({ data: mockResponse });

      const result = await authService.login({
        email: 'user@test.com',
        password: 'Password123!',
      });

      expect(mockAxios.post).toHaveBeenCalledWith('/auth/login', {
        email: 'user@test.com',
        password: 'Password123!',
      });
      expect(result).toEqual(mockResponse);
    });

    it('should login with rememberMe flag', async () => {
      const mockResponse: AuthResponse = {
        user: {
          id: '1',
          email: 'user@test.com',
          name: 'Test User',
          phone: null,
          authTier: 'PARENT',
          leaderboardOptIn: true,
        },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      mockAxios.post.mockResolvedValue({ data: mockResponse });

      await authService.login({
        email: 'user@test.com',
        password: 'Password123!',
        rememberMe: true,
      });

      expect(mockAxios.post).toHaveBeenCalledWith('/auth/login', {
        email: 'user@test.com',
        password: 'Password123!',
        rememberMe: true,
      });
    });

    it('should return mustChangePassword flag when required', async () => {
      const mockResponse: AuthResponse = {
        user: {
          id: '1',
          email: 'user@test.com',
          name: 'Test User',
          phone: null,
          authTier: 'PARENT',
          leaderboardOptIn: true,
          mustChangePassword: true,
        },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      mockAxios.post.mockResolvedValue({ data: mockResponse });

      const result = await authService.login({
        email: 'user@test.com',
        password: 'TempPassword123!',
      });

      expect(result.user.mustChangePassword).toBe(true);
    });

    it('should handle invalid credentials', async () => {
      mockAxios.post.mockRejectedValue({
        response: {
          status: 401,
          data: { message: 'Invalid credentials' },
        },
      });

      await expect(
        authService.login({
          email: 'wrong@test.com',
          password: 'WrongPassword',
        })
      ).rejects.toMatchObject({
        response: { status: 401 },
      });
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      mockAxios.post.mockResolvedValue({});

      await authService.logout();

      expect(mockAxios.post).toHaveBeenCalledWith('/auth/logout');
    });

    it('should handle logout errors gracefully', async () => {
      mockAxios.post.mockRejectedValue({
        response: { status: 401 },
      });

      await expect(authService.logout()).rejects.toMatchObject({
        response: { status: 401 },
      });
    });
  });

  describe('refresh', () => {
    it('should refresh access token', async () => {
      const mockResponse = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      mockAxios.post.mockResolvedValue({ data: mockResponse });

      const result = await authService.refresh();

      expect(mockAxios.post).toHaveBeenCalledWith('/auth/refresh');
      expect(result).toEqual(mockResponse);
    });

    it('should handle expired refresh token', async () => {
      mockAxios.post.mockRejectedValue({
        response: {
          status: 401,
          data: { message: 'Refresh token expired' },
        },
      });

      await expect(authService.refresh()).rejects.toMatchObject({
        response: { status: 401 },
      });
    });
  });

  describe('requestPasswordReset', () => {
    it('should request password reset email', async () => {
      const mockResponse = {
        message: 'Password reset email sent',
      };

      mockAxios.post.mockResolvedValue({ data: mockResponse });

      const result = await authService.requestPasswordReset('user@test.com');

      expect(mockAxios.post).toHaveBeenCalledWith('/auth/request-reset', {
        email: 'user@test.com',
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle non-existent email gracefully', async () => {
      const mockResponse = {
        message: 'If the email exists, a reset link has been sent',
      };

      mockAxios.post.mockResolvedValue({ data: mockResponse });

      const result = await authService.requestPasswordReset('nonexistent@test.com');

      expect(result.message).toBeTruthy();
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      const mockResponse = {
        message: 'Password reset successful',
      };

      mockAxios.post.mockResolvedValue({ data: mockResponse });

      const result = await authService.resetPassword('valid-token', 'NewPassword123!');

      expect(mockAxios.post).toHaveBeenCalledWith('/auth/reset-password', {
        token: 'valid-token',
        newPassword: 'NewPassword123!',
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle invalid reset token', async () => {
      mockAxios.post.mockRejectedValue({
        response: {
          status: 400,
          data: { message: 'Invalid or expired reset token' },
        },
      });

      await expect(
        authService.resetPassword('invalid-token', 'NewPassword123!')
      ).rejects.toMatchObject({
        response: { status: 400 },
      });
    });
  });

  describe('getCurrentUser', () => {
    it('should fetch current user with all relations', async () => {
      const mockUser: User = {
        id: '1',
        email: 'user@test.com',
        name: 'Test User',
        phone: '555-1234',
        authTier: 'LEADER',
        leaderboardOptIn: true,
        roles: [
          {
            id: 'role-1',
            name: 'Den Leader',
            roleType: 'DEN_LEADER',
            specialty: null,
            rankLevel: 'WOLF',
          },
        ],
        childrenRanks: [{ rankLevel: 'WOLF' }],
        pointBalance: {
          totalPoints: 150,
          currentYearPoints: 50,
        },
      };

      mockAxios.get.mockResolvedValue({ data: mockUser });

      const result = await authService.getCurrentUser();

      expect(mockAxios.get).toHaveBeenCalledWith('/auth/me');
      expect(result).toEqual(mockUser);
    });

    it('should handle unauthenticated request', async () => {
      mockAxios.get.mockRejectedValue({
        response: {
          status: 401,
          data: { message: 'Unauthorized' },
        },
      });

      await expect(authService.getCurrentUser()).rejects.toMatchObject({
        response: { status: 401 },
      });
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const mockResponse = {
        message: 'Password changed successfully',
      };

      mockAxios.post.mockResolvedValue({ data: mockResponse });

      const result = await authService.changePassword('OldPassword123!', 'NewPassword123!');

      expect(mockAxios.post).toHaveBeenCalledWith('/auth/change-password', {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle incorrect current password', async () => {
      mockAxios.post.mockRejectedValue({
        response: {
          status: 400,
          data: { message: 'Current password is incorrect' },
        },
      });

      await expect(
        authService.changePassword('WrongPassword', 'NewPassword123!')
      ).rejects.toMatchObject({
        response: { status: 400 },
      });
    });

    it('should handle weak new password', async () => {
      mockAxios.post.mockRejectedValue({
        response: {
          status: 400,
          data: { message: 'New password does not meet requirements' },
        },
      });

      await expect(
        authService.changePassword('OldPassword123!', 'weak')
      ).rejects.toMatchObject({
        response: { status: 400 },
      });
    });
  });
});
