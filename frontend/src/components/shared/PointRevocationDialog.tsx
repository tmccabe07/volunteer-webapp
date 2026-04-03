/**
 * Point Revocation Dialog
 * 
 * Dialog for Tier 2+ users to revoke point events
 */

'use client';

import React, { useState } from 'react';
import { pointsService } from '@/services/points.service';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface PointRevocationDialogProps {
  pointEventId: string;
  pointValue: number;
  volunteerId: string;
  volunteerName: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function PointRevocationDialog({
  pointEventId,
  pointValue,
  volunteerId,
  volunteerName,
  onSuccess,
  onCancel
}: PointRevocationDialogProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (reason.length < 10) {
      setError('Reason must be at least 10 characters');
      return;
    }

    if (reason.length > 500) {
      setError('Reason must not exceed 500 characters');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      await pointsService.revokePoints(pointEventId, reason);
      
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to revoke points');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="max-w-md w-full p-6 space-y-4">
        <div>
          <h2 className="text-2xl font-bold">Revoke Points</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Revoking {pointValue} points from {volunteerName}
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="reason" className="block text-sm font-medium mb-2">
              Reason for Revocation *
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full min-h-[120px] px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Explain why these points are being revoked (10-500 characters)"
              required
              minLength={10}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {reason.length} / 500 characters
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm">
            <p className="font-medium text-yellow-800">⚠️ Warning</p>
            <p className="text-yellow-700 mt-1">
              This action will create a revocation record and update the volunteer's point balance. 
              This cannot be undone.
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || reason.length < 10}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? 'Revoking...' : 'Revoke Points'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
