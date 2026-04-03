/**
 * Leaderboard Page
 * 
 * Display ranked volunteers with badge tiers and current user position
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { pointsService, type LeaderboardResponse } from '@/services/points.service';
import { volunteerApi } from '@/services/volunteer.service';
import { BadgeTier } from '@/components/shared/points/BadgeTier';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// Badge colors from BadgeTierService
const badgeTierColors: Record<string, string> = {
  'Bronze': '#CD7F32',
  'Silver': '#C0C0C0',
  'Gold': '#FFD700',
  'Platinum': '#E5E4E2',
  'Diamond': '#B9F2FF'
};

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = async (page: number = 1) => {
    try {
      setLoading(true);
      const data = await pointsService.getLeaderboard(page, 50);
      setLeaderboardData(data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const handlePageChange = (page: number) => {
    fetchLeaderboard(page);
  };

  const handleToggleOptIn = async () => {
    try {
      // Get current profile
      const profile = await volunteerApi.getMyProfile();
      
      // Toggle leaderboardOptIn
      await volunteerApi.updateMyProfile({
        name: profile.name,
        phone: profile.phone,
        leaderboardOptIn: !profile.leaderboardOptIn,
        childrenRanks: profile.childrenRanks.map(cr => cr.rankLevel)
      });

      // Refresh leaderboard
      await fetchLeaderboard(leaderboardData?.pagination.page || 1);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update opt-in status');
    }
  };

  if (loading && !leaderboardData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading leaderboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-6 bg-red-50 border-red-200">
          <p className="text-red-600">{error}</p>
        </Card>
      </div>
    );
  }

  if (!leaderboardData) return null;

  const totalPages = Math.ceil(leaderboardData.pagination.total / leaderboardData.pagination.limit);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Leaderboard</h1>
          <Button variant="outline" onClick={handleToggleOptIn}>
            Toggle Visibility
          </Button>
        </div>

        {/* Current User Position */}
        {leaderboardData.currentUser.rank && (
          <Card className="p-6 bg-blue-50 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Your Position</p>
                <p className="text-2xl font-bold">#{leaderboardData.currentUser.rank}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Your Points</p>
                <p className="text-2xl font-bold">{leaderboardData.currentUser.totalPoints}</p>
              </div>
            </div>
          </Card>
        )}

        {!leaderboardData.currentUser.rank && (
          <Card className="p-4 bg-gray-50">
            <p className="text-sm text-muted-foreground text-center">
              You are currently opted out of the leaderboard
            </p>
          </Card>
        )}

        {/* Leaderboard List */}
        <div className="space-y-2">
          {leaderboardData.leaderboard.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground">
              No volunteers on leaderboard yet
            </Card>
          ) : (
            leaderboardData.leaderboard.map((entry) => (
              <Card
                key={entry.volunteer.id}
                className={`p-4 ${
                  entry.rank <= 3 ? 'border-2 border-yellow-400 bg-yellow-50' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    {/* Rank */}
                    <div className="flex-shrink-0 w-12 text-center">
                      <span className={`text-2xl font-bold ${
                        entry.rank === 1 ? 'text-yellow-500' :
                        entry.rank === 2 ? 'text-gray-400' :
                        entry.rank === 3 ? 'text-orange-600' :
                        'text-gray-600'
                      }`}>
                        #{entry.rank}
                      </span>
                    </div>

                    {/* Volunteer Name */}
                    <div className="flex-1">
                      <p className="font-semibold">{entry.volunteer.name}</p>
                    </div>

                    {/* Badge Tier */}
                    {entry.badgeTier && (
                      <div className="flex-shrink-0">
                        <BadgeTier
                          tierName={entry.badgeTier}
                          badgeColor={badgeTierColors[entry.badgeTier] || '#999999'}
                          size="sm"
                        />
                      </div>
                    )}

                    {/* Total Points */}
                    <div className="flex-shrink-0 text-right">
                      <p className="text-sm text-muted-foreground">Points</p>
                      <p className="text-xl font-bold">{entry.totalPoints}</p>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={leaderboardData.pagination.page === 1}
              onClick={() => handlePageChange(leaderboardData.pagination.page - 1)}
            >
              Previous
            </Button>
            
            <span className="text-sm">
              Page {leaderboardData.pagination.page} of {totalPages}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              disabled={leaderboardData.pagination.page === totalPages}
              onClick={() => handlePageChange(leaderboardData.pagination.page + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
