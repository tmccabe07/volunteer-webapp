import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import {
  setupTests,
  teardownTests,
  createTestVolunteer,
  prisma,
} from '../src/test/test-utils';
import * as bcrypt from 'bcrypt';

describe('Admin Tasks API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    await setupTests();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await teardownTests();
    await app.close();
  });

  afterEach(async () => {
    await prisma.taskCompletion.deleteMany();
    await prisma.adminTaskToRole.deleteMany();
    await prisma.adminTask.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.volunteerToRole.deleteMany();
    await prisma.volunteer.deleteMany();
  });

  // Helper function to login and get cookies
  async function loginUser(email: string, password: string) {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password });
    return res.headers['set-cookie'];
  }

  describe('GET /api/admin-tasks', () => {
    it('should list tasks for authenticated user', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      const volunteer = await createTestVolunteer({
        email: 'parent@example.com',
        passwordHash,
        authTier: 'PARENT',
      });

      const leader = await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: 'LEADER',
      });

      // Create a pack-wide task
      await prisma.adminTask.create({
        data: {
          name: 'Pack Safety Training',
          description: 'Complete safety training',
          dueDate: new Date('2026-08-01'),
          isPackWide: true,
          createdById: leader.id,
        },
      });

      const cookies = await loginUser('parent@example.com', password);

      return request(app.getHttpServer())
        .get('/api/admin-tasks')
        .set('Cookie', cookies)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('tasks');
          expect(res.body).toHaveProperty('pagination');
          expect(Array.isArray(res.body.tasks)).toBe(true);
          expect(res.body.tasks.length).toBeGreaterThan(0);
        });
    });

    it('should filter tasks by status', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      const volunteer = await createTestVolunteer({
        email: 'parent@example.com',
        passwordHash,
      });

      const leader = await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: 'LEADER',
      });

      const task = await prisma.adminTask.create({
        data: {
          name: 'Complete Task',
          dueDate: new Date('2026-08-01'),
          isPackWide: true,
          createdById: leader.id,
        },
      });

      // Mark task as complete for the volunteer
      await prisma.taskCompletion.create({
        data: {
          taskId: task.id,
          volunteerId: volunteer.id,
        },
      });

      const cookies = await loginUser('parent@example.com', password);

      // Test complete filter
      const completeRes = await request(app.getHttpServer())
        .get('/api/admin-tasks?status=complete')
        .set('Cookie', cookies)
        .expect(200);

      expect(completeRes.body.tasks.length).toBeGreaterThan(0);
      expect(completeRes.body.tasks[0].currentUserCompletion).toBeTruthy();

      // Test incomplete filter
      const incompleteTask = await prisma.adminTask.create({
        data: {
          name: 'Incomplete Task',
          dueDate: new Date('2026-08-15'),
          isPackWide: true,
          createdById: leader.id,
        },
      });

      const incompleteRes = await request(app.getHttpServer())
        .get('/api/admin-tasks?status=incomplete')
        .set('Cookie', cookies)
        .expect(200);

      const incompleteTaskResult = incompleteRes.body.tasks.find(
        (t: any) => t.id === incompleteTask.id
      );
      expect(incompleteTaskResult).toBeTruthy();
      expect(incompleteTaskResult.currentUserCompletion).toBeNull();
    });

    it('should reject unauthenticated requests', () => {
      return request(app.getHttpServer())
        .get('/api/admin-tasks')
        .expect(401);
    });
  });

  describe('GET /api/admin-tasks/:id', () => {
    it('should get task details', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      const volunteer = await createTestVolunteer({
        email: 'parent@example.com',
        passwordHash,
      });

      const leader = await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: 'LEADER',
      });

      const task = await prisma.adminTask.create({
        data: {
          name: 'Medical Forms',
          description: 'Submit medical forms',
          dueDate: new Date('2026-08-01'),
          completionSteps: JSON.stringify([
            { step: 'Download form', url: 'https://example.com/form' },
          ]),
          isPackWide: true,
          createdById: leader.id,
        },
      });

      const cookies = await loginUser('parent@example.com', password);

      return request(app.getHttpServer())
        .get(`/api/admin-tasks/${task.id}`)
        .set('Cookie', cookies)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(task.id);
          expect(res.body.name).toBe('Medical Forms');
          expect(res.body.description).toBe('Submit medical forms');
          expect(res.body.completionSteps).toHaveLength(1);
          expect(res.body.completionSteps[0].step).toBe('Download form');
        });
    });

    it('should return 404 for non-existent task', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      await createTestVolunteer({
        email: 'parent@example.com',
        passwordHash,
      });

      const cookies = await loginUser('parent@example.com', password);

      return request(app.getHttpServer())
        .get('/api/admin-tasks/invalid-id')
        .set('Cookie', cookies)
        .expect(404);
    });
  });

  describe('POST /api/admin-tasks', () => {
    it('should create a new task (Tier 2+)', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      const leader = await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: 'LEADER',
      });

      const cookies = await loginUser('leader@example.com', password);

      return request(app.getHttpServer())
        .post('/api/admin-tasks')
        .set('Cookie', cookies)
        .send({
          name: 'New Administrative Task',
          description: 'Complete this task',
          dueDate: new Date('2026-08-01').toISOString(),
          isPackWide: true,
          isRecurring: false,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.name).toBe('New Administrative Task');
          expect(res.body.isPackWide).toBe(true);
        });
    });

    it('should reject task creation for Tier 1 users', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      await createTestVolunteer({
        email: 'parent@example.com',
        passwordHash,
        authTier: 'PARENT',
      });

      const cookies = await loginUser('parent@example.com', password);

      return request(app.getHttpServer())
        .post('/api/admin-tasks')
        .set('Cookie', cookies)
        .send({
          name: 'Unauthorized Task',
          dueDate: new Date('2026-08-01').toISOString(),
          isPackWide: true,
        })
        .expect(403);
    });

    it('should validate required fields', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      const leader = await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: 'LEADER',
      });

      const cookies = await loginUser('leader@example.com', password);

      // Missing name
      await request(app.getHttpServer())
        .post('/api/admin-tasks')
        .set('Cookie', cookies)
        .send({
          dueDate: new Date('2026-08-01').toISOString(),
          isPackWide: true,
        })
        .expect(400);

      // Missing dueDate
      await request(app.getHttpServer())
        .post('/api/admin-tasks')
        .set('Cookie', cookies)
        .send({
          name: 'Test Task',
          isPackWide: true,
        })
        .expect(400);
    });
  });

  describe('POST /api/admin-tasks/:id/complete', () => {
    it('should mark task as complete', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      const volunteer = await createTestVolunteer({
        email: 'parent@example.com',
        passwordHash,
      });

      const leader = await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: 'LEADER',
      });

      const task = await prisma.adminTask.create({
        data: {
          name: 'Task to Complete',
          dueDate: new Date('2026-08-01'),
          isPackWide: true,
          createdById: leader.id,
        },
      });

      const cookies = await loginUser('parent@example.com', password);

      return request(app.getHttpServer())
        .post(`/api/admin-tasks/${task.id}/complete`)
        .set('Cookie', cookies)
        .expect(201)
        .expect((res) => {
          expect(res.body.taskId).toBe(task.id);
          expect(res.body.volunteerId).toBe(volunteer.id);
          expect(res.body.isComplete).toBe(true);
        });
    });

    it('should reject duplicate completions', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      const volunteer = await createTestVolunteer({
        email: 'parent@example.com',
        passwordHash,
      });

      const leader = await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: 'LEADER',
      });

      const task = await prisma.adminTask.create({
        data: {
          name: 'Task to Complete',
          dueDate: new Date('2026-08-01'),
          isPackWide: true,
          createdById: leader.id,
        },
      });

      const cookies = await loginUser('parent@example.com', password);

      // Complete once
      await request(app.getHttpServer())
        .post(`/api/admin-tasks/${task.id}/complete`)
        .set('Cookie', cookies)
        .expect(201);

      // Try to complete again
      return request(app.getHttpServer())
        .post(`/api/admin-tasks/${task.id}/complete`)
        .set('Cookie', cookies)
        .expect(409);
    });
  });

  describe('DELETE /api/admin-tasks/:id', () => {
    it('should delete a task (Tier 2+)', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      const leader = await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: 'LEADER',
      });

      const task = await prisma.adminTask.create({
        data: {
          name: 'Task to Delete',
          dueDate: new Date('2026-08-01'),
          isPackWide: true,
          createdById: leader.id,
        },
      });

      const cookies = await loginUser('leader@example.com', password);

      await request(app.getHttpServer())
        .delete(`/api/admin-tasks/${task.id}`)
        .set('Cookie', cookies)
        .expect(204);

      // Verify task is soft deleted
      const deletedTask = await prisma.adminTask.findUnique({
        where: { id: task.id },
      });
      expect(deletedTask?.deletedAt).toBeTruthy();
    });

    it('should reject deletion for Tier 1 users', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      await createTestVolunteer({
        email: 'parent@example.com',
        passwordHash,
        authTier: 'PARENT',
      });

      const leader = await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: 'LEADER',
      });

      const task = await prisma.adminTask.create({
        data: {
          name: 'Task to Delete',
          dueDate: new Date('2026-08-01'),
          isPackWide: true,
          createdById: leader.id,
        },
      });

      const cookies = await loginUser('parent@example.com', password);

      return request(app.getHttpServer())
        .delete(`/api/admin-tasks/${task.id}`)
        .set('Cookie', cookies)
        .expect(403);
    });
  });
});
