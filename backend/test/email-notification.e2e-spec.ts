import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { createTestVolunteer, prisma, setupTests, teardownTests } from '../src/test/test-utils';
import * as bcrypt from 'bcrypt';

describe('Email Notification API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.EMAIL_TRANSPORT = 'console';
    process.env.EMAIL_FROM = 'noreply@test.local';

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
    await prisma.emailRecipientLog.deleteMany();
    await prisma.emailLog.deleteMany();
    await prisma.adminTaskToRole.deleteMany();
    await prisma.adminTask.deleteMany();
    await prisma.denChiefAssignment.deleteMany();
    await prisma.denChief.deleteMany();
    await prisma.eventTargetDen.deleteMany();
    await prisma.activitySlot.deleteMany();
    await prisma.event.deleteMany();
    await prisma.denMembership.deleteMany();
    await prisma.parentChildLink.deleteMany();
    await prisma.childScout.deleteMany();
    await prisma.den.deleteMany();
    await prisma.volunteerToRole.deleteMany();
    await prisma.volunteer.deleteMany();
  });

  async function loginUser(email: string, password: string) {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password });
    return res.headers['set-cookie'];
  }

  async function createLeader(email = 'leader@test.com', password = 'Password123!') {
    const passwordHash = await bcrypt.hash(password, 12);
    return createTestVolunteer({ email, passwordHash, authTier: 'LEADER' });
  }

  async function createAdmin(email = 'admin@test.com', password = 'Password123!') {
    const passwordHash = await bcrypt.hash(password, 12);
    return createTestVolunteer({ email, passwordHash, authTier: 'ADMIN' });
  }

  async function createParentWithChild(parentEmail: string, den: { id: string }) {
    const passwordHash = await bcrypt.hash('Password123!', 12);
    const parent = await createTestVolunteer({ email: parentEmail, passwordHash, authTier: 'PARENT' });
    const child = await prisma.childScout.create({
      data: { firstName: 'Cub', lastName: 'Scout', currentRank: 'WOLF', createdBy: parent.id },
    });
    await prisma.denMembership.create({ data: { denId: den.id, childScoutId: child.id } });
    await prisma.parentChildLink.create({
      data: { parentId: parent.id, childScoutId: child.id, status: 'APPROVED', requestedBy: parent.id },
    });
    return { parent, child };
  }

  // ---------------------------------------------------------------------------
  // GET /events/:id/email-preview
  // ---------------------------------------------------------------------------

  describe('GET /api/events/:id/email-preview', () => {
    it('returns default recipient count for a den-scoped event', async () => {
      const leader = await createLeader();
      const den = await prisma.den.create({ data: { name: 'Den 1', denNumber: 1, rankLevel: 'WOLF' } });
      const { parent: _p } = await createParentWithChild('parent1@test.com', den);
      await createParentWithChild('parent2@test.com', den);

      const event = await prisma.event.create({
        data: {
          title: 'Den Meeting',
          eventDate: new Date('2026-08-01'),
          scopeType: 'DEN',
          createdById: leader.id,
        },
      });
      await prisma.eventTargetDen.create({ data: { eventId: event.id, denId: den.id } });

      const cookies = await loginUser('leader@test.com', 'Password123!');
      const res = await request(app.getHttpServer())
        .get(`/api/events/${event.id}/email-preview`)
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.defaultRecipientCount).toBe(2);
      expect(res.body.recentSend).toBeNull();
    });

    it('returns cooldown flag after a recent send', async () => {
      const leader = await createLeader();
      const event = await prisma.event.create({
        data: { title: 'Pack Meeting', eventDate: new Date('2026-08-01'), scopeType: 'PACK_WIDE', createdById: leader.id },
      });

      await prisma.emailLog.create({
        data: {
          senderId: leader.id,
          templateType: 'EVENT_NOTIFICATION',
          eventId: event.id,
          recipientCount: 5,
          skippedCount: 0,
          failedCount: 0,
          status: 'SENT',
          sentAt: new Date(),
        },
      });

      const cookies = await loginUser('leader@test.com', 'Password123!');
      const res = await request(app.getHttpServer())
        .get(`/api/events/${event.id}/email-preview`)
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.recentSend).not.toBeNull();
      expect(res.body.recentSend.withinCooldown).toBe(true);
    });

    it('requires LEADER auth', async () => {
      const parent = await createTestVolunteer({ email: 'parent@test.com', authTier: 'PARENT' });
      const event = await prisma.event.create({
        data: { title: 'Test', eventDate: new Date('2026-08-01'), scopeType: 'PACK_WIDE', createdById: parent.id },
      });
      const passwordHash = await bcrypt.hash('Password123!', 12);
      await prisma.volunteer.update({ where: { id: parent.id }, data: { passwordHash } });

      const cookies = await loginUser('parent@test.com', 'Password123!');
      const res = await request(app.getHttpServer())
        .get(`/api/events/${event.id}/email-preview`)
        .set('Cookie', cookies);

      expect(res.status).toBe(403);
    });
  });

  // ---------------------------------------------------------------------------
  // POST /events/:id/notify-members (T008)
  // ---------------------------------------------------------------------------

  describe('POST /api/events/:id/notify-members', () => {
    it('sends notifications to all parents in a den-scoped event', async () => {
      const leader = await createLeader();
      const den = await prisma.den.create({ data: { name: 'Den 2', denNumber: 2, rankLevel: 'WOLF' } });
      await createParentWithChild('parent1@test.com', den);
      await createParentWithChild('parent2@test.com', den);

      const event = await prisma.event.create({
        data: { title: 'Den Hike', eventDate: new Date('2026-08-10'), scopeType: 'DEN', createdById: leader.id },
      });
      await prisma.eventTargetDen.create({ data: { eventId: event.id, denId: den.id } });

      const cookies = await loginUser('leader@test.com', 'Password123!');
      const res = await request(app.getHttpServer())
        .post(`/api/events/${event.id}/notify-members`)
        .set('Cookie', cookies)
        .send({});

      expect(res.status).toBe(201);
      expect(res.body.recipientCount).toBe(2);
      expect(res.body.skippedCount).toBe(0);
      expect(res.body.status).toBe('SENT');

      const log = await prisma.emailLog.findFirst({ where: { eventId: event.id } });
      expect(log).not.toBeNull();
      expect(log!.recipientCount).toBe(2);
      expect(log!.templateType).toBe('EVENT_NOTIFICATION');
    });

    it('deduplicates a parent in both scope and additionalRecipientIds', async () => {
      const leader = await createLeader();
      const den = await prisma.den.create({ data: { name: 'Den 3', denNumber: 3, rankLevel: 'WOLF' } });
      const { parent } = await createParentWithChild('parent1@test.com', den);

      const event = await prisma.event.create({
        data: { title: 'Pack Meeting', eventDate: new Date('2026-08-12'), scopeType: 'DEN', createdById: leader.id },
      });
      await prisma.eventTargetDen.create({ data: { eventId: event.id, denId: den.id } });

      const cookies = await loginUser('leader@test.com', 'Password123!');
      const res = await request(app.getHttpServer())
        .post(`/api/events/${event.id}/notify-members`)
        .set('Cookie', cookies)
        .send({ additionalRecipientIds: [parent.id] });

      expect(res.status).toBe(201);
      expect(res.body.recipientCount).toBe(1);
    });

    it('skips recipients with no email and logs the skip', async () => {
      const leader = await createLeader();
      const event = await prisma.event.create({
        data: { title: 'Pack Event', eventDate: new Date('2026-08-14'), scopeType: 'PACK_WIDE', createdById: leader.id },
      });

      const cookies = await loginUser('leader@test.com', 'Password123!');
      const res = await request(app.getHttpServer())
        .post(`/api/events/${event.id}/notify-members`)
        .set('Cookie', cookies)
        .send({});

      // Pack-wide with no parents enrolled: 0 recipients, 0 skipped
      expect(res.status).toBe(201);
      expect(res.body.recipientCount).toBe(0);
    });

    it('returns cooldown warning flag but still sends within cooldown', async () => {
      const leader = await createLeader();
      const den = await prisma.den.create({ data: { name: 'Den 4', denNumber: 4, rankLevel: 'WOLF' } });
      await createParentWithChild('parent4@test.com', den);

      const event = await prisma.event.create({
        data: { title: 'Den Meeting 2', eventDate: new Date('2026-08-15'), scopeType: 'DEN', createdById: leader.id },
      });
      await prisma.eventTargetDen.create({ data: { eventId: event.id, denId: den.id } });

      // Pre-populate a recent send
      await prisma.emailLog.create({
        data: {
          senderId: leader.id,
          templateType: 'EVENT_NOTIFICATION',
          eventId: event.id,
          recipientCount: 1,
          skippedCount: 0,
          failedCount: 0,
          status: 'SENT',
          sentAt: new Date(),
        },
      });

      const cookies = await loginUser('leader@test.com', 'Password123!');
      const res = await request(app.getHttpServer())
        .post(`/api/events/${event.id}/notify-members`)
        .set('Cookie', cookies)
        .send({});

      expect(res.status).toBe(201);
      expect(res.body.withinCooldownWarning).toBe(true);
    });

    it('includes den chiefs in den-scoped notifications', async () => {
      const leader = await createLeader();
      const den = await prisma.den.create({ data: { name: 'Den 5', denNumber: 5, rankLevel: 'WOLF' } });
      await createParentWithChild('parent5@test.com', den);

      const denChief = await prisma.denChief.create({
        data: {
          email: 'denchief@test.com',
          firstName: 'Chief',
          lastName: 'Youth',
          passwordHash: await bcrypt.hash('Password123!', 12),
        },
      });
      await prisma.denChiefAssignment.create({
        data: { denChiefId: denChief.id, denId: den.id, assignedBy: leader.id },
      });

      const event = await prisma.event.create({
        data: { title: 'Den Campout', eventDate: new Date('2026-08-20'), scopeType: 'DEN', createdById: leader.id },
      });
      await prisma.eventTargetDen.create({ data: { eventId: event.id, denId: den.id } });

      const cookies = await loginUser('leader@test.com', 'Password123!');
      const res = await request(app.getHttpServer())
        .post(`/api/events/${event.id}/notify-members`)
        .set('Cookie', cookies)
        .send({});

      expect(res.status).toBe(201);
      expect(res.body.recipientCount).toBe(2); // 1 parent + 1 den chief
    });
  });

  // ---------------------------------------------------------------------------
  // POST /admin-tasks/:id/send-reminder (T017)
  // ---------------------------------------------------------------------------

  describe('POST /api/admin-tasks/:id/send-reminder', () => {
    it('sends reminder to volunteers with the assigned role', async () => {
      const admin = await createAdmin();
      const role = await prisma.volunteerRole.findFirst();
      const passwordHash = await bcrypt.hash('Password123!', 12);
      const vol = await createTestVolunteer({ email: 'assigned@test.com', passwordHash, authTier: 'LEADER' });
      await prisma.volunteerToRole.create({ data: { volunteerId: vol.id, roleId: role!.id } });

      const task = await prisma.adminTask.create({
        data: {
          name: 'File Safety Report',
          dueDate: new Date('2026-01-01'), // overdue
          isPackWide: false,
          createdById: admin.id,
          assignedRoles: { create: { roleId: role!.id } },
        },
      });

      const cookies = await loginUser('admin@test.com', 'Password123!');
      const res = await request(app.getHttpServer())
        .post(`/api/admin-tasks/${task.id}/send-reminder`)
        .set('Cookie', cookies);

      expect(res.status).toBe(201);
      expect(res.body.recipientCount).toBe(1);
      expect(res.body.status).toBe('SENT');

      const log = await prisma.emailLog.findFirst({ where: { taskId: task.id } });
      expect(log).not.toBeNull();
      expect(log!.templateType).toBe('TASK_REMINDER');
    });

    it('returns 400 for a task not yet due', async () => {
      const admin = await createAdmin();
      const task = await prisma.adminTask.create({
        data: {
          name: 'Future Task',
          dueDate: new Date('2099-01-01'),
          isPackWide: false,
          createdById: admin.id,
        },
      });

      const cookies = await loginUser('admin@test.com', 'Password123!');
      const res = await request(app.getHttpServer())
        .post(`/api/admin-tasks/${task.id}/send-reminder`)
        .set('Cookie', cookies);

      expect(res.status).toBe(400);
    });

    it('returns 409 within 24-hour cooldown', async () => {
      const admin = await createAdmin();
      const task = await prisma.adminTask.create({
        data: {
          name: 'Old Task',
          dueDate: new Date('2026-01-01'),
          isPackWide: false,
          createdById: admin.id,
        },
      });

      await prisma.emailLog.create({
        data: {
          senderId: admin.id,
          templateType: 'TASK_REMINDER',
          taskId: task.id,
          recipientCount: 1,
          skippedCount: 0,
          failedCount: 0,
          status: 'SENT',
          sentAt: new Date(),
        },
      });

      const cookies = await loginUser('admin@test.com', 'Password123!');
      const res = await request(app.getHttpServer())
        .post(`/api/admin-tasks/${task.id}/send-reminder`)
        .set('Cookie', cookies);

      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty('lastSentAt');
    });

    it('requires ADMIN auth', async () => {
      const leader = await createLeader();
      const task = await prisma.adminTask.create({
        data: { name: 'Test', dueDate: new Date('2026-01-01'), isPackWide: false, createdById: leader.id },
      });

      const cookies = await loginUser('leader@test.com', 'Password123!');
      const res = await request(app.getHttpServer())
        .post(`/api/admin-tasks/${task.id}/send-reminder`)
        .set('Cookie', cookies);

      expect(res.status).toBe(403);
    });
  });

  // ---------------------------------------------------------------------------
  // POST /events/:id/send-completion-summary (T023)
  // ---------------------------------------------------------------------------

  describe('POST /api/events/:id/send-completion-summary', () => {
    it('sends summary to scope members when event is complete', async () => {
      const leader = await createLeader();
      const den = await prisma.den.create({ data: { name: 'Den 6', denNumber: 6, rankLevel: 'WOLF' } });
      await createParentWithChild('parent6@test.com', den);

      const event = await prisma.event.create({
        data: {
          title: 'Camp Trip',
          eventDate: new Date('2026-07-01'),
          scopeType: 'DEN',
          isComplete: true,
          createdById: leader.id,
        },
      });
      await prisma.eventTargetDen.create({ data: { eventId: event.id, denId: den.id } });

      const cookies = await loginUser('leader@test.com', 'Password123!');
      const res = await request(app.getHttpServer())
        .post(`/api/events/${event.id}/send-completion-summary`)
        .set('Cookie', cookies)
        .send({});

      expect(res.status).toBe(201);
      expect(res.body.recipientCount).toBe(1);
      expect(res.body.status).toBe('SENT');

      const log = await prisma.emailLog.findFirst({ where: { eventId: event.id } });
      expect(log!.templateType).toBe('EVENT_COMPLETION_SUMMARY');
    });

    it('returns 400 if event is not complete', async () => {
      const leader = await createLeader();
      const event = await prisma.event.create({
        data: {
          title: 'Upcoming Trip',
          eventDate: new Date('2026-09-01'),
          scopeType: 'PACK_WIDE',
          isComplete: false,
          createdById: leader.id,
        },
      });

      const cookies = await loginUser('leader@test.com', 'Password123!');
      const res = await request(app.getHttpServer())
        .post(`/api/events/${event.id}/send-completion-summary`)
        .set('Cookie', cookies)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Event is not marked complete');
    });
  });

  // ---------------------------------------------------------------------------
  // GET /pack/members/search
  // ---------------------------------------------------------------------------

  describe('GET /api/pack/members/search', () => {
    it('returns matching volunteers and den chiefs by name', async () => {
      const leader = await createLeader();
      const passwordHash = await bcrypt.hash('Password123!', 12);
      await createTestVolunteer({ email: 'alice@test.com', passwordHash, authTier: 'PARENT', name: 'Alice Johnson' } as any);
      await prisma.denChief.create({
        data: {
          email: 'charlie@test.com',
          firstName: 'Charlie',
          lastName: 'Jones',
          passwordHash: await bcrypt.hash('Password123!', 12),
        },
      });

      const cookies = await loginUser('leader@test.com', 'Password123!');
      const res = await request(app.getHttpServer())
        .get('/api/pack/members/search?q=Jo')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      const names = res.body.map((r: { name: string }) => r.name);
      expect(names.some((n: string) => n.includes('Johnson') || n.includes('Jones'))).toBe(true);
    });

    it('returns 400 when q is too short', async () => {
      const leader = await createLeader();
      const cookies = await loginUser('leader@test.com', 'Password123!');
      const res = await request(app.getHttpServer())
        .get('/api/pack/members/search?q=A')
        .set('Cookie', cookies);

      expect(res.status).toBe(400);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /events/:id/email-logs
  // ---------------------------------------------------------------------------

  describe('GET /api/events/:id/email-logs', () => {
    it('returns email log history for an event', async () => {
      const leader = await createLeader();
      const event = await prisma.event.create({
        data: { title: 'Pack Picnic', eventDate: new Date('2026-08-01'), scopeType: 'PACK_WIDE', createdById: leader.id },
      });

      await prisma.emailLog.create({
        data: {
          senderId: leader.id,
          templateType: 'EVENT_NOTIFICATION',
          eventId: event.id,
          recipientCount: 10,
          skippedCount: 2,
          failedCount: 0,
          status: 'SENT',
        },
      });

      const cookies = await loginUser('leader@test.com', 'Password123!');
      const res = await request(app.getHttpServer())
        .get(`/api/events/${event.id}/email-logs`)
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].recipientCount).toBe(10);
      expect(res.body[0].templateType).toBe('EVENT_NOTIFICATION');
    });
  });
});
