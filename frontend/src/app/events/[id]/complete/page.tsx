'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AttendanceForm from '@/components/den/AttendanceForm';
import eventsService from '@/services/events.service';
import {
  attendanceService,
  type ChildAttendanceDetail,
  type RecordAttendanceItem,
} from '@/services/attendance.service';
import { denService } from '@/services/den.service';
import volunteersService from '@/services/volunteers.service';
import { advancementService, type Requirement } from '@/services/advancement.service';

interface DenOption {
  id: string;
  name: string;
  denNumber: number;
  rankLevel: string;
}

interface EventActivitySlot {
  id: string;
  description?: string | null;
  activityType: {
    id: string;
    name: string;
    pointValue: number;
    category: string;
  };
  capacity: number | null;
  signups: Array<{
    id: string;
    volunteer: {
      id: string;
      name: string;
    };
    withdrawn: boolean;
    createdAt: string;
  }>;
}

interface EventDetails {
  id: string;
  title: string;
  eventDate: string;
  eventEndDate?: string | null;
  eventTime: string | null;
  scopeType?: 'PACK_WIDE' | 'DEN';
  rankLevel?: string | null;
  denId?: string | null;
  targetDens?: Array<{ denId: string; den: DenOption }>;
  plannedRequirements?: Array<{
    requirementId: string;
    requirement?: {
      requirementText: string;
      adventure?: {
        name: string;
      };
    };
  }>;
  plannedHourActivities?: {
    camping?: { enabled: boolean; nights?: number };
    hiking?: { enabled: boolean; miles?: number };
    service?: { enabled: boolean; hours?: number };
  } | null;
  activitySlots: EventActivitySlot[];
  isComplete: boolean;
}

interface ManualVolunteer {
  volunteerId: string;
  activitySlotId: string;
}

interface ApiErrorShape {
  response?: {
    status?: number;
    data?: {
      error?: string;
    };
  };
  message?: string;
}

const STEPS = ['Attendance', 'Requirements', 'Volunteer Credits', 'Review'];

export default function CompleteEventPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const eventId = params.id as string;

  const [event, setEvent] = useState<EventDetails | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<ChildAttendanceDetail[]>([]);
  const [dens, setDens] = useState<DenOption[]>([]);
  const [selectedDenId, setSelectedDenId] = useState<string>('');
  const [isLoadingDens, setIsLoadingDens] = useState(false);
  const [allVolunteers, setAllVolunteers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [allRequirements, setAllRequirements] = useState<Requirement[]>([]);

  const [manualVolunteers, setManualVolunteers] = useState<ManualVolunteer[]>([]);
  const [excludedSignupIds, setExcludedSignupIds] = useState<Set<string>>(new Set());
  const [selectedAdditionalRequirementIds, setSelectedAdditionalRequirementIds] = useState<Set<string>>(new Set());

  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedPromptCount, setGeneratedPromptCount] = useState(0);
  const [requirementPromptMessage, setRequirementPromptMessage] = useState('');
  const [isPromptingRequirementParents, setIsPromptingRequirementParents] = useState(false);
  const [requirementPromptStatus, setRequirementPromptStatus] = useState<string | null>(null);
  const [createPlannedHourPrompts, setCreatePlannedHourPrompts] = useState(true);
  const [hourPromptSyncMode, setHourPromptSyncMode] = useState<'ADD_ONLY' | 'SYNC_REMOVE'>('ADD_ONLY');
  const [isApplyingPlannedHourActivities, setIsApplyingPlannedHourActivities] = useState(false);
  const [plannedHourActivityStatus, setPlannedHourActivityStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }

    if (user && user.authTier === 'PARENT') {
      setError('You need Leader or Admin access to complete events');
      setIsLoading(false);
      return;
    }

    if (user && eventId) {
      loadData();
    }
  }, [authLoading, user, eventId, router]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [eventData, attendanceData, volunteerData, requirementsData] = await Promise.all([
        eventsService.getEvent(eventId),
        attendanceService.getEventAttendance(eventId).catch(() => ({ attendance: [] })),
        volunteersService.listAllVolunteers(),
        advancementService.getRequirements(),
      ]);

      const typedEvent = eventData as EventDetails;
      setEvent(typedEvent);
      setAttendanceRecords(attendanceData.attendance || []);
      setAllVolunteers(volunteerData.volunteers || []);
      setAllRequirements(requirementsData.data || []);

      if (typedEvent.isComplete) {
        setError('This event is already complete.');
      }

      if (typedEvent.scopeType === 'DEN' && (typedEvent.targetDens || []).length > 0) {
        const targetDenOptions = (typedEvent.targetDens || []).map((target) => target.den);
        setDens(targetDenOptions);
        if (targetDenOptions.length === 1) {
          setSelectedDenId(targetDenOptions[0].id);
        }
      } else if (!typedEvent.denId) {
        await loadDensForAttendance(typedEvent.rankLevel || undefined);
      }
    } catch (err: unknown) {
      const apiError = err as ApiErrorShape;
      if (apiError.response?.status === 404) {
        setError('Event not found');
      } else {
        setError(apiError.response?.data?.error || apiError.message || 'Failed to load completion flow');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadDensForAttendance = async (rankLevel?: string) => {
    try {
      setIsLoadingDens(true);
      const response = await denService.listDens({
        ...(rankLevel && { rankLevel }),
        isActive: true,
      });
      setDens(response.data);

      if (response.data.length === 1) {
        setSelectedDenId(response.data[0].id);
      }
    } catch {
      setDens([]);
    } finally {
      setIsLoadingDens(false);
    }
  };

  const refreshAttendance = async () => {
    const attendanceData = await attendanceService.getEventAttendance(eventId).catch(() => ({ attendance: [] }));
    setAttendanceRecords(attendanceData.attendance || []);
    setCurrentStep(2);
  };

  const toggleExcludeSignup = (signupId: string) => {
    setExcludedSignupIds((prev) => {
      const next = new Set(prev);
      if (next.has(signupId)) {
        next.delete(signupId);
      } else {
        next.add(signupId);
      }
      return next;
    });
  };

  const addManualVolunteer = () => {
    setManualVolunteers((prev) => [...prev, { volunteerId: '', activitySlotId: '' }]);
  };

  const removeManualVolunteer = (index: number) => {
    setManualVolunteers((prev) => prev.filter((_, i) => i !== index));
  };

  const updateManualVolunteer = (index: number, field: keyof ManualVolunteer, value: string) => {
    setManualVolunteers((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const totalSignups = useMemo(() => {
    if (!event) {
      return 0;
    }
    return event.activitySlots.reduce((sum, slot) => {
      return sum + slot.signups.filter((s) => !s.withdrawn && !excludedSignupIds.has(s.id)).length;
    }, 0);
  }, [event, excludedSignupIds]);

  const totalPointsFromSignups = useMemo(() => {
    if (!event) {
      return 0;
    }
    return event.activitySlots.reduce((sum, slot) => {
      const activeSignups = slot.signups.filter((s) => !s.withdrawn && !excludedSignupIds.has(s.id)).length;
      return sum + activeSignups * slot.activityType.pointValue;
    }, 0);
  }, [event, excludedSignupIds]);

  const validManuals = manualVolunteers.filter((m) => m.volunteerId && m.activitySlotId);

  const totalPointsFromManuals = useMemo(() => {
    if (!event || validManuals.length === 0) {
      return 0;
    }

    return validManuals.reduce((sum, manual) => {
      const slot = event.activitySlots.find((s) => s.id === manual.activitySlotId);
      return sum + (slot?.activityType.pointValue || 0);
    }, 0);
  }, [event, validManuals]);

  const totalPoints = totalPointsFromSignups + totalPointsFromManuals;

  const plannedRequirementIds = useMemo(
    () => new Set((event?.plannedRequirements || []).map((planned) => planned.requirementId)),
    [event],
  );

  const additionalRequirementOptions = useMemo(
    () => allRequirements.filter((requirement) => !plannedRequirementIds.has(requirement.id)),
    [allRequirements, plannedRequirementIds],
  );

  const groupedAdditionalRequirements = useMemo(() => {
    const groups = new Map<string, Requirement[]>();
    for (const requirement of additionalRequirementOptions) {
      if (!groups.has(requirement.adventureName)) {
        groups.set(requirement.adventureName, []);
      }
      groups.get(requirement.adventureName)!.push(requirement);
    }
    return Array.from(groups.entries());
  }, [additionalRequirementOptions]);

  const toggleAdditionalRequirement = (requirementId: string) => {
    setSelectedAdditionalRequirementIds((prev) => {
      const next = new Set(prev);
      if (next.has(requirementId)) {
        next.delete(requirementId);
      } else {
        next.add(requirementId);
      }
      return next;
    });
  };

  const getPresentChildIds = () =>
    attendanceRecords
      .filter((record) => record.attendanceStatus === 'PRESENT')
      .map((record) => record.child.id);

  const handleApplyPlannedHourActivities = async () => {
    if (!event?.plannedHourActivities) {
      setPlannedHourActivityStatus('No planned camping/hiking/service activities are configured for this event.');
      return;
    }

    const presentChildIds = getPresentChildIds();
    if (presentChildIds.length === 0) {
      setPlannedHourActivityStatus('No PRESENT attendance records found. Record attendance first.');
      return;
    }

    if (!createPlannedHourPrompts) {
      setPlannedHourActivityStatus('Planned activities acknowledged. Prompt generation is currently disabled.');
      return;
    }

    const categoryPrompts: Array<{
      category: 'CAMPING' | 'HIKING' | 'SERVICE';
      categoryData?: Record<string, unknown>;
      childScoutIds: string[];
    }> = [];

    if (event.plannedHourActivities.camping?.enabled) {
      categoryPrompts.push({
        category: 'CAMPING',
        categoryData: {
          nights: event.plannedHourActivities.camping.nights,
          location: event.title,
        },
        childScoutIds: presentChildIds,
      });
    }

    if (event.plannedHourActivities.hiking?.enabled) {
      categoryPrompts.push({
        category: 'HIKING',
        categoryData: {
          miles: event.plannedHourActivities.hiking.miles,
          trailName: event.title,
        },
        childScoutIds: presentChildIds,
      });
    }

    if (event.plannedHourActivities.service?.enabled) {
      categoryPrompts.push({
        category: 'SERVICE',
        categoryData: {
          hours: event.plannedHourActivities.service.hours,
          projectName: event.title,
        },
        childScoutIds: presentChildIds,
      });
    }

    if (categoryPrompts.length === 0) {
      setPlannedHourActivityStatus('No enabled planned hour activities found on this event.');
      return;
    }

    try {
      setIsApplyingPlannedHourActivities(true);
      setPlannedHourActivityStatus(null);
      setError(null);

      const result = await eventsService.generateHourPrompts(eventId, {
        categoryPrompts,
        syncMode: hourPromptSyncMode,
      });

      setGeneratedPromptCount((prev) => prev + (result.promptsGenerated || 0));
      setPlannedHourActivityStatus(
        `Applied planned activities to ${presentChildIds.length} present Cub Scout(s); generated ${result.promptsGenerated || 0} prompt(s).`,
      );
    } catch (err: unknown) {
      const apiError = err as ApiErrorShape;
      setError(
        apiError.response?.data?.error ||
          apiError.message ||
          'Failed to apply planned camping/hiking/service activities',
      );
    } finally {
      setIsApplyingPlannedHourActivities(false);
    }
  };

  const handlePromptRequirementParents = async () => {
    try {
      setIsPromptingRequirementParents(true);
      setRequirementPromptStatus(null);
      setError(null);

      const result = await eventsService.promptRequirementParents(eventId, {
        message: requirementPromptMessage.trim() || undefined,
      });

      if (result.promptedRequirementProgress === 0) {
        setRequirementPromptStatus('No pending requirement updates were found for this event.');
        return;
      }

      setRequirementPromptStatus(
        `Prompt sent for ${result.promptedRequirementProgress} requirement record(s) to ${result.promptedParents} linked parent(s).`,
      );
    } catch (err: unknown) {
      const apiError = err as ApiErrorShape;
      setError(
        apiError.response?.data?.error ||
          apiError.message ||
          'Failed to prompt parents for requirement Scoutbook updates',
      );
    } finally {
      setIsPromptingRequirementParents(false);
    }
  };

  const handleComplete = async () => {
    if (!event) {
      return;
    }

    try {
      setIsCompleting(true);
      setError(null);

      if (selectedAdditionalRequirementIds.size > 0 && attendanceRecords.length > 0) {
        const additionalIds = Array.from(selectedAdditionalRequirementIds);
        const attendancePayload: RecordAttendanceItem[] = attendanceRecords.map((record) => {
          const existingCoveredIds = record.coveredRequirements.map((requirement) => requirement.id);
          const mergedRequirementIds =
            record.attendanceStatus === 'PRESENT'
              ? Array.from(new Set([...existingCoveredIds, ...additionalIds]))
              : [];

          return {
            childScoutId: record.child.id,
            attendanceStatus: record.attendanceStatus,
            notes: record.notes || undefined,
            coveredRequirementIds: mergedRequirementIds,
          };
        });

        await attendanceService.recordAttendance(eventId, { attendance: attendancePayload });
      }

      await eventsService.completeEvent(eventId, {
        manualVolunteers: validManuals.length > 0 ? validManuals : undefined,
        excludedSignupIds: excludedSignupIds.size > 0 ? Array.from(excludedSignupIds) : undefined,
      });

      window.dispatchEvent(new Event('pointsUpdated'));
      router.push(`/events/${eventId}`);
    } catch (err: unknown) {
      const apiError = err as ApiErrorShape;
      setError(apiError.response?.data?.error || apiError.message || 'Failed to complete event');
    } finally {
      setIsCompleting(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Loading completion workflow...</p>
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-6 bg-red-50 border-red-200">
          <p className="text-red-800">{error}</p>
          <div className="mt-4 flex gap-2">
            <Button onClick={() => router.push('/events')} variant="outline">
              Back to Events
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!event) {
    return null;
  }

  const resolvedDenId = event.denId || selectedDenId || undefined;
  const hasExistingAttendance = attendanceRecords.length > 0;

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/events/${event.id}`}>
            <Button variant="ghost" size="sm" className="mb-2 px-0">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Event
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Complete Event</h1>
          <p className="text-gray-600 mt-1">{event.title}</p>
        </div>
        <Badge variant="outline">Step {currentStep} of {STEPS.length}</Badge>
      </div>

      <Card className="p-4">
        <div className="grid md:grid-cols-4 gap-2">
          {STEPS.map((step, index) => {
            const stepNumber = index + 1;
            const isActive = stepNumber === currentStep;
            const isDone = stepNumber < currentStep;
            return (
              <div
                key={step}
                className={`rounded-md border px-3 py-2 text-sm ${
                  isActive
                    ? 'border-blue-500 bg-blue-50'
                    : isDone
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="font-semibold">{stepNumber}. {step}</div>
              </div>
            );
          })}
        </div>
      </Card>

      {currentStep === 1 && (
        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">Attendance</h2>
          <p className="text-sm text-gray-600">
            Record or update Cub Scout attendance and covered requirements before completion.
          </p>

          {!resolvedDenId ? (
            <div className="space-y-3">
              <Label>Select a den for attendance</Label>
              <Select
                value={selectedDenId}
                onValueChange={setSelectedDenId}
                disabled={isLoadingDens || dens.length === 0}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      isLoadingDens
                        ? 'Loading dens...'
                        : dens.length === 0
                        ? 'No active dens available'
                        : 'Select a den'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {dens.map((den) => (
                    <SelectItem key={den.id} value={den.id}>
                      {den.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <AttendanceForm
              eventId={event.id}
              denId={resolvedDenId}
              rankLevel={event.rankLevel || undefined}
              plannedRequirementIds={(event.plannedRequirements || []).map((p) => p.requirementId)}
              onSuccess={refreshAttendance}
            />
          )}

          <div className="flex items-center justify-between gap-2 text-sm text-gray-600">
            <p>
              {hasExistingAttendance
                ? 'Use Record Attendance to save updates, or continue with existing attendance.'
                : 'Use Record Attendance to save attendance and continue automatically.'}
            </p>
            {hasExistingAttendance && (
              <Button variant="outline" onClick={() => setCurrentStep(2)}>
                Continue without changes
              </Button>
            )}
          </div>
        </Card>
      )}

      {currentStep === 2 && (
        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">Requirements</h2>
          {(event.plannedRequirements || []).length === 0 ? (
            <p className="text-sm text-gray-600">No planned requirements were configured for this event.</p>
          ) : (
            <>
              <p className="text-sm text-gray-600">
                Planned requirements are applied from Step 1 (Attendance). Use Back if you need to adjust coverage.
              </p>
              <div className="space-y-2 pt-2">
                {(event.plannedRequirements || []).map((planned) => (
                  <div key={planned.requirementId} className="border rounded-md p-3">
                    {planned.requirement?.adventure?.name && (
                      <p className="text-sm font-medium">{planned.requirement.adventure.name}</p>
                    )}
                    <p className="text-sm text-gray-700">
                      {planned.requirement?.requirementText || planned.requirementId}
                    </p>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t space-y-2">
                <p className="text-sm font-medium">Additional Requirements Covered (Optional)</p>
                <p className="text-xs text-gray-600">
                  Use this when the den covered requirements that were not planned. These will be added to all PRESENT Cub Scouts at completion.
                </p>
                {groupedAdditionalRequirements.length === 0 ? (
                  <p className="text-xs text-gray-500">No additional requirements available.</p>
                ) : (
                  <div className="max-h-64 overflow-y-auto border rounded-md p-3 space-y-3">
                    {groupedAdditionalRequirements.map(([adventureName, requirements]) => (
                      <div key={adventureName}>
                        <p className="text-sm font-medium">{adventureName}</p>
                        <div className="space-y-1 mt-1">
                          {requirements.map((requirement) => {
                            const checked = selectedAdditionalRequirementIds.has(requirement.id);
                            return (
                              <label key={requirement.id} className="flex items-start gap-2 text-sm cursor-pointer">
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={() => toggleAdditionalRequirement(requirement.id)}
                                />
                                <span>{requirement.requirementText}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t space-y-2">
                <p className="text-sm font-medium">Prompt Parents for Scoutbook Requirement Updates</p>
                <p className="text-xs text-gray-600">
                  Send parents a reminder to update Scoutbook for requirements covered in this event.
                </p>
                <Textarea
                  value={requirementPromptMessage}
                  onChange={(e) => setRequirementPromptMessage(e.target.value)}
                  placeholder="Optional custom message for parents"
                  rows={2}
                  maxLength={500}
                />
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={handlePromptRequirementParents}
                    disabled={isPromptingRequirementParents}
                  >
                    {isPromptingRequirementParents ? 'Sending Prompt...' : 'Prompt Parents'}
                  </Button>
                  {requirementPromptStatus && (
                    <p className="text-xs text-green-700">{requirementPromptStatus}</p>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t space-y-2">
                <p className="text-sm font-medium">Planned Camping / Hiking / Service Activities</p>
                {!event.plannedHourActivities ? (
                  <p className="text-xs text-gray-600">No planned hour activities were configured for this event.</p>
                ) : (
                  <>
                    <div className="text-xs text-gray-700 space-y-1">
                      {event.plannedHourActivities.camping?.enabled && (
                        <p>Camping: {event.plannedHourActivities.camping.nights ?? 0} night(s)</p>
                      )}
                      {event.plannedHourActivities.hiking?.enabled && (
                        <p>Hiking: {event.plannedHourActivities.hiking.miles ?? 0} mile(s)</p>
                      )}
                      {event.plannedHourActivities.service?.enabled && (
                        <p>Service: {event.plannedHourActivities.service.hours ?? 0} hour(s)</p>
                      )}
                    </div>

                    <label className="flex items-center gap-2 text-xs">
                      <Checkbox
                        checked={createPlannedHourPrompts}
                        onCheckedChange={(checked) => setCreatePlannedHourPrompts(!!checked)}
                      />
                      Create Scoutbook prompts when applying planned activities
                    </label>

                    {createPlannedHourPrompts && (
                      <div className="space-y-1">
                        <Label className="text-xs">Attendance change prompt behavior</Label>
                        <Select
                          value={hourPromptSyncMode}
                          onValueChange={(value: 'ADD_ONLY' | 'SYNC_REMOVE') => setHourPromptSyncMode(value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ADD_ONLY">Add prompts for newly present scouts only</SelectItem>
                            <SelectItem value="SYNC_REMOVE">Sync prompts (add new and remove obsolete pending prompts)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        onClick={handleApplyPlannedHourActivities}
                        disabled={isApplyingPlannedHourActivities}
                      >
                        {isApplyingPlannedHourActivities ? 'Applying...' : 'Apply Planned Activities'}
                      </Button>
                      {plannedHourActivityStatus && (
                        <p className="text-xs text-green-700">{plannedHourActivityStatus}</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          <div className="flex justify-between gap-2">
            <Button variant="outline" onClick={() => setCurrentStep(1)}>Back</Button>
            <Button variant="outline" onClick={() => setCurrentStep(3)}>Continue to Volunteer Credits</Button>
          </div>
        </Card>
      )}

      {currentStep === 3 && (
        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">Volunteer Credits</h2>
          <p className="text-sm text-gray-600">Exclude no-shows and add manual volunteers if needed.</p>

          <div className="space-y-3">
            {event.activitySlots.map((slot) => {
              const activeSignups = slot.signups.filter((s) => !s.withdrawn);
              if (activeSignups.length === 0) {
                return null;
              }

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
                        <button
                          key={signup.id}
                          type="button"
                          onClick={() => toggleExcludeSignup(signup.id)}
                          className={`px-2 py-1 rounded text-sm border ${
                            isExcluded
                              ? 'bg-red-100 border-red-300 text-red-700 line-through'
                              : 'bg-green-100 border-green-300 text-green-700'
                          }`}
                          title={isExcluded ? 'Include volunteer' : 'Exclude volunteer'}
                        >
                          {signup.volunteer.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 space-y-3 border-t">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Manual Volunteers</h3>
              <Button type="button" variant="outline" size="sm" onClick={addManualVolunteer}>
                Add Volunteer
              </Button>
            </div>

            {manualVolunteers.map((manual, index) => (
              <div key={`${manual.volunteerId}-${manual.activitySlotId}-${index}`} className="grid md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
                <div>
                  <Label>Volunteer</Label>
                  <Select
                    value={manual.volunteerId}
                    onValueChange={(value) => updateManualVolunteer(index, 'volunteerId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select volunteer" />
                    </SelectTrigger>
                    <SelectContent>
                      {allVolunteers.map((volunteer) => (
                        <SelectItem key={volunteer.id} value={volunteer.id}>
                          {volunteer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Activity</Label>
                  <Select
                    value={manual.activitySlotId}
                    onValueChange={(value) => updateManualVolunteer(index, 'activitySlotId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select activity" />
                    </SelectTrigger>
                    <SelectContent>
                      {event.activitySlots.map((slot) => (
                        <SelectItem key={slot.id} value={slot.id}>
                          {slot.description
                            ? `${slot.activityType.name} - ${slot.description}`
                            : slot.activityType.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button type="button" variant="destructive" onClick={() => removeManualVolunteer(index)}>
                  Remove
                </Button>
              </div>
            ))}
          </div>

          <div className="flex justify-between gap-2">
            <Button variant="outline" onClick={() => setCurrentStep(2)}>Back</Button>
            <Button variant="outline" onClick={() => setCurrentStep(4)}>Review</Button>
          </div>
        </Card>
      )}

      {currentStep === 4 && (
        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">Review and Confirm</h2>
          <div className="space-y-2 text-sm">
            <p>Attendance records: <strong>{attendanceRecords.length}</strong></p>
            <p>Planned requirements configured: <strong>{(event.plannedRequirements || []).length}</strong></p>
            <p>Additional requirements selected: <strong>{selectedAdditionalRequirementIds.size}</strong></p>
            <p>Volunteer signups included: <strong>{totalSignups}</strong></p>
            <p>Manual volunteers added: <strong>{validManuals.length}</strong></p>
            <p>Total points to award: <strong>{totalPoints}</strong></p>
            <p>Scoutbook prompts generated: <strong>{generatedPromptCount}</strong></p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-between gap-2">
            <Button variant="outline" onClick={() => setCurrentStep(3)} disabled={isCompleting}>
              Back
            </Button>
            <Button onClick={handleComplete} disabled={isCompleting}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {isCompleting ? 'Completing Event...' : 'Mark Complete & Award Points'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
