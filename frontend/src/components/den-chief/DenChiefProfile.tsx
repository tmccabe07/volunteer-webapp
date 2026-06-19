'use client';

import { Button } from '@/components/ui/button';
import { type DenChief } from '@/services/denChiefService';

interface Props {
  denChief: DenChief;
  onRemoveAssignment: (assignmentId: string) => Promise<void>;
}

export default function DenChiefProfile({ denChief, onRemoveAssignment }: Props) {
  return (
    <div className="space-y-4 rounded-md border p-4">
      <div>
        <h2 className="text-lg font-semibold">{denChief.firstName} {denChief.lastName}</h2>
        <p className="text-sm text-gray-600">{denChief.email}</p>
      </div>

      <div>
        <h3 className="text-sm font-semibold">Active Den Assignments</h3>
        <div className="mt-2 space-y-2">
          {denChief.assignments.length === 0 && <p className="text-sm text-gray-500">No active assignments.</p>}
          {denChief.assignments.map((assignment) => (
            <div key={assignment.id} className="flex items-center justify-between rounded border p-2">
              <div>
                <p className="text-sm">{assignment.denName} (#{assignment.denNumber})</p>
                <p className="text-xs text-gray-600">From {new Date(assignment.validFrom).toLocaleDateString()}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => onRemoveAssignment(assignment.id)}>
                Remove
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
