import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminConfigPage from './page';
import configService from '@/services/config.service';
import type { PackConfig } from '@/services/config.service';

// Mock dependencies
const mockUser = {
  id: 1,
  email: 'admin@example.com',
  firstName: 'Admin',
  lastName: 'User',
  tier: 'ADMIN' as const,
};

vi.mock('@/lib/auth-context', () => ({
  useRequireTier: vi.fn(() => ({
    user: mockUser,
    isLoading: false,
  })),
}));

vi.mock('@/services/config.service', () => ({
  default: {
    getPackConfig: vi.fn(),
    updatePackConfig: vi.fn(),
  },
}));

vi.mock('@/components/forms/config/PackConfigForm', () => ({
  PackConfigForm: ({ initialData, onSubmit }: any) => (
    <div data-testid="pack-config-form">
      <div>Pack: {initialData?.packName}</div>
      <button onClick={() => onSubmit({ packName: 'Updated Pack' })}>
        Submit
      </button>
    </div>
  ),
}));

describe('AdminConfigPage', () => {
  const mockGetPackConfig = vi.mocked(configService.getPackConfig);
  const mockUpdatePackConfig = vi.mocked(configService.updatePackConfig);

  const mockConfig: PackConfig = {
    packName: 'Pack 123',
    packNumber: '123',
    scoutingYearStartDate: '2024-09-01',
    scoutingYearEndDate: '2025-08-31',
    activeRanks: ['LION', 'TIGER', 'WOLF'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPackConfig.mockResolvedValue(mockConfig);
    mockUpdatePackConfig.mockResolvedValue({
      ...mockConfig,
      packName: 'Updated Pack',
    });
  });

  it('loads and displays pack configuration', async () => {
    render(<AdminConfigPage />);

    await waitFor(() => {
      expect(mockGetPackConfig).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText('Pack: Pack 123')).toBeInTheDocument();
  });

  it('dispatches packConfigUpdated event after successful update', async () => {
    const eventListener = vi.fn();
    window.addEventListener('packConfigUpdated', eventListener);

    render(<AdminConfigPage />);

    await waitFor(() => {
      expect(screen.getByTestId('pack-config-form')).toBeInTheDocument();
    });

    // Click the submit button
    const submitButton = screen.getByText('Submit');
    submitButton.click();

    await waitFor(() => {
      expect(mockUpdatePackConfig).toHaveBeenCalledWith({ packName: 'Updated Pack' });
    });

    // Verify event was dispatched
    await waitFor(() => {
      expect(eventListener).toHaveBeenCalledTimes(1);
    });

    window.removeEventListener('packConfigUpdated', eventListener);
  });

  it('shows success message after successful update', async () => {
    render(<AdminConfigPage />);

    await waitFor(() => {
      expect(screen.getByTestId('pack-config-form')).toBeInTheDocument();
    });

    // Click the submit button
    const submitButton = screen.getByText('Submit');
    submitButton.click();

    await waitFor(() => {
      expect(screen.getByText('Pack configuration updated successfully!')).toBeInTheDocument();
    });
  });

  it('renders nothing when loading fails and no config is available', async () => {
    mockGetPackConfig.mockRejectedValue(new Error('Network error'));

    const { container } = render(<AdminConfigPage />);

    await waitFor(() => {
      expect(mockGetPackConfig).toHaveBeenCalled();
    });

    // Component should render nothing when packConfig is null
    expect(container.firstChild).toBeEmptyDOMElement();
  });
});
