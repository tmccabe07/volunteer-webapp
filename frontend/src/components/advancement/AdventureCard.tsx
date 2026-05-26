'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import CompleteRequirementButton from './CompleteRequirementButton';

interface AdventureCardProps {
  childScoutId: string;
  adventure: {
    id: string;
    name: string;
    classification: 'REQUIRED' | 'ELECTIVE' | 'SPECIAL_ELECTIVE';
    totalRequirements: number;
    completedRequirements: number;
    percentComplete: number;
    isComplete: boolean;
    requirements: Array<{
      id: string;
      displayOrder: number;
      requirementText: string;
      isCompleted: boolean;
      completedAt?: string;
      scoutbookStatus?: 'PENDING' | 'ENTERED' | 'VERIFIED';
    }>;
  };
  canComplete: boolean;
  onUpdated: () => Promise<void> | void;
}

function classificationColor(classification: 'REQUIRED' | 'ELECTIVE' | 'SPECIAL_ELECTIVE'): string {
  if (classification === 'REQUIRED') {
    return 'bg-blue-100 text-blue-800';
  }
  if (classification === 'ELECTIVE') {
    return 'bg-green-100 text-green-800';
  }
  return 'bg-amber-100 text-amber-800';
}

export default function AdventureCard({
  childScoutId,
  adventure,
  canComplete,
  onUpdated,
}: AdventureCardProps) {
  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-lg">{adventure.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={classificationColor(adventure.classification)}>
              {adventure.classification}
            </Badge>
            {adventure.isComplete && <Badge variant="outline">Complete</Badge>}
          </div>
        </div>
        <div className="text-sm text-gray-600">
          {adventure.completedRequirements} / {adventure.totalRequirements} requirements
        </div>
      </div>

      <Progress value={adventure.percentComplete} max={100} showLabel />

      <div className="space-y-2">
        {adventure.requirements.map((requirement) => (
          <div
            key={requirement.id}
            className="border rounded-md p-3 flex items-start justify-between gap-3"
          >
            <div className="space-y-1 flex-1">
              <p className="text-sm font-medium">
                {requirement.displayOrder}. {requirement.requirementText}
              </p>
              {requirement.isCompleted && (
                <div className="text-xs text-gray-600">
                  Completed
                  {requirement.completedAt
                    ? ` on ${new Date(requirement.completedAt).toLocaleDateString()}`
                    : ''}
                  {requirement.scoutbookStatus ? ` • Scoutbook: ${requirement.scoutbookStatus}` : ''}
                </div>
              )}
            </div>
            <CompleteRequirementButton
              childScoutId={childScoutId}
              requirementId={requirement.id}
              isCompleted={requirement.isCompleted}
              canComplete={canComplete}
              onCompleted={onUpdated}
            />
          </div>
        ))}
      </div>
    </Card>
  );
}
