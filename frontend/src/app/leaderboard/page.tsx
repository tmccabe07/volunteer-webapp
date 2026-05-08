/**
 * Leaderboard Page
 * 
 * Display ranked volunteers with badge tiers and current user position
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { pointsService, type LeaderboardResponse } from '@/services/points.service';
import { volunteerApi } from '@/services/volunteer.service';
import { BadgeTier } from '@/components/shared/points/BadgeTier';
import { BadgeTierLegend } from '@/components/shared/BadgeTierLegend';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react';

// Badge colors from BadgeTierService
const badgeTierColors: Record<string, string> = {
  'Bronze': '#CD7F32',
  'Silver': '#C0C0C0',
  'Gold': '#FFD700',
  'Platinum': '#E5E4E2',
  'Diamond': '#B9F2FF'
};

// Rank medal emojis for top 3
const getRankMedal = (rank: number): string => {
  switch (rank) {
    case 1: return '🥇';
    case 2: return '🥈';
    case 3: return '🥉';
    default: return '';
  }
};

// Rank change indicator (placeholder - requires backend support for historical rank data)
const getRankChangeIndicator = (rankChange?: number) => {
  if (!rankChange || rankChange === 0) {
    return (
      <span className="inline-flex items-center text-xs text-gray-400" title="No change">
        <Minus className="h-3 w-3" />
      </span>
    );
  }
  
  if (rankChange > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-[hsl(var(--success))] font-medium" title={`Up ${rankChange} positions`}>
        <TrendingUp className="h-3 w-3" />
        {rankChange}
      </span>
    );
  }
  
  return (
    <span className="inline-flex items-center gap-1 text-xs text-[hsl(var(--danger))] font-medium" title={`Down ${Math.abs(rankChange)} positions`}>
      <TrendingDown className="h-3 w-3" />
      {Math.abs(rankChange)}
    </span>
  );
};

// Rank styling for top 3
const getRankStyles = (rank: number) => {
  switch (rank) {
    case 1:
      return {
        cardClass: 'border-2 border-yellow-400 bg-gradient-to-r from-yellow-50 to-amber-50 shadow-lg',
        rankClass: 'text-yellow-500 text-3xl',
        nameClass: 'text-xl'
      };
    case 2:
      return {
        cardClass: 'border-2 border-gray-300 bg-gradient-to-r from-gray-50 to-slate-50 shadow-md',
        rankClass: 'text-gray-400 text-2xl',
        nameClass: 'text-lg'
      };
    case 3:
      return {
        cardClass: 'border-2 border-orange-400 bg-gradient-to-r from-orange-50 to-amber-50 shadow-md',
        rankClass: 'text-orange-600 text-2xl',
        nameClass: 'text-lg'
      };
    default:
      return {
        cardClass: '',
        rankClass: 'text-gray-600',
        nameClass: ''
      };
  }
};

export default function LeaderboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLegend, setShowLegend] = useState(false);
  const [isOptedIn, setIsOptedIn] = useState<boolean | null>(null);

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
    fetchOptInStatus();
  }, []);

  const fetchOptInStatus = async () => {
    try {
      const profile = await volunteerApi.getMyProfile();
      setIsOptedIn(profile.leaderboardOptIn);
    } catch (err) {
      console.error('Failed to fetch opt-in status:', err);
    }
  };

  const handlePageChange = (page: number) => {
    fetchLeaderboard(page);
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
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Page Title */}
        <div className="flex items-center gap-3 mb-4">
          <Trophy className="h-9 w-9 text-[hsl(var(--cub-gold))]" />
          <h1 className="text-4xl font-bold text-gray-900">Volunteer Leaderboard</h1>
        </div>
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowLegend(!showLegend)}>
              {showLegend ? 'Hide' : 'Show'} Badge Tiers
            </Button>
            {isOptedIn === false && (
              <Button variant="outline" onClick={() => router.push('/profile/edit')}>
                Opt Into Leaderboard
              </Button>
            )}
          </div>
        </div>

        {/* Badge Tier Legend */}
        {showLegend && (
          <Card className="p-6">
            <BadgeTierLegend 
              currentTier={leaderboardData.currentUser.rank ? undefined : null}
              currentPoints={leaderboardData.currentUser.totalPoints}
            />
          </Card>
        )}

        {/* Current User Position */}
        {leaderboardData.currentUser.rank && (
          <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-[hsl(var(--cub-blue))]/30">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Your Position</p>
                  <p className="text-3xl font-bold text-[hsl(var(--cub-blue))]">#{leaderboardData.currentUser.rank}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Your Points</p>
                  <p className="text-3xl font-bold text-[hsl(var(--cub-blue))]">{leaderboardData.currentUser.totalPoints.toLocaleString()}</p>
                </div>
              </div>
              
              {/* Comparison Stats */}
              {leaderboardData.pagination.total > 1 && (
                <div className="pt-4 border-t border-[hsl(var(--cub-blue))]/20">
                  <div className="flex items-center gap-2 text-sm">
                    <Trophy className="h-4 w-4 text-[hsl(var(--cub-gold))]" />
                    <span className="font-medium text-gray-700">
                      {(() => {
                        const percentile = Math.round((1 - (leaderboardData.currentUser.rank - 1) / leaderboardData.pagination.total) * 100);
                        if (percentile >= 90) return `🌟 Top ${100 - percentile + 1}% of volunteers! Outstanding!`;
                        if (percentile >= 75) return `⭐ Top ${100 - percentile + 1}% of volunteers! Excellent work!`;
                        if (percentile >= 50) return `👏 Top half of volunteers! Keep it up!`;
                        return `💪 You're making a difference! Keep volunteering!`;
                      })()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* No rank yet message (not opted in) */}
        {isOptedIn === false && (
          <Card className="p-4 bg-gray-50">
            <p className="text-sm text-muted-foreground text-center">
              Earn points by volunteering and opt in to appear on the leaderboard!
            </p>
          </Card>
        )}

        {/* Leaderboard List */}
        <div className="space-y-3">
          {leaderboardData.leaderboard.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground">
              No volunteers on leaderboard yet
            </Card>
          ) : (
            <>
              {/* Top 3 - Podium Style */}
              {leaderboardData.leaderboard
                .filter(entry => entry.rank <= 3)
                .map((entry) => {
                  const styles = getRankStyles(entry.rank);
                  const medal = getRankMedal(entry.rank);
                  const isCurrentUser = user && entry.volunteer.id === user.id;
                  
                  return (
                    <Card
                      key={entry.volunteer.id}
                      className={`p-6 ${styles.cardClass} ${isCurrentUser ? 'ring-2 ring-[hsl(var(--cub-blue))] ring-offset-2' : ''} transition-all hover:scale-[1.02]`}
                    >
                      <div className="flex items-center gap-4">
                        {/* Rank with Medal */}
                        <div className="flex-shrink-0 w-16 text-center">
                          <div className="flex flex-col items-center">
                            <span className="text-3xl mb-1">{medal}</span>
                            <span className={`text-xl font-bold ${styles.rankClass}`}>
                              #{entry.rank}
                            </span>
                          </div>
                        </div>

                        {/* Volunteer Info */}
                        <div className="flex-1 min-w-0">
                          <p className={`font-bold ${styles.nameClass} truncate`}>
                            {entry.volunteer.name}
                            {isCurrentUser && (
                              <span className="ml-2 text-sm font-normal text-[hsl(var(--cub-blue))]">(You)</span>
                            )}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {entry.badgeTier && (
                              <BadgeTier
                                tierName={entry.badgeTier}
                                badgeColor={badgeTierColors[entry.badgeTier] || '#999999'}
                                size="sm"
                              />
                            )}
                          </div>
                        </div>

                        {/* Points */}
                        <div className="flex-shrink-0 text-right">
                          <p className="text-sm text-muted-foreground">Points</p>
                          <p className="text-2xl font-bold text-blue-600">
                            {entry.totalPoints.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </Card>
                  );
                })}

              {/* Remaining ranks */}
              {leaderboardData.leaderboard
                .filter(entry => entry.rank > 3)
                .map((entry) => {
                  const isCurrentUser = user && entry.volunteer.id === user.id;
                  
                  return (
                    <Card
                      key={entry.volunteer.id}
                      className={`p-4 transition-colors ${
                        isCurrentUser 
                          ? 'bg-[hsl(var(--cub-blue))]/5 border-2 border-[hsl(var(--cub-blue))] shadow-md' 
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        {/* Rank */}
                        <div className="flex-shrink-0 w-12 text-center">
                          <span className={`text-lg font-semibold ${
                            isCurrentUser ? 'text-[hsl(var(--cub-blue))]' : 'text-gray-600'
                          }`}>
                            #{entry.rank}
                          </span>
                          {/* Rank change indicator - placeholder for future backend support */}
                          <div className="mt-0.5">
                            {getRankChangeIndicator(undefined /* entry.rankChange */)}
                          </div>
                        </div>

                        {/* Volunteer Name */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {entry.volunteer.name}
                            {isCurrentUser && (
                              <span className="ml-2 text-sm text-[hsl(var(--cub-blue))]">(You)</span>
                            )}
                          </p>
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
                        <div className="flex-shrink-0 text-right min-w-[80px]">
                          <p className="text-sm text-muted-foreground">Points</p>
                          <p className="text-lg font-semibold">{entry.totalPoints.toLocaleString()}</p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
            </>
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
