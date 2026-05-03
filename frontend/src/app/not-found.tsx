/**
 * Custom 404 Not Found Page
 * 
 * Displayed when a route doesn't exist
 * Provides helpful navigation back to the application
 */

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 dark:from-gray-900 dark:to-gray-800">
      <div className="text-center">
        {/* 404 Illustration */}
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-blue-600 dark:text-blue-400">404</h1>
          <div className="mt-4">
            <svg
              className="mx-auto h-32 w-32 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>

        {/* Message */}
        <h2 className="mb-4 text-3xl font-bold text-gray-900 dark:text-white">
          Page Not Found
        </h2>
        <p className="mb-8 text-lg text-gray-600 dark:text-gray-400">
          Oops! The page you&apos;re looking for doesn&apos;t exist.
          <br />
          It might have been moved or deleted.
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Link href="/">
            <Button size="lg" className="w-full sm:w-auto">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="mr-2 h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
              Go Home
            </Button>
          </Link>
          <Link href="/events">
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              Browse Events
            </Button>
          </Link>
        </div>

        {/* Help Links */}
        <div className="mt-12 text-sm text-gray-500 dark:text-gray-400">
          <p className="mb-2">Need help? Try these links:</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/profile" className="hover:text-blue-600 hover:underline">
              My Profile
            </Link>
            <Link href="/tasks" className="hover:text-blue-600 hover:underline">
              My Tasks
            </Link>
            <Link href="/points" className="hover:text-blue-600 hover:underline">
              Points
            </Link>
            <Link href="/leaderboard" className="hover:text-blue-600 hover:underline">
              Leaderboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
