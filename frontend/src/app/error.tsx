/**
 * Global Error Page
 * 
 * Catches unhandled errors in the application
 * Must be a Client Component
 */

'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console
    console.error('Application error:', error);

    // In production, send to error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: sendToErrorReporting(error);
    }
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
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
            We&apos;re sorry, but an unexpected error occurred. Our team has been notified and is
            working to fix it. Please try again or refresh the page.
          </p>

          {/* Error reference for support */}
          {error.digest && (
            <div className="rounded-md bg-gray-100 p-3 dark:bg-gray-800">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Error Reference: <code className="font-mono text-xs">{error.digest}</code>
              </p>
            </div>
          )}

          {/* Show error details in development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="rounded-md bg-red-50 p-4 dark:bg-red-900/20">
              <h3 className="mb-2 font-semibold text-red-800 dark:text-red-400">
                Error Details (Development Only):
              </h3>
              <pre className="overflow-auto text-xs text-red-700 dark:text-red-300">
                <code>{error.message}</code>
              </pre>
              {error.stack && (
                <pre className="mt-2 overflow-auto text-xs text-red-700 dark:text-red-300">
                  <code>{error.stack}</code>
                </pre>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button onClick={reset} variant="default">
              Try Again
            </Button>
            <Button onClick={() => window.location.href = '/'} variant="outline">
              Go Home
            </Button>
          </div>

          {/* Help text */}
          <div className="mt-6 border-t pt-4 text-sm text-gray-500 dark:text-gray-400">
            <p>
              If this problem persists, please contact support with the error reference above.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
