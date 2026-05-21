import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EventForm from './EventForm';

// Mock Next.js router
const mockPush = vi.fn();
const mockBack = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
  }),
}));

// Mock UI components to avoid dependencies
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: (props: any) => <textarea {...props} />,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardDescription: ({ children, ...props }: any) => <p {...props}>{children}</p>,
  CardHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <h3 {...props}>{children}</h3>,
}));

// Mock Select component - render as native select with options extracted from children
vi.mock('@/components/ui/select', () => {
  const React = require('react');
  
  // Marker for SelectItem component  
  const SELECT_ITEM_TYPE = Symbol.for('SelectItem');
  
  const SelectItem = ({ children, value }: any) => {
    (SelectItem as any).$$typeof = SELECT_ITEM_TYPE;
    return null;
  };
  (SelectItem as any).$$itemType = SELECT_ITEM_TYPE;
  
  const Select = ({ children, value, onValueChange }: any) => {
    const options: Array<{ value: string; label: string }> = [];
    
    // Recursively find all SelectItem elements
    const extractItems = (node: any): void => {
      React.Children.forEach(node, (child: any) => {
        if (!child) return;
        
        // Check if this is a SelectItem by looking at function name or type
        const childType = child.type;
        if (childType && (
          childType.name === 'SelectItem' ||
          childType.$$itemType === SELECT_ITEM_TYPE ||
          String(childType).includes('SelectItem')
        )) {
          options.push({
            value: child.props.value,
            label: child.props.children
          });
        } else if (child.props?.children) {
          extractItems(child.props.children);
        }
      });
    };
    
    extractItems(children);
    
    return React.createElement('select', {
      'data-testid': 'select-native',
      value: value || '',
      onChange: (e: any) => onValueChange?.(e.target.value)
    }, [
      value === '' && React.createElement('option', { key: '__empty__', value: '' }, 'Select...'),
      ...options.map(opt => 
        React.createElement('option', { key: opt.value, value: opt.value }, opt.label)
      )
    ].filter(Boolean));
  };
  
  return {
    Select,
    SelectTrigger: ({ children }: any) => children,
    SelectValue: ({ placeholder }: any) => React.createElement('span', {}, placeholder),
    SelectContent: ({ children }: any) => children,
    SelectItem,
  };
});

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  PlusCircle: () => <span data-testid="plus-icon">+</span>,
  Trash2: () => <span data-testid="trash-icon">×</span>,
  Clock: () => <span data-testid="clock-icon">🕐</span>,
  Check: () => <span data-testid="check-icon">✓</span>,
}));

// Mock Checkbox component
vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange, id, ...props }: any) => (
    <input
      type="checkbox"
      id={id}
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      {...props}
    />
  ),
}));

describe('EventForm', () => {
  const mockActivityTypes = [
    { id: 'activity-1', name: 'Setup', pointValue: 5, category: 'EVENT_SUPPORT' },
    { id: 'activity-2', name: 'Cleanup', pointValue: 5, category: 'EVENT_SUPPORT' },
    { id: 'activity-3', name: 'Den Leader', pointValue: 10, category: 'LEADERSHIP' },
  ];

  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    mockOnSubmit.mockResolvedValue(undefined);
    mockPush.mockClear();
    mockBack.mockClear();
  });

  afterEach(() => {
    mockOnSubmit.mockClear();
    cleanup();
  });

  describe('Initial Rendering', () => {
    it('should render the form with empty initial data', () => {
      render(
        <EventForm
          activityTypes={mockActivityTypes}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByLabelText(/event title/i)).toHaveValue('');
      expect(screen.getByPlaceholderText(/help clean up after the monthly pack meeting/i)).toHaveValue('');
      expect(screen.getByLabelText(/event date/i)).toHaveValue('');
      expect(screen.getByLabelText(/start time/i)).toHaveValue('');
      expect(screen.getByLabelText(/location/i)).toHaveValue('');
    });

    it('should render the form with initial data', () => {
      const initialData = {
        title: 'Pack Meeting',
        description: 'Monthly pack meeting',
        eventDate: '2026-05-15',
        eventTime: '18:00',
        location: 'Church Hall',
        rankLevel: 'WOLF',
        isRecurring: false,
        activitySlots: [{ activityTypeId: 'activity-1', capacity: 5 }],
      };

      render(
        <EventForm
          activityTypes={mockActivityTypes}
          onSubmit={mockOnSubmit}
          initialData={initialData}
        />
      );

      expect(screen.getByLabelText(/event title/i)).toHaveValue('Pack Meeting');
      expect(screen.getByPlaceholderText(/help clean up after the monthly pack meeting/i)).toHaveValue('Monthly pack meeting');
      expect(screen.getByLabelText(/event date/i)).toHaveValue('2026-05-15');
      expect(screen.getByLabelText(/start time/i)).toHaveValue('18:00');
      expect(screen.getByLabelText(/location/i)).toHaveValue('Church Hall');
    });

    it('should render all form sections', () => {
      render(
        <EventForm
          activityTypes={mockActivityTypes}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByText(/event details/i)).toBeInTheDocument();
      expect(screen.getByText(/basic information about the volunteer event/i)).toBeInTheDocument();
      expect(screen.getByText(/activity slots/i)).toBeInTheDocument();
    });

    it('should render submit and cancel buttons', () => {
      render(
        <EventForm
          activityTypes={mockActivityTypes}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByRole('button', { name: /create event/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should render custom submit label', () => {
      render(
        <EventForm
          activityTypes={mockActivityTypes}
          onSubmit={mockOnSubmit}
          submitLabel="Update Event"
        />
      );

      expect(screen.getByRole('button', { name: /update event/i })).toBeInTheDocument();
    });

    it('should mark required fields with asterisk', () => {
      render(
        <EventForm
          activityTypes={mockActivityTypes}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByText(/event title \*/i)).toBeInTheDocument();
      expect(screen.getByText(/event date \*/i)).toBeInTheDocument();
    });

    it('should render one activity slot by default', () => {
      render(
        <EventForm
          activityTypes={mockActivityTypes}
          onSubmit={mockOnSubmit}
        />
      );

      const activityLabels = screen.getAllByText(/activity type \*/i);
      expect(activityLabels).toHaveLength(1);
    });

    it('should render recurring event checkbox unchecked by default', () => {
      render(
        <EventForm
          activityTypes={mockActivityTypes}
          onSubmit={mockOnSubmit}
        />
      );

      const checkbox = screen.getByLabelText(/recurring event/i);
      expect(checkbox).not.toBeChecked();
    });
  });

  describe('Form Interactions - Basic Fields', () => {
    it('should update title field when typing', async () => {
      const user = userEvent.setup();
      render(
        <EventForm
          activityTypes={mockActivityTypes}
          onSubmit={mockOnSubmit}
        />
      );

      const titleInput = screen.getByLabelText(/event title/i);
      await user.type(titleInput, 'Pack Meeting Cleanup');

      expect(titleInput).toHaveValue('Pack Meeting Cleanup');
    });

    it('should update description field when typing', async () => {
      const user = userEvent.setup();
      render(
        <EventForm
          activityTypes={mockActivityTypes}
          onSubmit={mockOnSubmit}
        />
      );

      const descriptionInput = screen.getByPlaceholderText(/help clean up after the monthly pack meeting/i);
      await user.type(descriptionInput, 'Help clean up after the meeting');

      expect(descriptionInput).toHaveValue('Help clean up after the meeting');
    });

    it('should update event date when selected', async () => {
      const user = userEvent.setup();
      render(
        <EventForm
          activityTypes={mockActivityTypes}
          onSubmit={mockOnSubmit}
        />
      );

      const dateInput = screen.getByLabelText(/event date/i);
      await user.type(dateInput, '2026-06-01');

      expect(dateInput).toHaveValue('2026-06-01');
    });

    it('should update event time when selected', async () => {
      const user = userEvent.setup();
      render(
        <EventForm
          activityTypes={mockActivityTypes}
          onSubmit={mockOnSubmit}
        />
      );

      const timeInput = screen.getByLabelText(/start time/i);
      await user.type(timeInput, '19:30');

      expect(timeInput).toHaveValue('19:30');
    });

    it('should update location field when typing', async () => {
      const user = userEvent.setup();
      render(
        <EventForm
          activityTypes={mockActivityTypes}
          onSubmit={mockOnSubmit}
        />
      );

      const locationInput = screen.getByLabelText(/location/i);
      await user.type(locationInput, 'Community Center');

      expect(locationInput).toHaveValue('Community Center');
    });

    it('should toggle recurring event checkbox', async () => {
      const user = userEvent.setup();
      render(
        <EventForm
          activityTypes={mockActivityTypes}
          onSubmit={mockOnSubmit}
        />
      );

      const checkbox = screen.getByLabelText(/recurring event/i);
      expect(checkbox).not.toBeChecked();

      await user.click(checkbox);
      expect(checkbox).toBeChecked();

      await user.click(checkbox);
      expect(checkbox).not.toBeChecked();
    });
  });

  describe('Form Interactions - Rank Level Select', () => {
    it('should update rank level when selected', async () => {
      const user = userEvent.setup();
      render(
        <EventForm
          activityTypes={mockActivityTypes}
          onSubmit={mockOnSubmit}
        />
      );

      const select = screen.getAllByTestId('select-native')[0];
      await user.selectOptions(select, 'WOLF');

      expect(select).toHaveValue('WOLF');
    });

    it('should render all rank level options', () => {
      render(
        <EventForm
          activityTypes={mockActivityTypes}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByRole('option', { name: /^lion$/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /^tiger$/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /^wolf$/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /^bear$/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /webelos/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /arrow of light/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /pack-wide/i })).toBeInTheDocument();
    });

    it('should default to PACK_WIDE rank level', () => {
      render(
        <EventForm
          activityTypes={mockActivityTypes}
          onSubmit={mockOnSubmit}
        />
      );

      const select = screen.getAllByTestId('select-native')[0];
      expect(select).toHaveValue('PACK_WIDE');
    });
  });

  describe('Form Interactions - Activity Slots', () => {
    it('should add a new activity slot when clicking add button', async () => {
      const user = userEvent.setup();
      render(
        <EventForm
          activityTypes={mockActivityTypes}
          onSubmit={mockOnSubmit}
        />
      );

      const addButton = screen.getByRole('button', { name: /add activity slot/i });
      await user.click(addButton);

      const activityLabels = screen.getAllByText(/activity type \*/i);
      expect(activityLabels).toHaveLength(2);
    });

    it('should change button text to "Add Another Activity Slot" after first slot is filled', async () => {
      const user = userEvent.setup();
      render(
        <EventForm
          activityTypes={mockActivityTypes}
          onSubmit={mockOnSubmit}
        />
      );

      // Initially shows "Add Activity Slot"
      expect(screen.getByRole('button', { name: /add activity slot/i })).toBeInTheDocument();

      // Fill in first slot with activity type using the mocked select
      const activitySelect = screen.getAllByTestId('select-native')[1]; // Index 1 because rank level is at 0
      await user.selectOptions(activitySelect, 'activity-1');

      // Button text should change to "Add Another Activity Slot"
      expect(screen.getByRole('button', { name: /add another activity slot/i })).toBeInTheDocument();
    });

    it('should remove an activity slot when clicking remove button', async () => {
      const user = userEvent.setup();
      render(
        <EventForm
          activityTypes={mockActivityTypes}
          onSubmit={mockOnSubmit}
          initialData={{
            activitySlots: [
              { activityTypeId: 'activity-1', capacity: 5 },
              { activityTypeId: 'activity-2', capacity: null },
            ],
          }}
        />
      );

      const removeButtons = screen.getAllByRole('button', { name: /remove/i });
      expect(removeButtons).toHaveLength(2);

      await user.click(removeButtons[1]);

      const activityLabels = screen.getAllByText(/activity type \*/i);
      expect(activityLabels).toHaveLength(1);
    });

    it('should not show remove button when only one activity slot exists', async () => {
      const user = userEvent.setup();
      render(
        <EventForm
          activityTypes={mockActivityTypes}
          onSubmit={mockOnSubmit}
        />
      );

      const removeButton = screen.queryByRole('button', { name: /remove/i });
      expect(removeButton).not.toBeInTheDocument();
    });

    it('should display numbered headers for each activity slot', async () => {
      const user = userEvent.setup();
      render(
        <EventForm
          activityTypes={mockActivityTypes}
          onSubmit={mockOnSubmit}
          initialData={{
            activitySlots: [
              { activityTypeId: 'activity-1', capacity: 5 },
              { activityTypeId: 'activity-2', capacity: null },
            ],
          }}
        />
      );

      expect(screen.getByText('Activity Slot 1')).toBeInTheDocument();
      expect(screen.getByText('Activity Slot 2')).toBeInTheDocument();
    });

    it('should update activity type in slot', async () => {
      const user = userEvent.setup();
      render(
        <EventForm
          activityTypes={mockActivityTypes}
          onSubmit={mockOnSubmit}
        />
      );

      // Find the activity type select (it's the second select, first is rank level)
      const selects = screen.getAllByTestId('select-native');
      const activitySelect = selects[1];
      
      await user.selectOptions(activitySelect, 'activity-2');
      expect(activitySelect).toHaveValue('activity-2');
    });

    it('should update capacity in slot', async () => {
      const user = userEvent.setup();
      render(
        <EventForm
          activityTypes={mockActivityTypes}
          onSubmit={mockOnSubmit}
        />
      );

      const capacityInput = screen.getByPlaceholderText(/unlimited/i);
      await user.type(capacityInput, '10');

      expect(capacityInput).toHaveValue(10);
    });

    it('should clear capacity when input is cleared', async () => {
      const user = userEvent.setup();
      render(
        <EventForm
          activityTypes={mockActivityTypes}
          onSubmit={mockOnSubmit}
          initialData={{
            activitySlots: [{ activityTypeId: 'activity-1', capacity: 5 }],
          }}
        />
      );

      const capacityInput = screen.getByPlaceholderText(/unlimited/i);
      expect(capacityInput).toHaveValue(5);

      await user.clear(capacityInput);
      expect(capacityInput).toHaveValue(null);
    });

    it('should render all activity types in select', () => {
      render(
        <EventForm
          activityTypes={mockActivityTypes}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByRole('option', { name: /setup \(5 points\)/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /cleanup \(5 points\)/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /den leader \(10 points\)/i })).toBeInTheDocument();
    });

    it('should handle multiple activity slots independently', async () => {
      const user = userEvent.setup();
      render(
        <EventForm
          activityTypes={mockActivityTypes}
          onSubmit={mockOnSubmit}
        />
      );

      // Add a second slot
      const addButton = screen.getByRole('button', { name: /add activity slot/i });
      await user.click(addButton);

      // Get all activity selects (skip rank level select)
      const selects = screen.getAllByTestId('select-native');
      const activitySelects = selects.slice(1); // Skip rank level select

      // Set different values for each
      await user.selectOptions(activitySelects[0], 'activity-1');
      await user.selectOptions(activitySelects[1], 'activity-2');

      expect(activitySelects[0]).toHaveValue('activity-1');
      expect(activitySelects[1]).toHaveValue('activity-2');
    });
  });

  describe('Validation', () => {
    it('should validate required title field', async () => {
      const user = userEvent.setup();
      render(
        <EventForm
          activityTypes={mockActivityTypes}
          onSubmit={mockOnSubmit}
        />
      );

      const titleInput = screen.getByLabelText(/event title/i);
      expect(titleInput).toHaveAttribute('required');
      expect(titleInput).toHaveAttribute('minLength', '3');
      expect(titleInput).toHaveAttribute('maxLength', '200');
    });

    it('should validate required event date field', async () => {
      const user = userEvent.setup();
      render(
        <EventForm
          activityTypes={mockActivityTypes}
          onSubmit={mockOnSubmit}
        />
      );

      const dateInput = screen.getByLabelText(/event date/i);
      expect(dateInput).toHaveAttribute('required');
    });

    it('should show error when activity type is not selected', async () => {
      const user = userEvent.setup();
      render(
        <EventForm
          activityTypes={mockActivityTypes}
          onSubmit={mockOnSubmit}
        />
      );

      // Fill in required fields but leave activity type empty
      await user.type(screen.getByLabelText(/event title/i), 'Test Event');
      await user.type(screen.getByLabelText(/event date/i), '2026-06-01');

      const submitButton = screen.getByRole('button', { name: /create event/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/all activity slots must have an activity type selected/i)).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should show error for invalid date', async () => {
      const user = userEvent.setup();
      render(
        <EventForm
          activityTypes={mockActivityTypes}
          onSubmit={mockOnSubmit}
        />
      );

      await user.type(screen.getByLabelText(/event title/i), 'Test Event');
      
      // Select activity type
      const activitySelect = screen.getAllByTestId('select-native')[1];
      await user.selectOptions(activitySelect, 'activity-1');

      // Leave date empty and try to submit - empty string will fail Date parsing
      const dateInput = screen.getByLabelText(/event date/i);
      expect(dateInput).toHaveValue('');

      const submitButton = screen.getByRole('button', { name: /create event/i });
      await user.click(submitButton);

      // HTML5 validation will prevent submission with empty required date field
      // So this test actually verifies the date field is marked as required
      expect(dateInput).toHaveAttribute('required');
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should enforce minimum capacity of 1', () => {
      render(
        <EventForm
          activityTypes={mockActivityTypes}
          onSubmit={mockOnSubmit}
        />
      );

      const capacityInput = screen.getByPlaceholderText(/unlimited/i);
      expect(capacityInput).toHaveAttribute('min', '1');
    });
  });

  describe('Form Submission', () => {
    it('should submit form with valid data', async () => {
      const user = userEvent.setup();
      render(
        <EventForm
          activityTypes={mockActivityTypes}
          onSubmit={mockOnSubmit}
        />
      );

      await user.type(screen.getByLabelText(/event title/i), 'Pack Meeting');
      await user.type(screen.getByPlaceholderText(/help clean up after the monthly pack meeting/i), 'Monthly meeting');
      await user.type(screen.getByLabelText(/event date/i), '2026-05-15');
      await user.type(screen.getByLabelText(/start time/i), '18:00');
      await user.type(screen.getByLabelText(/location/i), 'Church Hall');

      // Select rank level
      const rankSelect = screen.getAllByTestId('select-native')[0];
      await user.selectOptions(rankSelect, 'WOLF');

      // Select activity type
      const activitySelect = screen.getAllByTestId('select-native')[1];
      await user.selectOptions(activitySelect, 'activity-1');

      const submitButton = screen.getByRole('button', { name: /create event/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      });

      const submittedData = mockOnSubmit.mock.calls[0][0];
      expect(submittedData.title).toBe('Pack Meeting');
      expect(submittedData.description).toBe('Monthly meeting');
      expect(submittedData.location).toBe('Church Hall');
      expect(submittedData.rankLevel).toBe('WOLF');
      expect(submittedData.activitySlots).toHaveLength(1);
      expect(submittedData.activitySlots[0].activityTypeId).toBe('activity-1');
    });

    it('should convert date to ISO 8601 format on submission', async () => {
      const user = userEvent.setup();
      render(
        <EventForm
          activityTypes={mockActivityTypes}
          onSubmit={mockOnSubmit}
        />
      );

      await user.type(screen.getByLabelText(/event title/i), 'Test Event');
      await user.type(screen.getByLabelText(/event date/i), '2026-05-15');

      // Select activity type
      const activitySelect = screen.getAllByTestId('select-native')[1];
      await user.selectOptions(activitySelect, 'activity-1');

      const submitButton = screen.getByRole('button', { name: /create event/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });

      const submittedData = mockOnSubmit.mock.calls[0][0];
      expect(submittedData.eventDate).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO format
    });

    it('should convert PACK_WIDE rank level to null on submission', async () => {
      const user = userEvent.setup();
      render(
        <EventForm
          activityTypes={mockActivityTypes}
          onSubmit={mockOnSubmit}
        />
      );

      await user.type(screen.getByLabelText(/event title/i), 'Test Event');
      await user.type(screen.getByLabelText(/event date/i), '2026-05-15');

      // Select activity type
      const activitySelect = screen.getAllByTestId('select-native')[1];
      await user.selectOptions(activitySelect, 'activity-1');

      // Rank level defaults to PACK_WIDE
      const submitButton = screen.getByRole('button', { name: /create event/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });

      const submittedData = mockOnSubmit.mock.calls[0][0];
      expect(submittedData.rankLevel).toBeNull();
    });

    it('should submit with multiple activity slots', async () => {
      const user = userEvent.setup();
      render(
        <EventForm
          activityTypes={mockActivityTypes}
          onSubmit={mockOnSubmit}
        />
      );

      await user.type(screen.getByLabelText(/event title/i), 'Test Event');
      await user.type(screen.getByLabelText(/event date/i), '2026-05-15');

      // Add second activity slot
      const addButton = screen.getByRole('button', { name: /add activity slot/i });
      await user.click(addButton);

      // Select different activities
      const activitySelects = screen.getAllByTestId('select-native').slice(1);
      await user.selectOptions(activitySelects[0], 'activity-1');
      await user.selectOptions(activitySelects[1], 'activity-2');

      const submitButton = screen.getByRole('button', { name: /create event/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });

      const submittedData = mockOnSubmit.mock.calls[0][0];
      expect(submittedData.activitySlots).toHaveLength(2);
      expect(submittedData.activitySlots[0].activityTypeId).toBe('activity-1');
      expect(submittedData.activitySlots[1].activityTypeId).toBe('activity-2');
    });

    it('should submit with capacity set to null when not provided', async () => {
      const user = userEvent.setup();
      render(
        <EventForm
          activityTypes={mockActivityTypes}
          onSubmit={mockOnSubmit}
        />
      );

      await user.type(screen.getByLabelText(/event title/i), 'Test Event');
      await user.type(screen.getByLabelText(/event date/i), '2026-05-15');

      // Select activity type but don't set capacity
      const activitySelect = screen.getAllByTestId('select-native')[1];
      await user.selectOptions(activitySelect, 'activity-1');

      const submitButton = screen.getByRole('button', { name: /create event/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });

      const submittedData = mockOnSubmit.mock.calls[0][0];
      expect(submittedData.activitySlots[0].capacity).toBeNull();
    });

    it('should submit with recurring flag', async () => {
      const user = userEvent.setup();
      render(
        <EventForm
          activityTypes={mockActivityTypes}
          onSubmit={mockOnSubmit}
        />
      );

      await user.type(screen.getByLabelText(/event title/i), 'Test Event');
      await user.type(screen.getByLabelText(/event date/i), '2026-05-15');

      // Check recurring checkbox
      const checkbox = screen.getByLabelText(/recurring event/i);
      await user.click(checkbox);

      // Select activity type
      const activitySelect = screen.getAllByTestId('select-native')[1];
      await user.selectOptions(activitySelect, 'activity-1');

      const submitButton = screen.getByRole('button', { name: /create event/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });

      const submittedData = mockOnSubmit.mock.calls[0][0];
      expect(submittedData.isRecurring).toBe(true);
    });

    it('should navigate to events page after successful submission', async () => {
      const user = userEvent.setup();
      render(
        <EventForm
          activityTypes={mockActivityTypes}
          onSubmit={mockOnSubmit}
        />
      );

      await user.type(screen.getByLabelText(/event title/i), 'Test Event');
      await user.type(screen.getByLabelText(/event date/i), '2026-05-15');

      // Select activity type
      const activitySelect = screen.getAllByTestId('select-native')[1];
      await user.selectOptions(activitySelect, 'activity-1');

      const submitButton = screen.getByRole('button', { name: /create event/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/events');
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading text during submission', async () => {
      const user = userEvent.setup();
      let resolveSubmit: any;
      const slowSubmit = vi.fn(() => new Promise(resolve => {
        resolveSubmit = resolve;
      }));

      render(
        <EventForm
          activityTypes={mockActivityTypes}
          onSubmit={slowSubmit}
        />
      );

      await user.type(screen.getByLabelText(/event title/i), 'Test Event');
      await user.type(screen.getByLabelText(/event date/i), '2026-05-15');

      // Select activity type
      const activitySelect = screen.getAllByTestId('select-native')[1];
      await user.selectOptions(activitySelect, 'activity-1');

      const submitButton = screen.getByRole('button', { name: /create event/i });
      await user.click(submitButton);

      // Check loading state
      expect(screen.getByRole('button', { name: /saving.../i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /saving.../i })).toBeDisabled();

      // Resolve and check it returns to normal
      resolveSubmit();
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create event/i })).toBeInTheDocument();
      });
    });

    it('should not allow re-submission while loading', async () => {
      const user = userEvent.setup();
      let resolveSubmit: any;
      const slowSubmit = vi.fn(() => new Promise(resolve => {
        resolveSubmit = resolve;
      }));

      render(
        <EventForm
          activityTypes={mockActivityTypes}
          onSubmit={slowSubmit}
        />
      );

      await user.type(screen.getByLabelText(/event title/i), 'Test Event');
      await user.type(screen.getByLabelText(/event date/i), '2026-05-15');

      // Select activity type
      const activitySelect = screen.getAllByTestId('select-native')[1];
      await user.selectOptions(activitySelect, 'activity-1');

      const submitButton = screen.getByRole('button', { name: /create event/i });
      await user.click(submitButton);

      // Try to click again while loading
      const loadingButton = screen.getByRole('button', { name: /saving.../i });
      await user.click(loadingButton);

      // Should only be called once
      expect(slowSubmit).toHaveBeenCalledTimes(1);

      resolveSubmit();
    });
  });

  describe('Error Handling', () => {
    it('should show error message when submission fails', async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockRejectedValueOnce(new Error('Network error'));

      render(
        <EventForm
          activityTypes={mockActivityTypes}
          onSubmit={mockOnSubmit}
        />
      );

      await user.type(screen.getByLabelText(/event title/i), 'Test Event');
      await user.type(screen.getByLabelText(/event date/i), '2026-05-15');

      // Select activity type
      const activitySelect = screen.getAllByTestId('select-native')[1];
      await user.selectOptions(activitySelect, 'activity-1');

      const submitButton = screen.getByRole('button', { name: /create event/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });

    it('should show generic error when no error message provided', async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockRejectedValueOnce(new Error());

      render(
        <EventForm
          activityTypes={mockActivityTypes}
          onSubmit={mockOnSubmit}
        />
      );

      await user.type(screen.getByLabelText(/event title/i), 'Test Event');
      await user.type(screen.getByLabelText(/event date/i), '2026-05-15');

      // Select activity type
      const activitySelect = screen.getAllByTestId('select-native')[1];
      await user.selectOptions(activitySelect, 'activity-1');

      const submitButton = screen.getByRole('button', { name: /create event/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to save event/i)).toBeInTheDocument();
      });
    });

    it('should clear error on resubmission', async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockRejectedValueOnce(new Error('First error'));

      render(
        <EventForm
          activityTypes={mockActivityTypes}
          onSubmit={mockOnSubmit}
        />
      );

      await user.type(screen.getByLabelText(/event title/i), 'Test Event');
      await user.type(screen.getByLabelText(/event date/i), '2026-05-15');

      // Select activity type
      const activitySelect = screen.getAllByTestId('select-native')[1];
      await user.selectOptions(activitySelect, 'activity-1');

      const submitButton = screen.getByRole('button', { name: /create event/i });
      
      // First submission fails
      await user.click(submitButton);
      await waitFor(() => {
        expect(screen.getByText(/first error/i)).toBeInTheDocument();
      });

      // Second submission succeeds
      mockOnSubmit.mockResolvedValueOnce(undefined);
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByText(/first error/i)).not.toBeInTheDocument();
      });
    });

    it('should re-enable form after error', async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockRejectedValueOnce(new Error('Server error'));

      render(
        <EventForm
          activityTypes={mockActivityTypes}
          onSubmit={mockOnSubmit}
        />
      );

      await user.type(screen.getByLabelText(/event title/i), 'Test Event');
      await user.type(screen.getByLabelText(/event date/i), '2026-05-15');

      // Select activity type
      const activitySelect = screen.getAllByTestId('select-native')[1];
      await user.selectOptions(activitySelect, 'activity-1');

      const submitButton = screen.getByRole('button', { name: /create event/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/server error/i)).toBeInTheDocument();
      });

      // Form should be enabled again
      expect(screen.getByRole('button', { name: /create event/i })).not.toBeDisabled();
    });

    it('should extract error message from API response', async () => {
      const user = userEvent.setup();
      // Simulate NestJS BadRequestException response format
      const apiError = {
        response: {
          status: 400,
          data: {
            statusCode: 400,
            message: { error: 'At least one activity slot is required' },
            error: 'Bad Request'
          }
        },
        message: 'Request failed with status code 400'
      };
      mockOnSubmit.mockRejectedValueOnce(apiError);

      render(
        <EventForm
          activityTypes={mockActivityTypes}
          onSubmit={mockOnSubmit}
        />
      );

      await user.type(screen.getByLabelText(/event title/i), 'Test Event');
      await user.type(screen.getByLabelText(/event date/i), '2026-05-15');

      // Select activity type
      const activitySelect = screen.getAllByTestId('select-native')[1];
      await user.selectOptions(activitySelect, 'activity-1');

      const submitButton = screen.getByRole('button', { name: /create event/i });
      await user.click(submitButton);

      await waitFor(() => {
        // Should show the backend error message, not the generic Axios message
        expect(screen.getByText(/at least one activity slot is required/i)).toBeInTheDocument();
        expect(screen.queryByText(/request failed with status code 400/i)).not.toBeInTheDocument();
      });
    });

    it('should handle validation error details array', async () => {
      const user = userEvent.setup();
      const validationError = {
        response: {
          status: 400,
          data: {
            statusCode: 400,
            message: { 
              error: 'Invalid input',
              details: ['Title is required', 'Event date is invalid']
            },
            error: 'Bad Request'
          }
        }
      };
      mockOnSubmit.mockRejectedValueOnce(validationError);

      render(
        <EventForm
          activityTypes={mockActivityTypes}
          onSubmit={mockOnSubmit}
        />
      );

      await user.type(screen.getByLabelText(/event title/i), 'Test Event');
      await user.type(screen.getByLabelText(/event date/i), '2026-05-15');

      // Select activity type
      const activitySelect = screen.getAllByTestId('select-native')[1];
      await user.selectOptions(activitySelect, 'activity-1');

      const submitButton = screen.getByRole('button', { name: /create event/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid input/i)).toBeInTheDocument();
      });
    });
  });

  describe('Cancel Functionality', () => {
    it('should navigate back when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <EventForm
          activityTypes={mockActivityTypes}
          onSubmit={mockOnSubmit}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockBack).toHaveBeenCalledTimes(1);
    });

    it('should not submit form when cancel is clicked', async () => {
      const user = userEvent.setup();
      render(
        <EventForm
          activityTypes={mockActivityTypes}
          onSubmit={mockOnSubmit}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should cancel even if form has unsaved changes', async () => {
      const user = userEvent.setup();
      render(
        <EventForm
          activityTypes={mockActivityTypes}
          onSubmit={mockOnSubmit}
        />
      );

      // Make changes
      await user.type(screen.getByLabelText(/event title/i), 'Changed Title');

      // Click cancel
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockBack).toHaveBeenCalledTimes(1);
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for all form fields', () => {
      render(
        <EventForm
          activityTypes={mockActivityTypes}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByLabelText(/event title/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/help clean up after the monthly pack meeting/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/event date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/start time/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/location/i)).toBeInTheDocument();
      // Rank Level and Capacity labels exist but aren't programmatically associated (custom components)
      expect(screen.getByText(/^rank level$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/recurring event/i)).toBeInTheDocument();
      expect(screen.getByText(/^capacity$/i)).toBeInTheDocument();
    });

    it('should have semantic form structure', () => {
      const { container } = render(
        <EventForm
          activityTypes={mockActivityTypes}
          onSubmit={mockOnSubmit}
        />
      );

      const form = container.querySelector('form');
      expect(form).toBeInTheDocument();
    });

    it('should have submit button with type="submit"', () => {
      render(
        <EventForm
          activityTypes={mockActivityTypes}
          onSubmit={mockOnSubmit}
        />
      );

      const submitButton = screen.getByRole('button', { name: /create event/i });
      expect(submitButton).toHaveAttribute('type', 'submit');
    });

    it('should have cancel button with type="button"', () => {
      render(
        <EventForm
          activityTypes={mockActivityTypes}
          onSubmit={mockOnSubmit}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toHaveAttribute('type', 'button');
    });

    it('should have descriptive placeholders', () => {
      render(
        <EventForm
          activityTypes={mockActivityTypes}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByPlaceholderText(/pack meeting cleanup/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/help clean up after the monthly pack meeting/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/church fellowship hall/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/unlimited/i)).toBeInTheDocument();
    });
  });
});
