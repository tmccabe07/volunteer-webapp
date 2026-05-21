import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ActivitySlotList from '@/components/shared/events/ActivitySlotList';

describe('Event Details Display - Activity Slot Descriptions (Phase 5 Integration)', () => {
  const mockActivitySlotsWithDescription = [
    {
      id: 'slot-001',
      activityType: {
        id: 'at-001',
        name: 'Event Volunteer',
        pointValue: 5,
        category: 'MEDIUM',
      },
      capacity: 5,
      description: 'Run Lion station for safety',
      signups: [],
    },
    {
      id: 'slot-002',
      activityType: {
        id: 'at-002',
        name: 'Setup Crew',
        pointValue: 8,
        category: 'HIGH',
      },
      capacity: 3,
      description: 'Lead campfire songs and stories',
      signups: [],
    },
  ];

  const mockActivitySlotsWithoutDescription = [
    {
      id: 'slot-003',
      activityType: {
        id: 'at-003',
        name: 'Cleanup Crew',
        pointValue: 3,
        category: 'LOW',
      },
      capacity: 10,
      description: null,
      signups: [],
    },
  ];

  // T098: Event details display custom description
  it('should display activity slot with custom description', () => {
    render(
      <ActivitySlotList
        activitySlots={mockActivitySlotsWithDescription}
        eventId="event-001"
        isComplete={false}
        isPastEvent={false}
      />
    );

    // Verify activity type names are displayed
    expect(screen.getByText('Event Volunteer')).toBeInTheDocument();
    expect(screen.getByText('Setup Crew')).toBeInTheDocument();

    // Verify custom descriptions are displayed
    expect(screen.getByText('Run Lion station for safety')).toBeInTheDocument();
    expect(screen.getByText('Lead campfire songs and stories')).toBeInTheDocument();
  });

  it('should display activity slot without description (only activity type name)', () => {
    render(
      <ActivitySlotList
        activitySlots={mockActivitySlotsWithoutDescription}
        eventId="event-001"
        isComplete={false}
        isPastEvent={false}
      />
    );

    // Verify activity type name is displayed
    expect(screen.getByText('Cleanup Crew')).toBeInTheDocument();

    // Verify no extra description text is shown (only the activity type name should appear)
    const slotContainer = screen.getByText('Cleanup Crew').closest('div');
    expect(slotContainer).toBeInTheDocument();
    
    // The description paragraph should not exist
    const paragraphs = slotContainer?.querySelectorAll('p');
    const descriptionParagraph = Array.from(paragraphs || []).find(p => 
      p.className.includes('text-sm') && p.className.includes('text-gray-600')
    );
    expect(descriptionParagraph).toBeUndefined();
  });

  it('should display multiple activity slots with mixed descriptions', () => {
    const mixedSlots = [
      ...mockActivitySlotsWithDescription,
      ...mockActivitySlotsWithoutDescription,
    ];

    render(
      <ActivitySlotList
        activitySlots={mixedSlots}
        eventId="event-001"
        isComplete={false}
        isPastEvent={false}
      />
    );

    // Verify all activity types are displayed
    expect(screen.getByText('Event Volunteer')).toBeInTheDocument();
    expect(screen.getByText('Setup Crew')).toBeInTheDocument();
    expect(screen.getByText('Cleanup Crew')).toBeInTheDocument();

    // Verify descriptions for slots that have them
    expect(screen.getByText('Run Lion station for safety')).toBeInTheDocument();
    expect(screen.getByText('Lead campfire songs and stories')).toBeInTheDocument();
  });

  it('should display description alongside activity metadata', () => {
    render(
      <ActivitySlotList
        activitySlots={mockActivitySlotsWithDescription}
        eventId="event-001"
        isComplete={false}
        isPastEvent={false}
      />
    );

    // Find the first activity slot
    const slotContainer = screen.getByText('Event Volunteer').closest('div');
    
    // Verify all elements are present in the same container
    expect(slotContainer).toBeInTheDocument();
    expect(slotContainer).toHaveTextContent('Event Volunteer');
    expect(slotContainer).toHaveTextContent('Run Lion station for safety');
    expect(slotContainer).toHaveTextContent('MEDIUM');
    expect(slotContainer).toHaveTextContent('5 points');
  });

  it('should handle empty string description same as null', () => {
    const slotsWithEmptyString = [
      {
        id: 'slot-004',
        activityType: {
          id: 'at-004',
          name: 'Photography',
          pointValue: 5,
          category: 'MEDIUM',
        },
        capacity: 2,
        description: '',
        signups: [],
      },
    ];

    render(
      <ActivitySlotList
        activitySlots={slotsWithEmptyString}
        eventId="event-001"
        isComplete={false}
        isPastEvent={false}
      />
    );

    // Activity type should be displayed
    expect(screen.getByText('Photography')).toBeInTheDocument();

    // No description should be visible (empty string should not render)
    const slotContainer = screen.getByText('Photography').closest('div');
    const paragraphs = slotContainer?.querySelectorAll('p');
    const descriptionParagraph = Array.from(paragraphs || []).find(p => 
      p.className.includes('text-sm') && p.className.includes('text-gray-600') && p.textContent === ''
    );
    expect(descriptionParagraph).toBeUndefined();
  });

  it('should render long descriptions without breaking layout', () => {
    const longDescription = 'This is a very long description that explains in great detail what the volunteer should do for this activity. It includes multiple sentences and provides comprehensive instructions for the role. The description continues with even more details about the specific responsibilities and expectations for this volunteer position.';
    
    const slotsWithLongDescription = [
      {
        id: 'slot-005',
        activityType: {
          id: 'at-005',
          name: 'Station Leader',
          pointValue: 10,
          category: 'HIGH',
        },
        capacity: 1,
        description: longDescription,
        signups: [],
      },
    ];

    render(
      <ActivitySlotList
        activitySlots={slotsWithLongDescription}
        eventId="event-001"
        isComplete={false}
        isPastEvent={false}
      />
    );

    // Verify full description is displayed
    expect(screen.getByText(longDescription)).toBeInTheDocument();
    
    // Verify activity type name is still visible
    expect(screen.getByText('Station Leader')).toBeInTheDocument();
  });
});
