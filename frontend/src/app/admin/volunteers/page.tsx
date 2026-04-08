'use client';

import { useState, useEffect } from 'react';
import { useRequireTier } from '@/lib/auth-context';
import axios from '@/lib/axios';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Volunteer {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  authTier: string;
  mustChangePassword: boolean;
  createdAt: string;
  volunteerRoles: Array<{
    role: {
      name: string;
      roleType: string;
    };
  }>;
}

interface ResetPasswordResult {
  email: string;
  name: string;
  temporaryPassword: string;
}

export default function AdminVolunteersPage() {
  const { user, isLoading } = useRequireTier('ADMIN');
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [filteredVolunteers, setFilteredVolunteers] = useState<Volunteer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingVolunteers, setIsLoadingVolunteers] = useState(true);
  const [error, setError] = useState('');
  const [resetResult, setResetResult] = useState<ResetPasswordResult | null>(null);

  useEffect(() => {
    if (!isLoading && user) {
      loadVolunteers();
    }
  }, [isLoading, user]);

  useEffect(() => {
    // Filter volunteers based on search term
    if (searchTerm === '') {
      setFilteredVolunteers(volunteers);
    } else {
      const filtered = volunteers.filter(v =>
        v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredVolunteers(filtered);
    }
  }, [searchTerm, volunteers]);

  const loadVolunteers = async () => {
    try {
      const response = await axios.get<{ success: boolean; data: Volunteer[] }>('/admin/volunteers');
      setVolunteers(response.data.data);
      setFilteredVolunteers(response.data.data);
    } catch (err: any) {
      console.error('Error loading volunteers:', err);
      setError('Failed to load volunteers');
    } finally {
      setIsLoadingVolunteers(false);
    }
  };

  const handleResetPassword = async (volunteerId: string, volunteerName: string) => {
    if (!confirm(`Reset password for ${volunteerName}?\n\nThis will generate a temporary password that they must change on first login.`)) {
      return;
    }

    try {
      const response = await axios.post<{ success: boolean; data: ResetPasswordResult }>(
        `/admin/volunteers/${volunteerId}/reset-password`
      );

      // Show the temporary password
      setResetResult(response.data.data);

      // Reload volunteers to show updated mustChangePassword flag
      await loadVolunteers();
    } catch (err: any) {
      console.error('Error resetting password:', err);
      alert(err.response?.data?.message || 'Failed to reset password');
    }
  };

  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case 'ADMIN':
        return 'bg-red-100 text-red-800';
      case 'LEADER':
        return 'bg-blue-100 text-blue-800';
      case 'PARENT':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading || isLoadingVolunteers) {
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
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Volunteer Management</h1>
          <p className="mt-2 text-gray-600">Manage volunteer accounts and reset passwords</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {resetResult && (
          <Card className="mb-6 bg-yellow-50 border-yellow-200">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Password Reset Successful
                </h3>
                <p className="text-sm text-gray-700 mb-4">
                  Share this temporary password with <strong>{resetResult.name}</strong> ({resetResult.email}):
                </p>
                <div className="bg-white border-2 border-yellow-400 rounded-md p-4 font-mono text-2xl text-center mb-4">
                  {resetResult.temporaryPassword}
                </div>
                <p className="text-sm text-gray-600">
                  ⚠️ This password will only be shown once. The volunteer must change it on first login.
                </p>
              </div>
              <button
                onClick={() => setResetResult(null)}
                className="ml-4 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
          </Card>
        )}

        <Card className="mb-6 p-4">
          <label htmlFor="search-volunteers" className="block text-sm font-medium mb-2">
            Search Volunteers
          </label>
          <Input
            id="search-volunteers"
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          />
        </Card>

        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Roles
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredVolunteers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      {searchTerm ? 'No volunteers found' : 'No volunteers yet'}
                    </td>
                  </tr>
                ) : (
                  filteredVolunteers.map((volunteer) => (
                    <tr key={volunteer.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{volunteer.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{volunteer.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTierBadgeColor(volunteer.authTier)}`}>
                          {volunteer.authTier}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500">
                          {volunteer.volunteerRoles.length > 0
                            ? volunteer.volunteerRoles.map(vr => vr.role.name).join(', ')
                            : 'No roles'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {volunteer.mustChangePassword && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                            Must Change Password
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleResetPassword(volunteer.id, volunteer.name)}
                        >
                          Reset Password
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="mt-6 text-sm text-gray-500">
          Total volunteers: {filteredVolunteers.length}
          {searchTerm && ` (filtered from ${volunteers.length})`}
        </div>
      </div>
    </div>
  );
}
