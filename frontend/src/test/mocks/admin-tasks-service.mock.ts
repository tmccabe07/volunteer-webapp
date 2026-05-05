/**
 * Mock implementation of adminTasksService for testing
 * Provides vi.fn() mocks for all admin tasks service methods
 */

import { vi } from 'vitest';
import type { TaskFixture } from '../fixtures/admin-tasks';

export interface ListTasksParams {
  assignedToMe?: boolean;
  status?: 'complete' | 'incomplete' | 'overdue';
  limit?: number;
  page?: number;
}

export interface ListTasksResponse {
  tasks: TaskFixture[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

/**
 * Mock adminTasksService with typed methods
 * Use in tests with vi.mocked() to set return values
 */
export const mockAdminTasksService = {
  listTasks: vi.fn<[ListTasksParams?], Promise<ListTasksResponse>>(),
  completeTask: vi.fn<[string], Promise<void>>(),
  uncompleteTask: vi.fn<[string], Promise<void>>(),
};

/**
 * Reset all mocks - call in afterEach()
 */
export const resetAdminTasksMocks = () => {
  mockAdminTasksService.listTasks.mockClear();
  mockAdminTasksService.completeTask.mockClear();
  mockAdminTasksService.uncompleteTask.mockClear();
};

/**
 * Setup default mock responses for common scenarios
 */
export const setupDefaultMocks = (tasks: TaskFixture[] = []) => {
  mockAdminTasksService.listTasks.mockResolvedValue({
    tasks,
    pagination: {
      page: 1,
      limit: 10,
      total: tasks.length,
    },
  });

  mockAdminTasksService.completeTask.mockResolvedValue(undefined);
  mockAdminTasksService.uncompleteTask.mockResolvedValue(undefined);
};
