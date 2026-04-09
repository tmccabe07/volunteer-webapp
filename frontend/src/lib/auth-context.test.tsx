import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useAuth, useRequireAuth, useRequireTier, AuthProvider } from './auth-context';
import { authService } from '@/services/auth.service';
import React from 'react';

// Mock Next.js router
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock auth service
vi.mock('@/services/auth.service', () => ({
  authService: {
    getCurrentUser: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
  },
}));

describe('Auth Context', () => {
  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    phone: '555-1234',
    authTier: 'PARENT' as const,
    leaderboardOptIn: true,
    roles: [],
    childrenRanks: [],
    pointBalance: {
      totalPoints: 100,
      currentYearPoints: 50,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('AuthProvider', () => {
    it('should load user on mount', async () => {
      const mockGetCurrentUser = vi.mocked(authService.getCurrentUser);
      mockGetCurrentUser.mockResolvedValueOnce(mockUser);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.user).toBeNull();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(mockGetCurrentUser).toHaveBeenCalledTimes(1);
    });

    it('should set user to null when not authenticated', async () => {
      const mockGetCurrentUser = vi.mocked(authService.getCurrentUser);
      mockGetCurrentUser.mockRejectedValueOnce(new Error('Not authenticated'));

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should throw error when useAuth is used outside provider', () => {
      // Suppress console.error for this test
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');

      consoleError.mockRestore();
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const mockGetCurrentUser = vi.mocked(authService.getCurrentUser);
      const mockLogin = vi.mocked(authService.login);

      mockGetCurrentUser
        .mockRejectedValueOnce(new Error('Not authenticated'))
        .mockResolvedValueOnce(mockUser);

      mockLogin.mockResolvedValueOnce({
        user: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          phone: mockUser.phone,
          authTier: mockUser.authTier,
          leaderboardOptIn: mockUser.leaderboardOptIn,
        },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.login('test@example.com', 'password');
      });

      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password',
        rememberMe: undefined,
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });
    });

    it('should login with remember me option', async () => {
      const mockGetCurrentUser = vi.mocked(authService.getCurrentUser);
      const mockLogin = vi.mocked(authService.login);

      mockGetCurrentUser
        .mockRejectedValueOnce(new Error('Not authenticated'))
        .mockResolvedValueOnce(mockUser);

      mockLogin.mockResolvedValueOnce({
        user: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          phone: mockUser.phone,
          authTier: mockUser.authTier,
          leaderboardOptIn: mockUser.leaderboardOptIn,
        },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.login('test@example.com', 'password', true);
      });

      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password',
        rememberMe: true,
      });
    });

    it('should redirect to change password when required', async () => {
      const mockGetCurrentUser = vi.mocked(authService.getCurrentUser);
      const mockLogin = vi.mocked(authService.login);

      mockGetCurrentUser
        .mockRejectedValueOnce(new Error('Not authenticated'))
        .mockResolvedValueOnce(mockUser);

      mockLogin.mockResolvedValueOnce({
        user: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          phone: mockUser.phone,
          authTier: mockUser.authTier,
          leaderboardOptIn: mockUser.leaderboardOptIn,
          mustChangePassword: true,
        },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.login('test@example.com', 'password');
      });

      expect(mockPush).toHaveBeenCalledWith('/auth/change-password');
    });

    it('should handle login errors', async () => {
      const mockGetCurrentUser = vi.mocked(authService.getCurrentUser);
      const mockLogin = vi.mocked(authService.login);

      mockGetCurrentUser.mockRejectedValueOnce(new Error('Not authenticated'));
      mockLogin.mockRejectedValueOnce(new Error('Invalid credentials'));

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.login('test@example.com', 'wrong-password');
        })
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('logout', () => {
    it('should logout user and redirect to login', async () => {
      const mockGetCurrentUser = vi.mocked(authService.getCurrentUser);
      const mockLogout = vi.mocked(authService.logout);

      mockGetCurrentUser.mockResolvedValueOnce(mockUser);
      mockLogout.mockResolvedValueOnce();

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(mockLogout).toHaveBeenCalledTimes(1);
      expect(result.current.user).toBeNull();
      expect(mockPush).toHaveBeenCalledWith('/auth/login');
    });

    it('should handle logout errors gracefully', async () => {
      const mockGetCurrentUser = vi.mocked(authService.getCurrentUser);
      const mockLogout = vi.mocked(authService.logout);

      mockGetCurrentUser.mockResolvedValueOnce(mockUser);
      mockLogout.mockRejectedValueOnce(new Error('Logout failed'));

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      await expect(
        act(async () => {
          await result.current.logout();
        })
      ).rejects.toThrow('Logout failed');
    });
  });

  describe('register', () => {
    it('should register new user and load profile', async () => {
      const mockGetCurrentUser = vi.mocked(authService.getCurrentUser);
      const mockRegister = vi.mocked(authService.register);

      mockGetCurrentUser
        .mockRejectedValueOnce(new Error('Not authenticated'))
        .mockResolvedValueOnce(mockUser);

      mockRegister.mockResolvedValueOnce({
        user: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          phone: mockUser.phone,
          authTier: mockUser.authTier,
          leaderboardOptIn: mockUser.leaderboardOptIn,
        },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.register({
          email: 'new@example.com',
          password: 'password123',
          name: 'New User',
          phone: '555-5555',
        });
      });

      expect(mockRegister).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password123',
        name: 'New User',
        phone: '555-5555',
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });
    });

    it('should handle registration errors', async () => {
      const mockGetCurrentUser = vi.mocked(authService.getCurrentUser);
      const mockRegister = vi.mocked(authService.register);

      mockGetCurrentUser.mockRejectedValueOnce(new Error('Not authenticated'));
      mockRegister.mockRejectedValueOnce(new Error('Email already exists'));

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.register({
            email: 'existing@example.com',
            password: 'password123',
            name: 'Test User',
          });
        })
      ).rejects.toThrow('Email already exists');
    });
  });

  describe('refreshUser', () => {
    it('should reload user data', async () => {
      const mockGetCurrentUser = vi.mocked(authService.getCurrentUser);
      const updatedUser = { ...mockUser, name: 'Updated Name' };

      mockGetCurrentUser
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(updatedUser);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user?.name).toBe('Test User');
      });

      await act(async () => {
        await result.current.refreshUser();
      });

      await waitFor(() => {
        expect(result.current.user?.name).toBe('Updated Name');
      });
    });
  });

  describe('useRequireAuth', () => {
    it('should return user when authenticated', async () => {
      const mockGetCurrentUser = vi.mocked(authService.getCurrentUser);
      mockGetCurrentUser.mockResolvedValueOnce(mockUser);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useRequireAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should redirect to login when not authenticated', async () => {
      const mockGetCurrentUser = vi.mocked(authService.getCurrentUser);
      mockGetCurrentUser.mockRejectedValueOnce(new Error('Not authenticated'));

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useRequireAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(mockPush).toHaveBeenCalledWith('/auth/login');
    });

    it('should not redirect while loading', async () => {
      const mockGetCurrentUser = vi.mocked(authService.getCurrentUser);
      mockGetCurrentUser.mockImplementation(() => new Promise(() => {})); // Never resolves

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useRequireAuth(), { wrapper });

      expect(result.current.isLoading).toBe(true);
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('useRequireTier', () => {
    it('should allow access for PARENT tier user requiring PARENT', async () => {
      const mockGetCurrentUser = vi.mocked(authService.getCurrentUser);
      mockGetCurrentUser.mockResolvedValueOnce(mockUser);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useRequireTier('PARENT'), { wrapper });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should redirect to login when not authenticated', async () => {
      const mockGetCurrentUser = vi.mocked(authService.getCurrentUser);
      mockGetCurrentUser.mockRejectedValueOnce(new Error('Not authenticated'));

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useRequireTier('LEADER'), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockPush).toHaveBeenCalledWith('/auth/login');
    });

    it('should redirect to dashboard when tier is insufficient', async () => {
      const mockGetCurrentUser = vi.mocked(authService.getCurrentUser);
      mockGetCurrentUser.mockResolvedValueOnce(mockUser); // PARENT tier

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useRequireTier('LEADER'), { wrapper });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });

    it('should allow LEADER to access PARENT tier', async () => {
      const leaderUser = { ...mockUser, authTier: 'LEADER' as const };
      const mockGetCurrentUser = vi.mocked(authService.getCurrentUser);
      mockGetCurrentUser.mockResolvedValueOnce(leaderUser);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useRequireTier('PARENT'), { wrapper });

      await waitFor(() => {
        expect(result.current.user).toEqual(leaderUser);
      });

      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should allow ADMIN to access LEADER tier', async () => {
      const adminUser = { ...mockUser, authTier: 'ADMIN' as const };
      const mockGetCurrentUser = vi.mocked(authService.getCurrentUser);
      mockGetCurrentUser.mockResolvedValueOnce(adminUser);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useRequireTier('LEADER'), { wrapper });

      await waitFor(() => {
        expect(result.current.user).toEqual(adminUser);
      });

      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should not redirect for LEADER requiring ADMIN', async () => {
      const leaderUser = { ...mockUser, authTier: 'LEADER' as const };
      const mockGetCurrentUser = vi.mocked(authService.getCurrentUser);
      mockGetCurrentUser.mockResolvedValueOnce(leaderUser);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useRequireTier('ADMIN'), { wrapper });

      await waitFor(() => {
        expect(result.current.user).toEqual(leaderUser);
      });

      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });
});
