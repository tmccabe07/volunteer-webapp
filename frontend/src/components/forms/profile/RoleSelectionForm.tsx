'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface VolunteerRole {
  id: string;
  name: string;
  description?: string | null;
  roleType: string;
}

interface AssignedRole {
  id: string;
  roleId: string;
  roleName: string;
  assignedAt: string;
}

interface RoleSelectionFormProps {
  availableRoles: VolunteerRole[];
  assignedRoles: AssignedRole[];
  onAssignRole: (roleId: string) => Promise<void>;
  onRemoveRole: (roleAssignmentId: string) => Promise<void>;
  isLoading?: boolean;
}

export function RoleSelectionForm({
  availableRoles,
  assignedRoles,
  onAssignRole,
  onRemoveRole,
  isLoading = false
}: RoleSelectionFormProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [processingRoleId, setProcessingRoleId] = useState<string | null>(null);

  const handleAssignRole = async (roleId: string) => {
    setProcessingRoleId(roleId);
    setErrors({});

    try {
      await onAssignRole(roleId);
    } catch (error: any) {
      if (error.response?.data?.details) {
        setErrors({ [roleId]: error.response.data.details.join(', ') });
      } else {
        setErrors({ [roleId]: error.response?.data?.error || 'Failed to assign role' });
      }
    } finally {
      setProcessingRoleId(null);
    }
  };

  const handleRemoveRole = async (roleAssignmentId: string) => {
    setProcessingRoleId(roleAssignmentId);
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
      setProcessingRoleId(null);
    }
  };

  const isRoleAssigned = (roleId: string) => {
    return assignedRoles.some(ar => ar.roleId === roleId);
  };

  const getAssignmentId = (roleId: string) => {
    return assignedRoles.find(ar => ar.roleId === roleId)?.id;
  };

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-4">Volunteer Roles</h2>
      <p className="text-sm text-gray-600 mb-6">
        Select the roles you fulfill in the pack. Den leaders and committee members receive 100 points and tier 2 access.
      </p>

      {Object.keys(errors).length > 0 && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
          {Object.values(errors)[0]}
        </div>
      )}

      <div className="space-y-3">
        {availableRoles.map(role => {
          const assigned = isRoleAssigned(role.id);
          const assignmentId = getAssignmentId(role.id);
          const processing = processingRoleId === role.id || processingRoleId === assignmentId;

          return (
            <div key={role.id} className="flex items-center justify-between p-3 border rounded">
              <div className="flex-1">
                <div className="font-medium">{role.name}</div>
                {role.description && (
                  <div className="text-sm text-gray-600">{role.description}</div>
                )}
              </div>
              <div>
                {assigned ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveRole(assignmentId!)}
                    disabled={isLoading || processing}
                  >
                    {processing ? 'Removing...' : 'Remove'}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleAssignRole(role.id)}
                    disabled={isLoading || processing}
                  >
                    {processing ? 'Adding...' : 'Add Role'}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
