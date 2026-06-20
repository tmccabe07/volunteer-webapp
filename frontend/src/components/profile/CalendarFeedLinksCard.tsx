'use client';

import { useMemo, useState } from 'react';
import { CalendarFeedDescriptor, calendarFeedService } from '@/services/calendarFeed.service';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface CalendarFeedLinksCardProps {
  feeds: CalendarFeedDescriptor[];
  onFeedRegenerated: (updatedFeed: { scopeType: 'PACK' | 'DEN'; denId: string | null; feedUrl: string }) => void;
}

export function CalendarFeedLinksCard({ feeds, onFeedRegenerated }: CalendarFeedLinksCardProps) {
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [regeneratingKey, setRegeneratingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sortedFeeds = useMemo(() => {
    return [...feeds].sort((a, b) => {
      if (a.scopeType === b.scopeType) {
        return a.displayName.localeCompare(b.displayName);
      }
      return a.scopeType === 'PACK' ? -1 : 1;
    });
  }, [feeds]);

  const handleCopy = async (url: string) => {
    setError(null);
    try {
      await navigator.clipboard.writeText(url);
      setCopyMessage('Calendar URL copied');
      setTimeout(() => setCopyMessage(null), 2000);
    } catch {
      setError('Unable to copy link. Please copy it manually.');
    }
  };

  const handleRegenerate = async (feed: CalendarFeedDescriptor) => {
    const key = `${feed.scopeType}:${feed.denId || 'pack'}`;
    setRegeneratingKey(key);
    setError(null);

    try {
      const updated = await calendarFeedService.regenerateFeed({
        scopeType: feed.scopeType,
        denId: feed.denId || undefined,
      });

      onFeedRegenerated(updated);
      setCopyMessage('Feed link regenerated');
      setTimeout(() => setCopyMessage(null), 2000);
    } catch {
      setError('Unable to regenerate this link right now.');
    } finally {
      setRegeneratingKey(null);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-2">Calendar Subscription Links</h2>
      <div className="text-sm text-gray-700 mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
        <p className="font-medium mb-1">How to subscribe in Google Calendar:</p>
        <ol className="list-decimal list-inside space-y-0.5">
          <li>In the left sidebar, find <strong>Other calendars</strong> and click <strong>+</strong></li>
          <li>Choose <strong>From URL</strong></li>
          <li>Paste the link below and click <strong>Add calendar</strong></li>
        </ol>
        <p className="mt-2 text-gray-500 text-xs">Do not use "Subscribe to calendar" — that field expects an email address, not a URL.</p>
      </div>

      <div className="space-y-3">
        {sortedFeeds.map((feed) => {
          const key = `${feed.scopeType}:${feed.denId || 'pack'}`;
          return (
            <div key={key} className="rounded border p-3 bg-gray-50">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-medium">
                    {feed.scopeType === 'PACK' ? 'Pack Calendar' : `${feed.displayName} Calendar`}
                  </p>
                  <p className="text-xs text-gray-600 break-all">{feed.feedUrl}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {feed.lastAccessedAt
                      ? `Last pulled ${new Date(feed.lastAccessedAt).toLocaleString()}`
                      : 'Not pulled yet'}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleCopy(feed.feedUrl)}>
                    Copy URL
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleRegenerate(feed)}
                    disabled={regeneratingKey === key}
                  >
                    {regeneratingKey === key ? 'Regenerating...' : 'Regenerate'}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {copyMessage ? <p className="text-sm text-green-700 mt-3">{copyMessage}</p> : null}
      {error ? <p className="text-sm text-red-700 mt-3">{error}</p> : null}
    </Card>
  );
}
