'use client';

import { Button } from '@/components/ui/button';
import { type ScopedRoleAssignment } from '@/services/roleService';

interface Props {
  assignments: ScopedRoleAssignment[];
  onRemove: (assignmentId: string) => Promise<void>;
}

export default function RoleAssignmentsList({ assignments, onRemove }: Props) {
  return (
    <div className="rounded-md border">
      <div className="border-b px-4 py-3 text-sm font-semibold">Scoped Assignments</div>
      <div className="divide-y">
        {assignments.length === 0 && (
          <p className="px-4 py-3 text-sm text-gray-500">No scoped assignments yet.</p>
        )}

        {assignments.map((assignment) => (
          <div key={assignment.id} className="flex items-center justify-between gap-4 px-4 py-3">
            <div>
              <p className="text-sm font-medium">{assignment.volunteerName} - {assignment.roleName}</p>
              <p className="text-xs text-gray-600">
                Scope: {assignment.scopeType}
                {assignment.denNumber ? ` | Den ${assignment.denNumber}` : ''}
                {assignment.rankLevel ? ` | ${assignment.rankLevel}` : ''}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => onRemove(assignment.id)}>
              Remove
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
