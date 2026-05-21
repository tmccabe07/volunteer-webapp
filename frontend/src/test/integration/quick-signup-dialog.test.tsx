import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import QuickSignupDialog from '@/components/shared/events/QuickSignupDialog';
import eventsService from '@/services/events.service';

// Mock the events service
vi.mock('@/services/events.service', () => ({
  default: {
    getEvent: vi.fn(),
    signupForActivity: vi.fn(),
    withdrawFromActivity: vi.fn(),
  },
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe('QuickSignupDialog - Activity Slot Descriptions', () => {
  const mockEvent = {
    id: 'event-1',
    title: 'Pack Meeting',
    eventDate: '2026-06-15T18:00:00Z',
    eventTime: '6:00 PM',
    location: 'Community Center',
    rankLevel: null,
    activitySlots: [
      {
        id: 'slot-1',
        activityType: {
          id: 'type-1',
          name: 'Event Volunteer',
          pointValue: 5,
          category: 'MEDIUM',
        },
        capacity: 3,
        description: 'Setup chairs and tables before the meeting',
        signups: [],
      },
      {
        id: 'slot-2',
        activityType: {
          id: 'type-1',
          name: 'Event Volunteer',
          pointValue: 5,
          category: 'MEDIUM',
        },
        capacity: 2,
        description: 'Manage registration desk and greet families',
        signups: [],
      },
      {
        id: 'slot-3',
        activityType: {
          id: 'type-2',
          name: 'Cleanup Crew',
          pointValue: 3,
          category: 'LOW',
        },
        capacity: 4,
        description: null, // No description
        signups: [],
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display description for activity slots with custom descriptions', async () => {
    vi.mocked(eventsService.getEvent).mockResolvedValue(mockEvent);

    render(
      <QuickSignupDialog
        eventId="event-1"
        eventTitle="Pack Meeting"
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Setup chairs and tables before the meeting')).toBeInTheDocument();
    });

    expect(screen.getByText('Manage registration desk and greet families')).toBeInTheDocument();
  });

  it('should not display description for activity slots without descriptions', async () => {
    vi.mocked(eventsService.getEvent).mockResolvedValue(mockEvent);

    render(
      <QuickSignupDialog
        eventId="event-1"
        eventTitle="Pack Meeting"
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Cleanup Crew')).toBeInTheDocument();
    });

    // Should not have any description text for the Cleanup Crew slot
    const cleanupSlot = screen.getByText('Cleanup Crew').closest('div');
    expect(cleanupSlot).toBeInTheDocument();
    // The description paragraphs should only be 2 (not 3)
    const descriptions = screen.getAllByText(/Setup chairs|Manage registration/);
    expect(descriptions).toHaveLength(2);
  });

  it('should display multiple activity slots with same type but different descriptions', async () => {
    vi.mocked(eventsService.getEvent).mockResolvedValue(mockEvent);

    render(
      <QuickSignupDialog
        eventId="event-1"
        eventTitle="Pack Meeting"
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getAllByText('Event Volunteer')).toHaveLength(2);
    });

    // Should display both Event Volunteer slots (they have same name)
    const eventVolunteerElements = screen.getAllByText('Event Volunteer');
    expect(eventVolunteerElements).toHaveLength(2);

    // Should display both unique descriptions
    expect(screen.getByText('Setup chairs and tables before the meeting')).toBeInTheDocument();
    expect(screen.getByText('Manage registration desk and greet families')).toBeInTheDocument();
  });

  it('should display description below activity type name and above badges', async () => {
    vi.mocked(eventsService.getEvent).mockResolvedValue(mockEvent);

    const { container } = render(
      <QuickSignupDialog
        eventId="event-1"
        eventTitle="Pack Meeting"
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Setup chairs and tables before the meeting')).toBeInTheDocument();
    });

    // Find the first activity slot container
    const activitySlotName = screen.getAllByText('Event Volunteer')[0];
    const slotContainer = activitySlotName.closest('div[class*="p-4"]');
    
    expect(slotContainer).toBeInTheDocument();
    
    // Verify structure: name → description → badges
    const activityNameElement = slotContainer!.querySelector('h4');
    expect(activityNameElement?.textContent).toBe('Event Volunteer');
    
    const descriptionElement = slotContainer!.querySelector('p.text-sm.text-gray-600');
    expect(descriptionElement?.textContent).toBe('Setup chairs and tables before the meeting');
  });

  it('should load event details when dialog opens', async () => {
    vi.mocked(eventsService.getEvent).mockResolvedValue(mockEvent);

    const { rerender } = render(
      <QuickSignupDialog
        eventId="event-1"
        eventTitle="Pack Meeting"
        open={false}
        onOpenChange={vi.fn()}
      />
    );

    expect(eventsService.getEvent).not.toHaveBeenCalled();

    rerender(
      <QuickSignupDialog
        eventId="event-1"
        eventTitle="Pack Meeting"
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(eventsService.getEvent).toHaveBeenCalledWith('event-1');
    });

    expect(screen.getByText('Setup chairs and tables before the meeting')).toBeInTheDocument();
  });
});
