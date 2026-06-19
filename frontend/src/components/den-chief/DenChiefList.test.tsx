import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import DenChiefList from './DenChiefList';

describe('DenChiefList', () => {
  it('renders den chief rows', () => {
    render(
      <DenChiefList
        denChiefs={[
          {
            id: 'chief-1',
            firstName: 'Alex',
            lastName: 'Chief',
            email: 'alex@example.com',
            scoutbookId: null,
            isActive: true,
            assignments: [],
          },
        ]}
      />,
    );

    expect(screen.getByText('Alex Chief')).toBeInTheDocument();
    expect(screen.getByText('alex@example.com')).toBeInTheDocument();
  });
});
