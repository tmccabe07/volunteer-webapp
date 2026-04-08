'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PlusCircle, Trash2 } from 'lucide-react';

interface ManualVolunteer {
  volunteerId: string;
  activitySlotId: string;
}

interface CompleteEventDialogProps {
  event: {
    id: string;
    title: string;
    activitySlots: Array<{
      id: string;
      activityType: {
        name: string;
        pointValue: number;
      };
      signups: Array<{
        volunteer: {
          id: string;
          name: string;
        };
        withdrawn: boolean;
      }>;
    }>;
  };
  onComplete: (data: { manualVolunteers?: ManualVolunteer[] }) => Promise<void>;
  onCancel: () => void;
}

export default function CompleteEventDialog({ event, onComplete, onCancel }: CompleteEventDialogProps) {
  const [manualVolunteers, setManualVolunteers] = useState<ManualVolunteer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get list of all volunteers who signed up (for dropdown)
  const allVolunteers = event.activitySlots.flatMap(slot =>
    slot.signups
      .filter(s => !s.withdrawn)
      .map(s => s.volunteer)
  );

  // Get unique volunteers
  const uniqueVolunteers = Array.from(
    new Map(allVolunteers.map(v => [v.id, v])).values()
  );

  const addManualVolunteer = () => {
    setManualVolunteers(prev => [
      ...prev,
      { volunteerId: '', activitySlotId: '' },
    ]);
  };

  const removeManualVolunteer = (index: number) => {
    setManualVolunteers(prev => prev.filter((_, i) => i !== index));
  };

  const updateManualVolunteer = (index: number, field: keyof ManualVolunteer, value: string) => {
    setManualVolunteers(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleComplete = async () => {
    setLoading(true);
    setError(null);

    try {
      // Validate manual volunteers
      const validManuals = manualVolunteers.filter(
        m => m.volunteerId && m.activitySlotId
      );

      await onComplete({
        manualVolunteers: validManuals.length > 0 ? validManuals : undefined,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to complete event');
    } finally {
      setLoading(false);
    }
  };

  // Count active signups
  const totalSignups = event.activitySlots.reduce((sum, slot) => {
    return sum + slot.signups.filter(s => !s.withdrawn).length;
  }, 0);

  const totalPoints = event.activitySlots.reduce((sum, slot) => {
    const activeSignups = slot.signups.filter(s => !s.withdrawn).length;
    return sum + (activeSignups * slot.activityType.pointValue);
  }, 0);

  return (
    <Dialog open onOpenChange={() => onCancel()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Mark Event Complete</DialogTitle>
          <DialogDescription>
            Award points to all volunteers who participated in this event. You can also add volunteers who participated but didn't sign up.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold mb-2">Event Summary</h4>
            <ul className="space-y-1 text-sm">
              <li>• {totalSignups} volunteers signed up</li>
              <li>• {totalPoints} total points will be awarded</li>
            </ul>
          </div>

          {/* Activity Slots with Signups */}
          <div>
            <h4 className="font-semibold mb-2">Signed Up Volunteers</h4>
            <div className="space-y-3">
              {event.activitySlots.map(slot => {
                const activeSignups = slot.signups.filter(s => !s.withdrawn);
                if (activeSignups.length === 0) return null;

                return (
                  <div key={slot.id} className="p-3 border rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <p className="font-medium">{slot.activityType.name}</p>
                      <p className="text-sm text-gray-600">{slot.activityType.pointValue} points each</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {activeSignups.map((signup, idx) => (
                        <span key={idx} className="px-2 py-1 bg-gray-100 rounded text-sm">
                          {signup.volunteer.name}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Manual Volunteers */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-semibold">Add Manual Volunteers (Optional)</h4>
              <Button type="button" variant="outline" size="sm" onClick={addManualVolunteer}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Volunteer
              </Button>
            </div>

            {manualVolunteers.length === 0 ? (
              <p className="text-sm text-gray-500 p-4 border rounded-lg text-center">
                No manual volunteers added. Click "Add Volunteer" to include someone who participated without signing up.
              </p>
            ) : (
              <div className="space-y-3">
                {manualVolunteers.map((manual, index) => (
                  <div key={index} className="flex gap-3 items-end p-3 border rounded-lg">
                    <div className="flex-1">
                      <Label>Volunteer</Label>
                      <Input
                        placeholder="Enter volunteer ID"
                        value={manual.volunteerId}
                        onChange={(e) => updateManualVolunteer(index, 'volunteerId', e.target.value)}
                      />
                    </div>

                    <div className="flex-1">
                      <Label>Activity</Label>
                      <Select
                        value={manual.activitySlotId}
                        onValueChange={(value: string) => updateManualVolunteer(index, 'activitySlotId', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select activity" />
                        </SelectTrigger>
                        <SelectContent>
                          {event.activitySlots.map(slot => (
                            <SelectItem key={slot.id} value={slot.id}>
                              {slot.activityType.name} ({slot.activityType.pointValue} pts)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => removeManualVolunteer(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleComplete} disabled={loading}>
            {loading ? 'Completing...' : 'Mark Complete & Award Points'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
