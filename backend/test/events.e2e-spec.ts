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
  createTestEvent,
  createTestActivityType,
  prisma,
} from '../src/test/test-utils';
import * as bcrypt from 'bcrypt';

describe('Events API (e2e)', () => {
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
    await prisma.signup.deleteMany();
    await prisma.activitySlot.deleteMany();
    await prisma.event.deleteMany();
    await prisma.pointEvent.deleteMany();
    await prisma.volunteerPointBalance.deleteMany();
    await prisma.volunteer.deleteMany();
    await prisma.activityType.deleteMany();
  });

  // Helper function to login and get cookies
  async function loginUser(email: string, password: string) {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password });
    return res.headers['set-cookie'];
  }

  describe('GET /api/events', () => {
    it('should list events for authenticated user', async () => {
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

      // Create a test event
      await createTestEvent(leader.id, {
        title: 'Pack Meeting',
        description: 'Monthly pack meeting',
        eventDate: new Date('2026-06-15'),
        rankLevel: 'WOLF',
      });

      const cookies = await loginUser('parent@example.com', password);

      return request(app.getHttpServer())
        .get('/api/events')
        .set('Cookie', cookies)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('events');
          expect(res.body).toHaveProperty('pagination');
          expect(res.body.pagination).toHaveProperty('total');
          expect(res.body.pagination).toHaveProperty('page');
          expect(res.body.pagination).toHaveProperty('limit');
          expect(Array.isArray(res.body.events)).toBe(true);
        });
    });

    it('should filter events by upcoming flag', async () => {
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

      // Create past and future events
      await createTestEvent(leader.id, {
        title: 'Past Event',
        eventDate: new Date('2020-01-01'),
      });

      await createTestEvent(leader.id, {
        title: 'Future Event',
        eventDate: new Date('2026-12-01'),
      });

      const cookies = await loginUser('parent@example.com', password);

      return request(app.getHttpServer())
        .get('/api/events?upcoming=true')
        .set('Cookie', cookies)
        .expect(200)
        .expect((res) => {
          expect(res.body.events.length).toBeGreaterThanOrEqual(0);
          // All events should be in the future
          res.body.events.forEach((event: any) => {
            expect(new Date(event.eventDate) >= new Date()).toBe(true);
          });
        });
    });

    it('should filter events by rank level', async () => {
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

      await createTestEvent(leader.id, {
        title: 'Wolf Event',
        rankLevel: 'WOLF',
        eventDate: new Date('2026-06-01'),
      });

      await createTestEvent(leader.id, {
        title: 'Bear Event',
        rankLevel: 'BEAR',
        eventDate: new Date('2026-06-02'),
      });

      const cookies = await loginUser('parent@example.com', password);

      return request(app.getHttpServer())
        .get('/api/events?rankLevel=WOLF')
        .set('Cookie', cookies)
        .expect(200)
        .expect((res) => {
          res.body.events.forEach((event: any) => {
            expect(event.rankLevel).toBe('WOLF');
          });
        });
    });

    it('should reject unauthenticated requests', () => {
      return request(app.getHttpServer())
        .get('/api/events')
        .expect(401);
    });

    it('should support pagination', async () => {
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

      // Create multiple events
      for (let i = 0; i < 15; i++) {
        await createTestEvent(leader.id, {
          title: `Event ${i}`,
          eventDate: new Date(`2026-06-${String(i + 1).padStart(2, '0')}`),
        });
      }

      const cookies = await loginUser('parent@example.com', password);

      return request(app.getHttpServer())
        .get('/api/events?page=1&limit=10')
        .set('Cookie', cookies)
        .expect(200)
        .expect((res) => {
          expect(res.body.pagination.page).toBe(1);
          expect(res.body.pagination.limit).toBe(10);
          expect(res.body.events.length).toBeLessThanOrEqual(10);
        });
    });
  });

  describe('GET /api/events/:id', () => {
    it('should get event details', async () => {
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

      const event = await createTestEvent(leader.id, {
        title: 'Pack Meeting',
        description: 'Monthly meeting',
        eventDate: new Date('2026-06-01'),
      });

      const cookies = await loginUser('parent@example.com', password);

      return request(app.getHttpServer())
        .get(`/api/events/${event.id}`)
        .set('Cookie', cookies)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(event.id);
          expect(res.body.title).toBe('Pack Meeting');
          expect(res.body).toHaveProperty('activitySlots');
          expect(res.body).toHaveProperty('createdBy');
        });
    });

    it('should return 404 for non-existent event', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      await createTestVolunteer({
        email: 'parent@example.com',
        passwordHash,
      });

      const cookies = await loginUser('parent@example.com', password);

      return request(app.getHttpServer())
        .get('/api/events/non-existent-id')
        .set('Cookie', cookies)
        .expect(404);
    });

    it('should reject unauthenticated requests', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      const leader = await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: 'LEADER',
      });

      const event = await createTestEvent(leader.id);

      return request(app.getHttpServer())
        .get(`/api/events/${event.id}`)
        .expect(401);
    });
  });

  describe('POST /api/events', () => {
    it('should create event as LEADER', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      const leader = await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: 'LEADER',
      });

      const activityType = await createTestActivityType({
        name: 'Event Setup',
        pointValue: 5,
      });

      const cookies = await loginUser('leader@example.com', password);

      return request(app.getHttpServer())
        .post('/api/events')
        .set('Cookie', cookies)
        .send({
          title: 'New Pack Event',
          description: 'A new event for the pack',
          eventDate: '2026-07-01T10:00:00Z',
          rankLevel: 'WOLF',
          isRecurring: false,
          activitySlots: [
            {
              activityTypeId: activityType.id,
              capacity: 10,
            },
          ],
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.title).toBe('New Pack Event');
          expect(res.body.rankLevel).toBe('WOLF');
          expect(res.body.activitySlots).toHaveLength(1);
          expect(res.body.createdBy).toBeDefined();
        });
    });

    it('should reject event creation as PARENT', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      await createTestVolunteer({
        email: 'parent@example.com',
        passwordHash,
        authTier: 'PARENT',
      });

      const activityType = await createTestActivityType();

      const cookies = await loginUser('parent@example.com', password);

      return request(app.getHttpServer())
        .post('/api/events')
        .set('Cookie', cookies)
        .send({
          title: 'Unauthorized Event',
          description: 'Should not be created',
          eventDate: '2026-07-01T10:00:00Z',
          activitySlots: [
            {
              activityTypeId: activityType.id,
              capacity: 10,
            },
          ],
        })
        .expect(403);
    });

    it('should reject event with no activity slots', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: 'LEADER',
      });

      const cookies = await loginUser('leader@example.com', password);

      return request(app.getHttpServer())
        .post('/api/events')
        .set('Cookie', cookies)
        .send({
          title: 'Event Without Slots',
          description: 'Should fail',
          eventDate: '2026-07-01T10:00:00Z',
          activitySlots: [],
        })
        .expect(400);
    });

    it('should reject event with invalid activity type', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: 'LEADER',
      });

      const cookies = await loginUser('leader@example.com', password);

      return request(app.getHttpServer())
        .post('/api/events')
        .set('Cookie', cookies)
        .send({
          title: 'Event With Bad Activity',
          description: 'Should fail',
          eventDate: '2026-07-01T10:00:00Z',
          activitySlots: [
            {
              activityTypeId: 'non-existent-id',
              capacity: 10,
            },
          ],
        })
        .expect(400);
    });

    it('should set recurringEndDate when isRecurring is true', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: 'LEADER',
      });

      const activityType = await createTestActivityType();

      const cookies = await loginUser('leader@example.com', password);

      return request(app.getHttpServer())
        .post('/api/events')
        .set('Cookie', cookies)
        .send({
          title: 'Recurring Event',
          description: 'Weekly meeting',
          eventDate: '2026-06-01T10:00:00Z',
          isRecurring: true,
          activitySlots: [
            {
              activityTypeId: activityType.id,
              capacity: 10,
            },
          ],
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.isRecurring).toBe(true);
          expect(res.body.recurringEndDate).toBeDefined();
        });
    });

    it('should reject unauthenticated requests', async () => {
      const activityType = await createTestActivityType();

      return request(app.getHttpServer())
        .post('/api/events')
        .send({
          title: 'Unauthorized Event',
          description: 'Should not be created',
          eventDate: '2026-07-01T10:00:00Z',
          activitySlots: [
            {
              activityTypeId: activityType.id,
            },
          ],
        })
        .expect(401);
    });

    // User Story 1: Retroactive Event Creation
    it('should create event with past date (retroactive)', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: 'LEADER',
      });

      const activityType = await createTestActivityType();
      const cookies = await loginUser('leader@example.com', password);

      // Create event with date 5 days in the past
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      return request(app.getHttpServer())
        .post('/api/events')
        .set('Cookie', cookies)
        .send({
          title: 'Past Event',
          description: 'Event that already happened',
          eventDate: pastDate.toISOString(),
          activitySlots: [
            {
              activityTypeId: activityType.id,
              capacity: 10,
            },
          ],
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.title).toBe('Past Event');
        });
    });

    it('should create event with today date', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: 'LEADER',
      });

      const activityType = await createTestActivityType();
      const cookies = await loginUser('leader@example.com', password);

      return request(app.getHttpServer())
        .post('/api/events')
        .set('Cookie', cookies)
        .send({
          title: 'Today Event',
          description: 'Event happening today',
          eventDate: new Date().toISOString(),
          activitySlots: [
            {
              activityTypeId: activityType.id,
              capacity: 10,
            },
          ],
        })
        .expect(201);
    });
  });

  describe('GET /api/events - Retroactive Field', () => {
    it('should include isRetroactive=true for events created after event date', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      const leader = await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: 'LEADER',
      });

      // Create event with past date (retroactive)
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);
      
      await createTestEvent(leader.id, {
        title: 'Past Event',
        eventDate: pastDate,
      });

      const cookies = await loginUser('leader@example.com', password);

      return request(app.getHttpServer())
        .get('/api/events?upcoming=false')
        .set('Cookie', cookies)
        .expect(200)
        .expect((res) => {
          expect(res.body.events).toHaveLength(1);
          expect(res.body.events[0]).toHaveProperty('isRetroactive');
          expect(res.body.events[0].isRetroactive).toBe(true);
        });
    });

    it('should include isRetroactive=false for events created before event date', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      const leader = await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: 'LEADER',
      });

      // Create event with future date (planned in advance)
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      
      await createTestEvent(leader.id, {
        title: 'Future Event',
        eventDate: futureDate,
      });

      const cookies = await loginUser('leader@example.com', password);

      return request(app.getHttpServer())
        .get('/api/events')
        .set('Cookie', cookies)
        .expect(200)
        .expect((res) => {
          expect(res.body.events).toHaveLength(1);
          expect(res.body.events[0]).toHaveProperty('isRetroactive');
          expect(res.body.events[0].isRetroactive).toBe(false);
        });
    });
  });

  describe('GET /api/events/:id - Retroactive Field', () => {
    it('should include isRetroactive field in event detail', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      const leader = await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: 'LEADER',
      });

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 3);
      
      const event = await createTestEvent(leader.id, {
        title: 'Past Event',
        eventDate: pastDate,
      });

      const cookies = await loginUser('leader@example.com', password);

      return request(app.getHttpServer())
        .get(`/api/events/${event.id}`)
        .set('Cookie', cookies)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('isRetroactive');
          expect(res.body.isRetroactive).toBe(true);
        });
    });
  });

  describe('PUT /api/events/:id', () => {
    it('should update event as LEADER', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      const leader = await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: 'LEADER',
      });

      const event = await createTestEvent(leader.id, {
        title: 'Original Title',
        description: 'Original description',
        eventDate: new Date('2026-06-01'),
      });

      const cookies = await loginUser('leader@example.com', password);

      return request(app.getHttpServer())
        .put(`/api/events/${event.id}`)
        .set('Cookie', cookies)
        .send({
          title: 'Updated Title',
          description: 'Updated description',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.title).toBe('Updated Title');
          expect(res.body.description).toBe('Updated description');
        });
    });

    it('should reject update as PARENT', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      const leader = await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: 'LEADER',
      });

      await createTestVolunteer({
        email: 'parent@example.com',
        passwordHash,
        authTier: 'PARENT',
      });

      const event = await createTestEvent(leader.id);

      const cookies = await loginUser('parent@example.com', password);

      return request(app.getHttpServer())
        .put(`/api/events/${event.id}`)
        .set('Cookie', cookies)
        .send({
          title: 'Unauthorized Update',
        })
        .expect(403);
    });

    it('should reject update of non-existent event', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: 'LEADER',
      });

      const cookies = await loginUser('leader@example.com', password);

      return request(app.getHttpServer())
        .put('/api/events/non-existent-id')
        .set('Cookie', cookies)
        .send({
          title: 'Updated Title',
        })
        .expect(404);
    });

    it('should reject update of completed event', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      const leader = await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: 'LEADER',
      });

      const event = await createTestEvent(leader.id, {
        isComplete: true,
      });

      const cookies = await loginUser('leader@example.com', password);

      return request(app.getHttpServer())
        .put(`/api/events/${event.id}`)
        .set('Cookie', cookies)
        .send({
          title: 'Updated Title',
        })
        .expect(409);
    });

    it('should update event date to future date', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      const leader = await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: 'LEADER',
      });

      const event = await createTestEvent(leader.id, {
        eventDate: new Date('2026-06-01'),
      });

      const cookies = await loginUser('leader@example.com', password);

      return request(app.getHttpServer())
        .put(`/api/events/${event.id}`)
        .set('Cookie', cookies)
        .send({
          eventDate: '2026-07-15T10:00:00Z',
        })
        .expect(200)
        .expect((res) => {
          expect(new Date(res.body.eventDate)).toEqual(new Date('2026-07-15T10:00:00Z'));
        });
    });
  });

  describe('POST /api/events/:id/complete', () => {
    it('should complete event and award points as LEADER', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      const leader = await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: 'LEADER',
      });

      const participant = await createTestVolunteer({
        email: 'participant@example.com',
        passwordHash,
        authTier: 'PARENT',
      });

      const activityType = await createTestActivityType({
        name: 'Event Setup',
        pointValue: 10,
      });

      const event = await createTestEvent(leader.id, {
        title: 'Pack Meeting',
        eventDate: new Date('2026-06-01'),
      });

      // Get the activity slot
      const activitySlot = await prisma.activitySlot.findFirst({
        where: { eventId: event.id },
      });

      // Update the slot to use our test activity type
      await prisma.activitySlot.update({
        where: { id: activitySlot!.id },
        data: { activityTypeId: activityType.id },
      });

      // Sign up participant
      await prisma.signup.create({
        data: {
          volunteerId: participant.id,
          activitySlotId: activitySlot!.id,
          withdrawn: false,
        },
      });

      const cookies = await loginUser('leader@example.com', password);

      return request(app.getHttpServer())
        .post(`/api/events/${event.id}/complete`)
        .set('Cookie', cookies)
        .send({})
        .expect(201)
        .expect((res) => {
          expect(res.body.isComplete).toBe(true);
          expect(res.body.pointsAwarded).toBeDefined();
          expect(res.body.pointsAwarded.length).toBeGreaterThan(0);
          expect(res.body.pointsAwarded[0]).toHaveProperty('volunteerId');
          expect(res.body.pointsAwarded[0]).toHaveProperty('points');
          expect(res.body.pointsAwarded[0].points).toBe(10);
        });
    });

    it('should reject completion as PARENT', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      const leader = await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: 'LEADER',
      });

      await createTestVolunteer({
        email: 'parent@example.com',
        passwordHash,
        authTier: 'PARENT',
      });

      const event = await createTestEvent(leader.id);

      const cookies = await loginUser('parent@example.com', password);

      return request(app.getHttpServer())
        .post(`/api/events/${event.id}/complete`)
        .set('Cookie', cookies)
        .send({})
        .expect(403);
    });

    it('should reject completion of non-existent event', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: 'LEADER',
      });

      const cookies = await loginUser('leader@example.com', password);

      return request(app.getHttpServer())
        .post('/api/events/non-existent-id/complete')
        .set('Cookie', cookies)
        .send({})
        .expect(404);
    });

    it('should reject completion of already completed event', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      const leader = await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: 'LEADER',
      });

      const event = await createTestEvent(leader.id, {
        isComplete: true,
      });

      const cookies = await loginUser('leader@example.com', password);

      return request(app.getHttpServer())
        .post(`/api/events/${event.id}/complete`)
        .set('Cookie', cookies)
        .send({})
        .expect(409);
    });

    it('should handle manual volunteers in completion', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      const leader = await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: 'LEADER',
      });

      const manualVolunteer = await createTestVolunteer({
        email: 'manual@example.com',
        passwordHash,
        authTier: 'PARENT',
      });

      const activityType = await createTestActivityType({
        pointValue: 15,
      });

      const event = await createTestEvent(leader.id, {
        eventDate: new Date('2026-06-01'),
      });

      const activitySlot = await prisma.activitySlot.findFirst({
        where: { eventId: event.id },
      });

      await prisma.activitySlot.update({
        where: { id: activitySlot!.id },
        data: { activityTypeId: activityType.id },
      });

      const cookies = await loginUser('leader@example.com', password);

      return request(app.getHttpServer())
        .post(`/api/events/${event.id}/complete`)
        .set('Cookie', cookies)
        .send({
          manualVolunteers: [
            {
              volunteerId: manualVolunteer.id,
              activitySlotId: activitySlot!.id,
            },
          ],
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.pointsAwarded).toHaveLength(1);
          expect(res.body.pointsAwarded[0].volunteerId).toBe(manualVolunteer.id);
          expect(res.body.pointsAwarded[0].points).toBe(15);
        });
    });

    // User Story 2: Retroactive Event with Manual Volunteers
    it('should complete retroactive event with manual volunteers', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      const leader = await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: 'LEADER',
      });

      const manualVolunteer = await createTestVolunteer({
        email: 'manual@example.com',
        passwordHash,
        authTier: 'PARENT',
      });

      const activityType = await createTestActivityType({
        name: 'Event Setup',
        pointValue: 10,
      });

      // Create retroactive event (past date)
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);
      
      const event = await createTestEvent(leader.id, {
        title: 'Past Community Service',
        eventDate: pastDate,
      });

      const activitySlot = await prisma.activitySlot.findFirst({
        where: { eventId: event.id },
      });

      await prisma.activitySlot.update({
        where: { id: activitySlot!.id },
        data: { activityTypeId: activityType.id },
      });

      const cookies = await loginUser('leader@example.com', password);

      const response = await request(app.getHttpServer())
        .post(`/api/events/${event.id}/complete`)
        .set('Cookie', cookies)
        .send({
          manualVolunteers: [
            {
              volunteerId: manualVolunteer.id,
              activitySlotId: activitySlot!.id,
            },
          ],
        })
        .expect(201);

      expect(response.body.pointsAwarded).toHaveLength(1);
      expect(response.body.pointsAwarded[0].volunteerId).toBe(manualVolunteer.id);
      expect(response.body.pointsAwarded[0].points).toBe(10);

      // Verify point event was created
      const pointEvent = await prisma.pointEvent.findFirst({
        where: {
          volunteerId: manualVolunteer.id,
          referenceId: event.id,
        },
      });

      expect(pointEvent).toBeTruthy();
      expect(pointEvent!.points).toBe(10);
      expect(pointEvent!.reason).toContain('manual');
    });

    it('should verify point event reason includes manual indicator for retroactive events', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      const leader = await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: 'LEADER',
      });

      const manualVolunteer = await createTestVolunteer({
        email: 'manual2@example.com',
        passwordHash,
        authTier: 'PARENT',
      });

      const activityType = await createTestActivityType({
        name: 'Event Cleanup',
        pointValue: 5,
      });

      // Create retroactive event
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 3);
      
      const event = await createTestEvent(leader.id, {
        eventDate: pastDate,
      });

      const activitySlot = await prisma.activitySlot.findFirst({
        where: { eventId: event.id },
      });

      await prisma.activitySlot.update({
        where: { id: activitySlot!.id },
        data: { activityTypeId: activityType.id },
      });

      const cookies = await loginUser('leader@example.com', password);

      await request(app.getHttpServer())
        .post(`/api/events/${event.id}/complete`)
        .set('Cookie', cookies)
        .send({
          manualVolunteers: [
            {
              volunteerId: manualVolunteer.id,
              activitySlotId: activitySlot!.id,
            },
          ],
        })
        .expect(201);

      // Verify the reason field includes "manual"
      const pointEvent = await prisma.pointEvent.findFirst({
        where: {
          volunteerId: manualVolunteer.id,
          referenceId: event.id,
        },
      });

      expect(pointEvent).toBeTruthy();
      expect(pointEvent!.reason).toContain('manual');
      expect(pointEvent!.reason).toContain('Event Cleanup');
    });
  });

  describe('POST /api/events/:eventId/slots/:slotId/signup', () => {
    it('should allow signup for activity slot', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      const leader = await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: 'LEADER',
      });

      const volunteer = await createTestVolunteer({
        email: 'volunteer@example.com',
        passwordHash,
        authTier: 'PARENT',
      });

      const event = await createTestEvent(leader.id, {
        eventDate: new Date('2026-06-15'),
      });

      const activitySlot = await prisma.activitySlot.findFirst({
        where: { eventId: event.id },
      });

      const cookies = await loginUser('volunteer@example.com', password);

      return request(app.getHttpServer())
        .post(`/api/events/${event.id}/slots/${activitySlot!.id}/signup`)
        .set('Cookie', cookies)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.volunteerId).toBe(volunteer.id);
          expect(res.body.activitySlotId).toBe(activitySlot!.id);
          expect(res.body.withdrawn).toBe(false);
        });
    });

    it('should reject signup for non-existent slot', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      const leader = await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: 'LEADER',
      });

      await createTestVolunteer({
        email: 'volunteer@example.com',
        passwordHash,
      });

      const event = await createTestEvent(leader.id);

      const cookies = await loginUser('volunteer@example.com', password);

      return request(app.getHttpServer())
        .post(`/api/events/${event.id}/slots/non-existent-slot/signup`)
        .set('Cookie', cookies)
        .expect(404);
    });

    it('should reject signup for past event', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      const leader = await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: 'LEADER',
      });

      await createTestVolunteer({
        email: 'volunteer@example.com',
        passwordHash,
      });

      const event = await createTestEvent(leader.id, {
        eventDate: new Date('2020-01-01'),
      });

      const activitySlot = await prisma.activitySlot.findFirst({
        where: { eventId: event.id },
      });

      const cookies = await loginUser('volunteer@example.com', password);

      return request(app.getHttpServer())
        .post(`/api/events/${event.id}/slots/${activitySlot!.id}/signup`)
        .set('Cookie', cookies)
        .expect(400);
    });

    it('should reject signup for completed event', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      const leader = await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: 'LEADER',
      });

      await createTestVolunteer({
        email: 'volunteer@example.com',
        passwordHash,
      });

      const event = await createTestEvent(leader.id, {
        eventDate: new Date('2026-06-01'),
        isComplete: true,
      });

      const activitySlot = await prisma.activitySlot.findFirst({
        where: { eventId: event.id },
      });

      const cookies = await loginUser('volunteer@example.com', password);

      return request(app.getHttpServer())
        .post(`/api/events/${event.id}/slots/${activitySlot!.id}/signup`)
        .set('Cookie', cookies)
        .expect(400);
    });

    it('should reject duplicate signup', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      const leader = await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: 'LEADER',
      });

      const volunteer = await createTestVolunteer({
        email: 'volunteer@example.com',
        passwordHash,
      });

      const event = await createTestEvent(leader.id, {
        eventDate: new Date('2026-06-15'),
      });

      const activitySlot = await prisma.activitySlot.findFirst({
        where: { eventId: event.id },
      });

      // First signup
      await prisma.signup.create({
        data: {
          volunteerId: volunteer.id,
          activitySlotId: activitySlot!.id,
          withdrawn: false,
        },
      });

      const cookies = await loginUser('volunteer@example.com', password);

      return request(app.getHttpServer())
        .post(`/api/events/${event.id}/slots/${activitySlot!.id}/signup`)
        .set('Cookie', cookies)
        .expect(409);
    });

    it('should reject signup when at capacity', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      const leader = await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: 'LEADER',
      });

      const volunteer = await createTestVolunteer({
        email: 'volunteer@example.com',
        passwordHash,
      });

      const event = await createTestEvent(leader.id, {
        eventDate: new Date('2026-06-15'),
      });

      const activitySlot = await prisma.activitySlot.findFirst({
        where: { eventId: event.id },
      });

      // Set capacity to 1
      await prisma.activitySlot.update({
        where: { id: activitySlot!.id },
        data: { capacity: 1 },
      });

      // Fill the slot with another volunteer
      const other = await createTestVolunteer({
        email: 'other@example.com',
        passwordHash,
      });

      await prisma.signup.create({
        data: {
          volunteerId: other.id,
          activitySlotId: activitySlot!.id,
          withdrawn: false,
        },
      });

      const cookies = await loginUser('volunteer@example.com', password);

      return request(app.getHttpServer())
        .post(`/api/events/${event.id}/slots/${activitySlot!.id}/signup`)
        .set('Cookie', cookies)
        .expect(400);
    });

    it('should reject unauthenticated signup', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      const leader = await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: 'LEADER',
      });

      const event = await createTestEvent(leader.id);

      const activitySlot = await prisma.activitySlot.findFirst({
        where: { eventId: event.id },
      });

      return request(app.getHttpServer())
        .post(`/api/events/${event.id}/slots/${activitySlot!.id}/signup`)
        .expect(401);
    });
  });

  describe('DELETE /api/events/:eventId/slots/:slotId/signup', () => {
    it('should allow withdrawal from activity slot', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      const leader = await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: 'LEADER',
      });

      const volunteer = await createTestVolunteer({
        email: 'volunteer@example.com',
        passwordHash,
      });

      const event = await createTestEvent(leader.id, {
        eventDate: new Date('2026-06-15'),
      });

      const activitySlot = await prisma.activitySlot.findFirst({
        where: { eventId: event.id },
      });

      // Sign up first
      await prisma.signup.create({
        data: {
          volunteerId: volunteer.id,
          activitySlotId: activitySlot!.id,
          withdrawn: false,
        },
      });

      const cookies = await loginUser('volunteer@example.com', password);

      return request(app.getHttpServer())
        .delete(`/api/events/${event.id}/slots/${activitySlot!.id}/signup`)
        .set('Cookie', cookies)
        .expect(200)
        .expect((res) => {
          expect(res.body.withdrawn).toBe(true);
          expect(res.body.withdrawnAt).toBeDefined();
        });
    });

    it('should reject withdrawal from non-existent signup', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      const leader = await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: 'LEADER',
      });

      await createTestVolunteer({
        email: 'volunteer@example.com',
        passwordHash,
      });

      const event = await createTestEvent(leader.id);

      const activitySlot = await prisma.activitySlot.findFirst({
        where: { eventId: event.id },
      });

      const cookies = await loginUser('volunteer@example.com', password);

      return request(app.getHttpServer())
        .delete(`/api/events/${event.id}/slots/${activitySlot!.id}/signup`)
        .set('Cookie', cookies)
        .expect(404);
    });

    it('should reject withdrawal from already withdrawn signup', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      const leader = await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: 'LEADER',
      });

      const volunteer = await createTestVolunteer({
        email: 'volunteer@example.com',
        passwordHash,
      });

      const event = await createTestEvent(leader.id, {
        eventDate: new Date('2026-06-15'),
      });

      const activitySlot = await prisma.activitySlot.findFirst({
        where: { eventId: event.id },
      });

      // Sign up and withdraw
      await prisma.signup.create({
        data: {
          volunteerId: volunteer.id,
          activitySlotId: activitySlot!.id,
          withdrawn: true,
          withdrawnAt: new Date(),
        },
      });

      const cookies = await loginUser('volunteer@example.com', password);

      return request(app.getHttpServer())
        .delete(`/api/events/${event.id}/slots/${activitySlot!.id}/signup`)
        .set('Cookie', cookies)
        .expect(404);
    });

    it('should reject unauthenticated withdrawal', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      const leader = await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: 'LEADER',
      });

      const event = await createTestEvent(leader.id);

      const activitySlot = await prisma.activitySlot.findFirst({
        where: { eventId: event.id },
      });

      return request(app.getHttpServer())
        .delete(`/api/events/${event.id}/slots/${activitySlot!.id}/signup`)
        .expect(401);
    });
  });
});
