'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import AdvancementProgress from '@/components/advancement/AdvancementProgress';
import {
  advancementService,
  type ChildAdvancementProgress,
} from '@/services/advancement.service';
import { useAuth } from '@/lib/auth-context';

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const maybeResponse = (error as {
      response?: {
        status?: number;
        data?: { error?: string };
      };
    }).response;

    if (maybeResponse?.status === 403) {
      return 'You do not have permission to view this advancement record.';
    }

    if (maybeResponse?.status === 404) {
      return 'Cub Scout advancement progress was not found.';
    }

    if (maybeResponse?.data?.error) {
      return maybeResponse.data.error;
    }
  }

  return fallback;
}

export default function CubAdvancementPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const childScoutId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<ChildAdvancementProgress | null>(null);

  const loadProgress = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await advancementService.getChildAdvancementProgress(childScoutId);
      setProgress(result);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to load advancement progress'));
    } finally {
      setIsLoading(false);
    }
  }, [childScoutId]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }

    if (user && childScoutId) {
      loadProgress();
    }
  }, [authLoading, user, childScoutId, router, loadProgress]);

  if (authLoading || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Loading advancement progress...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-6 bg-red-50 border-red-200">
          <p className="text-red-800">{error}</p>
          <div className="mt-4 flex gap-2">
            <Link href={`/cubs/${childScoutId}`}>
              <Button variant="outline">Back to Cub Scout</Button>
            </Link>
            <Button onClick={loadProgress}>Try Again</Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!progress) {
    return null;
  }

  const canComplete = !!user;

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div>
        <Link href={`/cubs/${childScoutId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Cub Scout
          </Button>
        </Link>
      </div>

      <AdvancementProgress progress={progress} canComplete={canComplete} onRefresh={loadProgress} />
    </div>
  );
}
