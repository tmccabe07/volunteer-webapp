/**
 * PointsHistory Component
 * 
 * Displays paginated list of point events
 */

'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface PointEvent {
  id: string;
  points: number;
  eventType: 'EVENT_PARTICIPATION' | 'TASK_COMPLETION' | 'ROLE_ASSIGNMENT' | 'ADMIN_REVOCATION';
  reason: string | null;
  activityType: {
    name: string;
    pointValue: number;
  } | null;
  createdBy: {
    id: string;
    name: string;
  };
  createdAt: string;
}

interface PointsHistoryProps {
  pointEvents: PointEvent[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
  onPageChange: (page: number) => void;
}

const eventTypeLabels: Record<string, string> = {
  EVENT_PARTICIPATION: 'Event Participation',
  TASK_COMPLETION: 'Task Completion',
  ROLE_ASSIGNMENT: 'Role Assignment',
  ADMIN_REVOCATION: 'Revocation'
};

export function PointsHistory({ pointEvents, pagination, onPageChange }: PointsHistoryProps) {
  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Point History</h3>
      
      <div className="space-y-2">
        {pointEvents.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">
            No point events yet
          </Card>
        ) : (
          pointEvents.map((event) => (
            <Card key={event.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-lg font-bold ${
                        event.points > 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {event.points > 0 ? '+' : ''}{event.points}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {eventTypeLabels[event.eventType] || event.eventType}
                    </span>
                  </div>
                  
                  {event.activityType && (
                    <p className="text-sm mt-1">{event.activityType.name}</p>
                  )}
                  
                  {event.reason && (
                    <p className="text-sm text-muted-foreground mt-1">{event.reason}</p>
                  )}
                  
                  <p className="text-xs text-muted-foreground mt-2">
                    by {event.createdBy.name} • {new Date(event.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page === 1}
            onClick={() => onPageChange(pagination.page - 1)}
          >
            Previous
          </Button>
          
          <span className="text-sm">
            Page {pagination.page} of {totalPages}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page === totalPages}
            onClick={() => onPageChange(pagination.page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
