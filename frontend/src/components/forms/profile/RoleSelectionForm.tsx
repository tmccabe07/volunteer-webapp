'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { AssignableDen } from '@/services/volunteer.service';

const DEN_SCOPED_ROLE_TYPES = new Set([
  'DEN_LEADER',
  'ASSISTANT_DEN_LEADER',
  'LION_GUIDE',
]);

const RANK_OPTIONS = [
  { value: 'LION', label: 'Lion' },
  { value: 'TIGER', label: 'Tiger' },
  { value: 'WOLF', label: 'Wolf' },
  { value: 'BEAR', label: 'Bear' },
  { value: 'WEBELOS', label: 'Webelos' },
  { value: 'AOL', label: 'Arrow of Light' },
];

interface VolunteerRole {
  id: string;
  name: string;
  description?: string | null;
  roleType: string;
  rankLevel?: string | null;
}

interface AssignedRole {
  id: string;
  roleId: string;
  roleName: string;
  roleType: string;
  rankLevel: string | null;
  denId: string | null;
  denName: string | null;
  denNumber: number | null;
  denRankLevel: string | null;
  assignedAt: string;
}

interface RoleSelectionFormProps {
  availableRoles: VolunteerRole[];
  assignedRoles: AssignedRole[];
  onAssignRole: (input: { roleId: string; denIds?: string[] }) => Promise<void>;
  onRemoveRole: (roleAssignmentId: string) => Promise<void>;
  loadAssignableDens: (rankLevel?: string) => Promise<AssignableDen[]>;
  isLoading?: boolean;
}

export function RoleSelectionForm({
  availableRoles,
  assignedRoles,
  onAssignRole,
  onRemoveRole,
  loadAssignableDens,
  isLoading = false
}: RoleSelectionFormProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [processingKey, setProcessingKey] = useState<string | null>(null);
  const [configRoleId, setConfigRoleId] = useState<string | null>(null);
  const [selectedRank, setSelectedRank] = useState<string>('');
  const [assignableDens, setAssignableDens] = useState<AssignableDen[]>([]);
  const [selectedDenIds, setSelectedDenIds] = useState<string[]>([]);
  const [loadingDens, setLoadingDens] = useState(false);
  const [densError, setDensError] = useState<string | null>(null);

  const roleById = useMemo(
    () => new Map(availableRoles.map((role) => [role.id, role])),
    [availableRoles]
  );

  const configRole = configRoleId ? roleById.get(configRoleId) ?? null : null;
  const isConfigRoleDenScoped =
    !!configRole && DEN_SCOPED_ROLE_TYPES.has(configRole.roleType);

  useEffect(() => {
    if (!configRole || !isConfigRoleDenScoped) {
      return;
    }

    const fixedRank = configRole.rankLevel ?? '';
    if (fixedRank && selectedRank !== fixedRank) {
      setSelectedRank(fixedRank);
    }
  }, [configRole, isConfigRoleDenScoped, selectedRank]);

  useEffect(() => {
    const shouldLoad = !!configRole && isConfigRoleDenScoped;
    if (!shouldLoad) {
      setAssignableDens([]);
      setDensError(null);
      return;
    }

    const load = async () => {
      setLoadingDens(true);
      setDensError(null);
      try {
        const dens = await loadAssignableDens(selectedRank || undefined);
        setAssignableDens(dens);
      } catch (error: any) {
        setAssignableDens([]);
        setDensError(
          error?.response?.data?.error ||
            'Unable to load dens right now. Please try again.'
        );
      } finally {
        setLoadingDens(false);
      }
    };

    void load();
  }, [configRole, isConfigRoleDenScoped, loadAssignableDens, selectedRank]);

  const handleAssignRole = async (input: { roleId: string; denIds?: string[] }) => {
    const id = input.roleId;
    setProcessingKey(id);
    setErrors({});

    try {
      await onAssignRole(input);
      setConfigRoleId(null);
      setSelectedRank('');
      setSelectedDenIds([]);
    } catch (error: any) {
      if (error.response?.data?.details) {
        setErrors({ [id]: error.response.data.details.join(', ') });
      } else {
        setErrors({ [id]: error.response?.data?.error || 'Failed to assign role' });
      }
    } finally {
      setProcessingKey(null);
    }
  };

  const handleRemoveRole = async (roleAssignmentId: string) => {
    setProcessingKey(roleAssignmentId);
    setErrors({});

    try {
      await onRemoveRole(roleAssignmentId);
    } catch (error: any) {
      if (error.response?.data?.details) {
        setErrors({ [roleAssignmentId]: error.response.data.details.join(', ') });
      } else {
        setErrors({ [roleAssignmentId]: error.response?.data?.error || 'Failed to remove role' });
      }
    } finally {
      setProcessingKey(null);
    }
  };

  const isRoleAssignedPackWide = (roleId: string) => {
    return assignedRoles.some((ar) => ar.roleId === roleId && !ar.denId);
  };

  const denAssignmentsForRole = (roleId: string) => {
    return assignedRoles.filter((ar) => ar.roleId === roleId && !!ar.denId);
  };

  const packAssignmentForRole = (roleId: string) => {
    return assignedRoles.find((ar) => ar.roleId === roleId && !ar.denId);
  };

  const toggleDen = (denId: string, checked: boolean) => {
    setSelectedDenIds((prev) => {
      if (checked) {
        return [...new Set([...prev, denId])];
      }
      return prev.filter((id) => id !== denId);
    });
  };

  const openRoleConfig = (role: VolunteerRole) => {
    setConfigRoleId(role.id);
    setSelectedDenIds([]);
    setErrors({});
    if (role.rankLevel) {
      setSelectedRank(role.rankLevel);
    } else {
      setSelectedRank('');
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-4">Volunteer Roles</h2>
      <p className="text-sm text-gray-600 mb-6">
        Select your role, then assign rank and den scope for den-based leader roles.
      </p>

      {Object.keys(errors).length > 0 && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
          {Object.values(errors)[0]}
        </div>
      )}

      <div className="space-y-3">
        {availableRoles.map(role => {
          const isDenScoped = DEN_SCOPED_ROLE_TYPES.has(role.roleType);
          const denAssignments = denAssignmentsForRole(role.id);
          const packAssignment = packAssignmentForRole(role.id);
          const packAssigned = isRoleAssignedPackWide(role.id);
          const processing = processingKey === role.id || processingKey === packAssignment?.id;
          const isConfigOpen = configRoleId === role.id;

          return (
            <div key={role.id} className="p-3 border rounded space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="font-medium">{role.name}</div>
                  {role.description && (
                    <div className="text-sm text-gray-600">{role.description}</div>
                  )}
                  {isDenScoped && denAssignments.length > 0 && (
                    <div className="mt-2 text-xs text-gray-600">
                      Assigned dens: {denAssignments.map((a) => a.denName ?? `Den ${a.denNumber}`).join(', ')}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {isDenScoped ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => openRoleConfig(role)}
                      disabled={isLoading || processing}
                    >
                      {isConfigOpen ? 'Configuring...' : denAssignments.length > 0 ? 'Add Den Scope' : 'Configure Scope'}
                    </Button>
                  ) : packAssigned ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveRole(packAssignment!.id)}
                      disabled={isLoading || processing}
                    >
                      {processing ? 'Removing...' : 'Remove'}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleAssignRole({ roleId: role.id })}
                      disabled={isLoading || processing}
                    >
                      {processing ? 'Adding...' : 'Add Role'}
                    </Button>
                  )}
                </div>
              </div>

              {isDenScoped && denAssignments.length > 0 && (
                <div className="space-y-2">
                  {denAssignments.map((assignment) => {
                    const assignmentProcessing = processingKey === assignment.id;
                    return (
                      <div key={assignment.id} className="flex items-center justify-between text-sm bg-slate-50 rounded px-3 py-2">
                        <span>{assignment.denName ?? `Den ${assignment.denNumber}`}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveRole(assignment.id)}
                          disabled={isLoading || assignmentProcessing}
                        >
                          {assignmentProcessing ? 'Removing...' : 'Remove'}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}

              {isConfigOpen && isDenScoped && (
                <div className="border rounded p-3 bg-slate-50 space-y-3">
                  <div>
                    <div className="text-sm font-medium mb-1">Step 1: Rank</div>
                    {role.rankLevel ? (
                      <div className="text-sm text-gray-700">{role.rankLevel}</div>
                    ) : (
                      <Select
                        value={selectedRank}
                        onValueChange={(value) => {
                          setSelectedRank(value);
                          setSelectedDenIds([]);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose rank" />
                        </SelectTrigger>
                        <SelectContent>
                          {RANK_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div>
                    <div className="text-sm font-medium mb-1">Step 2: Den(s)</div>
                    {densError ? (
                      <div className="text-sm text-red-700">{densError}</div>
                    ) : loadingDens ? (
                      <div className="text-sm text-gray-500">Loading dens...</div>
                    ) : assignableDens.length === 0 ? (
                      <div className="text-sm text-gray-500">
                        {selectedRank
                          ? 'No active dens for this rank.'
                          : 'No active dens are available yet.'}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {assignableDens.map((den) => (
                          <label key={den.id} className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={selectedDenIds.includes(den.id)}
                              onCheckedChange={(checked) => toggleDen(den.id, checked === true)}
                            />
                            <span>{den.name} (Den {den.denNumber})</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleAssignRole({ roleId: role.id, denIds: selectedDenIds })}
                      disabled={isLoading || processingKey === role.id || selectedDenIds.length === 0}
                    >
                      {processingKey === role.id ? 'Assigning...' : 'Assign to Selected Dens'}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setConfigRoleId(null);
                        setSelectedRank('');
                        setSelectedDenIds([]);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
