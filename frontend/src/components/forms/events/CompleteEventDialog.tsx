'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
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
import { PlusCircle, Trash2, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface ManualVolunteer {
  volunteerId: string;
  activitySlotId: string;
}

interface CompleteEventDialogProps {
  event: {
    id: string;
    title: string;
    plannedRequirements?: Array<{
      requirementId: string;
      requirement?: {
        requirementText: string;
      };
    }>;
    activitySlots: Array<{
      id: string;
      activityType: {
        name: string;
        pointValue: number;
      };
      signups: Array<{
        id: string;
        volunteer: {
          id: string;
          name: string;
        };
        withdrawn: boolean;
      }>;
    }>;
  };
  allVolunteers: Array<{
    id: string;
    name: string;
    email: string;
  }>;
  attendanceCount?: number;
  onRecordAttendance?: () => void;
  onComplete: (data: {
    manualVolunteers?: ManualVolunteer[];
    excludedSignupIds?: string[];
    applyPlannedRequirementsToPresent?: boolean;
  }) => Promise<void>;
  onCancel: () => void;
}

export default function CompleteEventDialog({
  event,
  allVolunteers,
  attendanceCount = 0,
  onRecordAttendance,
  onComplete,
  onCancel,
}: CompleteEventDialogProps) {
  const [manualVolunteers, setManualVolunteers] = useState<ManualVolunteer[]>([]);
  const [excludedSignupIds, setExcludedSignupIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applyPlannedRequirementsToPresent, setApplyPlannedRequirementsToPresent] = useState(false);

  const plannedRequirements = event.plannedRequirements || [];

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

  const toggleExcludeSignup = (signupId: string) => {
    setExcludedSignupIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(signupId)) {
        newSet.delete(signupId);
      } else {
        newSet.add(signupId);
      }
      return newSet;
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
        excludedSignupIds: excludedSignupIds.size > 0 ? Array.from(excludedSignupIds) : undefined,
        applyPlannedRequirementsToPresent,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to complete event';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Count active signups minus excluded ones
  const totalSignups = event.activitySlots.reduce((sum, slot) => {
    return sum + slot.signups.filter(s => !s.withdrawn && !excludedSignupIds.has(s.id)).length;
  }, 0);

  const totalPoints = event.activitySlots.reduce((sum, slot) => {
    const activeSignups = slot.signups.filter(s => !s.withdrawn && !excludedSignupIds.has(s.id)).length;
    return sum + (activeSignups * slot.activityType.pointValue);
  }, 0);

  return (
    <Dialog open onOpenChange={() => onCancel()}>
      <DialogContent className="bg-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Mark Event Complete</DialogTitle>
          <DialogDescription>
            Award points to all volunteers who participated in this event. You can also add volunteers who participated but didn&apos;t sign up.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Attendance Context */}
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
            <h4 className="font-semibold mb-2">Cub Attendance</h4>
            <p className="text-sm text-amber-900">
              {attendanceCount > 0
                ? `${attendanceCount} Cub Scout attendance record${attendanceCount === 1 ? '' : 's'} recorded for this event.`
                : 'No Cub Scout attendance recorded yet for this event.'}
            </p>
            {onRecordAttendance && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={onRecordAttendance}
              >
                Record / Review Attendance
              </Button>
            )}
            {plannedRequirements.length > 0 && (
              <div className="mt-3 p-3 bg-white rounded border border-amber-200 space-y-2">
                <p className="text-sm font-medium text-amber-900">
                  Planned requirements: {plannedRequirements.length}
                </p>
                <label className="flex items-start gap-2 cursor-pointer text-sm text-amber-900">
                  <Checkbox
                    checked={applyPlannedRequirementsToPresent}
                    onCheckedChange={(checked) => setApplyPlannedRequirementsToPresent(Boolean(checked))}
                    disabled={attendanceCount === 0 || loading}
                  />
                  <span>
                    Apply planned requirements to all PRESENT Cub Scouts before marking complete.
                  </span>
                </label>
                {attendanceCount === 0 && (
                  <p className="text-xs text-amber-800">
                    Add attendance records first to use bulk apply.
                  </p>
                )}
              </div>
            )}
          </div>

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
            <p className="text-sm text-gray-600 mb-3">Click the X to exclude volunteers who didn&apos;t show up</p>
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
                      {activeSignups.map((signup) => {
                        const isExcluded = excludedSignupIds.has(signup.id);
                        return (
                          <div
                            key={signup.id}
                            className={`px-2 py-1 rounded text-sm flex items-center gap-1 ${
                              isExcluded ? 'bg-red-100 text-red-700 line-through' : 'bg-green-100 text-green-700'
                            }`}
                          >
                            <span>{signup.volunteer.name}</span>
                            <button
                              type="button"
                              onClick={() => toggleExcludeSignup(signup.id)}
                              className="hover:bg-red-200 rounded-full p-0.5"
                              title={isExcluded ? 'Include volunteer' : 'Exclude volunteer (no points)'}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      })}
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
                No manual volunteers added. Click &quot;Add Volunteer&quot; to include someone who participated without signing up.
              </p>
            ) : (
              <div className="space-y-3">
                {manualVolunteers.map((manual, index) => (
                    <div key={index} className="flex gap-3 items-end p-3 border rounded-lg">
                      <div className="flex-1">
                        <Label>Volunteer</Label>
                        <Select
                          value={manual.volunteerId}
                          onValueChange={(value: string) => updateManualVolunteer(index, 'volunteerId', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select volunteer" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            {allVolunteers.map((volunteer) => (
                              <SelectItem key={volunteer.id} value={volunteer.id}>
                                <div className="flex flex-col">
                                  <span>{volunteer.name}</span>
                                  <span className="text-xs text-gray-500">{volunteer.email}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
          <Button variant="outline" onClick={handleComplete} disabled={loading}>
            {loading ? 'Completing...' : 'Mark Complete & Award Points'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
