/**
 * Points Page
 * 
 * Display current user's points, badge tier, and point history
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { pointsService, type PointsResponse } from '@/services/points.service';
import { PointsBalance } from '@/components/shared/points/PointsBalance';
import { PointsHistory } from '@/components/shared/points/PointsHistory';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function PointsPage() {
  const { user } = useAuth();
  const [pointsData, setPointsData] = useState<PointsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [yearFilter, setYearFilter] = useState<number | undefined>(undefined);

  const fetchPoints = async (page: number = 1) => {
    try {
      setLoading(true);
      const data = await pointsService.getMyPoints(page, 50, yearFilter);
      setPointsData(data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load points');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPoints();
  }, [yearFilter]);

  const handlePageChange = (page: number) => {
    fetchPoints(page);
  };

  const handleYearFilterToggle = () => {
    if (yearFilter) {
      setYearFilter(undefined);
    } else {
      setYearFilter(new Date().getFullYear());
    }
  };

  if (loading && !pointsData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading points...</p>
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

  if (!pointsData) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">My Points</h1>
          <Button variant="outline" onClick={handleYearFilterToggle}>
            {yearFilter ? 'Show All Years' : 'This Year Only'}
          </Button>
        </div>

        {/* Points Balance */}
        <PointsBalance
          totalPoints={pointsData.balance.totalPoints}
          currentYearPoints={pointsData.balance.currentYearPoints}
          badgeTier={pointsData.balance.badgeTier}
          rank={pointsData.balance.rank}
          showRank={true}
        />

        {/* Points History */}
        <PointsHistory
          pointEvents={pointsData.pointEvents}
          pagination={pointsData.pagination}
          onPageChange={handlePageChange}
        />
      </div>
    </div>
  );
}
