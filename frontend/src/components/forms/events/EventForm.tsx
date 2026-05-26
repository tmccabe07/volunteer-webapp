'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Trash2, Clock } from 'lucide-react';
import { calculateDuration } from '@/lib/time-format.util';
import StepManager from './StepManager';
import { ActivitySlotStep } from '@/services/events.service';

interface ActivitySlot {
  activityTypeId: string;
  capacity?: number | null;
  description?: string;
  steps?: ActivitySlotStep[];
}

interface EventFormData {
  title: string;
  description?: string;
  eventDate: string;
  eventTime?: string;
  endTime?: string;
  fullDay?: boolean;
  location?: string;
  scopeType?: 'PACK_WIDE' | 'DEN';
  targetDenIds?: string[];
  isRecurring?: boolean;
  plannedRequirementIds?: string[];
  activitySlots: ActivitySlot[];
}

interface ActivityType {
  id: string;
  name: string;
  pointValue: number;
  category: string;
}

interface DenOption {
  id: string;
  name: string;
  denNumber: number;
  rankLevel: string;
}

interface RequirementOption {
  id: string;
  adventureName: string;
  rankLevel: string;
  requirementText: string;
}

interface EventFormProps {
  initialData?: Partial<EventFormData>;
  activityTypes: ActivityType[];
  availableDens?: DenOption[];
  availableRequirements?: RequirementOption[];
  onSubmit: (data: EventFormData) => Promise<void>;
  submitLabel?: string;
}

interface ApiValidationError {
  error?: string;
  details?: string[];
}

interface ApiErrorShape {
  response?: {
    data?: {
      message?: string | ApiValidationError;
      error?: string;
      details?: string[];
    } | string;
  };
  message?: string;
}

export default function EventForm({
  initialData,
  activityTypes,
  availableDens = [],
  availableRequirements = [],
  onSubmit,
  submitLabel = 'Create Event',
}: EventFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<EventFormData>({
    title: initialData?.title || '',
    description: initialData?.description || '',
    eventDate: initialData?.eventDate || '',
    eventTime: initialData?.eventTime || '',
    endTime: initialData?.endTime || '',
    fullDay: initialData?.fullDay || false,
    location: initialData?.location || '',
    scopeType: initialData?.scopeType || 'PACK_WIDE',
    targetDenIds: initialData?.targetDenIds || [],
    isRecurring: initialData?.isRecurring || false,
    plannedRequirementIds: initialData?.plannedRequirementIds || [],
    activitySlots: initialData?.activitySlots || [{ activityTypeId: '', capacity: null, description: '', steps: [] }],
  });

  // Cache for preserving time values when toggling fullDay
  const [timeCache, setTimeCache] = useState<{ eventTime?: string; endTime?: string }>({
    eventTime: initialData?.eventTime || '',
    endTime: initialData?.endTime || '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (
      formData.scopeType === 'DEN' &&
      availableDens.length === 1 &&
      (formData.targetDenIds || []).length === 0
    ) {
      setFormData((prev) => ({ ...prev, targetDenIds: [availableDens[0].id] }));
    }
  }, [formData.scopeType, formData.targetDenIds, availableDens]);

  const groupedRequirements = useMemo(() => {
    const selectedDenRanks = new Set(
      availableDens
        .filter((den) => (formData.targetDenIds || []).includes(den.id))
        .map((den) => den.rankLevel)
    );

    const filteredRequirements =
      formData.scopeType === 'DEN'
        ? availableRequirements.filter((requirement) => selectedDenRanks.has(requirement.rankLevel))
        : availableRequirements;

    const groups = new Map<string, RequirementOption[]>();
    for (const requirement of filteredRequirements) {
      const key = `${requirement.rankLevel}::${requirement.adventureName}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(requirement);
    }
    return Array.from(groups.entries());
  }, [availableDens, availableRequirements, formData.scopeType, formData.targetDenIds]);

  useEffect(() => {
    if (formData.scopeType !== 'DEN') {
      return;
    }

    const visibleRequirementIds = new Set(
      groupedRequirements.flatMap(([, requirements]) => requirements.map((requirement) => requirement.id))
    );

    const currentlySelected = formData.plannedRequirementIds || [];
    const nextSelected = currentlySelected.filter((id) => visibleRequirementIds.has(id));

    if (nextSelected.length !== currentlySelected.length) {
      setFormData((prev) => ({ ...prev, plannedRequirementIds: nextSelected }));
    }
  }, [formData.scopeType, formData.plannedRequirementIds, groupedRequirements]);

  // Calculate duration for display
  const duration = useMemo(() => {
    if (!formData.fullDay && formData.eventTime && formData.endTime) {
      try {
        return calculateDuration(formData.eventTime, formData.endTime);
      } catch {
        return null;
      }
    }
    return null;
  }, [formData.fullDay, formData.eventTime, formData.endTime]);

  // Validate time range
  const timeError = useMemo(() => {
    if (!formData.fullDay && formData.endTime && !formData.eventTime) {
      return 'End time requires a start time';
    }
    return null;
  }, [formData.fullDay, formData.eventTime, formData.endTime]);

  const handleChange = <K extends keyof EventFormData>(field: K, value: EventFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFullDayToggle = (checked: boolean) => {
    if (checked) {
      // Cache current time values before clearing
      setTimeCache({
        eventTime: formData.eventTime,
        endTime: formData.endTime,
      });
      // Clear times and set fullDay
      setFormData(prev => ({
        ...prev,
        fullDay: true,
        eventTime: '',
        endTime: '',
      }));
    } else {
      // Restore cached times and clear fullDay
      setFormData(prev => ({
        ...prev,
        fullDay: false,
        eventTime: timeCache.eventTime || '',
        endTime: timeCache.endTime || '',
      }));
    }
  };

  const handleActivitySlotChange = <K extends keyof ActivitySlot>(
    index: number,
    field: K,
    value: ActivitySlot[K],
  ) => {
    const newSlots = [...formData.activitySlots];
    newSlots[index] = { ...newSlots[index], [field]: value };
    setFormData(prev => ({ ...prev, activitySlots: newSlots }));
  };

  const toggleTargetDen = (denId: string) => {
    setFormData((prev) => {
      const selected = new Set(prev.targetDenIds || []);
      if (selected.has(denId)) {
        selected.delete(denId);
      } else {
        selected.add(denId);
      }
      return { ...prev, targetDenIds: Array.from(selected) };
    });
  };

  const togglePlannedRequirement = (requirementId: string) => {
    setFormData((prev) => {
      const selected = new Set(prev.plannedRequirementIds || []);
      if (selected.has(requirementId)) {
        selected.delete(requirementId);
      } else {
        selected.add(requirementId);
      }
      return { ...prev, plannedRequirementIds: Array.from(selected) };
    });
  };

  const addActivitySlot = () => {
    setFormData(prev => ({
      ...prev,
      activitySlots: [...prev.activitySlots, { activityTypeId: '', capacity: null, description: '', steps: [] }],
    }));
  };

  const removeActivitySlot = (index: number) => {
    if (formData.activitySlots.length === 1) {
      setError('At least one activity slot is required');
      return;
    }
    setFormData(prev => ({
      ...prev,
      activitySlots: prev.activitySlots.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validate time range (skip if fullDay)
      if (!formData.fullDay && timeError) {
        throw new Error(timeError);
      }

      // Validate activity slots
      for (const slot of formData.activitySlots) {
        if (!slot.activityTypeId) {
          throw new Error('All activity slots must have an activity type selected');
        }
      }

      if (formData.scopeType === 'DEN' && (formData.targetDenIds || []).length === 0) {
        throw new Error('Select at least one den for den-scoped events');
      }

      // Convert eventDate and eventTime to ISO 8601
      let eventDateTime: Date;
      if (formData.fullDay || !formData.eventTime) {
        // Full-day or no time specified - default to noon to allow same-day events
        const dateTimeString = `${formData.eventDate}T12:00:00`;
        eventDateTime = new Date(dateTimeString);
      } else {
        // Combine date and time
        const dateTimeString = `${formData.eventDate}T${formData.eventTime}:00`;
        eventDateTime = new Date(dateTimeString);
      }

      if (isNaN(eventDateTime.getTime())) {
        throw new Error('Invalid event date or time');
      }

      const submissionData: EventFormData = {
        ...formData,
        eventDate: eventDateTime.toISOString(),
        // Ensure empty strings become undefined for proper API handling
        eventTime: formData.eventTime || undefined,
        endTime: formData.endTime || undefined,
      };

      await onSubmit(submissionData);
      router.push('/events');
    } catch (err: unknown) {
      // Extract error message from API response
      let errorMessage = 'Failed to save event';

      const apiError = err as ApiErrorShape;
      
      // NestJS wraps BadRequestException objects in a message field
      const responseData = apiError.response?.data && typeof apiError.response.data === 'object'
        ? apiError.response.data.message || apiError.response.data
        : apiError.response?.data;
      
      if (typeof responseData === 'object' && responseData.error) {
        // Backend returned a structured error { error: "message", details?: [] }
        errorMessage = responseData.error;
        
        // If there are validation details, append them
        if (responseData.details && Array.isArray(responseData.details) && responseData.details.length > 0) {
          errorMessage += ': ' + responseData.details.join(', ');
        }
      } else if (typeof responseData === 'string') {
        // Backend returned a simple string message
        errorMessage = responseData;
      } else if (apiError.message) {
        // Fallback to error message
        errorMessage = apiError.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Event Details</CardTitle>
          <CardDescription>Basic information about the volunteer event</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Event Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              required
              minLength={3}
              maxLength={200}
              placeholder="Pack Meeting Cleanup"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Help clean up after the monthly pack meeting"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="eventDate">Event Date *</Label>
              <Input
                id="eventDate"
                type="date"
                value={formData.eventDate}
                onChange={(e) => handleChange('eventDate', e.target.value)}
                required
              />
            </div>

            <div className="flex items-center space-x-2 pt-8">
              <Checkbox
                id="fullDay"
                checked={formData.fullDay || false}
                onCheckedChange={handleFullDayToggle}
              />
              <Label htmlFor="fullDay" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Full Day Event
              </Label>
            </div>
          </div>

          {!formData.fullDay && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="eventTime">Start Time</Label>
                  <Input
                    id="eventTime"
                    type="time"
                    value={formData.eventTime}
                    onChange={(e) => handleChange('eventTime', e.target.value)}
                    placeholder="6:00 PM"
                  />
                </div>

                <div>
                  <Label htmlFor="endTime">End Time (optional)</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => handleChange('endTime', e.target.value)}
                    placeholder="8:00 PM"
                    disabled={!formData.eventTime}
                  />
                </div>
              </div>

              {timeError && (
                <p className="text-sm text-red-600">{timeError}</p>
              )}
              {duration && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>Duration: {duration}</span>
                </div>
              )}
            </>
          )}

          <div>
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => handleChange('location', e.target.value)}
              placeholder="Church Fellowship Hall"
            />
          </div>

          <div>
            <Label htmlFor="scopeType">Event Scope</Label>
            <Select
              value={formData.scopeType || 'PACK_WIDE'}
              onValueChange={(value: 'PACK_WIDE' | 'DEN') => handleChange('scopeType', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select event scope" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PACK_WIDE">Pack-Wide</SelectItem>
                <SelectItem value="DEN">Den-Scoped</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.scopeType === 'DEN' && (
            <div>
              <Label>Target Dens</Label>
              <div className="mt-2 space-y-2 max-h-44 overflow-y-auto border rounded-md p-3">
                {availableDens.length === 0 ? (
                  <p className="text-sm text-gray-600">No dens available in your scope.</p>
                ) : (
                  availableDens.map((den) => {
                    const checked = (formData.targetDenIds || []).includes(den.id);
                    return (
                      <label key={den.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleTargetDen(den.id)}
                        />
                        <span>{den.name} (#{den.denNumber})</span>
                      </label>
                    );
                  })
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">Choose one or more dens for this event.</p>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isRecurring"
              checked={formData.isRecurring}
              onChange={(e) => handleChange('isRecurring', e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="isRecurring" className="font-normal">
              Recurring event (repeats until end of scouting year)
            </Label>
          </div>

          <div>
            <Label>Planned Adventures & Requirements</Label>
            <div className="mt-2 max-h-64 overflow-y-auto border rounded-md p-3 space-y-3">
              {groupedRequirements.length === 0 ? (
                <p className="text-sm text-gray-600">No requirements available.</p>
              ) : (
                groupedRequirements.map(([groupKey, requirements]) => {
                  const [rankLevel, adventureName] = groupKey.split('::');
                  return (
                  <div key={groupKey}>
                    <p className="text-sm font-medium">{adventureName} <span className="text-gray-500">({rankLevel})</span></p>
                    <div className="mt-1 space-y-1">
                      {requirements.map((requirement) => {
                        const checked = (formData.plannedRequirementIds || []).includes(requirement.id);
                        return (
                          <label key={requirement.id} className="flex items-start gap-2 text-sm cursor-pointer">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => togglePlannedRequirement(requirement.id)}
                            />
                            <span>{requirement.requirementText}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  );
                })
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              These planned requirements can be bulk-applied to present Cub Scouts when completing attendance.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity Slots</CardTitle>
          <CardDescription>
            Define volunteer activities for this event. Each activity can have a capacity limit.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.activitySlots.map((slot, index) => (
            <div key={index} className="p-4 border rounded-lg space-y-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold text-sm text-gray-700">
                  Activity Slot {index + 1}
                </h4>
                {formData.activitySlots.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeActivitySlot(index)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                )}
              </div>

              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <Label>Activity Type *</Label>
                  <Select
                    value={slot.activityTypeId}
                    onValueChange={(value) => handleActivitySlotChange(index, 'activityTypeId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select activity" />
                    </SelectTrigger>
                    <SelectContent>
                      {activityTypes.map(type => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name} ({type.pointValue} points)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-32">
                  <Label>Capacity</Label>
                  <Input
                    type="number"
                    min="1"
                    value={slot.capacity || ''}
                    onChange={(e) =>
                      handleActivitySlotChange(index, 'capacity', e.target.value ? parseInt(e.target.value) : null)
                    }
                    placeholder="Unlimited"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor={`description-${index}`}>
                  Custom Description (optional)
                </Label>
                <Textarea
                  id={`description-${index}`}
                  value={slot.description || ''}
                  onChange={(e) => handleActivitySlotChange(index, 'description', e.target.value)}
                  placeholder="Add specific instructions for this activity slot"
                  maxLength={500}
                  rows={2}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {(slot.description || '').length} / 500 characters
                </p>
              </div>

              <StepManager
                steps={slot.steps || []}
                onChange={(steps) => handleActivitySlotChange(index, 'steps', steps)}
              />
            </div>
          ))}

          <Button type="button" variant="outline" onClick={addActivitySlot} className="w-full">
            <PlusCircle className="h-4 w-4 mr-2" />
            {formData.activitySlots.length > 0 && formData.activitySlots[0].activityTypeId
              ? 'Add Another Activity Slot'
              : 'Add Activity Slot'}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}

      <div className="flex gap-4">
        <Button type="submit" variant="outline" disabled={loading}>
          {loading ? 'Saving...' : submitLabel}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
