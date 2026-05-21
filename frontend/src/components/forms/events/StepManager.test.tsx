import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StepManager from './StepManager';
import { ActivitySlotStep } from '@/services/events.service';

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}));

describe('StepManager', () => {
  let mockOnChange: ReturnType<typeof vi.fn>;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    mockOnChange = vi.fn();
    user = userEvent.setup({ delay: null });
  });

  // T142: Test component rendering and basic functionality
  it('should render empty state when no steps provided', () => {
    render(<StepManager steps={[]} onChange={mockOnChange} />);
    
    expect(screen.getByText(/No steps added/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Step/i })).toBeInTheDocument();
  });

  // T143: Test adding step appends to list
  it('should add a step when Add Step button clicked', async () => {
    render(<StepManager steps={[]} onChange={mockOnChange} />);
    
    const addButton = screen.getByRole('button', { name: /Add Step/i });
    await user.click(addButton);
    
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith([
        { orderIndex: 0, stepText: '' }
      ]);
    });
  });

  it('should append step to existing steps', async () => {
    const initialSteps: ActivitySlotStep[] = [
      { orderIndex: 0, stepText: 'First step' },
    ];
    
    render(<StepManager steps={initialSteps} onChange={mockOnChange} />);
    
    const addButton = screen.getByRole('button', { name: /Add Step/i });
    await user.click(addButton);
    
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith([
        { orderIndex: 0, stepText: 'First step' },
        { orderIndex: 1, stepText: '' }
      ]);
    });
  });

  // T144: Test removing step renumbers remaining steps
  it('should remove step and renumber remaining steps', async () => {
    const initialSteps: ActivitySlotStep[] = [
      { id: '1', orderIndex: 0, stepText: 'Step 1' },
      { id: '2', orderIndex: 1, stepText: 'Step 2' },
      { id: '3', orderIndex: 2, stepText: 'Step 3' },
    ];
    
    render(<StepManager steps={initialSteps} onChange={mockOnChange} />);
    
    // Remove the middle step (Step 2)
    const removeButtons = screen.getAllByRole('button', { name: '' }); // Trash icon buttons
    await user.click(removeButtons[1]); // Second remove button (index 1)
    
    await waitFor(() => {
      const call = mockOnChange.mock.calls[0][0];
      expect(call).toHaveLength(2);
      expect(call[0]).toEqual({ id: '1', orderIndex: 0, stepText: 'Step 1' });
      expect(call[1]).toEqual({ id: '3', orderIndex: 1, stepText: 'Step 3' }); // Renumbered from 2 to 1
    });
  });

  // T145: Test "Add Step" button disabled at 20 steps
  it('should disable Add Step button at 20 steps', () => {
    const maxSteps: ActivitySlotStep[] = Array.from({ length: 20 }, (_, i) => ({
      id: `step-${i}`,
      orderIndex: i,
      stepText: `Step ${i + 1}`,
    }));
    
    render(<StepManager steps={maxSteps} onChange={mockOnChange} />);
    
    const addButton = screen.getByRole('button', { name: /Add Step/i });
    expect(addButton).toBeDisabled();
    expect(screen.getByText(/Maximum of 20 steps reached/i)).toBeInTheDocument();
  });

  it('should allow adding step when below 20 limit', () => {
    const steps: ActivitySlotStep[] = Array.from({ length: 19 }, (_, i) => ({
      id: `step-${i}`,
      orderIndex: i,
      stepText: `Step ${i + 1}`,
    }));
    
    render(<StepManager steps={steps} onChange={mockOnChange} />);
    
    const addButton = screen.getByRole('button', { name: /Add Step/i });
    expect(addButton).not.toBeDisabled();
  });

  // T146: Test character counter per step
  it('should display character counter for each step', () => {
    const steps: ActivitySlotStep[] = [
      { id: '1', orderIndex: 0, stepText: 'Short text' },
      { id: '2', orderIndex: 1, stepText: 'A much longer text that has more characters' },
    ];
    
    render(<StepManager steps={steps} onChange={mockOnChange} />);
    
    expect(screen.getByText('10 / 200 characters')).toBeInTheDocument();
    // The second step may have slight variations, use regex matcher
    expect(screen.getByText(/4[36] \/ 200 characters/)).toBeInTheDocument();
  });

  it('should update character counter as user types', async () => {
    const steps: ActivitySlotStep[] = [
      { id: '1', orderIndex: 0, stepText: '' },
    ];
    
    render(<StepManager steps={steps} onChange={mockOnChange} />);
    
    const input = screen.getByPlaceholderText('Step 1 instructions');
    await user.type(input, 'Hello');
    
    await waitFor(() => {
      expect(screen.getByText('5 / 200 characters')).toBeInTheDocument();
    });
  });

  // T147: Test validation prevents empty step text
  it('should prevent text exceeding 200 characters', async () => {
    const steps: ActivitySlotStep[] = [
      { id: '1', orderIndex: 0, stepText: '' },
    ];
    
    render(<StepManager steps={steps} onChange={mockOnChange} />);
    
    const input = screen.getByPlaceholderText('Step 1 instructions');
    const longText = 'a'.repeat(201);
    
    await user.type(input, longText);
    
    // Should only accept 200 characters
    await waitFor(() => {
      const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0];
      expect(lastCall[0].stepText.length).toBeLessThanOrEqual(200);
    });
  });

  it('should display numbered circles for each step', () => {
    const steps: ActivitySlotStep[] = [
      { id: '1', orderIndex: 0, stepText: 'First' },
      { id: '2', orderIndex: 1, stepText: 'Second' },
      { id: '3', orderIndex: 2, stepText: 'Third' },
    ];
    
    render(<StepManager steps={steps} onChange={mockOnChange} />);
    
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should show step count in header', () => {
    const steps: ActivitySlotStep[] = [
      { id: '1', orderIndex: 0, stepText: 'First' },
      { id: '2', orderIndex: 1, stepText: 'Second' },
    ];
    
    render(<StepManager steps={steps} onChange={mockOnChange} />);
    
    expect(screen.getByText(/Activity Steps \(2\/20\)/i)).toBeInTheDocument();
  });
});
