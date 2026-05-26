import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AttendanceForm from './AttendanceForm';
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
  default: () => <div data-testid="covered-requirements-selector" />,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => <span />,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('AttendanceForm', () => {
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
        {
          id: 'child-2',
          firstName: 'Jamie',
          lastName: 'Scout',
          memberSince: '2026-01-01T00:00:00.000Z',
          parents: [],
        },
      ],
    });
    mockRecordAttendance.mockResolvedValue({});
  });

  it('loads den roster and renders children', async () => {
    render(<AttendanceForm eventId="event-1" denId="den-1" rankLevel="WOLF" />);

    await waitFor(() => {
      expect(mockGetDenRoster).toHaveBeenCalledWith('den-1');
    });

    expect(screen.getByText('Alex Scout')).toBeInTheDocument();
    expect(screen.getByText('Jamie Scout')).toBeInTheDocument();
    expect(screen.getByText('Record Attendance (2 children)')).toBeInTheDocument();
  });

  it('submits default present attendance payload for all children', async () => {
    const user = userEvent.setup({ delay: null });
    const onSuccess = vi.fn();

    render(
      <AttendanceForm eventId="event-1" denId="den-1" rankLevel="WOLF" onSuccess={onSuccess} />,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Record Attendance' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Record Attendance' }));

    await waitFor(() => {
      expect(mockRecordAttendance).toHaveBeenCalledWith('event-1', {
        attendance: [
          {
            childScoutId: 'child-1',
            attendanceStatus: 'PRESENT',
          },
          {
            childScoutId: 'child-2',
            attendanceStatus: 'PRESENT',
          },
        ],
      });
    });

    expect(onSuccess).toHaveBeenCalled();
    expect(screen.getByText('Attendance recorded for 2 children')).toBeInTheDocument();
  });

  it('shows no-members state when roster is empty', async () => {
    mockGetDenRoster.mockResolvedValueOnce({
      den: {
        id: 'den-1',
        name: 'Wolf Den 1',
        denNumber: 1,
        rankLevel: 'WOLF',
      },
      members: [],
    });

    render(<AttendanceForm eventId="event-1" denId="den-1" rankLevel="WOLF" />);

    await waitFor(() => {
      expect(screen.getByText('No children found')).toBeInTheDocument();
    });
  });
});
