import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { CalendarFeedLinksCard } from '@/components/profile/CalendarFeedLinksCard';

describe('CalendarFeedLinksCard', () => {
  it('renders pack and den links', () => {
    const onFeedRegenerated = vi.fn();

    render(
      <CalendarFeedLinksCard
        feeds={[
          {
            scopeType: 'PACK',
            denId: null,
            displayName: 'Pack 123',
            feedUrl: 'https://example.com/api/calendar/feeds/pack.ics',
            isActive: true,
            lastAccessedAt: null,
          },
          {
            scopeType: 'DEN',
            denId: 'den-1',
            displayName: 'Den 8',
            feedUrl: 'https://example.com/api/calendar/feeds/den-8.ics',
            isActive: true,
            lastAccessedAt: null,
          },
        ]}
        onFeedRegenerated={onFeedRegenerated}
      />,
    );

    expect(screen.getByText('Pack Calendar')).toBeInTheDocument();
    expect(screen.getByText('Den 8 Calendar')).toBeInTheDocument();
    expect(screen.getAllByText('Copy URL').length).toBe(2);
  });
});
