'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { advancementService, ChildAdvancementProgress } from '@/services/advancement.service';
import RequestChildLinkForm from '@/components/parent/RequestChildLinkForm';
import { parentLinkService, RequestableCubScoutItem } from '@/services/parentLinkService';

interface CubWithProgress {
  cub: RequestableCubScoutItem;
  progress: ChildAdvancementProgress | null;
}

export default function MyCubScoutsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cubsWithProgress, setCubsWithProgress] = useState<CubWithProgress[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const loadMyCubs = async () => {
      setIsLoadingData(true);
      setError(null);

      try {
        const cubsResponse = await parentLinkService.getMyLinkedCubScouts();
        const cubs = cubsResponse.data;

        const progressResults = await Promise.all(
          cubs.map(async (cub) => {
            try {
              const progress = await advancementService.getChildAdvancementProgress(cub.id);
              return { cub, progress };
            } catch (progressError) {
              console.error(`Error loading progress for cub ${cub.id}:`, progressError);
              return { cub, progress: null };
            }
          }),
        );

        setCubsWithProgress(progressResults);
      } catch (err) {
        console.error('Error loading My Cub Scouts data:', err);
        setError('Unable to load your Cub Scouts right now.');
      } finally {
        setIsLoadingData(false);
      }
    };

    loadMyCubs();
  }, [user]);

  const totalEligibleRanks = useMemo(
    () => cubsWithProgress.filter((item) => item.progress?.rankProgress.isRankEligible).length,
    [cubsWithProgress],
  );

  if (authLoading || isLoadingData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Cub Scouts</h1>
        <p className="text-gray-600 mt-2">
          Track advancement status and upcoming milestones for your Cub Scouts.
        </p>
      </div>

      {error && (
        <Card className="p-4 border-red-200 bg-red-50 text-red-800">
          {error}
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-sm text-gray-600">Linked Cub Scouts</p>
          <p className="text-2xl font-bold mt-1">{cubsWithProgress.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-600">Rank eligible</p>
          <p className="text-2xl font-bold mt-1">{totalEligibleRanks}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-600">Parent link requests</p>
          <p className="text-sm mt-2">Submit and track requests directly on this page.</p>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-2">Request a Parent Link</h2>
        <p className="text-sm text-gray-600 mb-4">
          If your Cub Scout is not listed, submit a link request here for leader approval.
        </p>
        <RequestChildLinkForm />
      </Card>

      {cubsWithProgress.length === 0 ? (
        <Card className="p-6">
          <h2 className="text-xl font-semibold">No linked Cub Scouts yet</h2>
          <p className="text-gray-600 mt-2">Submit a parent link request above to get started.</p>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {cubsWithProgress.map(({ cub, progress }) => {
            const rankProgress = progress?.rankProgress;

            return (
              <Card key={cub.id} className="p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h2 className="text-xl font-semibold">{cub.firstName} {cub.lastName}</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {cub.currentRank}
                      {cub.currentDen ? ` • ${cub.currentDen.name}` : ''}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/cubs/${cub.id}`}>
                      <Button variant="outline" size="sm">Profile</Button>
                    </Link>
                    <Link href={`/cubs/${cub.id}/advancement`}>
                      <Button size="sm">Advancement</Button>
                    </Link>
                  </div>
                </div>

                {rankProgress ? (
                  <div className="mt-4 space-y-2 text-sm">
                    <p>
                      Required Adventures: <span className="font-medium">{rankProgress.requiredAdventuresCompleted}/{rankProgress.requiredAdventuresNeeded}</span>
                    </p>
                    <p>
                      Elective Adventures: <span className="font-medium">{rankProgress.electiveAdventuresCompleted}/{rankProgress.electiveAdventuresNeeded}</span>
                    </p>
                    <p>
                      Rank Status:{' '}
                      <span className={rankProgress.isRankEligible ? 'font-medium text-green-700' : 'font-medium text-gray-700'}>
                        {rankProgress.isRankEligible ? 'Eligible' : 'In Progress'}
                      </span>
                    </p>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-gray-600">Advancement status is temporarily unavailable for this Cub Scout.</p>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}