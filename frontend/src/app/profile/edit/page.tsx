'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { volunteerApi, type VolunteerProfile, type AvailableRole } from '@/services/volunteer.service';
import { ProfileEditForm } from '@/components/forms/profile/ProfileEditForm';
import { ChildrenRanksForm } from '@/components/forms/profile/ChildrenRanksForm';
import { RoleSelectionForm } from '@/components/forms/profile/RoleSelectionForm';
import { useAuth } from '@/lib/auth-context';

export default function ProfileEditPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [profile, setProfile] = useState<VolunteerProfile | null>(null);
  const [availableRoles, setAvailableRoles] = useState<AvailableRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }

    if (user) {
      loadProfile();
      loadAvailableRoles();
    }
  }, [user, authLoading]);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      const data = await volunteerApi.getMyProfile();
      setProfile(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAvailableRoles = async () => {
    try {
      const roles = await volunteerApi.getAvailableRoles();
      setAvailableRoles(roles);
    } catch (err: any) {
      console.error('Failed to load available roles:', err);
    }
  };

  const handleProfileUpdate = async (data: { name: string; phone: string; leaderboardOptIn: boolean }) => {
    await volunteerApi.updateMyProfile(data);
    await loadProfile();
    router.push('/profile');
  };

  const handleRanksUpdate = async (ranks: string[]) => {
    await volunteerApi.updateMyProfile({ childrenRanks: ranks });
    await loadProfile();
  };

  const handleAssignRole = async (roleId: string) => {
    await volunteerApi.assignRole(roleId);
    await loadProfile();
  };

  const handleRemoveRole = async (roleAssignmentId: string) => {
    await volunteerApi.removeRole(roleAssignmentId);
    await loadProfile();
  };

  if (authLoading || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Loading profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="p-6 bg-red-50 border border-red-200 rounded text-red-800">
          {error}
        </div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Edit Profile</h1>
      </div>

      <div className="space-y-6">
        <ProfileEditForm
          initialData={{
            name: profile.name,
            phone: profile.phone || '',
            leaderboardOptIn: profile.leaderboardOptIn,
          }}
          onSubmit={handleProfileUpdate}
          onCancel={() => router.push('/profile')}
        />

        <ChildrenRanksForm
          initialRanks={profile.childrenRanks.map(r => r.rankLevel)}
          onSubmit={handleRanksUpdate}
        />

        <RoleSelectionForm
          availableRoles={availableRoles}
          assignedRoles={profile.roles.map(r => ({
            id: r.id,
            roleId: r.roleId,
            roleName: r.roleName,
            assignedAt: r.assignedAt,
          }))}
          onAssignRole={handleAssignRole}
          onRemoveRole={handleRemoveRole}
        />
      </div>
    </div>
  );
}
