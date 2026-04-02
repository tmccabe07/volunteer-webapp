'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { volunteerApi, type VolunteerDetail } from '@/services/volunteer.service';
import { useAuth } from '@/lib/auth-context';

export default function VolunteerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const volunteerId = params?.id as string;
  const { user, isLoading: authLoading } = useAuth();
  const [volunteer, setVolunteer] = useState<VolunteerDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }

    if (user && volunteerId) {
      loadVolunteer();
    }
  }, [user, authLoading, volunteerId]);

  const loadVolunteer = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await volunteerApi.getVolunteerById(volunteerId);
      setVolunteer(data);
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError('You do not have permission to view this volunteer');
      } else if (err.response?.status === 404) {
        setError('Volunteer not found');
      } else {
        setError(err.response?.data?.error || 'Failed to load volunteer details');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Loading volunteer details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-6 bg-red-50 border-red-200">
          <p className="text-red-800">{error}</p>
          <Button onClick={() => router.back()} className="mt-4">
            Go Back
          </Button>
        </Card>
      </div>
    );
  }

  if (!volunteer) {
    return null;
  }

  const isOwnProfile = user?.id === volunteer.id;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{volunteer.name}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            Back
          </Button>
          {isOwnProfile && (
            <Button onClick={() => router.push('/profile/edit')}>
              Edit Profile
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* Basic Information */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
          <div className="space-y-3">
            <div>
              <span className="text-sm text-gray-600">Email:</span>
              <p className="font-medium">{volunteer.email}</p>
            </div>
            {volunteer.phone && (
              <div>
                <span className="text-sm text-gray-600">Phone:</span>
                <p className="font-medium">{volunteer.phone}</p>
              </div>
            )}
            <div>
              <span className="text-sm text-gray-600">Authorization Tier:</span>
              <p className="font-medium">
                {volunteer.authTier === 'ADMIN' ? 'Site Admin' : 
                 volunteer.authTier === 'LEADER' ? 'Leader' : 'Parent/Guardian'}
              </p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Member Since:</span>
              <p className="font-medium">{new Date(volunteer.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </Card>

        {/* Points & Achievements */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Points & Achievements</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-gray-600">Total Points</span>
              <p className="font-medium text-2xl">{volunteer.pointBalance.totalPoints}</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Current Year</span>
              <p className="font-medium text-2xl">{volunteer.pointBalance.currentYearPoints}</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Badge Tier</span>
              <p className="font-medium text-lg">
                {volunteer.pointBalance.badgeTier || 'No badge yet'}
              </p>
            </div>
            {volunteer.pointBalance.rank && (
              <div>
                <span className="text-sm text-gray-600">Leaderboard Rank</span>
                <p className="font-medium text-lg">#{volunteer.pointBalance.rank}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Volunteer Roles */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Volunteer Roles</h2>
          {volunteer.roles.length > 0 ? (
            <ul className="space-y-2">
              {volunteer.roles.map(role => (
                <li key={role.id} className="p-3 bg-gray-50 rounded">
                  <p className="font-medium">{role.roleName}</p>
                  <p className="text-sm text-gray-600">
                    Assigned {new Date(role.assignedAt).toLocaleDateString()}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-600">No roles assigned</p>
          )}
        </Card>

        {/* Children's Ranks */}
        {volunteer.childrenRanks.length > 0 && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Children&apos;s Ranks</h2>
            <div className="flex gap-2 flex-wrap">
              {volunteer.childrenRanks.map(rank => (
                <span key={rank.id} className="px-3 py-1 bg-blue-100 text-blue-800 rounded">
                  {formatRankLevel(rank.rankLevel)}
                </span>
              ))}
            </div>
          </Card>
        )}

        {/* Point History */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Point History</h2>
          {volunteer.pointHistory.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {volunteer.pointHistory.map(event => (
                <div key={event.id} className="flex justify-between items-center p-3 border-b">
                  <div className="flex-1">
                    <p className="font-medium">
                      {event.activityType?.name || formatEventType(event.eventType)}
                    </p>
                    {event.reason && (
                      <p className="text-sm text-gray-600">{event.reason}</p>
                    )}
                    <p className="text-xs text-gray-500">
                      {new Date(event.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className={`font-semibold ${event.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {event.points > 0 ? '+' : ''}{event.points}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">No point history</p>
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

function formatEventType(eventType: string): string {
  const labels: Record<string, string> = {
    EVENT_PARTICIPATION: 'Event Participation',
    TASK_COMPLETION: 'Task Completion',
    ROLE_ASSIGNMENT: 'Role Assignment',
    ADMIN_REVOCATION: 'Admin Revocation',
  };
  return labels[eventType] || eventType;
}
