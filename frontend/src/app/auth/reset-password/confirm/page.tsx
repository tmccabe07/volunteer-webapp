'use client';

export const dynamic = 'force-dynamic';

import { useSearchParams } from 'next/navigation';
import { ResetPasswordForm } from '@/components/forms/auth/ResetPasswordForm';
import { Suspense } from 'react';

function ResetPasswordConfirmContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="max-w-md mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">Invalid Reset Link</h2>
          <p className="text-gray-600 mb-4">
            The password reset link is invalid or has expired.
          </p>
          <a href="/auth/reset-password" className="text-blue-600 hover:underline">
            Request a new reset link
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full">
        <ResetPasswordForm token={token} />
      </div>
    </div>
  );
}

function ResetPasswordConfirmPageContent() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <ResetPasswordConfirmContent />
    </Suspense>
  );
}

export default function ResetPasswordConfirmPage() {
  return <Suspense><ResetPasswordConfirmPageContent /></Suspense>;
}
