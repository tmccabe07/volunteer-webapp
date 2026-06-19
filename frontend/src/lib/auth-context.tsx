'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authService, User } from '@/services/auth.service';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    name: string;
    phone?: string;
  }) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Load user on mount (skip on public auth pages to avoid 401 errors)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const publicAuthPaths = ['/auth/login', '/auth/register', '/auth/reset-password'];
      const isOnPublicPage = publicAuthPaths.some(path => window.location.pathname.startsWith(path));
      
      if (!isOnPublicPage) {
        loadUser();
      } else {
        setIsLoading(false);
      }
    } else {
      loadUser();
    }
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      // User not authenticated or token expired
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string, rememberMe?: boolean) => {
    const response = await authService.login({ email, password, rememberMe });
    // Load full user data after login
    await loadUser();
    
    // Check if user must change password
    if (response.user.mustChangePassword) {
      router.push('/auth/change-password');
    }
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    router.push('/auth/login');
  };

  const register = async (data: {
    email: string;
    password: string;
    name: string;
    phone?: string;
  }) => {
    await authService.register(data);
    // Load full user data after registration
    await loadUser();
  };

  const refreshUser = async () => {
    await loadUser();
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    register,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Hook to require authentication
 * Redirects to login if not authenticated
 */
export function useRequireAuth() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, isLoading, router]);

  return { user, isLoading };
}

/**
 * Hook to require specific tier
 * Redirects to login if not authenticated, or dashboard if insufficient permissions
 */
export function useRequireTier(minTier: 'PARENT' | 'LEADER' | 'ADMIN') {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const tierLevels = { PARENT: 1, LEADER: 2, DEN_CHIEF: 2, ADMIN: 3 };

  useEffect(() => {
    if (!isLoading) {
      // Not authenticated - redirect to login
      if (!user) {
        router.push('/auth/login');
        return;
      }

      // Check tier level
      const userLevel = tierLevels[user.authTier];
      const requiredLevel = tierLevels[minTier];

      // Insufficient permissions - redirect to dashboard
      if (userLevel < requiredLevel) {
        router.push('/dashboard');
      }
    }
  }, [user, isLoading, minTier, router]);

  return { user, isLoading };
}
