import { ActivityTypeService } from './activity-type.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import {
  setupTests,
  teardownTests,
  createTestVolunteer,
  createTestActivityType,
  createTestEvent,
  prisma,
} from '../test/test-utils';

describe('ActivityTypeService', () => {
  let service: ActivityTypeService;
  let testAdmin: any;

  beforeAll(async () => {
    await setupTests();
  });

  afterAll(async () => {
    await teardownTests();
  });

  beforeEach(async () => {
    // ActivityTypeService doesn't use DI, just instantiate directly
    service = new ActivityTypeService();
    
    // Create test admin for audit logs
    testAdmin = await createTestVolunteer({ authTier: 'ADMIN' });
  });

  afterEach(async () => {
    // Clean up in order to respect foreign key constraints
    await prisma.signup.deleteMany();
    await prisma.activitySlot.deleteMany();
    await prisma.event.deleteMany();
    await prisma.pointEvent.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.badgeTierHistory.deleteMany();
    await prisma.volunteerPointBalance.deleteMany();
    await prisma.leaderboardCache.deleteMany();
    await prisma.childRank.deleteMany();
    await prisma.volunteerToRole.deleteMany();
    await prisma.volunteer.deleteMany();
    await prisma.activityType.deleteMany();
  });

  describe('getAllActivityTypes', () => {
    it('should return all active activity types', async () => {
      await createTestActivityType({ name: 'Activity 1' });
      await createTestActivityType({ name: 'Activity 2' });
      await createTestActivityType({ name: 'Activity 3' });

      const result = await service.getAllActivityTypes();

      expect(result.activityTypes.length).toBeGreaterThanOrEqual(3);
      expect(result.activityTypes.some(a => a.name === 'Activity 1')).toBe(true);
      expect(result.activityTypes.some(a => a.name === 'Activity 2')).toBe(true);
      expect(result.activityTypes.some(a => a.name === 'Activity 3')).toBe(true);
    });

    it('should not return soft-deleted activity types', async () => {
      const active = await createTestActivityType({ name: 'Active Activity' });
      const deleted = await createTestActivityType({ name: 'Deleted Activity' });

      // Soft delete one
      await prisma.activityType.update({
        where: { id: deleted.id },
        data: { deletedAt: new Date() },
      });

      const result = await service.getAllActivityTypes();

      expect(result.activityTypes.some(a => a.name === 'Active Activity')).toBe(true);
      expect(result.activityTypes.some(a => a.name === 'Deleted Activity')).toBe(false);
    });

    it('should include all required fields', async () => {
      await createTestActivityType({ 
        name: 'Test Activity',
        category: 'HIGH',
        pointValue: 10,
        description: 'Test description',
      });

      const result = await service.getAllActivityTypes();
      const activity = result.activityTypes.find(a => a.name === 'Test Activity');

      expect(activity).toHaveProperty('id');
      expect(activity).toHaveProperty('name');
      expect(activity).toHaveProperty('pointValue');
      expect(activity).toHaveProperty('category');
      expect(activity).toHaveProperty('description');
    });

    it('should order results by category', async () => {
      await createTestActivityType({ name: 'Medium Activity', category: 'MEDIUM' });
      await createTestActivityType({ name: 'High Activity', category: 'HIGH' });
      await createTestActivityType({ name: 'Low Activity', category: 'LOW' });

      const result = await service.getAllActivityTypes();

      // HIGH should come before LOW and MEDIUM (alphabetically)
      const highIndex = result.activityTypes.findIndex(a => a.category === 'HIGH');
      const lowIndex = result.activityTypes.findIndex(a => a.category === 'LOW');
      const mediumIndex = result.activityTypes.findIndex(a => a.category === 'MEDIUM');

      expect(highIndex).toBeLessThan(lowIndex);
      expect(lowIndex).toBeLessThan(mediumIndex);
    });
  });

  describe('createActivityType', () => {
    it('should create a new activity type', async () => {
      const data = {
        name: 'New Activity',
        pointValue: 15,
        category: 'HIGH' as const,
        description: 'A new activity',
      };

      const result = await service.createActivityType(data, testAdmin.id);

      expect(result.name).toBe('New Activity');
      expect(result.pointValue).toBe(15);
      expect(result.category).toBe('HIGH');
      expect(result.description).toBe('A new activity');
    });

    it('should create activity type with null description', async () => {
      const data = {
        name: 'Activity No Description',
        pointValue: 5,
        category: 'LOW' as const,
      };

      const result = await service.createActivityType(data, testAdmin.id);

      expect(result.name).toBe('Activity No Description');
      expect(result.description).toBeNull();
    });

    it('should throw error when activity type name already exists', async () => {
      const data = {
        name: 'Duplicate Activity',
        pointValue: 10,
        category: 'MEDIUM' as const,
      };

      await service.createActivityType(data, testAdmin.id);

      await expect(
        service.createActivityType(data, testAdmin.id)
      ).rejects.toThrow(ConflictException);
    });

    it('should create audit log entry', async () => {
      const data = {
        name: 'Logged Activity',
        pointValue: 5,
        category: 'LOW' as const,
      };

      await service.createActivityType(data, testAdmin.id);

      const auditLog = await prisma.auditLog.findFirst({
        where: {
          userId: testAdmin.id,
          action: 'CREATE_ACTIVITY_TYPE',
        },
      });

      expect(auditLog).toBeTruthy();
      expect(auditLog!.entityType).toBe('ActivityType');
    });
  });

  describe('updateActivityType', () => {
    it('should update activity type fields', async () => {
      const activity = await createTestActivityType({
        name: 'Original Name',
        pointValue: 10,
        category: 'MEDIUM',
      });

      const updated = await service.updateActivityType(
        activity.id,
        {
          name: 'Updated Name',
          pointValue: 15,
          category: 'HIGH',
          description: 'New description',
        },
        testAdmin.id
      );

      expect(updated.name).toBe('Updated Name');
      expect(updated.pointValue).toBe(15);
      expect(updated.category).toBe('HIGH');
      expect(updated.description).toBe('New description');
    });

    it('should update only specified fields', async () => {
      const activity = await createTestActivityType({
        name: 'Original Name',
        pointValue: 10,
        category: 'MEDIUM',
        description: 'Original description',
      });

      const updated = await service.updateActivityType(
        activity.id,
        { pointValue: 20 },
        testAdmin.id
      );

      expect(updated.name).toBe('Original Name');
      expect(updated.pointValue).toBe(20);
      expect(updated.category).toBe('MEDIUM');
      expect(updated.description).toBe('Original description');
    });

    it('should throw error when activity type not found', async () => {
      await expect(
        service.updateActivityType('non-existent-id', { name: 'New Name' }, testAdmin.id)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw error when activity type is soft-deleted', async () => {
      const activity = await createTestActivityType();

      await prisma.activityType.update({
        where: { id: activity.id },
        data: { deletedAt: new Date() },
      });

      await expect(
        service.updateActivityType(activity.id, { name: 'New Name' }, testAdmin.id)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw error when updated name conflicts with existing activity', async () => {
      const activity1 = await createTestActivityType({ name: 'Activity 1' });
      const activity2 = await createTestActivityType({ name: 'Activity 2' });

      await expect(
        service.updateActivityType(activity1.id, { name: 'Activity 2' }, testAdmin.id)
      ).rejects.toThrow(ConflictException);
    });

    it('should allow updating to same name', async () => {
      const activity = await createTestActivityType({ name: 'Unique Name' });

      const updated = await service.updateActivityType(
        activity.id,
        { name: 'Unique Name', pointValue: 20 },
        testAdmin.id
      );

      expect(updated.name).toBe('Unique Name');
      expect(updated.pointValue).toBe(20);
    });

    it('should create audit log entry', async () => {
      const activity = await createTestActivityType();

      await service.updateActivityType(
        activity.id,
        { pointValue: 25 },
        testAdmin.id
      );

      const auditLog = await prisma.auditLog.findFirst({
        where: {
          userId: testAdmin.id,
          action: 'UPDATE_ACTIVITY_TYPE',
          entityId: activity.id,
        },
      });

      expect(auditLog).toBeTruthy();
    });
  });

  describe('deleteActivityType', () => {
    it('should soft delete activity type', async () => {
      const activity = await createTestActivityType({ name: 'To Delete' });

      await service.deleteActivityType(activity.id, testAdmin.id);

      const deleted = await prisma.activityType.findUnique({
        where: { id: activity.id },
      });

      expect(deleted!.deletedAt).toBeTruthy();
    });

    it('should throw error when activity type not found', async () => {
      await expect(
        service.deleteActivityType('non-existent-id', testAdmin.id)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw error when activity type already deleted', async () => {
      const activity = await createTestActivityType();

      await prisma.activityType.update({
        where: { id: activity.id },
        data: { deletedAt: new Date() },
      });

      await expect(
        service.deleteActivityType(activity.id, testAdmin.id)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw error when activity type is used by future events', async () => {
      const activity = await createTestActivityType();
      
      // Create future event using this activity type
      const futureEvent = await createTestEvent(testAdmin.id, {
        eventDate: new Date('2026-12-31'),
      });

      // Update the activity slot to use our specific activity type
      const slot = await prisma.activitySlot.findFirst({
        where: { eventId: futureEvent.id },
      });

      await prisma.activitySlot.update({
        where: { id: slot!.id },
        data: { activityTypeId: activity.id },
      });

      await expect(
        service.deleteActivityType(activity.id, testAdmin.id)
      ).rejects.toThrow(ConflictException);
    });

    it('should allow deletion when only used by past events', async () => {
      const activity = await createTestActivityType();
      
      // Create past event using this activity type
      const pastEvent = await createTestEvent(testAdmin.id, {
        eventDate: new Date('2020-01-01'),
      });

      const slot = await prisma.activitySlot.findFirst({
        where: { eventId: pastEvent.id },
      });

      await prisma.activitySlot.update({
        where: { id: slot!.id },
        data: { activityTypeId: activity.id },
      });

      // Should not throw
      await service.deleteActivityType(activity.id, testAdmin.id);

      const deleted = await prisma.activityType.findUnique({
        where: { id: activity.id },
      });

      expect(deleted!.deletedAt).toBeTruthy();
    });

    it('should create audit log entry', async () => {
      const activity = await createTestActivityType();

      await service.deleteActivityType(activity.id, testAdmin.id);

      const auditLog = await prisma.auditLog.findFirst({
        where: {
          userId: testAdmin.id,
          action: 'DELETE_ACTIVITY_TYPE',
          entityId: activity.id,
        },
      });

      expect(auditLog).toBeTruthy();
    });

    it('should remove deleted activity type from getAllActivityTypes', async () => {
      const activity = await createTestActivityType({ name: 'Will Be Deleted' });

      await service.deleteActivityType(activity.id, testAdmin.id);

      const result = await service.getAllActivityTypes();

      expect(result.activityTypes.some(a => a.name === 'Will Be Deleted')).toBe(false);
    });
  });
});
