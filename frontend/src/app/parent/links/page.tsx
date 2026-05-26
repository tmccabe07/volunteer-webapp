'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import RequestChildLinkForm from '@/components/parent/RequestChildLinkForm';
import PendingLinksQueue from '@/components/parent/PendingLinksQueue';
import { useAuth } from '@/lib/auth-context';

export default function ParentLinksPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login');
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const canRequestLink = user.authTier === 'PARENT';
  const canReviewPending = user.authTier === 'LEADER' || user.authTier === 'ADMIN';

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Parent-Cub Scout Links</h1>
        <p className="text-gray-600 mt-2">
          Request family links for Cub Scouts and review pending approvals.
        </p>
      </div>

      {canRequestLink && <RequestChildLinkForm />}

      {canReviewPending && <PendingLinksQueue />}

      {!canRequestLink && !canReviewPending && (
        <div className="p-4 border rounded-md text-sm text-gray-700">
          Your account does not currently have access to this page.
        </div>
      )}
    </div>
  );
}
