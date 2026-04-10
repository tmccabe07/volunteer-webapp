/**
 * Pack Configuration Service Tests
 * 
 * Tests for PackConfigService business logic
 */

import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PackConfigService } from './pack-config.service';
import {
  setupTests,
  teardownTests,
  createTestVolunteer,
  prisma,
} from '../test/test-utils';

describe('PackConfigService', () => {
  let service: PackConfigService;
  let testVolunteer: any;

  beforeAll(async () => {
    await setupTests();
  });

  afterAll(async () => {
    await teardownTests();
  });

  beforeEach(async () => {
    service = new PackConfigService();
    testVolunteer = await createTestVolunteer({ authTier: 'ADMIN' });
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.auditLog.deleteMany();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPackConfig', () => {
    it('should return pack configuration', async () => {
      const result = await service.getPackConfig();

      expect(result).toBeDefined();
      expect(result.packName).toBe('Test Pack');
      expect(result.packNumber).toBe('123');
      expect(result.activeRanks).toEqual(['LION', 'TIGER', 'WOLF', 'BEAR', 'WEBELOS', 'AOL']);
    });

    it('should throw NotFoundException when no config exists', async () => {
      // Delete the pack config
      await prisma.packConfig.deleteMany();

      await expect(service.getPackConfig()).rejects.toThrow(NotFoundException);

      // Restore the pack config for other tests
      await prisma.packConfig.create({
        data: {
          packName: 'Test Pack',
          packNumber: '123',
          yearStartDate: new Date('2025-09-01'),
          yearEndDate: new Date('2026-05-31'),
          activeRanks: ['LION', 'TIGER', 'WOLF', 'BEAR', 'WEBELOS', 'AOL'],
        },
      });
    });
  });

  describe('updatePackConfig', () => {
    const updateData = {
      packName: 'Updated Pack Name',
      yearEndDate: new Date('2026-08-31').toISOString(),
    };

    it('should update pack configuration', async () => {
      const result = await service.updatePackConfig(updateData, testVolunteer.id);

      expect(result).toBeDefined();
      expect(result.packName).toBe('Updated Pack Name');
      expect(new Date(result.yearEndDate).toISOString()).toBe(new Date('2026-08-31').toISOString());
    });

    it('should throw NotFoundException when config does not exist', async () => {
      // Delete the pack config
      await prisma.packConfig.deleteMany();

      await expect(service.updatePackConfig(updateData, testVolunteer.id)).rejects.toThrow(
        NotFoundException
      );

      // Restore the pack config for other tests
      await prisma.packConfig.create({
        data: {
          packName: 'Test Pack',
          packNumber: '123',
          yearStartDate: new Date('2025-09-01'),
          yearEndDate: new Date('2026-05-31'),
          activeRanks: ['LION', 'TIGER', 'WOLF', 'BEAR', 'WEBELOS', 'AOL'],
        },
      });
    });

    it('should cascade yearEndDate changes to recurring events and tasks', async () => {
      // Create a recurring event
      const event = await prisma.event.create({
        data: {
          title: 'Test Recurring Event',
          eventDate: new Date('2025-10-01'),
          createdById: testVolunteer.id,
          isRecurring: true,
          recurringEndDate: new Date('2026-05-31'),
        },
      });

      // Create a recurring admin task
      const adminTask = await prisma.adminTask.create({
        data: {
          name: 'Test Recurring Task',
          dueDate: new Date('2025-10-01'),
          createdById: testVolunteer.id,
          isRecurring: true,
          recurringEndDate: new Date('2026-05-31'),
        },
      });

      const newYearEndDate = new Date('2026-08-31');
      await service.updatePackConfig(
        { yearEndDate: newYearEndDate.toISOString() },
        testVolunteer.id
      );

      // Verify the event was updated
      const updatedEvent = await prisma.event.findUnique({
        where: { id: event.id },
      });
      expect(updatedEvent?.recurringEndDate?.toISOString()).toBe(newYearEndDate.toISOString());

      // Verify the admin task was updated
      const updatedTask = await prisma.adminTask.findUnique({
        where: { id: adminTask.id },
      });
      expect(updatedTask?.recurringEndDate?.toISOString()).toBe(newYearEndDate.toISOString());

      // Clean up
      await prisma.event.deleteMany({ where: { id: event.id } });
      await prisma.adminTask.deleteMany({ where: { id: adminTask.id } });
    });

    it('should create audit log entry', async () => {
      const updateInput = {
        packName: 'Audit Test Pack',
      };

      await service.updatePackConfig(updateInput, testVolunteer.id);

      // Verify audit log was created
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          userId: testVolunteer.id,
          action: 'UPDATE_PACK_CONFIG',
          entityType: 'PackConfig',
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(auditLog).toBeDefined();
      expect(auditLog?.userId).toBe(testVolunteer.id);
      expect(auditLog?.action).toBe('UPDATE_PACK_CONFIG');
      expect(auditLog?.entityType).toBe('PackConfig');
      expect(auditLog?.changes).toEqual(updateInput);
    });
  });
});
