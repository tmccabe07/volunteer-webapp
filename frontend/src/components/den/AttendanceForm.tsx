'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Users, CheckCircle2, XCircle, MinusCircle } from 'lucide-react';
import { denService, type DenRosterMember } from '@/services/den.service';
import { attendanceService, type RecordAttendanceItem } from '@/services/attendance.service';
import CoveredRequirementsSelector from '@/components/advancement/CoveredRequirementsSelector';

interface AttendanceFormProps {
  /**
   * Event ID to record attendance for
   */
  eventId: string;
  /**
   * Optional den ID to filter members
   */
  denId?: string;
  /**
   * Rank level for the event
   */
  rankLevel?: string;
  plannedRequirementIds?: string[];
  /**
   * Callback after successful submission
   */
  onSuccess?: () => void;
}

interface AttendanceEntry {
  childScoutId: string;
  firstName: string;
  lastName: string;
  attendanceStatus: 'PRESENT' | 'ABSENT' | 'EXCUSED';
  notes: string;
  coveredRequirementIds: string[];
}

interface ApiErrorShape {
  response?: {
    data?: {
      error?: string;
    };
  };
}

const STATUS_OPTIONS = [
  { value: 'PRESENT', label: 'Present', icon: CheckCircle2, color: 'text-green-600' },
  { value: 'ABSENT', label: 'Absent', icon: XCircle, color: 'text-red-600' },
  { value: 'EXCUSED', label: 'Excused', icon: MinusCircle, color: 'text-yellow-600' },
] as const;

export default function AttendanceForm({
  eventId,
  denId,
  rankLevel,
  plannedRequirementIds = [],
  onSuccess,
}: AttendanceFormProps) {
  const [children, setChildren] = useState<DenRosterMember[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceEntry>>({});
  const [isLoadingChildren, setIsLoadingChildren] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedChildForRequirements, setSelectedChildForRequirements] = useState<string | null>(null);

  useEffect(() => {
    if (denId) {
      loadDenRoster();
    }
  }, [denId]);

  const loadDenRoster = async () => {
    if (!denId) return;
    
    try {
      setIsLoadingChildren(true);
      setError(null);
      const roster = await denService.getDenRoster(denId);
      setChildren(roster.members);
      
      // Initialize attendance entries with default PRESENT status
      const initialAttendance: Record<string, AttendanceEntry> = {};
      roster.members.forEach((child) => {
        initialAttendance[child.id] = {
          childScoutId: child.id,
          firstName: child.firstName,
          lastName: child.lastName,
          attendanceStatus: 'PRESENT',
          notes: '',
          coveredRequirementIds: [],
        };
      });
      setAttendance(initialAttendance);
    } catch (err: unknown) {
      const apiError = err as ApiErrorShape;
      setError(apiError.response?.data?.error || 'Failed to load den roster');
    } finally {
      setIsLoadingChildren(false);
    }
  };

  const handleStatusChange = (childId: string, status: 'PRESENT' | 'ABSENT' | 'EXCUSED') => {
    setAttendance(prev => ({
      ...prev,
      [childId]: {
        ...prev[childId],
        attendanceStatus: status,
        // Clear requirements if marking absent/excused
        ...(status !== 'PRESENT' && { coveredRequirementIds: [] }),
      },
    }));
    setSuccess(null);
  };

  const handleNotesChange = (childId: string, notes: string) => {
    setAttendance(prev => ({
      ...prev,
      [childId]: {
        ...prev[childId],
        notes,
      },
    }));
  };

  const handleRequirementsChange = (childId: string, requirementIds: string[]) => {
    setAttendance(prev => ({
      ...prev,
      [childId]: {
        ...prev[childId],
        coveredRequirementIds: requirementIds,
      },
    }));
  };

  const handleApplyPlannedToPresent = () => {
    if (plannedRequirementIds.length === 0) {
      return;
    }

    setAttendance((prev) => {
      const updated = { ...prev };
      for (const childId of Object.keys(updated)) {
        if (updated[childId].attendanceStatus === 'PRESENT') {
          updated[childId] = {
            ...updated[childId],
            coveredRequirementIds: [...plannedRequirementIds],
          };
        }
      }
      return updated;
    });
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);
      setError(null);
      setSuccess(null);
      
      const attendanceData: RecordAttendanceItem[] = Object.values(attendance).map(entry => ({
        childScoutId: entry.childScoutId,
        attendanceStatus: entry.attendanceStatus,
        ...(entry.notes.trim() && { notes: entry.notes.trim() }),
        ...(entry.coveredRequirementIds.length > 0 && { 
          coveredRequirementIds: entry.coveredRequirementIds 
        }),
      }));
      
      await attendanceService.recordAttendance(eventId, { attendance: attendanceData });
      
      setSuccess(`Attendance recorded for ${attendanceData.length} children`);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: unknown) {
      const apiError = err as ApiErrorShape;
      setError(apiError.response?.data?.error || 'Failed to record attendance');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkAllPresent = () => {
    const updated = { ...attendance };
    Object.keys(updated).forEach(childId => {
      updated[childId].attendanceStatus = 'PRESENT';
    });
    setAttendance(updated);
  };

  if (isLoadingChildren) {
    return (
      <div className="p-8 text-center text-gray-600">
        <p>Loading children...</p>
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <Card className="p-8 text-center text-gray-600">
        <Users className="h-12 w-12 mx-auto mb-3 text-gray-400" />
        <p className="font-medium">No children found</p>
        <p className="text-sm mt-1">Please add members to the den first</p>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Record Attendance ({children.length} children)</h3>
        <div className="flex gap-2">
          {plannedRequirementIds.length > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={handleApplyPlannedToPresent}
              disabled={isSubmitting}
            >
              Apply Planned Requirements to Present
            </Button>
          )}
          <Button type="button" variant="outline" onClick={handleMarkAllPresent} disabled={isSubmitting}>
            Mark All Present
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {children.map((child) => {
          const entry = attendance[child.id];
          if (!entry) return null;

          const StatusIcon = STATUS_OPTIONS.find(s => s.value === entry.attendanceStatus)?.icon || CheckCircle2;
          const statusColor = STATUS_OPTIONS.find(s => s.value === entry.attendanceStatus)?.color || 'text-gray-600';

          return (
            <Card key={child.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <StatusIcon className={`h-5 w-5 ${statusColor}`} />
                  {entry.firstName} {entry.lastName}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor={`status-${child.id}`}>Attendance Status</Label>
                  <Select
                    value={entry.attendanceStatus}
                    onValueChange={(value: 'PRESENT' | 'ABSENT' | 'EXCUSED') => 
                      handleStatusChange(child.id, value)
                    }
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id={`status-${child.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((status) => {
                        const Icon = status.icon;
                        return (
                          <SelectItem key={status.value} value={status.value}>
                            <div className="flex items-center gap-2">
                              <Icon className={`h-4 w-4 ${status.color}`} />
                              {status.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {entry.attendanceStatus === 'PRESENT' && rankLevel && (
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedChildForRequirements(
                        selectedChildForRequirements === child.id ? null : child.id
                      )}
                      disabled={isSubmitting}
                    >
                      {selectedChildForRequirements === child.id ? 'Hide' : 'Select'} Requirements
                      {entry.coveredRequirementIds.length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {entry.coveredRequirementIds.length} selected
                        </Badge>
                      )}
                    </Button>
                    {selectedChildForRequirements === child.id && (
                      <div className="mt-3">
                        <CoveredRequirementsSelector
                          rankLevel={rankLevel}
                          selectedRequirementIds={entry.coveredRequirementIds}
                          onChange={(ids) => handleRequirementsChange(child.id, ids)}
                          disabled={isSubmitting}
                        />
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor={`notes-${child.id}`}>Notes (Optional)</Label>
                  <Textarea
                    id={`notes-${child.id}`}
                    value={entry.notes}
                    onChange={(e) => handleNotesChange(child.id, e.target.value)}
                    placeholder="Add any notes about this child's attendance"
                    maxLength={500}
                    rows={2}
                    disabled={isSubmitting}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? 'Recording...' : 'Record Attendance'}
        </Button>
      </div>
    </form>
  );
}
