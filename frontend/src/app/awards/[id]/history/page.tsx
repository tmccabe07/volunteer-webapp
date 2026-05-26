'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { awardService, type AwardItem } from '@/services/awardService';
import { Button } from '@/components/ui/button';

export default function AwardHistoryPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const [items, setItems] = useState<AwardItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPageLoading, setIsPageLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login');
      return;
    }

    if (!isLoading && user && user.authTier === 'PARENT') {
      router.push('/unauthorized');
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    const load = async () => {
      if (isLoading || !user || user.authTier === 'PARENT') {
        return;
      }

      try {
        setIsPageLoading(true);
        const response = await awardService.getAwards();
        setItems(response.data);
      } catch (err: any) {
        setError(err?.response?.data?.error || 'Failed to load award history');
      } finally {
        setIsPageLoading(false);
      }
    };

    load();
  }, [isLoading, user]);

  const award = useMemo(() => items.find((item) => item.id === params.id), [items, params.id]);

  if (isLoading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }

  if (!user || user.authTier === 'PARENT') {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl font-bold">Award History</h1>
        <Button asChild variant="outline">
          <Link href="/awards">Back to Dashboard</Link>
        </Button>
      </div>

      {isPageLoading ? (
        <p className="text-sm text-slate-600">Loading award details...</p>
      ) : error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      ) : !award ? (
        <p className="text-sm text-slate-600">Award not found.</p>
      ) : (
        <div className="rounded-lg border p-4 space-y-2 text-sm text-slate-700">
          <p><span className="font-medium">Award:</span> {award.award.name}</p>
          <p><span className="font-medium">Cub Scout:</span> {award.childScout.name}</p>
          <p><span className="font-medium">Current State:</span> {award.currentState}</p>
          <p><span className="font-medium">Updated:</span> {new Date(award.updatedAt).toLocaleString()}</p>
          <p className="text-slate-600">
            State change history is provided by the transition API response and can be surfaced in future detail endpoints.
          </p>
        </div>
      )}
    </div>
  );
}
