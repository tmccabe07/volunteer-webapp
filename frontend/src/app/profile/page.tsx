'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { volunteerApi, type VolunteerProfile } from '@/services/volunteer.service';
import { childScoutService, type ChildScoutListItem } from '@/services/childScout.service';
import { calendarFeedService, type CalendarFeedDescriptor } from '@/services/calendarFeed.service';
import { useAuth } from '@/lib/auth-context';
import { AchievementHistory } from '@/components/shared/achievements/AchievementHistory';
import { BadgeTier } from '@/components/shared/points/BadgeTier';
import { CalendarFeedLinksCard } from '@/components/profile/CalendarFeedLinksCard';
import { Users } from 'lucide-react';

// Default badge colors (from BadgeTierService)
const DEFAULT_BADGE_COLORS: Record<string, string> = {
  'Bronze': '#CD7F32',
  'Silver': '#C0C0C0',
  'Gold': '#FFD700',
  'Platinum': '#E5E4E2',
  'Diamond': '#B9F2FF'
};

const RANK_LABELS: Record<string, string> = {
  LION: 'Lion',
  TIGER: 'Tiger',
  WOLF: 'Wolf',
  BEAR: 'Bear',
  WEBELOS: 'Webelos',
  AOL: 'Arrow of Light',
};

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { error?: string } } }).response;
    if (response?.data?.error) {
      return response.data.error;
    }
  }

  return fallback;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [profile, setProfile] = useState<VolunteerProfile | null>(null);
  const [linkedCubs, setLinkedCubs] = useState<ChildScoutListItem[]>([]);
  const [linkedCubsLoading, setLinkedCubsLoading] = useState(false);
  const [linkedCubsError, setLinkedCubsError] = useState<string | null>(null);
  const [calendarFeeds, setCalendarFeeds] = useState<CalendarFeedDescriptor[]>([]);
  const [calendarFeedsError, setCalendarFeedsError] = useState<string | null>(null);
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
  }, [user, authLoading, router]);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      const data = await volunteerApi.getMyProfile();
      setProfile(data);

      try {
        const feeds = await calendarFeedService.listFeeds();
        setCalendarFeeds(feeds);
        setCalendarFeedsError(null);
      } catch {
        setCalendarFeeds([]);
        setCalendarFeedsError('Unable to load calendar subscription links');
      }

      if (data.authTier === 'PARENT') {
        setLinkedCubsLoading(true);
        setLinkedCubsError(null);
        try {
          const response = await childScoutService.listChildScouts({
            page: 1,
            limit: 100,
            isActive: true,
          });
          setLinkedCubs(response.data);
        } catch {
          setLinkedCubsError('Failed to load linked Cub Scouts');
          setLinkedCubs([]);
        } finally {
          setLinkedCubsLoading(false);
        }
      } else {
        setLinkedCubs([]);
        setLinkedCubsError(null);
      }
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to load profile'));
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
          <Button variant="outline">Edit Profile</Button>
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

        {calendarFeedsError ? (
          <Card className="p-6 bg-red-50 border-red-200">
            <p className="text-red-800">{calendarFeedsError}</p>
          </Card>
        ) : (
          <CalendarFeedLinksCard
            feeds={calendarFeeds}
            onFeedRegenerated={(updatedFeed) => {
              setCalendarFeeds((current) =>
                current.map((feed) =>
                  feed.scopeType === updatedFeed.scopeType && feed.denId === updatedFeed.denId
                    ? { ...feed, feedUrl: updatedFeed.feedUrl }
                    : feed,
                ),
              );
            }}
          />
        )}

        {profile.authTier === 'PARENT' && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <h2 className="text-xl font-semibold">Linked Cub Scouts</h2>
              <Link href="/my-cub-scouts">
                <Button variant="outline" size="sm">
                  <Users className="h-4 w-4 mr-2" />
                  Open My Cub Scouts
                </Button>
              </Link>
            </div>

            {linkedCubsLoading ? (
              <p className="text-gray-600">Loading linked Cub Scouts...</p>
            ) : linkedCubsError ? (
              <p className="text-red-700">{linkedCubsError}</p>
            ) : linkedCubs.length > 0 ? (
              <ul className="space-y-3">
                {linkedCubs.map((cub) => (
                  <li key={cub.id} className="border rounded p-3 bg-gray-50">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <p className="font-medium">
                          {cub.firstName} {cub.lastName}
                        </p>
                        <p className="text-sm text-gray-600">
                          {RANK_LABELS[cub.currentRank] || cub.currentRank}
                          {cub.currentDen ? ` • ${cub.currentDen.name}` : ''}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Link href={`/cubs/${cub.id}`}>
                          <Button variant="outline" size="sm">View Profile</Button>
                        </Link>
                        <Link href={`/cubs/${cub.id}/advancement`}>
                          <Button size="sm">View Advancement</Button>
                        </Link>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="space-y-2">
                <p className="text-gray-600">No approved Cub Scout links yet.</p>
                <Link href="/parent/links">
                  <Button variant="outline" size="sm">Request Parent Link</Button>
                </Link>
              </div>
            )}
          </Card>
        )}

        {/* Children's Ranks */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Children&apos;s Ranks</h2>
          {profile.authTier !== 'PARENT' ? (
            <p className="text-gray-600">Rank badges are shown for linked Cub Scouts.</p>
          ) : linkedCubsLoading ? (
            <p className="text-gray-600">Loading rank badges...</p>
          ) : linkedCubs.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {linkedCubs.map((cub) => (
                <span
                  key={cub.id}
                  className="inline-flex items-center rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-sm text-blue-900"
                >
                  {RANK_LABELS[cub.currentRank] || cub.currentRank}
                  {cub.currentDen?.denNumber ? ` • Den #${cub.currentDen.denNumber}` : ''}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">No linked Cub Scouts yet</p>
          )}
        </Card>
      </div>
    </div>
  );
}
