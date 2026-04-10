import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Header } from './header';
import configService from '@/services/config.service';
import { pointsService } from '@/services/points.service';

// Mock dependencies
vi.mock('@/lib/auth-context', () => ({
  useAuth: vi.fn(() => ({
    user: null,
    isLoading: false,
    logout: vi.fn(),
  })),
}));

vi.mock('@/services/config.service', () => ({
  default: {
    getPackConfig: vi.fn(),
  },
}));

vi.mock('@/services/points.service', () => ({
  pointsService: {
    getMyPoints: vi.fn(),
  },
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('Header', () => {
  const mockGetPackConfig = vi.mocked(configService.getPackConfig);
  const mockGetMyPoints = vi.mocked(pointsService.getMyPoints);

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPackConfig.mockResolvedValue({
      packName: 'Pack 123',
      packNumber: '123',
      scoutingYearStartDate: '2024-09-01',
      scoutingYearEndDate: '2025-08-31',
      activeRanks: ['LION', 'TIGER', 'WOLF'],
    });
    mockGetMyPoints.mockResolvedValue({
      balance: {
        totalPoints: 0,
        badgeTier: null,
      },
      history: [],
      pagination: {
        totalPages: 1,
        currentPage: 1,
        totalPoints: 0,
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches and displays pack configuration on mount', async () => {
    render(<Header />);

    await waitFor(() => {
      expect(mockGetPackConfig).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText('🦁 Pack 123')).toBeInTheDocument();
  });

  it('updates pack configuration when packConfigUpdated event is dispatched', async () => {
    render(<Header />);

    // Wait for initial load
    await waitFor(() => {
      expect(mockGetPackConfig).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText('🦁 Pack 123')).toBeInTheDocument();

    // Update the mock to return new config
    mockGetPackConfig.mockResolvedValue({
      packName: 'Pack 456 - Updated',
      packNumber: '456',
      scoutingYearStartDate: '2024-09-01',
      scoutingYearEndDate: '2025-08-31',
      activeRanks: ['LION', 'TIGER', 'WOLF'],
    });

    // Dispatch the custom event
    window.dispatchEvent(new CustomEvent('packConfigUpdated'));

    // Verify the config is refetched
    await waitFor(() => {
      expect(mockGetPackConfig).toHaveBeenCalledTimes(2);
    });

    // Verify the new pack name is displayed
    await waitFor(() => {
      expect(screen.getByText('🦁 Pack 456 - Updated')).toBeInTheDocument();
    });
    
    expect(screen.queryByText('🦁 Pack 123')).not.toBeInTheDocument();
  });

  it('uses default pack config if fetch fails', async () => {
    mockGetPackConfig.mockRejectedValue(new Error('Network error'));

    render(<Header />);

    await waitFor(() => {
      expect(mockGetPackConfig).toHaveBeenCalledTimes(1);
    });

    // Should show default values on error
    expect(screen.getByText('🦁 Pack 123')).toBeInTheDocument();
  });

  it('cleans up event listener on unmount', async () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = render(<Header />);

    await waitFor(() => {
      expect(mockGetPackConfig).toHaveBeenCalled();
    });

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('packConfigUpdated', expect.any(Function));
  });
});
