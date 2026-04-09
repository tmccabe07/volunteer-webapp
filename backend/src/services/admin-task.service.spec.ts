import { AdminTaskService } from './admin-task.service';
import {
  setupTests,
  teardownTests,
  createTestVolunteer,
  prisma,
} from '../test/test-utils';

describe('AdminTaskService', () => {
  let service: AdminTaskService;
  let testVolunteer: any;
  let testLeader: any;
  let testRole: any;

  beforeAll(async () => {
    await setupTests();
  });

  afterAll(async () => {
    await teardownTests();
  });

  beforeEach(async () => {
    service = new AdminTaskService();
    
    // Create test volunteers
    testVolunteer = await createTestVolunteer({ authTier: 'PARENT' });
    testLeader = await createTestVolunteer({ authTier: 'LEADER' });
    
    // Get or create a test role
    testRole = await prisma.volunteerRole.findFirst({
      where: { deletedAt: null },
    });

    if (!testRole) {
      testRole = await prisma.volunteerRole.create({
        data: {
          name: 'Test Role',
          roleType: 'PARENT_GUARDIAN',
          grantsTier: 'PARENT',
        },
      });
    }
  });

  afterEach(async () => {
    // Clean up in order to respect foreign key constraints
    await prisma.taskCompletion.deleteMany();
    await prisma.adminTaskToRole.deleteMany();
    await prisma.adminTask.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.childRank.deleteMany();
    await prisma.volunteerToRole.deleteMany();
    await prisma.volunteer.deleteMany();
  });

  describe('createTask', () => {
    it('should create a new administrative task with role assignments', async () => {
      const taskData = {
        name: 'Submit Medical Forms',
        description: 'Please submit updated medical forms',
        dueDate: new Date('2026-08-01').toISOString(),
        completionSteps: [
          { step: 'Download the form', url: 'https://example.com/form' },
          { step: 'Fill it out' },
        ],
        isPackWide: false,
        assignedRoleIds: [testRole.id],
        isRecurring: false,
      };

      const task = await service.createTask(taskData, testLeader.id);

      expect(task.name).toBe('Submit Medical Forms');
      expect(task.description).toBe('Please submit updated medical forms');
      expect(task.isPackWide).toBe(false);
      expect(task.isRecurring).toBe(false);
      expect(task.assignedRoles).toHaveLength(1);
      expect(task.assignedRoles[0].role.id).toBe(testRole.id);
      expect(task.createdBy.id).toBe(testLeader.id);
      
      // Check completion steps are serialized
      const steps = JSON.parse(task.completionSteps!);
      expect(steps).toHaveLength(2);
      expect(steps[0].step).toBe('Download the form');
      expect(steps[0].url).toBe('https://example.com/form');
    });

    it('should create a pack-wide task', async () => {
      const taskData = {
        name: 'Pack Safety Training',
        description: 'All volunteers must complete safety training',
        dueDate: new Date('2026-08-15').toISOString(),
        isPackWide: true,
        isRecurring: false,
      };

      const task = await service.createTask(taskData, testLeader.id);

      expect(task.name).toBe('Pack Safety Training');
      expect(task.isPackWide).toBe(true);
      expect(task.assignedRoles).toHaveLength(0);
    });

    it('should set recurringEndDate from PackConfig when isRecurring is true', async () => {
      const taskData = {
        name: 'Monthly Attendance Report',
        description: 'Submit monthly attendance',
        dueDate: new Date('2026-07-01').toISOString(),
        isPackWide: false,
        assignedRoleIds: [testRole.id],
        isRecurring: true,
      };

      const task = await service.createTask(taskData, testLeader.id);

      expect(task.isRecurring).toBe(true);
      expect(task.recurringEndDate).toBeTruthy();
      
      // Should match the pack config year end date
      const packConfig = await prisma.packConfig.findFirst();
      expect(task.recurringEndDate).toEqual(packConfig!.yearEndDate);
    });

    it('should throw error when assigned roles do not exist', async () => {
      const taskData = {
        name: 'Invalid Task',
        description: 'Task with invalid roles',
        dueDate: new Date('2026-08-01').toISOString(),
        isPackWide: false,
        assignedRoleIds: ['invalid-role-id'],
        isRecurring: false,
      };

      await expect(
        service.createTask(taskData, testLeader.id)
      ).rejects.toThrow('One or more assigned roles do not exist');
    });
  });

  describe('updateTask', () => {
    it('should update an existing task', async () => {
      // Create a task first
      const task = await service.createTask({
        name: 'Original Task',
        description: 'Original description',
        dueDate: new Date('2026-08-01').toISOString(),
        isPackWide: true,
        isRecurring: false,
      }, testLeader.id);

      // Update the task
      const updatedTask = await service.updateTask(
        task.id,
        {
          name: 'Updated Task',
          description: 'Updated description',
        },
        testLeader.id
      );

      expect(updatedTask.name).toBe('Updated Task');
      expect(updatedTask.description).toBe('Updated description');
    });

    it('should throw error when task does not exist', async () => {
      await expect(
        service.updateTask('invalid-task-id', { name: 'Test' }, testLeader.id)
      ).rejects.toThrow('Task not found');
    });
  });

  describe('listTasks', () => {
    beforeEach(async () => {
      // Assign test role to parent volunteer
      await prisma.volunteerToRole.create({
        data: {
          volunteerId: testVolunteer.id,
          roleId: testRole.id,
        },
      });
    });

    it('should list tasks assigned to user roles', async () => {
      // Create a task assigned to the test role
      await service.createTask({
        name: 'Role-Specific Task',
        description: 'Task for specific role',
        dueDate: new Date('2026-08-01').toISOString(),
        isPackWide: false,
        assignedRoleIds: [testRole.id],
        isRecurring: false,
      }, testLeader.id);

      const result = await service.listTasks(testVolunteer.id, 'PARENT', {
        page: 1,
        limit: 20,
        assignedToMe: true,
      });

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].name).toBe('Role-Specific Task');
    });

    it('should include pack-wide tasks', async () => {
      // Create a pack-wide task
      await service.createTask({
        name: 'Pack-Wide Task',
        description: 'Task for everyone',
        dueDate: new Date('2026-08-01').toISOString(),
        isPackWide: true,
        isRecurring: false,
      }, testLeader.id);

      const result = await service.listTasks(testVolunteer.id, 'PARENT', {
        page: 1,
        limit: 20,
        assignedToMe: true,
      });

      expect(result.tasks.length).toBeGreaterThan(0);
      const packWideTask = result.tasks.find(t => t.name === 'Pack-Wide Task');
      expect(packWideTask).toBeTruthy();
    });

    it('should filter by status (incomplete)', async () => {
      // Create a task
      const task = await service.createTask({
        name: 'Incomplete Task',
        description: 'Task not yet complete',
        dueDate: new Date('2026-08-01').toISOString(),
        isPackWide: true,
        isRecurring: false,
      }, testLeader.id);

      const result = await service.listTasks(testVolunteer.id, 'PARENT', {
        status: 'incomplete',
      });

      const incompleteTask = result.tasks.find(t => t.id === task.id);
      expect(incompleteTask).toBeTruthy();
      expect(incompleteTask!.currentUserCompletion).toBeNull();
    });
  });

  describe('completeTask', () => {
    beforeEach(async () => {
      // Assign test role to volunteer
      await prisma.volunteerToRole.create({
        data: {
          volunteerId: testVolunteer.id,
          roleId: testRole.id,
        },
      });
    });

    it('should mark task as complete for current user', async () => {
      const task = await service.createTask({
        name: 'Task to Complete',
        description: 'Test task',
        dueDate: new Date('2026-08-01').toISOString(),
        isPackWide: false,
        assignedRoleIds: [testRole.id],
        isRecurring: false,
      }, testLeader.id);

      const completion = await service.completeTask(task.id, testVolunteer.id);

      expect(completion.taskId).toBe(task.id);
      expect(completion.volunteerId).toBe(testVolunteer.id);
      expect(completion.isComplete).toBe(true);

      // Verify notification was created
      const notifications = await prisma.notification.findMany({
        where: {
          volunteerId: testVolunteer.id,
          type: 'TASK_COMPLETION',
        },
      });
      expect(notifications).toHaveLength(1);
    });

    it('should throw error when task not assigned to user roles', async () => {
      // Create a task assigned to a different role
      const otherRole = await prisma.volunteerRole.create({
        data: {
          name: 'Other Role',
          roleType: 'COMMITTEE',
          grantsTier: 'LEADER',
        },
      });

      const task = await service.createTask({
        name: 'Other Task',
        description: 'Task for other role',
        dueDate: new Date('2026-08-01').toISOString(),
        isPackWide: false,
        assignedRoleIds: [otherRole.id],
        isRecurring: false,
      }, testLeader.id);

      await expect(
        service.completeTask(task.id, testVolunteer.id)
      ).rejects.toThrow('Task not assigned to your roles');
    });

    it('should throw error when task already completed', async () => {
      const task = await service.createTask({
        name: 'Task to Complete Twice',
        description: 'Test task',
        dueDate: new Date('2026-08-01').toISOString(),
        isPackWide: true,
        isRecurring: false,
      }, testLeader.id);

      // Complete once
      await service.completeTask(task.id, testVolunteer.id);

      // Try to complete again
      await expect(
        service.completeTask(task.id, testVolunteer.id)
      ).rejects.toThrow('Task already marked complete');
    });
  });

  describe('deleteTask', () => {
    it('should soft delete a task', async () => {
      const task = await service.createTask({
        name: 'Task to Delete',
        description: 'Test task',
        dueDate: new Date('2026-08-01').toISOString(),
        isPackWide: true,
        isRecurring: false,
      }, testLeader.id);

      await service.deleteTask(task.id, testLeader.id);

      // Verify task is soft deleted
      const deletedTask = await prisma.adminTask.findUnique({
        where: { id: task.id },
      });

      expect(deletedTask).toBeTruthy();
      expect(deletedTask!.deletedAt).toBeTruthy();
    });

    it('should throw error when task does not exist', async () => {
      await expect(
        service.deleteTask('invalid-task-id', testLeader.id)
      ).rejects.toThrow('Task not found');
    });
  });

  describe('getTaskCompletions', () => {
    beforeEach(async () => {
      // Assign test role to volunteer
      await prisma.volunteerToRole.create({
        data: {
          volunteerId: testVolunteer.id,
          roleId: testRole.id,
        },
      });
    });

    it('should return completion statistics', async () => {
      const task = await service.createTask({
        name: 'Task with Completions',
        description: 'Test task',
        dueDate: new Date('2026-08-01').toISOString(),
        isPackWide: false,
        assignedRoleIds: [testRole.id],
        isRecurring: false,
      }, testLeader.id);

      // Complete the task
      await service.completeTask(task.id, testVolunteer.id);

      const completions = await service.getTaskCompletions(task.id);

      expect(completions.task.id).toBe(task.id);
      expect(completions.completions).toHaveLength(1);
      expect(completions.stats.totalCompleted).toBe(1);
      expect(completions.stats.totalAssigned).toBeGreaterThan(0);
      expect(completions.stats.completionRate).toBeGreaterThan(0);
    });
  });
});
