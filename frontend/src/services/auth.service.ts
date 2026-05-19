import axios from '@/lib/axios';

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  authTier: 'PARENT' | 'LEADER' | 'ADMIN';
  leaderboardOptIn: boolean;
  mustChangePassword?: boolean;
  roles: Array<{
    id: string;
    name: string;
    roleType: string;
    specialty: string | null;
    rankLevel: string | null;
  }>;
  childrenRanks: Array<{
    rankLevel: string;
  }>;
  pointBalance: {
    totalPoints: number;
    currentYearPoints: number;
  };
  badgeTier: {
    current: string | null;
    currentTierDetails: {
      tierName: string;
      minPoints: number;
      maxPoints: number | null;
      badgeColor: string;
    } | null;
    nextTier: {
      tierName: string;
      minPoints: number;
      badgeColor: string;
    } | null;
    pointsToNextTier: number | null;
  };
  projectedPoints: number;
}

export interface AuthResponse {
  user: Omit<User, 'roles' | 'childrenRanks' | 'pointBalance'> & { mustChangePassword?: boolean };
  accessToken: string;
  refreshToken: string;
}

/**
 * Auth API service for authentication operations
 */
export class AuthApiService {
  /**
   * Register a new volunteer account
   */
  async register(data: {
    email: string;
    password: string;
    name: string;
    phone?: string;
  }): Promise<AuthResponse> {
    const response = await axios.post<AuthResponse>('/auth/register', data);
    return response.data;
  }

  /**
   * Log in with email and password
   */
  async login(data: {
    email: string;
    password: string;
    rememberMe?: boolean;
  }): Promise<AuthResponse> {
    const response = await axios.post<AuthResponse>('/auth/login', data);
    return response.data;
  }

  /**
   * Log out current session
   */
  async logout(): Promise<void> {
    await axios.post('/auth/logout');
  }

  /**
   * Refresh access token
   */
  async refresh(): Promise<{ accessToken: string; refreshToken: string }> {
    const response = await axios.post('/auth/refresh');
    return response.data;
  }

  /**
   * Request password reset email
   */
  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const response = await axios.post('/auth/request-reset', { email });
    return response.data;
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const response = await axios.post('/auth/reset-password', {
      token,
      newPassword
    });
    return response.data;
  }

  /**
   * Get current authenticated user info
   */
  async getCurrentUser(): Promise<User> {
    const response = await axios.get<User>('/auth/me');
    return response.data;
  }

  /**
   * Change password for authenticated user
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const response = await axios.post('/auth/change-password', {
      currentPassword,
      newPassword
    });
    return response.data;
  }
}

export const authService = new AuthApiService();
