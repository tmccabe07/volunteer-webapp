'use client';

import { Fragment, useState, useEffect } from 'react';
import { useRequireTier } from '@/lib/auth-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { VolunteerRoleForm, VolunteerRoleData } from '@/components/forms/config/VolunteerRoleForm';
import configService, { VolunteerRole } from '@/services/config.service';
import { Plus, Pencil, Trash2 } from 'lucide-react';

export default function AdminRolesPage() {
  const { user, isLoading } = useRequireTier('ADMIN');
  const [roles, setRoles] = useState<VolunteerRole[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingRole, setEditingRole] = useState<VolunteerRole | null>(null);
  const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && user) {
      loadRoles();
    }
  }, [isLoading, user]);

  const loadRoles = async () => {
    try {
      const response = await configService.getVolunteerRoles();
      setRoles(response.roles);
      setError('');
    } catch (err: unknown) {
      console.error('Error loading volunteer roles:', err);
      setError('Failed to load volunteer roles');
    } finally {
      setIsLoadingRoles(false);
    }
  };

  const handleCreate = async (data: Omit<VolunteerRoleData, 'id'>) => {
    try {
      await configService.createVolunteerRole(data);
      await loadRoles();
      setShowForm(false);
      setError('');
    } catch (err: unknown) {
      throw err; // Let the form handle the error display
    }
  };

  const handleUpdate = async (data: Omit<VolunteerRoleData, 'id'>) => {
    if (!editingRole?.id) return;

    try {
      await configService.updateVolunteerRole(editingRole.id, data);
      await loadRoles();
      setEditingRole(null);
      setError('');
    } catch (err: unknown) {
      throw err; // Let the form handle the error display
    }
  };

  const handleDelete = async (roleId: string) => {
    if (deletingRoleId) return; // Prevent multiple simultaneous deletes

    const confirmed = confirm(
      'Are you sure you want to delete this role? This action cannot be undone. ' +
      'The role cannot be deleted if it is currently assigned to volunteers.'
    );

    if (!confirmed) return;

    setDeletingRoleId(roleId);
    try {
      await configService.deleteVolunteerRole(roleId);
      await loadRoles();
      setError('');
    } catch (err: unknown) {
      const maybeResponse = (err as { response?: { data?: { error?: string } } }).response;
      const errorMessage = maybeResponse?.data?.error || 'Failed to delete volunteer role';
      setError(errorMessage);
    } finally {
      setDeletingRoleId(null);
    }
  };

  const handleEdit = (role: VolunteerRole) => {
    setEditingRole(role);
    setShowForm(false);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingRole(null);
  };

  const getRoleTypeLabel = (roleType: string): string => {
    const labels: Record<string, string> = {
      PARENT_GUARDIAN: 'Parent/Guardian',
      COMMITTEE: 'Committee Member',
      DEN_LEADER: 'Den Leader',
      ASSISTANT_DEN_LEADER: 'Assistant Den Leader',
      ASSISTANT_CUB_MASTER: 'Assistant Cub Master',
      LION_GUIDE: 'Lion Guide',
      SCOUTER_RESERVE: 'Scouter Reserve',
    };
    return labels[roleType] || roleType;
  };

  const getTierLabel = (tier: string): string => {
    const labels: Record<string, string> = {
      PARENT: 'Parent (Tier 1)',
      LEADER: 'Leader (Tier 2)',
      ADMIN: 'Admin (Tier 3)',
    };
    return labels[tier] || tier;
  };

  if (isLoading || isLoadingRoles) {
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
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Volunteer Role Management</h1>
          <p className="mt-2 text-gray-600">
            Configure volunteer roles and their permissions for your pack
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {showForm && !editingRole && (
          <div className="mb-6">
            <VolunteerRoleForm
              initialData={undefined}
              onSubmit={handleCreate}
              onCancel={handleCancelForm}
              isEdit={false}
            />
          </div>
        )}
        
        {!showForm && !editingRole && (
          <div className="mb-6">
            <Button variant="outline" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Volunteer Role
            </Button>
          </div>
        )}

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Volunteer Roles</h2>
          
          {roles.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No volunteer roles configured yet. Create one to get started.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Authorization Tier
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {roles.map(role => (
                    <Fragment key={role.id}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{role.name}</div>
                          {role.description && (
                            <div className="text-sm text-gray-500">{role.description}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {getRoleTypeLabel(role.roleType)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {role.specialty && (
                            <div>Specialty: {role.specialty}</div>
                          )}
                          {role.rankLevel && (
                            <div>Rank: {role.rankLevel}</div>
                          )}
                          {!role.specialty && !role.rankLevel && (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            role.grantsTier === 'ADMIN' ? 'bg-purple-100 text-purple-800' :
                            role.grantsTier === 'LEADER' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {getTierLabel(role.grantsTier)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="plainoutline"
                              onClick={() => handleEdit(role)}
                              disabled={deletingRoleId === role.id}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="plainoutline"
                              onClick={() => handleDelete(role.id)}
                              disabled={deletingRoleId === role.id}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {editingRole?.id === role.id && (
                        <tr key={`${role.id}-edit`}>
                          <td colSpan={5} className="px-6 py-4 bg-gray-50">
                            <VolunteerRoleForm
                              initialData={{
                                ...editingRole,
                                description: editingRole.description || undefined,
                                specialty: editingRole.specialty || undefined,
                                rankLevel: editingRole.rankLevel || undefined,
                              }}
                              onSubmit={handleUpdate}
                              onCancel={handleCancelForm}
                              isEdit={true}
                            />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="p-6 mt-6 bg-blue-50 border-blue-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            ℹ️ About Volunteer Roles
          </h3>
          <div className="text-sm text-gray-700 space-y-2">
            <p>
              <strong>Role Types:</strong> Define the type of volunteer position (parent, committee member, den leader, etc.)
            </p>
            <p>
              <strong>Committee Roles:</strong> Require a specialty (e.g., Treasurer, Secretary, Advancement Chair)
            </p>
            <p>
              <strong>Den Leader Roles:</strong> Require a rank level (Lion, Tiger, Wolf, Bear, Webelos, AOL)
            </p>
            <p>
              <strong>Authorization Tiers:</strong> Control access levels within the system:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li><strong>Tier 1 (Parent):</strong> Basic volunteer access - view events, sign up, track own points</li>
              <li><strong>Tier 2 (Leader):</strong> Create events, manage signups, view volunteer lists, assign administrative tasks</li>
              <li><strong>Tier 3 (Admin):</strong> Full system access - manage configuration, roles, activity types, all volunteers</li>
            </ul>
            <p className="mt-4 pt-4 border-t border-blue-300">
              <strong>Important:</strong> Only name and description can be updated after creation. Other properties (role type, specialty, rank level, tier) are immutable to preserve historical data integrity.
            </p>
            <p className="text-orange-700 font-medium">
              <strong>⚠️ Deletion:</strong> Roles cannot be deleted if they are currently assigned to volunteers. Remove all role assignments first.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
