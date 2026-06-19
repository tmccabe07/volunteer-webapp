import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AdminRolesPage from '@/app/admin/roles/page';

const authState = {
  user: { id: 'admin-1', authTier: 'ADMIN' },
  isLoading: false,
};

const getVolunteerRolesMock = vi.fn();
const listAssignmentsMock = vi.fn();
const assignScopedMock = vi.fn();
const removeAssignmentMock = vi.fn();

vi.mock('@/lib/auth-context', () => ({
  useRequireTier: () => authState,
}));

vi.mock('@/services/config.service', () => ({
  default: {
    getVolunteerRoles: (...args: any[]) => getVolunteerRolesMock(...args),
    createVolunteerRole: vi.fn(),
    updateVolunteerRole: vi.fn(),
    deleteVolunteerRole: vi.fn(),
  },
}));

vi.mock('@/services/roleService', () => ({
  roleService: {
    listAssignments: (...args: any[]) => listAssignmentsMock(...args),
    assignScoped: (...args: any[]) => assignScopedMock(...args),
    removeAssignment: (...args: any[]) => removeAssignmentMock(...args),
  },
}));

describe('Scoped access flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getVolunteerRolesMock.mockResolvedValue({ roles: [] });
    listAssignmentsMock.mockResolvedValue([
      {
        id: 'assignment-1',
        volunteerId: 'vol-1',
        volunteerName: 'Alex Scout',
        roleId: 'role-1',
        roleName: 'Den Leader',
        scopeType: 'DEN',
        rankLevel: null,
        denId: 'den-1',
        denNumber: 8,
        assignedAt: new Date().toISOString(),
      },
    ]);
    assignScopedMock.mockResolvedValue({ id: 'assignment-2' });
    removeAssignmentMock.mockResolvedValue(undefined);
  });

  it('renders scoped assignment area and removes an assignment', async () => {
    render(<AdminRolesPage />);

    await waitFor(() => {
      expect(screen.getByText('Scoped Role Assignments')).toBeInTheDocument();
      expect(screen.getByText('Alex Scout - Den Leader')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

    await waitFor(() => {
      expect(removeAssignmentMock).toHaveBeenCalledWith('assignment-1');
    });
  });
});
