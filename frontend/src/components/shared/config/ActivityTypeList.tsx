'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Pencil, Trash2 } from 'lucide-react';
import { ActivityTypeData } from '@/components/forms/config/ActivityTypeForm';

interface ActivityTypeListProps {
  activityTypes: ActivityTypeData[];
  onEdit?: (activityType: ActivityTypeData) => void;
  onDelete?: (activityTypeId: string) => Promise<void>;
  canManage?: boolean; // Whether user can edit/delete (Tier 3 only)
}

const CATEGORY_COLORS: Record<string, string> = {
  LOW: 'bg-blue-100 text-blue-800',
  MEDIUM: 'bg-purple-100 text-purple-800',
  HIGH: 'bg-orange-100 text-orange-800',
  SPECIAL: 'bg-red-100 text-red-800',
};

export function ActivityTypeList({
  activityTypes,
  onEdit,
  onDelete,
  canManage = false,
}: ActivityTypeListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async (activityType: ActivityTypeData) => {
    if (!onDelete || !activityType.id) return;

    const confirmed = confirm(
      `Are you sure you want to delete "${activityType.name}"?\n\nThis action cannot be undone. Historical events will preserve this activity type.`
    );

    if (!confirmed) return;

    setDeletingId(activityType.id);
    setDeleteError(null);

    try {
      await onDelete(activityType.id);
    } catch (error: any) {
      setDeleteError(error.response?.data?.error || 'Failed to delete activity type');
      setTimeout(() => setDeleteError(null), 5000);
    } finally {
      setDeletingId(null);
    }
  };

  if (activityTypes.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">No activity types configured yet.</p>
        {canManage && (
          <p className="text-sm text-gray-400">
            Create your first activity type to get started.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {deleteError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
          {deleteError}
        </div>
      )}

      {activityTypes.map((activityType) => (
        <div
          key={activityType.id}
          className="p-4 border rounded-lg flex justify-between items-start hover:bg-gray-50 transition-colors"
        >
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-lg">{activityType.name}</h3>
              <Badge className={CATEGORY_COLORS[activityType.category]}>
                {activityType.category}
              </Badge>
            </div>
            
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center text-gray-600">
                <Trophy className="h-4 w-4 mr-1" />
                <span className="text-sm font-medium">{activityType.pointValue} points</span>
              </div>
            </div>

            {activityType.description && (
              <p className="text-sm text-gray-600 mt-2">{activityType.description}</p>
            )}
          </div>

          {canManage && (
            <div className="flex gap-2 ml-4">
              {onEdit && (
                <Button
                  variant="plainoutline"
                  size="sm"
                  onClick={() => onEdit(activityType)}
                  disabled={deletingId === activityType.id}
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="plainoutline"
                  size="sm"
                  onClick={() => handleDelete(activityType)}
                  disabled={deletingId === activityType.id}
                  className="text-red-600 hover:text-red-700 hover:border-red-300"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  {deletingId === activityType.id ? 'Deleting...' : 'Delete'}
                </Button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
