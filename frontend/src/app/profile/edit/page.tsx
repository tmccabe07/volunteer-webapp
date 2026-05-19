'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { volunteerApi, type VolunteerProfile, type AvailableRole } from '@/services/volunteer.service';
import { RoleSelectionForm } from '@/components/forms/profile/RoleSelectionForm';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

const RANK_OPTIONS = [
  { value: 'LION', label: 'Lion' },
  { value: 'TIGER', label: 'Tiger' },
  { value: 'WOLF', label: 'Wolf' },
  { value: 'BEAR', label: 'Bear' },
  { value: 'WEBELOS', label: 'Webelos' },
  { value: 'AOL', label: 'Arrow of Light' },
];

export default function ProfileEditPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [profile, setProfile] = useState<VolunteerProfile | null>(null);
  const [availableRoles, setAvailableRoles] = useState<AvailableRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const hasLoadedRef = useRef(false);

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [leaderboardOptIn, setLeaderboardOptIn] = useState(false);
  const [selectedRanks, setSelectedRanks] = useState<string[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }

    if (user && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadProfile();
      loadAvailableRoles();
    }
  }, [user, authLoading, router]);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      const data = await volunteerApi.getMyProfile();
      setProfile(data);
      // Initialize form state
      setName(data.name);
      setPhone(data.phone || '');
      setLeaderboardOptIn(data.leaderboardOptIn);
      setSelectedRanks(data.childrenRanks.map(r => r.rankLevel));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const newErrors: Record<string, string> = {};
    if (!name || name.trim().length === 0) {
      newErrors.name = 'Name is required';
    } else if (name.length > 100) {
      newErrors.name = 'Name must be 100 characters or less';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSaving(true);
    setErrors({});

    try {
      await volunteerApi.updateMyProfile({
        name,
        phone,
        leaderboardOptIn,
        childrenRanks: selectedRanks,
      });
      router.push('/profile');
    } catch (err: any) {
      if (err.response?.data?.details) {
        setErrors({ general: err.response.data.details.join(', ') });
      } else {
        setErrors({ general: err.response?.data?.error || 'Failed to update profile' });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const toggleRank = (rank: string) => {
    if (selectedRanks.includes(rank)) {
      setSelectedRanks(prev => prev.filter(r => r !== rank));
    } else {
      setSelectedRanks(prev => [...prev, rank]);
    }
  };

  const handleAssignRole = async (roleId: string) => {
    try {
      const result = await volunteerApi.assignRole(roleId);
      await loadProfile();
      
      // Notify header to refresh points
      window.dispatchEvent(new Event('pointsUpdated'));
      
      // Check if tier was upgraded
      if (result.tierUpgraded) {
        alert('🎉 Congratulations! You\'ve been promoted to Leader tier.\n\n⚠️ IMPORTANT: Please save profile, log out and log back in for your new permissions to take effect.');
      }
    } catch (err: any) {
      console.error('Failed to assign role:', err);
      setError(err.response?.data?.error || 'Failed to assign role');
    }
  };

  const handleRemoveRole = async (roleAssignmentId: string) => {
    await volunteerApi.removeRole(roleAssignmentId);
    await loadProfile();
    
    // Notify header to refresh points
    window.dispatchEvent(new Event('pointsUpdated'));
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

      <form onSubmit={handleSubmit}>
        {errors.general && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
            {errors.general}
          </div>
        )}

        <div className="space-y-6">
          {/* Basic Information */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-1">
                  Name *
                </label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  disabled={isSaving}
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="text-red-600 text-sm mt-1">{errors.name}</p>
                )}
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium mb-1">
                  Phone
                </label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  disabled={isSaving}
                  placeholder="(555) 555-5555"
                />
              </div>

              {/* Leaderboard Opt-In */}
              <div className="pt-2">
                <label className="block text-sm font-medium mb-2">
                  Leaderboard Visibility
                </label>
                <div 
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    leaderboardOptIn 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex items-center h-5">
                      <input
                        id="leaderboardOptIn"
                        type="checkbox"
                        checked={leaderboardOptIn}
                        onChange={e => setLeaderboardOptIn(e.target.checked)}
                        disabled={isSaving}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex-1">
                      <label 
                        htmlFor="leaderboardOptIn" 
                        className="font-medium text-sm cursor-pointer"
                      >
                        Show me on the public leaderboard
                      </label>
                      <p className="text-xs text-muted-foreground mt-1">
                        {leaderboardOptIn ? (
                          <span className="text-green-700">
                            ✓ Your profile and points will be <strong>visible</strong> to all volunteers on the leaderboard
                          </span>
                        ) : (
                          <span className="text-gray-600">
                            Your profile will be <strong>hidden</strong> from the leaderboard (you can still earn points)
                          </span>
                        )}
                      </p>
                    </div>
                    <div 
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        leaderboardOptIn
                          ? 'bg-green-200 text-green-800'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {leaderboardOptIn ? 'PUBLIC' : 'PRIVATE'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Children's Ranks */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-2">Children&apos;s Ranks</h2>
            <p className="text-sm text-gray-600 mb-4">
              Select the ranks of your children in the pack. This helps us tailor event recommendations.
            </p>
            <div className="space-y-2">
              {RANK_OPTIONS.map(option => (
                <div key={option.value} className="flex items-center">
                  <input
                    id={`rank-${option.value}`}
                    type="checkbox"
                    checked={selectedRanks.includes(option.value)}
                    onChange={() => toggleRank(option.value)}
                    disabled={isSaving}
                    className="mr-2"
                  />
                  <label htmlFor={`rank-${option.value}`} className="text-sm">
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
          </Card>

          {/* Volunteer Roles */}
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

          {/* Save Button */}
          <div className="flex gap-3 pt-4">
            <Button type="submit" variant="outline" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Profile'}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => router.push('/profile')} 
              disabled={isSaving}
            >
              Cancel
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
