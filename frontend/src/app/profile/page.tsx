'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { volunteerApi, type VolunteerProfile } from '@/services/volunteer.service';
import { useAuth } from '@/lib/auth-context';
import { AchievementHistory } from '@/components/shared/achievements/AchievementHistory';
import { BadgeTier } from '@/components/shared/points/BadgeTier';

// Default badge colors (from BadgeTierService)
const DEFAULT_BADGE_COLORS: Record<string, string> = {
  'Bronze': '#CD7F32',
  'Silver': '#C0C0C0',
  'Gold': '#FFD700',
  'Platinum': '#E5E4E2',
  'Diamond': '#B9F2FF'
};

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

        {/* Points Summary */}
        <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50">
          <h2 className="text-xl font-semibold mb-4">Points Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Points */}
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Total Points</p>
              <p className="font-bold text-4xl text-blue-600">{profile.pointBalance.totalPoints}</p>
            </div>

            {/* Current Badge Tier */}
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Current Badge Tier</p>
              {profile.pointBalance.badgeTier ? (
                <div className="flex justify-center">
                  <BadgeTier
                    tierName={profile.pointBalance.badgeTier}
                    badgeColor={DEFAULT_BADGE_COLORS[profile.pointBalance.badgeTier] || '#6B7280'}
                    size="lg"
                  />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No badge yet<br />(earn 20 points)</p>
              )}
            </div>

            {/* Leaderboard Rank */}
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Leaderboard Rank</p>
              {profile.pointBalance.rank ? (
                <p className="font-bold text-4xl text-purple-600">#{profile.pointBalance.rank}</p>
              ) : (
                <p className="text-sm text-muted-foreground mt-3">
                  {profile.leaderboardOptIn ? 'Not ranked yet' : 'Opted out'}
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-sm text-gray-600">Current Year Points:</span>
                <span className="ml-2 font-medium">{profile.pointBalance.currentYearPoints}</span>
              </div>
              <div>
                <span className="text-sm text-gray-600">Leaderboard:</span>
                <span className="ml-2 font-medium">
                  {profile.leaderboardOptIn ? (
                    <span className="text-green-600">Visible ✓</span>
                  ) : (
                    <span className="text-gray-500">Hidden</span>
                  )}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Achievements & Badge History */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Achievements & Badge History</h2>
          <AchievementHistory />
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
