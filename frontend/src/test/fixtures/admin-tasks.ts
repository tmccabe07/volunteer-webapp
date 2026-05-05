/**
 * Test fixtures for admin tasks
 * Used in dashboard and task component tests
 */

export interface TaskFixture {
  id: string;
  name: string;
  description: string | null;
  dueDate: string;
  isOverdue: boolean;
  isPackWide: boolean;
  assignedRoles: Array<{ id: string; name: string }>;
  currentUserCompletion: { id: string; completedAt: string; isComplete: boolean } | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Create a date string for X days in the future
 */
export const futureDate = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
};

/**
 * Create a date string for X days in the past
 */
export const pastDate = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

/**
 * Base task fixture - upcoming task assigned to Den Leader
 */
export const mockTask1: TaskFixture = {
  id: 'task-1',
  name: 'Submit attendance report',
  description: 'Monthly attendance summary due',
  dueDate: futureDate(2),
  isOverdue: false,
  isPackWide: false,
  assignedRoles: [
    { id: 'role-1', name: 'Den Leader' }
  ],
  currentUserCompletion: null,
  createdAt: pastDate(5),
  updatedAt: pastDate(5),
};

/**
 * Upcoming pack-wide task due in 5 days
 */
export const mockTask2: TaskFixture = {
  id: 'task-2',
  name: 'Update roster',
  description: null,
  dueDate: futureDate(5),
  isOverdue: false,
  isPackWide: true,
  assignedRoles: [],
  currentUserCompletion: null,
  createdAt: pastDate(3),
  updatedAt: pastDate(3),
};

/**
 * Upcoming task due in 10 days
 */
export const mockTask3: TaskFixture = {
  id: 'task-3',
  name: 'Review safety plan',
  description: 'Annual safety protocol review',
  dueDate: futureDate(10),
  isOverdue: false,
  isPackWide: false,
  assignedRoles: [
    { id: 'role-2', name: 'Cubmaster' }
  ],
  currentUserCompletion: null,
  createdAt: pastDate(10),
  updatedAt: pastDate(10),
};

/**
 * Overdue task (should not appear in dashboard)
 */
export const mockOverdueTask: TaskFixture = {
  id: 'task-overdue',
  name: 'Overdue task',
  description: 'This task is overdue',
  dueDate: pastDate(1),
  isOverdue: true,
  isPackWide: false,
  assignedRoles: [
    { id: 'role-1', name: 'Den Leader' }
  ],
  currentUserCompletion: null,
  createdAt: pastDate(15),
  updatedAt: pastDate(15),
};

/**
 * Completed task
 */
export const mockCompletedTask: TaskFixture = {
  id: 'task-completed',
  name: 'Completed task',
  description: 'This task is already complete',
  dueDate: futureDate(3),
  isOverdue: false,
  isPackWide: true,
  assignedRoles: [],
  currentUserCompletion: {
    id: 'completion-1',
    completedAt: pastDate(1),
    isComplete: true,
  },
  createdAt: pastDate(7),
  updatedAt: pastDate(1),
};

/**
 * Array of 10 upcoming tasks for testing pagination/limiting
 */
export const mockManyTasks: TaskFixture[] = Array.from({ length: 10 }, (_, i) => ({
  id: `task-many-${i + 1}`,
  name: `Task ${i + 1}`,
  description: `Description for task ${i + 1}`,
  dueDate: futureDate(i + 1),
  isOverdue: false,
  isPackWide: i % 2 === 0,
  assignedRoles: i % 2 === 0 ? [] : [{ id: 'role-1', name: 'Den Leader' }],
  currentUserCompletion: null,
  createdAt: pastDate(30),
  updatedAt: pastDate(30),
}));

/**
 * Array of upcoming tasks (3) + overdue tasks (2) for filtering tests
 */
export const mockMixedTasks: TaskFixture[] = [
  mockTask1,
  mockTask2,
  mockTask3,
  mockOverdueTask,
  {
    id: 'task-overdue-2',
    name: 'Another overdue task',
    description: null,
    dueDate: pastDate(3),
    isOverdue: true,
    isPackWide: false,
    assignedRoles: [{ id: 'role-1', name: 'Den Leader' }],
    currentUserCompletion: null,
    createdAt: pastDate(20),
    updatedAt: pastDate(20),
  },
];

/**
 * Empty tasks array for testing empty state
 */
export const mockEmptyTasks: TaskFixture[] = [];
