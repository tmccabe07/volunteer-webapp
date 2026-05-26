import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DenRoster from './DenRoster';

describe('DenRoster', () => {
  const roster = {
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
        memberSince: '2026-01-15T00:00:00.000Z',
        parents: [
          {
            name: 'Parent One',
            email: 'parent1@test.com',
            relationshipType: 'mother',
          },
        ],
      },
    ],
  };

  it('renders den summary and member details', () => {
    render(<DenRoster roster={roster} />);

    expect(screen.getByText('Wolf Den 1')).toBeInTheDocument();
    expect(screen.getByText('Wolf')).toBeInTheDocument();
    expect(screen.getByText('Den 1 • 1 scout')).toBeInTheDocument();
    expect(screen.getByText('Alex Scout')).toBeInTheDocument();
    expect(screen.getByText('Parent One')).toBeInTheDocument();
    expect(screen.getByText('parent1@test.com')).toBeInTheDocument();
  });

  it('calls remove callback when remove button is clicked', async () => {
    const user = userEvent.setup({ delay: null });
    const onRemoveMember = vi.fn();

    render(
      <DenRoster
        roster={roster}
        canRemoveMembers={true}
        onRemoveMember={onRemoveMember}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Remove' }));

    expect(onRemoveMember).toHaveBeenCalledWith('child-1', 'Alex Scout');
  });

  it('renders empty-state message when den has no members', () => {
    render(
      <DenRoster
        roster={{
          den: roster.den,
          members: [],
        }}
      />,
    );

    expect(screen.getByText('No members in this den')).toBeInTheDocument();
    expect(screen.getByText('Add members to get started')).toBeInTheDocument();
  });
});
