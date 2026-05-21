import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EventForm from '@/components/forms/events/EventForm';

// Mock router
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: vi.fn(),
  }),
}));

describe('Event Creation - Activity Slot Descriptions (Phase 5 Integration)', () => {
  const mockActivityTypes = [
    {
      id: 'at-001',
      name: 'Event Volunteer',
      pointValue: 5,
      category: 'MEDIUM',
    },
    {
      id: 'at-002',
      name: 'Setup Crew',
      pointValue: 8,
      category: 'HIGH',
    },
  ];

  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // T095: Add custom description to activity slot
  it('should render description field for activity slots', async () => {
    render(
      <EventForm
        activityTypes={mockActivityTypes}
        onSubmit={mockOnSubmit}
        submitLabel="Create Event"
      />
    );

    // Verify description field exists
    const descriptionField = screen.getByPlaceholderText(/add specific instructions/i);
    expect(descriptionField).toBeInTheDocument();
  });

  // T096: Character counter updates correctly
  it('should update character counter as description is typed', async () => {
    const user = userEvent.setup();
    
    render(
      <EventForm
        activityTypes={mockActivityTypes}
        onSubmit={mockOnSubmit}
      />
    );

    const descriptionField = screen.getByPlaceholderText(/add specific instructions/i);
    
    // Initially should show 0 / 500
    expect(screen.getByText('0 / 500 characters')).toBeInTheDocument();

    // Type some text
    await user.type(descriptionField, 'This is a test description');
    
    // Character count should update
    expect(screen.getByText('27 / 500 characters')).toBeInTheDocument();
  });

  // T097: Validation prevents > 500 chars
  it('should prevent description exceeding 500 characters', async () => {
    const user = userEvent.setup();
    
    render(
      <EventForm
        activityTypes={mockActivityTypes}
        onSubmit={mockOnSubmit}
      />
    );

    const descriptionField = screen.getByPlaceholderText(/add specific instructions/i) as HTMLTextAreaElement;
    
    // Try to type more than 500 characters
    const longText = 'A'.repeat(600);
    await user.type(descriptionField, longText);
    
    // Field should be limited to 500 characters (HTML maxLength attribute)
    expect(descriptionField.value.length).toBeLessThanOrEqual(500);
    expect(descriptionField).toHaveAttribute('maxLength', '500');
  });

  // T098: Submit form with custom description
  it('should include description in form data when provided', async () => {
    const user = userEvent.setup();
    mockOnSubmit.mockResolvedValue(undefined);
    
    const initialData = {
      title: 'Spring Campout',
      eventDate: '2026-07-01',
      activitySlots: [
        {
          activityTypeId: 'at-001',
          capacity: 5,
          description: '',
        },
      ],
    };
    
    render(
      <EventForm
        activityTypes={mockActivityTypes}
        onSubmit={mockOnSubmit}
        initialData={initialData}
      />
    );

    // Add description
    const descriptionField = screen.getByPlaceholderText(/add specific instructions/i);
    await user.type(descriptionField, 'Run Lion station for safety');

    // Verify description is in field
    expect(descriptionField).toHaveValue('Run Lion station for safety');
  });

  it('should allow empty description field', async () => {
    render(
      <EventForm
        activityTypes={mockActivityTypes}
        onSubmit={mockOnSubmit}
      />
    );

    const descriptionField = screen.getByPlaceholderText(/add specific instructions/i);
    
    // Description field should be optional (no required attribute)
    expect(descriptionField).not.toHaveAttribute('required');
    expect(descriptionField).toHaveValue('');
  });

  it('should preserve description when multiple activity slots exist', async () => {
    const user = userEvent.setup();
    
    const initialData = {
      title: 'Multi-Slot Event',
      eventDate: '2026-07-01',
      activitySlots: [
        {
          activityTypeId: 'at-001',
          capacity: 5,
          description: 'First slot description',
        },
        {
          activityTypeId: 'at-002',
          capacity: 3,
          description: 'Second slot description',
        },
      ],
    };
    
    render(
      <EventForm
        activityTypes={mockActivityTypes}
        onSubmit={mockOnSubmit}
        initialData={initialData}
      />
    );

    // Verify both descriptions are present
    const descriptionFields = screen.getAllByPlaceholderText(/add specific instructions/i);
    expect(descriptionFields).toHaveLength(2);
    expect(descriptionFields[0]).toHaveValue('First slot description');
    expect(descriptionFields[1]).toHaveValue('Second slot description');
  });

  it('should show character counter for each activity slot', async () => {
    const initialData = {
      title: 'Multi-Slot Event',
      eventDate: '2026-07-01',
      activitySlots: [
        {
          activityTypeId: 'at-001',
          capacity: 5,
          description: '',
        },
        {
          activityTypeId: 'at-002',
          capacity: 3,
          description: '',
        },
      ],
    };
    
    render(
      <EventForm
        activityTypes={mockActivityTypes}
        onSubmit={mockOnSubmit}
        initialData={initialData}
      />
    );

    // Verify both character counters are present
    const characterCounters = screen.getAllByText('0 / 500 characters');
    expect(characterCounters).toHaveLength(2);
  });
});
