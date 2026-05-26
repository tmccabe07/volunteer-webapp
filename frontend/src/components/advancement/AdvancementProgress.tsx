'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { ChildAdvancementProgress } from '@/services/advancement.service';
import AdventureCard from './AdventureCard';

interface AdvancementProgressProps {
  progress: ChildAdvancementProgress;
  canComplete: boolean;
  onRefresh: () => Promise<void> | void;
}

export default function AdvancementProgress({
  progress,
  canComplete,
  onRefresh,
}: AdvancementProgressProps) {
  const requiredPercent =
    progress.rankProgress.requiredAdventuresNeeded === 0
      ? 0
      : Math.round(
          (progress.rankProgress.requiredAdventuresCompleted /
            progress.rankProgress.requiredAdventuresNeeded) *
            100,
        );

  const electivePercent =
    progress.rankProgress.electiveAdventuresNeeded === 0
      ? 0
      : Math.round(
          (progress.rankProgress.electiveAdventuresCompleted /
            progress.rankProgress.electiveAdventuresNeeded) *
            100,
        );

  return (
    <div className="space-y-6">
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h2 className="text-2xl font-semibold">{progress.childScout.name}</h2>
            <p className="text-sm text-gray-600">Current Rank: {progress.childScout.currentRank}</p>
          </div>
          <Badge variant="outline" className={progress.rankProgress.isRankEligible ? 'border-green-300 text-green-700' : ''}>
            {progress.rankProgress.isRankEligible ? 'Rank Eligible' : 'In Progress'}
          </Badge>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Required Adventures</span>
              <span>
                {progress.rankProgress.requiredAdventuresCompleted} / {progress.rankProgress.requiredAdventuresNeeded}
              </span>
            </div>
            <Progress value={requiredPercent} max={100} />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Elective Adventures</span>
              <span>
                {progress.rankProgress.electiveAdventuresCompleted} / {progress.rankProgress.electiveAdventuresNeeded}
              </span>
            </div>
            <Progress value={electivePercent} max={100} />
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        {progress.adventures.map((adventure) => (
          <AdventureCard
            key={adventure.id}
            childScoutId={progress.childScout.id}
            adventure={adventure}
            canComplete={canComplete}
            onUpdated={onRefresh}
          />
        ))}
      </div>
    </div>
  );
}
