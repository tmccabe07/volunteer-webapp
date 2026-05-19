'use client';

import { useState, useMemo } from 'react';
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

interface ActivitySlot {
  activityTypeId: string;
  capacity?: number | null;
}

interface EventFormData {
  title: string;
  description?: string;
  eventDate: string;
  eventTime?: string;
  endTime?: string;
  fullDay?: boolean;
  location?: string;
  rankLevel?: string | null;
  isRecurring?: boolean;
  activitySlots: ActivitySlot[];
}

interface ActivityType {
  id: string;
  name: string;
  pointValue: number;
  category: string;
}

interface EventFormProps {
  initialData?: Partial<EventFormData>;
  activityTypes: ActivityType[];
  onSubmit: (data: EventFormData) => Promise<void>;
  submitLabel?: string;
}

const RANK_LEVELS = [
  { value: 'LION', label: 'Lion' },
  { value: 'TIGER', label: 'Tiger' },
  { value: 'WOLF', label: 'Wolf' },
  { value: 'BEAR', label: 'Bear' },
  { value: 'WEBELOS', label: 'Webelos' },
  { value: 'AOL', label: 'Arrow of Light' },
  { value: 'PACK_WIDE', label: 'Pack-Wide' },
];

export default function EventForm({ initialData, activityTypes, onSubmit, submitLabel = 'Create Event' }: EventFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<EventFormData>({
    title: initialData?.title || '',
    description: initialData?.description || '',
    eventDate: initialData?.eventDate || '',
    eventTime: initialData?.eventTime || '',
    endTime: initialData?.endTime || '',
    fullDay: initialData?.fullDay || false,
    location: initialData?.location || '',
    rankLevel: initialData?.rankLevel || null,
    isRecurring: initialData?.isRecurring || false,
    activitySlots: initialData?.activitySlots || [{ activityTypeId: '', capacity: null }],
  });

  // Cache for preserving time values when toggling fullDay
  const [timeCache, setTimeCache] = useState<{ eventTime?: string; endTime?: string }>({
    eventTime: initialData?.eventTime || '',
    endTime: initialData?.endTime || '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleChange = (field: keyof EventFormData, value: any) => {
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

  const handleActivitySlotChange = (index: number, field: keyof ActivitySlot, value: any) => {
    const newSlots = [...formData.activitySlots];
    newSlots[index] = { ...newSlots[index], [field]: value };
    setFormData(prev => ({ ...prev, activitySlots: newSlots }));
  };

  const addActivitySlot = () => {
    setFormData(prev => ({
      ...prev,
      activitySlots: [...prev.activitySlots, { activityTypeId: '', capacity: null }],
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
        rankLevel: formData.rankLevel === '' ? null : formData.rankLevel,
        // Ensure empty strings become undefined for proper API handling
        eventTime: formData.eventTime || undefined,
        endTime: formData.endTime || undefined,
      };

      await onSubmit(submissionData);
      router.push('/events');
    } catch (err: any) {
      // Extract error message from API response
      let errorMessage = 'Failed to save event';
      
      // NestJS wraps BadRequestException objects in a message field
      const responseData = err.response?.data?.message || err.response?.data;
      
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
      } else if (err.message) {
        // Fallback to error message
        errorMessage = err.message;
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
            <Label htmlFor="rankLevel">Rank Level</Label>
            <Select
              value={formData.rankLevel || 'PACK_WIDE'}
              onValueChange={(value) => handleChange('rankLevel', value === 'PACK_WIDE' ? null : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select rank level" />
              </SelectTrigger>
              <SelectContent>
                {RANK_LEVELS.map(rank => (
                  <SelectItem key={rank.value} value={rank.value}>
                    {rank.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
            <div key={index} className="flex gap-4 items-end p-4 border rounded-lg">
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

              <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={() => removeActivitySlot(index)}
                disabled={formData.activitySlots.length === 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <Button type="button" variant="outline" onClick={addActivitySlot} className="w-full">
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Activity Slot
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
