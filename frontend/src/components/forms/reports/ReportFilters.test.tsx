import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReportFilters } from './ReportFilters';

/**
 * ReportFilters Component Tests
 * Feature: 001-volunteer-management - User Story 9
 */

describe('ReportFilters', () => {
  const mockOnFilterChange = vi.fn();

  beforeEach(() => {
    mockOnFilterChange.mockClear();
  });

  it('should render all filter fields', () => {
    render(
      <ReportFilters 
        onFilterChange={mockOnFilterChange} 
        showRankFilter={true} 
        showStatusFilter={true} 
      />
    );

    expect(screen.getByLabelText('Start Date')).toBeInTheDocument();
    expect(screen.getByLabelText('End Date')).toBeInTheDocument();
    expect(screen.getByLabelText('Rank Level')).toBeInTheDocument();
    expect(screen.getByLabelText('Status')).toBeInTheDocument();
    expect(screen.getByLabelText('Report Format')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /apply filters/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });

  it('should not show rank filter when showRankFilter is false', () => {
    render(
      <ReportFilters 
        onFilterChange={mockOnFilterChange} 
        showRankFilter={false} 
        showStatusFilter={false} 
      />
    );

    expect(screen.queryByLabelText('Rank Level')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Status')).not.toBeInTheDocument();
  });

  it('should call onFilterChange when Apply Filters is clicked', async () => {
    render(<ReportFilters onFilterChange={mockOnFilterChange} />);

    const startDateInput = screen.getByLabelText('Start Date');
    fireEvent.change(startDateInput, { target: { value: '2026-01-01' } });

    const endDateInput = screen.getByLabelText('End Date');
    fireEvent.change(endDateInput, { target: { value: '2026-12-31' } });

    const applyButton = screen.getByRole('button', { name: /apply filters/i });
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(mockOnFilterChange).toHaveBeenCalledTimes(1);
      expect(mockOnFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: '2026-01-01',
          endDate: '2026-12-31',
          format: 'summary',
        })
      );
    });
  });

  it('should reset filters when Reset is clicked', async () => {
    render(<ReportFilters onFilterChange={mockOnFilterChange} />);

    // Set some filters
    const startDateInput = screen.getByLabelText('Start Date');
    fireEvent.change(startDateInput, { target: { value: '2026-01-01' } });

    // Click reset
    const resetButton = screen.getByRole('button', { name: /reset/i });
    fireEvent.click(resetButton);

    await waitFor(() => {
      expect(mockOnFilterChange).toHaveBeenCalledWith({
        format: 'summary',
      });
    });

    // Verify input is cleared
    expect(startDateInput).toHaveValue('');
  });

  it('should update format selection', async () => {
    render(<ReportFilters onFilterChange={mockOnFilterChange} />);

    // The format select default should be 'summary'
    const applyButton = screen.getByRole('button', { name: /apply filters/i });
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(mockOnFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          format: 'summary',
        })
      );
    });
  });

  it('should handle rank level filter when enabled', async () => {
    render(
      <ReportFilters 
        onFilterChange={mockOnFilterChange} 
        showRankFilter={true} 
      />
    );

    expect(screen.getByLabelText('Rank Level')).toBeInTheDocument();
  });

  it('should handle status filter when enabled', async () => {
    render(
      <ReportFilters 
        onFilterChange={mockOnFilterChange} 
        showStatusFilter={true} 
      />
    );

    expect(screen.getByLabelText('Status')).toBeInTheDocument();
  });

  it('should set max date to today for date inputs to prevent future dates', () => {
    render(<ReportFilters onFilterChange={mockOnFilterChange} />);

    const today = new Date().toISOString().split('T')[0];
    const startDateInput = screen.getByLabelText('Start Date') as HTMLInputElement;
    const endDateInput = screen.getByLabelText('End Date') as HTMLInputElement;

    expect(startDateInput.max).toBe(today);
    expect(endDateInput.max).toBe(today);
  });
});
