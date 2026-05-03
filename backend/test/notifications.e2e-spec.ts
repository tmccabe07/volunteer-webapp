/**
 * Notifications API E2E Tests
 * 
 * Tests notifications endpoints with authentication and authorization
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { prisma } from '../src/utils/prisma';
import { AuthService } from '../src/services/auth.service';
import { NotificationType } from '@prisma/client';

describe('Notifications API (e2e)', () => {
  let app: INestApplication;
  let authService: AuthService;
  let accessToken: string;
  let volunteerId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      })
    );
    await app.init();

    authService = moduleFixture.get<AuthService>(AuthService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up test data
    await prisma.notification.deleteMany({});
    await prisma.volunteer.deleteMany({});

    // Create test volunteer
    const volunteer = await prisma.volunteer.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        passwordHash: await authService.hashPassword('password123'),
        authTier: 'PARENT',
      },
    });
    volunteerId = volunteer.id;

    // Generate access token
    accessToken = authService.generateAccessToken({
      userId: volunteer.id,
      email: volunteer.email,
      authTier: volunteer.authTier,
    });
  });

  describe('GET /api/notifications', () => {
    it('should return empty list when no notifications', async () => {
      const response = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.notifications).toEqual([]);
      expect(response.body.unreadCount).toBe(0);
      expect(response.body.pagination).toMatchObject({
        total: 0,
        limit: 20,
        offset: 0,
        hasMore: false,
      });
    });

    it('should return notifications for authenticated user', async () => {
      // Create test notifications
      await prisma.notification.createMany({
        data: [
          {
            volunteerId,
            type: NotificationType.BADGE_ACHIEVEMENT,
            message: 'You earned Bronze badge!',
            isRead: false,
          },
          {
            volunteerId,
            type: NotificationType.TASK_COMPLETION,
            message: 'Task completed!',
            isRead: true,
          },
        ],
      });

      const response = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.notifications).toHaveLength(2);
      expect(response.body.unreadCount).toBe(1);
    });

    it('should support pagination with limit and offset', async () => {
      // Create 25 notifications
      const notifications = Array.from({ length: 25 }, (_, i) => ({
        volunteerId,
        type: NotificationType.BADGE_ACHIEVEMENT,
        message: `Notification ${i + 1}`,
        isRead: false,
      }));
      await prisma.notification.createMany({ data: notifications });

      const response = await request(app.getHttpServer())
        .get('/notifications?limit=10&offset=0')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.notifications).toHaveLength(10);
      expect(response.body.pagination).toMatchObject({
        total: 25,
        limit: 10,
        offset: 0,
        hasMore: true,
      });
    });

    it('should filter unread notifications when unreadOnly=true', async () => {
      await prisma.notification.createMany({
        data: [
          {
            volunteerId,
            type: NotificationType.BADGE_ACHIEVEMENT,
            message: 'Unread 1',
            isRead: false,
          },
          {
            volunteerId,
            type: NotificationType.BADGE_ACHIEVEMENT,
            message: 'Read 1',
            isRead: true,
          },
          {
            volunteerId,
            type: NotificationType.BADGE_ACHIEVEMENT,
            message: 'Unread 2',
            isRead: false,
          },
        ],
      });

      const response = await request(app.getHttpServer())
        .get('/notifications?unreadOnly=true')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.notifications).toHaveLength(2);
      expect(response.body.notifications.every((n: any) => !n.isRead)).toBe(true);
    });

    it('should return 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .get('/notifications')
        .expect(401);
    });

    it('should validate limit parameter bounds', async () => {
      await request(app.getHttpServer())
        .get('/notifications?limit=150')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);

      await request(app.getHttpServer())
        .get('/notifications?limit=0')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });

    it('should validate offset parameter', async () => {
      await request(app.getHttpServer())
        .get('/notifications?offset=-1')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });
  });

  describe('PUT /api/notifications/:id/read', () => {
    it('should mark notification as read', async () => {
      const notification = await prisma.notification.create({
        data: {
          volunteerId,
          type: NotificationType.BADGE_ACHIEVEMENT,
          message: 'Test notification',
          isRead: false,
        },
      });

      const response = await request(app.getHttpServer())
        .put(`/notifications/${notification.id}/read`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.message).toBe('Notification marked as read');
      expect(response.body.notification.isRead).toBe(true);

      // Verify in database
      const updated = await prisma.notification.findUnique({
        where: { id: notification.id },
      });
      expect(updated?.isRead).toBe(true);
    });

    it('should return 404 when notification not found', async () => {
      await request(app.getHttpServer())
        .put('/notifications/nonexistent-id/read')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should return 404 when notification belongs to different user', async () => {
      // Create another volunteer
      const otherVolunteer = await prisma.volunteer.create({
        data: {
          email: 'other@example.com',
          name: 'Other User',
          passwordHash: await authService.hashPassword('password123'),
          authTier: 'PARENT',
        },
      });

      const notification = await prisma.notification.create({
        data: {
          volunteerId: otherVolunteer.id,
          type: NotificationType.BADGE_ACHIEVEMENT,
          message: 'Other user notification',
          isRead: false,
        },
      });

      await request(app.getHttpServer())
        .put(`/notifications/${notification.id}/read`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should return 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .put('/notifications/some-id/read')
        .expect(401);
    });
  });

  describe('PUT /api/notifications/read-all', () => {
    it('should mark all notifications as read', async () => {
      // Create multiple unread notifications
      await prisma.notification.createMany({
        data: [
          {
            volunteerId,
            type: NotificationType.BADGE_ACHIEVEMENT,
            message: 'Notification 1',
            isRead: false,
          },
          {
            volunteerId,
            type: NotificationType.TASK_COMPLETION,
            message: 'Notification 2',
            isRead: false,
          },
          {
            volunteerId,
            type: NotificationType.EVENT_REMINDER,
            message: 'Notification 3',
            isRead: false,
          },
        ],
      });

      const response = await request(app.getHttpServer())
        .put('/notifications/read-all')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.message).toBe('All notifications marked as read');
      expect(response.body.count).toBe(3);

      // Verify all are read in database
      const unreadCount = await prisma.notification.count({
        where: { volunteerId, isRead: false },
      });
      expect(unreadCount).toBe(0);
    });

    it('should return 0 count when no unread notifications', async () => {
      const response = await request(app.getHttpServer())
        .put('/notifications/read-all')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.count).toBe(0);
    });

    it('should not affect other users notifications', async () => {
      // Create another volunteer with notifications
      const otherVolunteer = await prisma.volunteer.create({
        data: {
          email: 'other@example.com',
          name: 'Other User',
          passwordHash: await authService.hashPassword('password123'),
          authTier: 'PARENT',
        },
      });

      await prisma.notification.create({
        data: {
          volunteerId: otherVolunteer.id,
          type: NotificationType.BADGE_ACHIEVEMENT,
          message: 'Other user notification',
          isRead: false,
        },
      });

      await request(app.getHttpServer())
        .put('/notifications/read-all')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Verify other user's notification is still unread
      const otherUnreadCount = await prisma.notification.count({
        where: { volunteerId: otherVolunteer.id, isRead: false },
      });
      expect(otherUnreadCount).toBe(1);
    });

    it('should return 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .put('/notifications/read-all')
        .expect(401);
    });
  });
});
