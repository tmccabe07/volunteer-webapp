import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AttendanceForm from '@/components/den/AttendanceForm';
import { denService } from '@/services/den.service';
import { attendanceService } from '@/services/attendance.service';

vi.mock('@/services/den.service', () => ({
  denService: {
    getDenRoster: vi.fn(),
  },
}));

vi.mock('@/services/attendance.service', () => ({
  attendanceService: {
    recordAttendance: vi.fn(),
  },
}));

vi.mock('@/components/advancement/CoveredRequirementsSelector', () => ({
  default: ({ onChange }: { onChange: (ids: string[]) => void }) => (
    <div>
      <button type="button" onClick={() => onChange(['req-1', 'req-2'])}>
        Add Mock Requirements
      </button>
    </div>
  ),
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => <span />,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('Den Meeting Flow Integration', () => {
  const mockGetDenRoster = vi.mocked(denService.getDenRoster);
  const mockRecordAttendance = vi.mocked(attendanceService.recordAttendance);

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDenRoster.mockResolvedValue({
      den: {
        id: 'den-1',
        name: 'Wolf Den 1',
        denNumber: 1,
        rankLevel: 'WOLF',
      },
      members: [
        {
          id: 'child-1',
          firstName: 'Alex',
          lastName: 'Scout',
          memberSince: '2026-01-01T00:00:00.000Z',
          parents: [],
        },
      ],
    });
    mockRecordAttendance.mockResolvedValue({});
  });

  it('records den meeting attendance with covered requirements and notes', async () => {
    const user = userEvent.setup({ delay: null });

    render(<AttendanceForm eventId="event-1" denId="den-1" rankLevel="WOLF" />);

    await waitFor(() => {
      expect(screen.getByText('Alex Scout')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Select Requirements' }));
    await user.click(screen.getByRole('button', { name: 'Add Mock Requirements' }));

    const notesInput = screen.getByLabelText('Notes (Optional)');
    await user.type(notesInput, 'Participated fully and helped others.');

    await user.click(screen.getByRole('button', { name: 'Record Attendance' }));

    await waitFor(() => {
      expect(mockRecordAttendance).toHaveBeenCalledWith('event-1', {
        attendance: [
          {
            childScoutId: 'child-1',
            attendanceStatus: 'PRESENT',
            notes: 'Participated fully and helped others.',
            coveredRequirementIds: ['req-1', 'req-2'],
          },
        ],
      });
    });
  });
});
