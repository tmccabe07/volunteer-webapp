'use client';

export const dynamic = 'force-dynamic';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import ReconciliationQueue from '@/components/advancement/ReconciliationQueue';

function ReconciliationDashboardPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading } = useAuth();
  const denId = searchParams.get('denId') || undefined;

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login');
      return;
    }

    if (!isLoading && user && user.authTier === 'PARENT') {
      router.push('/unauthorized');
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user || user.authTier === 'PARENT') {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Verify Completions</h1>
        <p className="text-gray-600 mt-2">
          Review pending completions, confirm them in Scoutbook, and mark them verified here.
        </p>
      </div>

      <ReconciliationQueue initialDenId={denId} />
    </div>
  );
}

export default function ReconciliationDashboardPage() {
  return <Suspense><ReconciliationDashboardPageContent /></Suspense>;
}
