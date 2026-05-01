import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import { PrismaClient } from '@prisma/client';
import prisma from '../utils/prisma';

/**
 * ReportsService Unit Tests
 * Feature: 001-volunteer-management - User Story 9
 */

describe('ReportsService', () => {
  let service: ReportsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReportsService],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  afterEach(async () => {
    // Clean up test data - respecting foreign key constraints
    await prisma.pointEvent.deleteMany();
    await prisma.taskCompletion.deleteMany();
    await prisma.signup.deleteMany();
    await prisma.activitySlot.deleteMany();
    await prisma.event.deleteMany();
    await prisma.adminTaskToRole.deleteMany();
    await prisma.adminTask.deleteMany();
    await prisma.volunteerToRole.deleteMany();
    await prisma.activityType.deleteMany();
    await prisma.volunteerRole.deleteMany();
    await prisma.volunteerPointBalance.deleteMany();
    await prisma.leaderboardCache.deleteMany();
    await prisma.badgeTierHistory.deleteMany();
    await prisma.volunteer.deleteMany();
  });

  describe('generateParticipationReport', () => {
    it('should generate summary participation report', async () => {
      // Create test data
      const volunteer = await prisma.volunteer.create({
        data: {
          email: 'summary-report@example.com',
          name: 'Test Volunteer',
          passwordHash: 'hash',
          authTier: 'PARENT',
        },
      });

      const activityType = await prisma.activityType.create({
        data: {
          name: 'Test Activity',
          pointValue: 10,
          category: 'MEDIUM',
        },
      });

      const event = await prisma.event.create({
        data: {
          title: 'Test Event',
          eventDate: new Date('2026-03-15'),
          isComplete: true,
          createdById: volunteer.id,
        },
      });

      const activitySlot = await prisma.activitySlot.create({
        data: {
          eventId: event.id,
          activityTypeId: activityType.id,
        },
      });

      await prisma.signup.create({
        data: {
          volunteerId: volunteer.id,
          activitySlotId: activitySlot.id,
        },
      });

      await prisma.pointEvent.create({
        data: {
          volunteerId: volunteer.id,
          points: 10,
          eventType: 'EVENT_PARTICIPATION',
          createdById: volunteer.id,
          activityTypeId: activityType.id,
        },
      });

      // Generate report
      const report = await service.generateParticipationReport({
        format: 'summary',
        startDate: new Date('2026-01-01').toISOString(),
        endDate: new Date('2026-12-31').toISOString(),
      });

      // Assertions
      expect(report).toBeDefined();
      expect(report.period).toBeDefined();
      expect(report.stats).toBeDefined();
      expect(report.stats.totalVolunteers).toBeGreaterThan(0);
      expect(report.stats.totalEvents).toBe(1);
      expect(report.stats.totalSignups).toBe(1);
      expect(report.topVolunteers).toBeDefined();
      expect(report.topVolunteers.length).toBeGreaterThan(0);
      expect(report.topVolunteers[0].volunteer.name).toBe('Test Volunteer');
      expect(report.topVolunteers[0].pointsEarned).toBe(10);
    });

    it('should generate detailed participation report', async () => {
      // Create test data
      const volunteer = await prisma.volunteer.create({
        data: {
          email: 'test2@example.com',
          name: 'Test Volunteer 2',
          passwordHash: 'hash',
          authTier: 'PARENT',
        },
      });

      const activityType = await prisma.activityType.create({
        data: {
          name: 'Test Activity 2',
          pointValue: 15,
          category: 'HIGH',
        },
      });

      const event = await prisma.event.create({
        data: {
          title: 'Test Event 2',
          eventDate: new Date('2026-03-20'),
          isComplete: true,
          createdById: volunteer.id,
        },
      });

      const activitySlot = await prisma.activitySlot.create({
        data: {
          eventId: event.id,
          activityTypeId: activityType.id,
        },
      });

      await prisma.signup.create({
        data: {
          volunteerId: volunteer.id,
          activitySlotId: activitySlot.id,
        },
      });

      // Generate report
      const report = await service.generateParticipationReport({
        format: 'detailed',
        startDate: new Date('2026-01-01').toISOString(),
        endDate: new Date('2026-12-31').toISOString(),
      });

      // Assertions
      expect(report).toBeDefined();
      expect(report.volunteers).toBeDefined();
      expect(report.volunteers.length).toBeGreaterThan(0);
      expect(report.volunteers[0].volunteer.name).toBe('Test Volunteer 2');
      expect(report.volunteers[0].eventsParticipated).toBe(1);
      expect(report.volunteers[0].activities).toBeDefined();
      expect(report.volunteers[0].activities.length).toBe(1);
    });

    it('should filter by rank level', async () => {
      // Create test volunteers and events
      const volunteer = await prisma.volunteer.create({
        data: {
          email: 'lion@example.com',
          name: 'Lion Scout',
          passwordHash: 'hash',
          authTier: 'PARENT',
        },
      });

      const activityType = await prisma.activityType.create({
        data: {
          name: 'Lion Activity',
          pointValue: 5,
          category: 'MEDIUM',
        },
      });

      const event = await prisma.event.create({
        data: {
          title: 'Lion Event',
          eventDate: new Date('2026-04-01'),
          rankLevel: 'LION',
          isComplete: true,
          createdById: volunteer.id,
        },
      });

      const activitySlot = await prisma.activitySlot.create({
        data: {
          eventId: event.id,
          activityTypeId: activityType.id,
        },
      });

      await prisma.signup.create({
        data: {
          volunteerId: volunteer.id,
          activitySlotId: activitySlot.id,
        },
      });

      // Generate report with rank filter
      const report = await service.generateParticipationReport({
        format: 'summary',
        rankLevel: 'LION',
        startDate: new Date('2026-01-01').toISOString(),
        endDate: new Date('2026-12-31').toISOString(),
      });

      // Assertions
      expect(report.stats.totalEvents).toBe(1);
      expect(report.participationByRank.some(r => r.rankLevel === 'LION')).toBe(true);
    });
  });

  describe('generateAdminTaskReport', () => {
    it('should generate summary admin task report', async () => {
      // Create test data
      const volunteer = await prisma.volunteer.create({
        data: {
          email: 'admin@example.com',
          name: 'Admin User',
          passwordHash: 'hash',
          authTier: 'LEADER',
        },
      });

      const role = await prisma.volunteerRole.create({
        data: {
          name: 'Test Role',
          roleType: 'COMMITTEE',
          specialty: 'Test',
          grantsTier: 'LEADER',
        },
      });

      await prisma.volunteerToRole.create({
        data: {
          volunteerId: volunteer.id,
          roleId: role.id,
        },
      });

      const task = await prisma.adminTask.create({
        data: {
          name: 'Test Task',
          dueDate: new Date('2026-06-01'),
          createdById: volunteer.id,
        },
      });

      await prisma.adminTaskToRole.create({
        data: {
          taskId: task.id,
          roleId: role.id,
        },
      });

      await prisma.taskCompletion.create({
        data: {
          taskId: task.id,
          volunteerId: volunteer.id,
        },
      });

      // Generate report
      const report = await service.generateAdminTaskReport({
        format: 'summary',
        startDate: new Date('2026-01-01').toISOString(),
        endDate: new Date('2026-12-31').toISOString(),
      });

      // Assertions
      expect(report).toBeDefined();
      expect(report.stats).toBeDefined();
      expect(report.stats.totalTasks).toBe(1);
      expect(report.stats.totalCompletions).toBeGreaterThanOrEqual(1);
      expect(report.taskBreakdown).toBeDefined();
      expect(report.taskBreakdown.length).toBe(1);
      expect(report.taskBreakdown[0].task.name).toBe('Test Task');
    });

    it('should generate detailed admin task report', async () => {
      // Create test data
      const volunteer = await prisma.volunteer.create({
        data: {
          email: 'volunteer@example.com',
          name: 'Volunteer User',
          passwordHash: 'hash',
          authTier: 'LEADER',
        },
      });

      const role = await prisma.volunteerRole.create({
        data: {
          name: 'Committee Member',
          roleType: 'COMMITTEE',
          specialty: 'Treasurer',
          grantsTier: 'LEADER',
        },
      });

      await prisma.volunteerToRole.create({
        data: {
          volunteerId: volunteer.id,
          roleId: role.id,
        },
      });

      const task = await prisma.adminTask.create({
        data: {
          name: 'Annual Training',
          description: 'Complete annual training',
          dueDate: new Date('2026-07-01'),
          createdById: volunteer.id,
        },
      });

      await prisma.adminTaskToRole.create({
        data: {
          taskId: task.id,
          roleId: role.id,
        },
      });

      // Generate report
      const report = await service.generateAdminTaskReport({
        format: 'detailed',
        startDate: new Date('2026-01-01').toISOString(),
        endDate: new Date('2026-12-31').toISOString(),
      });

      // Assertions
      expect(report).toBeDefined();
      expect(report.tasks).toBeDefined();
      expect(report.tasks.length).toBeGreaterThan(0);
      expect(report.tasks[0].task.name).toBe('Annual Training');
      expect(report.tasks[0].assignedVolunteers).toBeDefined();
      expect(report.tasks[0].stats).toBeDefined();
    });

    it('should filter by status (overdue)', async () => {
      // Create overdue task
      const volunteer = await prisma.volunteer.create({
        data: {
          email: 'overdue@example.com',
          name: 'Overdue User',
          passwordHash: 'hash',
          authTier: 'LEADER',
        },
      });

      const role = await prisma.volunteerRole.create({
        data: {
          name: 'Overdue Role',
          roleType: 'COMMITTEE',
          specialty: 'Test',
          grantsTier: 'LEADER',
        },
      });

      await prisma.volunteerToRole.create({
        data: {
          volunteerId: volunteer.id,
          roleId: role.id,
        },
      });

      const overdueTask = await prisma.adminTask.create({
        data: {
          name: 'Overdue Task',
          dueDate: new Date('2026-01-01'), // Past date
          createdById: volunteer.id,
        },
      });

      await prisma.adminTaskToRole.create({
        data: {
          taskId: overdueTask.id,
          roleId: role.id,
        },
      });

      // Generate report with overdue filter
      const report = await service.generateAdminTaskReport({
        format: 'summary',
        status: 'overdue',
        startDate: new Date('2026-01-01').toISOString(),
        endDate: new Date('2026-12-31').toISOString(),
      });

      // Assertions
      expect(report.stats.overdueTasks).toBeGreaterThan(0);
      expect(report.taskBreakdown.every(t => t.isOverdue)).toBe(true);
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
