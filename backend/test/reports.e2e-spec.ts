import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import prisma from '../src/utils/prisma';
import * as bcrypt from 'bcrypt';

/**
 * Reports E2E Tests
 * Feature: 001-volunteer-management - User Story 9
 * Tests API endpoints for participation and administrative task reports
 */

describe('Reports API (e2e)', () => {
  let app: INestApplication;
  let leaderCookies: string[];
  let parentCookies: string[];
  let leaderId: string;
  let parentId: string;

  // Helper function to login and get cookies
  async function loginUser(email: string, password: string) {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password });
    return res.headers['set-cookie'];
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    const password = 'Password123!';
    const passwordHash = await bcrypt.hash(password, 12);

    // Create test users
    const leader = await prisma.volunteer.create({
      data: {
        email: 'leader-reports@test.com',
        name: 'Test Leader',
        passwordHash,
        authTier: 'LEADER',
      },
    });
    leaderId = leader.id;

    const parent = await prisma.volunteer.create({
      data: {
        email: 'parent-reports@test.com',
        name: 'Test Parent',
        passwordHash,
        authTier: 'PARENT',
      },
    });
    parentId = parent.id;

    // Generate tokens
    leaderCookies = await loginUser('leader-reports@test.com', password);
    parentCookies = await loginUser('parent-reports@test.com', password);
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.pointEvent.deleteMany();
    await prisma.signup.deleteMany();
    await prisma.activitySlot.deleteMany();
    await prisma.event.deleteMany();
    await prisma.taskCompletion.deleteMany();
    await prisma.adminTaskToRole.deleteMany();
    await prisma.adminTask.deleteMany();
    await prisma.volunteerToRole.deleteMany();
    await prisma.volunteerRole.deleteMany();
    await prisma.volunteer.deleteMany();
    await prisma.activityType.deleteMany();

    await app.close();
  });

  describe('GET /api/reports/participation', () => {
    it('should return participation report for Tier 2+ user', async () => {
      // Create test event and signup
      const activityType = await prisma.activityType.create({
        data: {
          name: 'Report Test Activity',
          pointValue: 10,
          category: 'MEDIUM',
        },
      });

      const event = await prisma.event.create({
        data: {
          title: 'Report Test Event',
          eventDate: new Date('2026-04-15'),
          isComplete: true,
          createdById: leaderId,
        },
      });

      const slot = await prisma.activitySlot.create({
        data: {
          eventId: event.id,
          activityTypeId: activityType.id,
        },
      });

      await prisma.signup.create({
        data: {
          volunteerId: leaderId,
          activitySlotId: slot.id,
        },
      });

      const response = await request(app.getHttpServer())
        .get('/api/reports/participation')
        .set('Cookie', leaderCookies)
        .query({
          format: 'summary',
          startDate: new Date('2026-01-01').toISOString(),
          endDate: new Date('2026-12-31').toISOString(),
        })
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.period).toBeDefined();
      expect(response.body.stats).toBeDefined();
      expect(response.body.stats.totalEvents).toBeGreaterThanOrEqual(0);
      expect(response.body.topVolunteers).toBeDefined();
      expect(response.body.participationByRank).toBeDefined();
    });

    it('should return 403 for Tier 1 (parent) user', async () => {
      await request(app.getHttpServer())
        .get('/api/reports/participation')
        .set('Cookie', parentCookies)
        .query({ format: 'summary' })
        .expect(403);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/reports/participation')
        .query({ format: 'summary' })
        .expect(401);
    });

    it('should return 400 for invalid query parameters', async () => {
      await request(app.getHttpServer())
        .get('/api/reports/participation')
        .set('Cookie', leaderCookies)
        .query({
          format: 'invalid',
          startDate: 'not-a-date',
        })
        .expect(400);
    });

    it('should support detailed format', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/reports/participation')
        .set('Cookie', leaderCookies)
        .query({
          format: 'detailed',
          startDate: new Date('2026-01-01').toISOString(),
          endDate: new Date('2026-12-31').toISOString(),
        })
        .expect(200);

      expect(response.body.volunteers).toBeDefined();
      expect(Array.isArray(response.body.volunteers)).toBe(true);
    });

    it('should filter by rank level', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/reports/participation')
        .set('Cookie', leaderCookies)
        .query({
          format: 'summary',
          rankLevel: 'LION',
          startDate: new Date('2026-01-01').toISOString(),
          endDate: new Date('2026-12-31').toISOString(),
        })
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe('GET /api/reports/administrative-tasks', () => {
    it('should return admin task report for Tier 2+ user', async () => {
      // Create test task
      const role = await prisma.volunteerRole.create({
        data: {
          name: 'Report Test Role',
          roleType: 'COMMITTEE',
          specialty: 'Test',
          grantsTier: 'LEADER',
        },
      });

      await prisma.volunteerToRole.create({
        data: {
          volunteerId: leaderId,
          roleId: role.id,
        },
      });

      const task = await prisma.adminTask.create({
        data: {
          name: 'Report Test Task',
          dueDate: new Date('2026-06-01'),
          createdById: leaderId,
        },
      });

      await prisma.adminTaskToRole.create({
        data: {
          taskId: task.id,
          roleId: role.id,
        },
      });

      const response = await request(app.getHttpServer())
        .get('/api/reports/administrative-tasks')
        .set('Cookie', leaderCookies)
        .query({
          format: 'summary',
          startDate: new Date('2026-01-01').toISOString(),
          endDate: new Date('2026-12-31').toISOString(),
        })
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.period).toBeDefined();
      expect(response.body.stats).toBeDefined();
      expect(response.body.stats.totalTasks).toBeGreaterThanOrEqual(0);
      expect(response.body.taskBreakdown).toBeDefined();
    });

    it('should return 403 for Tier 1 (parent) user', async () => {
      await request(app.getHttpServer())
        .get('/api/reports/administrative-tasks')
        .set('Cookie', parentCookies)
        .query({ format: 'summary' })
        .expect(403);
    });

    it('should support detailed format', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/reports/administrative-tasks')
        .set('Cookie', leaderCookies)
        .query({
          format: 'detailed',
          startDate: new Date('2026-01-01').toISOString(),
          endDate: new Date('2026-12-31').toISOString(),
        })
        .expect(200);

      expect(response.body.tasks).toBeDefined();
      expect(Array.isArray(response.body.tasks)).toBe(true);
    });

    it('should filter by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/reports/administrative-tasks')
        .set('Cookie', leaderCookies)
        .query({
          format: 'summary',
          status: 'complete',
          startDate: new Date('2026-01-01').toISOString(),
          endDate: new Date('2026-12-31').toISOString(),
        })
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should return 400 for invalid date range', async () => {
      await request(app.getHttpServer())
        .get('/api/reports/administrative-tasks')
        .set('Cookie', leaderCookies)
        .query({
          format: 'summary',
          startDate: new Date('2026-12-31').toISOString(),
          endDate: new Date('2026-01-01').toISOString(), // End before start
        })
        .expect(400);
    });
  });
});
