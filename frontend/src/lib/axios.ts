/**
 * Axios Client Configuration
 * 
 * Configured Axios instance with JWT refresh interceptors
 * per research.md Decision 2.3
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

/**
 * Base API client instance
 */
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  withCredentials: true, // Send HttpOnly cookies with requests
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request Interceptor
 * 
 * Cookies are sent automatically via withCredentials: true
 * No need to manually attach tokens
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor
 * 
 * Handles 401 errors with automatic token refresh
 * Queues failed requests until refresh completes
 */
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

/**
 * Add request to queue
 * @param callback Callback to execute when token is refreshed
 */
const subscribeTokenRefresh = (callback: (token: string) => void) => {
  refreshSubscribers.push(callback);
};

/**
 * Execute all queued requests
 * @param token New access token
 */
const onRefreshed = (token: string) => {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
      _forbiddenRetry?: boolean;
    };

    // Handle 401 Unauthorized errors
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      // Don't attempt token refresh for auth endpoints themselves
      const authEndpoints = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/request-reset', '/auth/reset-password'];
      const isAuthEndpoint = authEndpoints.some(endpoint => originalRequest.url?.includes(endpoint));
      
      if (isAuthEndpoint) {
        // For auth endpoints, just reject the error without retry
        return Promise.reject(error);
      }
      
      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh(() => {
            resolve(apiClient(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Attempt to refresh the token
        await apiClient.post('/auth/refresh');
        
        isRefreshing = false;
        onRefreshed('');
        
        // Retry the original request
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed - redirect to login
        isRefreshing = false;
        
        // Only redirect if we're in the browser (not during SSR)
        // AND not already on a public auth page (to avoid infinite loops)
        if (typeof window !== 'undefined') {
          const publicAuthPaths = ['/auth/login', '/auth/register', '/auth/reset-password', '/auth/change-password'];
          const isOnPublicPage = publicAuthPaths.some(path => window.location.pathname.startsWith(path));
          
          if (!isOnPublicPage) {
            window.location.href = '/auth/login';
          }
        }
        
        return Promise.reject(refreshError);
      }
    }

    // Handle 403 Forbidden errors
    if (error.response?.status === 403 && originalRequest && !originalRequest._forbiddenRetry) {
      originalRequest._forbiddenRetry = true;

      try {
        // Refresh once in case user tier changed after login and access token is stale
        await apiClient.post('/auth/refresh');
        return apiClient(originalRequest);
      } catch {
        // Fall through to unauthorized redirect below
      }
    }

    if (error.response?.status === 403) {
      // Insufficient permissions - redirect to unauthorized page
      if (typeof window !== 'undefined') {
        window.location.href = '/unauthorized';
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;

/**
 * Helper to handle API errors
 * @param error Axios error
 * @returns User-friendly error message
 */
export const handleApiError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    // Server responded with error
    if (error.response?.data?.error) {
      return error.response.data.error;
    }
    
    // Network error
    if (error.message === 'Network Error') {
      return 'Unable to connect to server. Please check your internet connection.';
    }
    
    // Generic HTTP error
    return error.message || 'An unexpected error occurred';
  }
  
  // Non-Axios error
  return 'An unexpected error occurred';
};
