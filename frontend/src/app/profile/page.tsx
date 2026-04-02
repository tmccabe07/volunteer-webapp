'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { volunteerApi, type VolunteerProfile } from '@/services/volunteer.service';
import { useAuth } from '@/lib/auth-context';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [profile, setProfile] = useState<VolunteerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }

    if (user) {
      loadProfile();
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
        <Card className="p-6 bg-red-50 border-red-200">
          <p className="text-red-800">{error}</p>
          <Button onClick={loadProfile} className="mt-4">
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Profile</h1>
        <Link href="/profile/edit">
          <Button>Edit Profile</Button>
        </Link>
      </div>

      <div className="space-y-6">
        {/* Basic Information */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
          <div className="space-y-3">
            <div>
              <span className="text-sm text-gray-600">Name:</span>
              <p className="font-medium">{profile.name}</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Email:</span>
              <p className="font-medium">{profile.email}</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Phone:</span>
              <p className="font-medium">{profile.phone || 'Not provided'}</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Authorization Tier:</span>
              <p className="font-medium">
                {profile.authTier === 'ADMIN' ? 'Site Admin' : 
                 profile.authTier === 'LEADER' ? 'Leader' : 'Parent/Guardian'}
              </p>
            </div>
          </div>
        </Card>

        {/* Points & Gamification */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Points & Achievements</h2>
          <div className="space-y-3">
            <div>
              <span className="text-sm text-gray-600">Total Points:</span>
              <p className="font-medium text-2xl">{profile.pointBalance.totalPoints}</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Current Year Points:</span>
              <p className="font-medium">{profile.pointBalance.currentYearPoints}</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Badge Tier:</span>
              <p className="font-medium text-lg">
                {profile.pointBalance.badgeTier ? (
                  <span className={getBadgeTierColor(profile.pointBalance.badgeTier)}>
                    {profile.pointBalance.badgeTier}
                  </span>
                ) : (
                  'No badge yet (earn 20 points)'
                )}
              </p>
            </div>
            {profile.pointBalance.rank && (
              <div>
                <span className="text-sm text-gray-600">Leaderboard Rank:</span>
                <p className="font-medium">#{profile.pointBalance.rank}</p>
              </div>
            )}
            <div>
              <span className="text-sm text-gray-600">Leaderboard Visibility:</span>
              <p className="font-medium">
                {profile.leaderboardOptIn ? 'Visible' : 'Hidden'}
              </p>
            </div>
          </div>
        </Card>

        {/* Volunteer Roles */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Volunteer Roles</h2>
          {profile.roles.length > 0 ? (
            <ul className="space-y-2">
              {profile.roles.map(role => (
                <li key={role.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <p className="font-medium">{role.roleName}</p>
                    <p className="text-sm text-gray-600">
                      Assigned {new Date(role.assignedAt).toLocaleDateString()}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-600">No roles assigned yet</p>
          )}
        </Card>

        {/* Children's Ranks */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Children&apos;s Ranks</h2>
          {profile.childrenRanks.length > 0 ? (
            <ul className="space-y-1">
              {profile.childrenRanks.map(rank => (
                <li key={rank.id} className="flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  {formatRankLevel(rank.rankLevel)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-600">No children ranks specified</p>
          )}
        </Card>
      </div>
    </div>
  );
}

function getBadgeTierColor(tier: string): string {
  const colors: Record<string, string> = {
    Bronze: 'text-orange-700',
    Silver: 'text-gray-500',
    Gold: 'text-yellow-600',
    Platinum: 'text-blue-400',
    Diamond: 'text-purple-600',
  };
  return colors[tier] || 'text-gray-800';
}

function formatRankLevel(rank: string): string {
  const labels: Record<string, string> = {
    LION: 'Lion',
    TIGER: 'Tiger',
    WOLF: 'Wolf',
    BEAR: 'Bear',
    WEBELOS: 'Webelos',
    AOL: 'Arrow of Light',
  };
  return labels[rank] || rank;
}
