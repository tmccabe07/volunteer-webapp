'use client';

import { useState, useEffect } from 'react';
import { useRequireTier } from '@/lib/auth-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ActivityTypeForm, ActivityTypeData } from '@/components/forms/config/ActivityTypeForm';
import { ActivityTypeList } from '@/components/shared/config/ActivityTypeList';
import configService from '@/services/config.service';
import { Plus } from 'lucide-react';

export default function AdminActivitiesPage() {
  const { user, isLoading } = useRequireTier('ADMIN');
  const [activityTypes, setActivityTypes] = useState<ActivityTypeData[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ActivityTypeData | null>(null);

  useEffect(() => {
    if (!isLoading && user) {
      loadActivityTypes();
    }
  }, [isLoading, user]);

  const loadActivityTypes = async () => {
    try {
      const response = await configService.getActivityTypes();
      setActivityTypes(response.activityTypes);
    } catch (err: any) {
      console.error('Error loading activity types:', err);
      setError('Failed to load activity types');
    } finally {
      setIsLoadingActivities(false);
    }
  };

  const handleCreate = async (data: Omit<ActivityTypeData, 'id'>) => {
    try {
      await configService.createActivityType(data);
      await loadActivityTypes();
      setShowForm(false);
      setError('');
    } catch (err: any) {
      throw err; // Let the form handle the error display
    }
  };

  const handleUpdate = async (data: Omit<ActivityTypeData, 'id'>) => {
    if (!editingActivity?.id) return;

    try {
      await configService.updateActivityType(editingActivity.id, data);
      await loadActivityTypes();
      setEditingActivity(null);
      setError('');
    } catch (err: any) {
      throw err; // Let the form handle the error display
    }
  };

  const handleDelete = async (activityTypeId: string) => {
    try {
      await configService.deleteActivityType(activityTypeId);
      await loadActivityTypes();
      setError('');
    } catch (err: any) {
      throw err; // Let the list handle the error display
    }
  };

  const handleEdit = (activityType: ActivityTypeData) => {
    setEditingActivity(activityType);
    setShowForm(false);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingActivity(null);
  };

  if (isLoading || isLoadingActivities) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Activity Configuration</h1>
          <p className="mt-2 text-gray-600">
            Manage volunteer activity types and point values for your pack
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {showForm || editingActivity ? (
          <div className="mb-6">
            <ActivityTypeForm
              initialData={editingActivity || undefined}
              onSubmit={editingActivity ? handleUpdate : handleCreate}
              onCancel={handleCancelForm}
            />
          </div>
        ) : (
          <div className="mb-6">
            <Button variant="outline" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Activity Type
            </Button>
          </div>
        )}

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Activity Types</h2>
          <ActivityTypeList
            activityTypes={activityTypes}
            onEdit={handleEdit}
            onDelete={handleDelete}
            canManage={true}
          />
        </Card>

        <Card className="p-6 mt-6 bg-blue-50 border-blue-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            ℹ️ About Activity Categories
          </h3>
          <div className="text-sm text-gray-700 space-y-2">
            <p><strong>LOW (1-5 points):</strong> Simple tasks like attending meetings or helping with setup</p>
            <p><strong>MEDIUM (6-10 points):</strong> More involved activities like leading a den activity or managing an event station</p>
            <p><strong>HIGH (11-20 points):</strong> Significant commitments like organizing a pack event or serving as a den leader</p>
            <p><strong>SPECIAL:</strong> Custom point values for unique activities or awards (any positive number)</p>
            <p className="mt-4 pt-4 border-t border-blue-300">
              <strong>Important:</strong> Changing point values only affects new events. Historical point awards are preserved.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
