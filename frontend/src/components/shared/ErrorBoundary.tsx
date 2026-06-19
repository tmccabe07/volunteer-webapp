/**
 * ErrorBoundary Component
 * 
 * React Error Boundary to catch and display errors gracefully
 * Prevents the entire app from crashing when a component error occurs
 * 
 * Usage:
 * Wrap components that might throw errors:
 * 
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 * 
 * Or use in layout.tsx to catch errors for entire routes
 */

'use client';

import React, { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console in development
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In production, you might want to send this to an error reporting service
    // e.g., Sentry, LogRocket, etc.
    if (process.env.NODE_ENV === 'production') {
      // Send to error reporting service
      // Example: sendToErrorReporting(error, errorInfo);
    }

    this.setState({
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const message = this.state.error?.message ?? '';
      const isAccessDenied = message.includes('403') || message.toLowerCase().includes('forbidden');

      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                Something went wrong
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400">
                {isAccessDenied
                  ? 'Access denied for this resource. Your account may not have permission for this page or den scope.'
                  : 'We\'re sorry, but something unexpected happened. Please try refreshing the page or contact support if the problem persists.'}
              </p>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="rounded-md bg-red-50 p-4 dark:bg-red-900/20">
                  <h3 className="mb-2 font-semibold text-red-800 dark:text-red-400">
                    Error Details (Development Only):
                  </h3>
                  <pre className="overflow-auto text-xs text-red-700 dark:text-red-300">
                    <code>{this.state.error.toString()}</code>
                  </pre>
                  {this.state.errorInfo && (
                    <pre className="mt-2 overflow-auto text-xs text-red-700 dark:text-red-300">
                      <code>{this.state.errorInfo.componentStack}</code>
                    </pre>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <Button onClick={this.handleReset} variant="outline">
                  Try Again
                </Button>
                <Button onClick={this.handleReload} variant="default">
                  Reload Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Error display component for showing specific errors
 * Use this for known error states (e.g., API errors)
 */
export function ErrorDisplay({
  title = 'Error',
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-red-700 dark:text-red-300">{message}</p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline" size="sm">
            Try Again
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Inline error message component
 * For displaying errors within forms or small sections
 */
export function InlineError({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
      <span>{message}</span>
    </div>
  );
}

export default ErrorBoundary;
