import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ScopedRoleAssignmentForm from './ScopedRoleAssignmentForm';

const assignScopedMock = vi.fn();

vi.mock('@/services/roleService', () => ({
  roleService: {
    assignScoped: (...args: any[]) => assignScopedMock(...args),
  },
}));

describe('ScopedRoleAssignmentForm', () => {
  it('submits DEN scope payload', async () => {
    assignScopedMock.mockResolvedValueOnce({ id: 'assignment-1' });

    render(<ScopedRoleAssignmentForm />);

    fireEvent.change(screen.getByPlaceholderText('Volunteer ID'), { target: { value: 'vol-1' } });
    fireEvent.change(screen.getByPlaceholderText('Role ID'), { target: { value: 'role-1' } });
    fireEvent.change(screen.getByPlaceholderText('Den number'), { target: { value: '8' } });
    fireEvent.click(screen.getByRole('button', { name: 'Assign Role' }));

    await waitFor(() => {
      expect(assignScopedMock).toHaveBeenCalledWith({
        volunteerId: 'vol-1',
        roleId: 'role-1',
        scopeType: 'DEN',
        denNumber: 8,
      });
    });
  });
});
