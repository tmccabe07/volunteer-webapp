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
    await prisma.activitySlotStep.deleteMany();
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

    // T039: GET event returns endTime field correctly
    it('should return endTime field for event with time range', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      await createTestVolunteer({
        email: 'parent@example.com',
        passwordHash,
      });

      const leader = await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: 'LEADER',
      });

      const event = await createTestEvent(leader.id, {
        title: 'Event With Time Range',
        eventDate: new Date('2026-06-01'),
        eventTime: '14:00',
        endTime: '16:30',
      });

      const cookies = await loginUser('parent@example.com', password);

      return request(app.getHttpServer())
        .get(`/api/events/${event.id}`)
        .set('Cookie', cookies)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(event.id);
          expect(res.body.eventTime).toBe('14:00');
          expect(res.body.endTime).toBe('16:30');
        });
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

    it('should accept event with past date for retroactive events', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: 'LEADER',
      });

      const activityType = await createTestActivityType();

      const cookies = await loginUser('leader@example.com', password);

      const response = await request(app.getHttpServer())
        .post('/api/events')
        .set('Cookie', cookies)
        .send({
          title: 'Past Event',
          description: 'Event in the past',
          eventDate: '2020-01-01T10:00:00Z',
          activitySlots: [
            {
              activityTypeId: activityType.id,
              capacity: 10,
            },
          ],
        })
        .expect(201);

      expect(response.body.title).toBe('Past Event');
      expect(response.body.eventDate).toBe('2020-01-01T10:00:00.000Z');
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

    // T033: Create event with valid start and end times
    it('should create event with start and end times', async () => {
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
          title: 'Event With Time Range',
          description: 'Event with both start and end times',
          eventDate: '2026-07-01T10:00:00Z',
          eventTime: '14:00',
          endTime: '16:30',
          activitySlots: [
            {
              activityTypeId: activityType.id,
              capacity: 10,
            },
          ],
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.eventTime).toBe('14:00');
          expect(res.body.endTime).toBe('16:30');
        });
    });

    // T034: Create event with start time only (existing behavior)
    it('should create event with start time only', async () => {
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
          title: 'Event With Start Time Only',
          description: 'Event without end time',
          eventDate: '2026-07-01T10:00:00Z',
          eventTime: '14:00',
          activitySlots: [
            {
              activityTypeId: activityType.id,
              capacity: 10,
            },
          ],
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.eventTime).toBe('14:00');
          expect(res.body.endTime).toBeNull();
        });
    });

    // T035: Reject event with end time before start time
    it('should allow event with end time before start time (midnight-spanning)', async () => {
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
          title: 'Midnight-Spanning Event',
          description: 'Event that spans midnight (logs warning)',
          eventDate: '2026-07-01T10:00:00Z',
          eventTime: '23:00',
          endTime: '01:00',
          activitySlots: [
            {
              activityTypeId: activityType.id,
              capacity: 10,
            },
          ],
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.eventTime).toBe('23:00');
          expect(res.body.endTime).toBe('01:00');
        });
    });

    // T036: Reject event with end time but no start time
    it('should reject event with end time but no start time', async () => {
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
          title: 'End Time Without Start',
          description: 'End time provided without start time',
          eventDate: '2026-07-01T10:00:00Z',
          endTime: '16:00',
          activitySlots: [
            {
              activityTypeId: activityType.id,
              capacity: 10,
            },
          ],
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.error).toBe('Invalid input');
        });
    });

    // T060: Create full-day event with fullDay=true, times=null
    it('should create full-day event with no times', async () => {
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
          title: 'Full Day Event',
          description: 'All day activity',
          eventDate: '2026-07-01T10:00:00Z',
          fullDay: true,
          activitySlots: [
            {
              activityTypeId: activityType.id,
              capacity: 10,
            },
          ],
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.title).toBe('Full Day Event');
          expect(res.body.fullDay).toBe(true);
          expect(res.body.eventTime).toBeNull();
          expect(res.body.endTime).toBeNull();
        });
    });

    // T061: Reject full-day event with times provided
    it('should reject full-day event with times provided', async () => {
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
          title: 'Invalid Full Day Event',
          description: 'Full day with times should be rejected',
          eventDate: '2026-07-01T10:00:00Z',
          fullDay: true,
          eventTime: '14:00',
          activitySlots: [
            {
              activityTypeId: activityType.id,
              capacity: 10,
            },
          ],
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.error).toBe('Invalid input');
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

    it('should accept update with past event date for retroactive events', async () => {
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

      const response = await request(app.getHttpServer())
        .put(`/api/events/${event.id}`)
        .set('Cookie', cookies)
        .send({
          eventDate: '2020-01-01T10:00:00Z',
        })
        .expect(200);

      expect(response.body.eventDate).toBe('2020-01-01T10:00:00.000Z');
    });

    // T037: Update event to add end time
    it('should update event to add end time', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      const leader = await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: 'LEADER',
      });

      const event = await createTestEvent(leader.id, {
        title: 'Event Without End Time',
        eventDate: new Date('2026-06-01'),
        eventTime: '14:00',
      });

      const cookies = await loginUser('leader@example.com', password);

      return request(app.getHttpServer())
        .put(`/api/events/${event.id}`)
        .set('Cookie', cookies)
        .send({
          endTime: '16:30',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.eventTime).toBe('14:00');
          expect(res.body.endTime).toBe('16:30');
        });
    });

    // T038: Update event to change end time
    it('should update event to change end time', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      const leader = await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: 'LEADER',
      });

      const event = await createTestEvent(leader.id, {
        title: 'Event With End Time',
        eventDate: new Date('2026-06-01'),
        eventTime: '14:00',
        endTime: '16:00',
      });

      const cookies = await loginUser('leader@example.com', password);

      return request(app.getHttpServer())
        .put(`/api/events/${event.id}`)
        .set('Cookie', cookies)
        .send({
          endTime: '17:30',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.eventTime).toBe('14:00');
          expect(res.body.endTime).toBe('17:30');
        });
    });

    // T062: Update event to convert to full-day (clears times)
    it('should update event to convert to full-day', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      const leader = await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: 'LEADER',
      });

      const event = await createTestEvent(leader.id, {
        title: 'Timed Event',
        eventDate: new Date('2026-06-01'),
        eventTime: '14:00',
        endTime: '16:00',
      });

      const cookies = await loginUser('leader@example.com', password);

      return request(app.getHttpServer())
        .put(`/api/events/${event.id}`)
        .set('Cookie', cookies)
        .send({
          fullDay: true,
          eventTime: null,
          endTime: null,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.fullDay).toBe(true);
          expect(res.body.eventTime).toBeNull();
          expect(res.body.endTime).toBeNull();
        });
    });

    // T063: Update event from full-day to timed
    it('should update event from full-day to timed', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      const leader = await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: 'LEADER',
      });

      const event = await createTestEvent(leader.id, {
        title: 'Full Day Event',
        eventDate: new Date('2026-06-01'),
        fullDay: true,
      });

      const cookies = await loginUser('leader@example.com', password);

      return request(app.getHttpServer())
        .put(`/api/events/${event.id}`)
        .set('Cookie', cookies)
        .send({
          fullDay: false,
          eventTime: '14:00',
          endTime: '16:00',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.fullDay).toBe(false);
          expect(res.body.eventTime).toBe('14:00');
          expect(res.body.endTime).toBe('16:00');
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

    it('should exclude specified signups from receiving points', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      const leader = await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: 'LEADER',
      });

      const volunteer1 = await createTestVolunteer({
        email: 'volunteer1@example.com',
        passwordHash,
        authTier: 'PARENT',
      });

      const volunteer2 = await createTestVolunteer({
        email: 'volunteer2@example.com',
        passwordHash,
        authTier: 'PARENT',
      });

      const activityType = await createTestActivityType({
        pointValue: 10,
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

      // Create two signups
      const signup1 = await prisma.signup.create({
        data: {
          volunteerId: volunteer1.id,
          activitySlotId: activitySlot!.id,
          withdrawn: false,
        },
      });

      const signup2 = await prisma.signup.create({
        data: {
          volunteerId: volunteer2.id,
          activitySlotId: activitySlot!.id,
          withdrawn: false,
        },
      });

      const cookies = await loginUser('leader@example.com', password);

      // Exclude volunteer2 who didn't show up
      return request(app.getHttpServer())
        .post(`/api/events/${event.id}/complete`)
        .set('Cookie', cookies)
        .send({
          excludedSignupIds: [signup2.id],
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.isComplete).toBe(true);
          expect(res.body.pointsAwarded).toHaveLength(1);
          expect(res.body.pointsAwarded[0].volunteerId).toBe(volunteer1.id);
          expect(res.body.pointsAwarded[0].points).toBe(10);
        });
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

  // Phase 5: User Story 3 - Activity Slot Descriptions
  describe('Activity Slot Descriptions (US3)', () => {
    // T082: Create activity slot with description
    it('should create activity slot with custom description', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: 'LEADER',
      });

      const activityType = await createTestActivityType({
        name: 'Event Volunteer US3',
        pointValue: 5,
      });

      const cookies = await loginUser('leader@example.com', password);

      return request(app.getHttpServer())
        .post('/api/events')
        .set('Cookie', cookies)
        .send({
          title: 'Spring Campout',
          description: 'Outdoor camping event',
          eventDate: '2026-07-01T10:00:00Z',
          activitySlots: [
            {
              activityTypeId: activityType.id,
              capacity: 5,
              description: 'Run Lion station for safety',
            },
          ],
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.activitySlots).toHaveLength(1);
          expect(res.body.activitySlots[0].description).toBe('Run Lion station for safety');
        });
    });

    // T083: Create activity slot without description (null)
    it('should create activity slot without description (defaults to null)', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: 'LEADER',
      });

      const activityType = await createTestActivityType({
        name: 'Event Volunteer US3-2',
        pointValue: 5,
      });

      const cookies = await loginUser('leader@example.com', password);

      return request(app.getHttpServer())
        .post('/api/events')
        .set('Cookie', cookies)
        .send({
          title: 'Summer BBQ',
          eventDate: '2026-08-01T10:00:00Z',
          activitySlots: [
            {
              activityTypeId: activityType.id,
              capacity: 10,
              // No description provided
            },
          ],
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.activitySlots).toHaveLength(1);
          expect(res.body.activitySlots[0].description).toBeNull();
        });
    });

    // T084: Reject description > 500 chars
    it('should reject activity slot description exceeding 500 characters', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: 'LEADER',
      });

      const activityType = await createTestActivityType();

      const cookies = await loginUser('leader@example.com', password);

      const longDescription = 'A'.repeat(501); // 501 characters

      return request(app.getHttpServer())
        .post('/api/events')
        .set('Cookie', cookies)
        .send({
          title: 'Event With Long Description',
          eventDate: '2026-07-01T10:00:00Z',
          activitySlots: [
            {
              activityTypeId: activityType.id,
              capacity: 10,
              description: longDescription,
            },
          ],
        })
        .expect(400);
    });

    // T085: Update activity slot description
    it('should update activity slot description via event update', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      const leader = await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: 'LEADER',
      });

      const activityType = await createTestActivityType();

      const event = await createTestEvent(leader.id, {
        title: 'Event To Update',
        eventDate: new Date('2026-07-01'),
      });

      const cookies = await loginUser('leader@example.com', password);

      return request(app.getHttpServer())
        .put(`/api/events/${event.id}`)
        .set('Cookie', cookies)
        .send({
          title: 'Updated Event',
          activitySlots: [
            {
              activityTypeId: activityType.id,
              capacity: 5,
              description: 'Updated: Lead campfire songs and stories',
            },
          ],
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.activitySlots).toHaveLength(1);
          expect(res.body.activitySlots[0].description).toBe('Updated: Lead campfire songs and stories');
        });
    });

    // T086: Clear description (set to null)
    it('should allow clearing activity slot description', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      const leader = await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: 'LEADER',
      });

      const activityType = await createTestActivityType();

      const event = await createTestEvent(leader.id, {
        title: 'Event With Description',
        eventDate: new Date('2026-07-01'),
      });

      const cookies = await loginUser('leader@example.com', password);

      return request(app.getHttpServer())
        .put(`/api/events/${event.id}`)
        .set('Cookie', cookies)
        .send({
          title: 'Event With Description',
          activitySlots: [
            {
              activityTypeId: activityType.id,
              capacity: 5,
              // Don't include description field to clear it
            },
          ],
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.activitySlots).toHaveLength(1);
          expect(res.body.activitySlots[0].description).toBeNull();
        });
    });

    // Verify GET returns description field
    it('should return description field when retrieving event details', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      const leader = await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: 'LEADER',
      });

      const activityType = await createTestActivityType();

      // Create event with description via direct prisma call (simulating complete flow)
      const event = await prisma.event.create({
        data: {
          title: 'Event With Custom Slot Description',
          eventDate: new Date('2026-07-01'),
          createdById: leader.id,
          activitySlots: {
            create: [
              {
                activityTypeId: activityType.id,
                capacity: 5,
                description: 'Custom description for this slot',
              },
            ],
          },
        },
        include: {
          activitySlots: true,
        },
      });

      await createTestVolunteer({
        email: 'parent@example.com',
        passwordHash,
        authTier: 'PARENT',
      });

      const cookies = await loginUser('parent@example.com', password);

      return request(app.getHttpServer())
        .get(`/api/events/${event.id}`)
        .set('Cookie', cookies)
        .expect(200)
        .expect((res) => {
          expect(res.body.activitySlots).toHaveLength(1);
          expect(res.body.activitySlots[0]).toHaveProperty('description');
          expect(res.body.activitySlots[0].description).toBe('Custom description for this slot');
        });
    });

    // Regression test: Multiple slots with same activity type but different descriptions
    it('should allow multiple activity slots with same activity type and different descriptions', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: 'LEADER',
      });

      const activityType = await createTestActivityType({
        name: 'Event Volunteer Multi',
        pointValue: 5,
      });

      const cookies = await loginUser('leader@example.com', password);

      return request(app.getHttpServer())
        .post('/api/events')
        .set('Cookie', cookies)
        .send({
          title: 'Multi-Station Event',
          description: 'Event with multiple stations using same activity type',
          eventDate: '2026-09-01T10:00:00Z',
          activitySlots: [
            {
              activityTypeId: activityType.id,
              capacity: 2,
              description: 'Station 1: Setup chairs and tables',
            },
            {
              activityTypeId: activityType.id,
              capacity: 3,
              description: 'Station 2: Manage registration desk',
            },
            {
              activityTypeId: activityType.id,
              capacity: 2,
              description: 'Station 3: Lead cleanup crew',
            },
          ],
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.activitySlots).toHaveLength(3);
          expect(res.body.activitySlots[0].description).toBe('Station 1: Setup chairs and tables');
          expect(res.body.activitySlots[0].activityType.name).toBe('Event Volunteer Multi');
          expect(res.body.activitySlots[1].description).toBe('Station 2: Manage registration desk');
          expect(res.body.activitySlots[1].activityType.name).toBe('Event Volunteer Multi');
          expect(res.body.activitySlots[2].description).toBe('Station 3: Lead cleanup crew');
          expect(res.body.activitySlots[2].activityType.name).toBe('Event Volunteer Multi');
        });
    });
  });

  describe('Activity Slot Steps (US4)', () => {
    // T121: Create activity slot with steps
    it('should create event with activity slot containing steps', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      const leader = await createTestVolunteer({
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
          title: 'Event with Steps',
          description: 'Test event with numbered steps',
          eventDate: '2026-07-15T10:00:00Z',
          activitySlots: [
            {
              activityTypeId: activityType.id,
              capacity: 5,
              description: 'Run Lion station for safety',
              steps: [
                { stepText: 'Gather the lions in a circle' },
                { stepText: 'Hand out the role placards' },
                { stepText: 'Explain the game rules' },
              ],
            },
          ],
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.activitySlots).toHaveLength(1);
          const slot = res.body.activitySlots[0];
          expect(slot.steps).toHaveLength(3);
          expect(slot.steps[0].stepText).toBe('Gather the lions in a circle');
          expect(slot.steps[0].orderIndex).toBe(0);
          expect(slot.steps[1].stepText).toBe('Hand out the role placards');
          expect(slot.steps[1].orderIndex).toBe(1);
          expect(slot.steps[2].stepText).toBe('Explain the game rules');
          expect(slot.steps[2].orderIndex).toBe(2);
        });
    });

    // T122: Add step to activity slot (POST)
    it('should add a step to existing activity slot', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      const leader = await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: 'LEADER',
      });

      const activityType = await createTestActivityType();
      const event = await createTestEvent(leader.id, {
        title: 'Event with Activity Slot',
        eventDate: new Date('2026-07-15'),
      });

      // Get activity slot from event
      const activitySlot = await prisma.activitySlot.findFirst({
        where: { eventId: event.id },
      });

      const cookies = await loginUser('leader@example.com', password);

      return request(app.getHttpServer())
        .post(`/api/activity-slots/${activitySlot!.id}/steps`)
        .set('Cookie', cookies)
        .send({ stepText: 'New step instruction' })
        .expect(201)
        .expect((res) => {
          expect(res.body.step).toBeDefined();
          expect(res.body.step.stepText).toBe('New step instruction');
          expect(res.body.step.activitySlotId).toBe(activitySlot!.id);
          expect(res.body.step.orderIndex).toBe(0);
        });
    });

    // T123: Remove step and verify renumbering
    it('should remove step and renumber remaining steps', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      const leader = await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: 'LEADER',
      });

      const activityType = await createTestActivityType();
      const event = await createTestEvent(leader.id, {
        title: 'Event with Steps',
        eventDate: new Date('2026-07-15'),
      });

      const activitySlot = await prisma.activitySlot.findFirst({
        where: { eventId: event.id },
      });

      // Create 3 steps
      const step1 = await prisma.activitySlotStep.create({
        data: { activitySlotId: activitySlot!.id, orderIndex: 0, stepText: 'Step 1' },
      });
      const step2 = await prisma.activitySlotStep.create({
        data: { activitySlotId: activitySlot!.id, orderIndex: 1, stepText: 'Step 2' },
      });
      const step3 = await prisma.activitySlotStep.create({
        data: { activitySlotId: activitySlot!.id, orderIndex: 2, stepText: 'Step 3' },
      });

      const cookies = await loginUser('leader@example.com', password);

      // Delete middle step
      await request(app.getHttpServer())
        .delete(`/api/activity-slots/${activitySlot!.id}/steps/${step2.id}`)
        .set('Cookie', cookies)
        .expect(204);

      // Verify remaining steps are renumbered
      const remainingSteps = await prisma.activitySlotStep.findMany({
        where: { activitySlotId: activitySlot!.id },
        orderBy: { orderIndex: 'asc' },
      });

      expect(remainingSteps).toHaveLength(2);
      expect(remainingSteps[0].id).toBe(step1.id);
      expect(remainingSteps[0].orderIndex).toBe(0);
      expect(remainingSteps[1].id).toBe(step3.id);
      expect(remainingSteps[1].orderIndex).toBe(1); // Renumbered from 2 to 1
    });

    // T124: Reorder steps with valid stepIds
    it('should reorder steps correctly', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      const leader = await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: 'LEADER',
      });

      const event = await createTestEvent(leader.id, {
        title: 'Event with Steps',
        eventDate: new Date('2026-07-15'),
      });

      const activitySlot = await prisma.activitySlot.findFirst({
        where: { eventId: event.id },
      });

      // Create 3 steps
      const step1 = await prisma.activitySlotStep.create({
        data: { activitySlotId: activitySlot!.id, orderIndex: 0, stepText: 'Step 1' },
      });
      const step2 = await prisma.activitySlotStep.create({
        data: { activitySlotId: activitySlot!.id, orderIndex: 1, stepText: 'Step 2' },
      });
      const step3 = await prisma.activitySlotStep.create({
        data: { activitySlotId: activitySlot!.id, orderIndex: 2, stepText: 'Step 3' },
      });

      const cookies = await loginUser('leader@example.com', password);

      // Reorder: [1, 2, 3] -> [3, 1, 2]
      return request(app.getHttpServer())
        .patch(`/api/activity-slots/${activitySlot!.id}/steps/reorder`)
        .set('Cookie', cookies)
        .send({ stepIds: [step3.id, step1.id, step2.id] })
        .expect(200)
        .expect((res) => {
          expect(res.body.steps).toHaveLength(3);
          expect(res.body.steps[0].id).toBe(step3.id);
          expect(res.body.steps[0].orderIndex).toBe(0);
          expect(res.body.steps[1].id).toBe(step1.id);
          expect(res.body.steps[1].orderIndex).toBe(1);
          expect(res.body.steps[2].id).toBe(step2.id);
          expect(res.body.steps[2].orderIndex).toBe(2);
        });
    });

    // T125: Reject > 20 steps (400 error)
    it('should reject more than 20 steps per activity slot', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      const leader = await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: 'LEADER',
      });

      const activityType = await createTestActivityType();
      const cookies = await loginUser('leader@example.com', password);

      const steps = Array.from({ length: 21 }, (_, i) => ({
        stepText: `Step ${i + 1}`,
      }));

      return request(app.getHttpServer())
        .post('/api/events')
        .set('Cookie', cookies)
        .send({
          title: 'Event with Too Many Steps',
          eventDate: '2026-07-15T10:00:00Z',
          activitySlots: [
            {
              activityTypeId: activityType.id,
              capacity: 5,
              steps,
            },
          ],
        })
        .expect(400);
    });

    // T126: Reject empty stepText (400 error)
    it('should reject empty stepText', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      const leader = await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: 'LEADER',
      });

      const event = await createTestEvent(leader.id, {
        title: 'Event',
        eventDate: new Date('2026-07-15'),
      });

      const activitySlot = await prisma.activitySlot.findFirst({
        where: { eventId: event.id },
      });

      const cookies = await loginUser('leader@example.com', password);

      return request(app.getHttpServer())
        .post(`/api/activity-slots/${activitySlot!.id}/steps`)
        .set('Cookie', cookies)
        .send({ stepText: '' })
        .expect(400);
    });

    // T127: Reject stepText > 200 chars (400 error)
    it('should reject stepText exceeding 200 characters', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      const leader = await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: 'LEADER',
      });

      const event = await createTestEvent(leader.id, {
        title: 'Event',
        eventDate: new Date('2026-07-15'),
      });

      const activitySlot = await prisma.activitySlot.findFirst({
        where: { eventId: event.id },
      });

      const cookies = await loginUser('leader@example.com', password);

      const longStepText = 'a'.repeat(201);

      return request(app.getHttpServer())
        .post(`/api/activity-slots/${activitySlot!.id}/steps`)
        .set('Cookie', cookies)
        .send({ stepText: longStepText })
        .expect(400);
    });

    // T128: GET activity slot returns steps in correct order
    it('should return steps in correct order when fetching event', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      const leader = await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: 'LEADER',
      });

      const activityType = await createTestActivityType();
      const cookies = await loginUser('leader@example.com', password);

      // Create event with steps
      const createRes = await request(app.getHttpServer())
        .post('/api/events')
        .set('Cookie', cookies)
        .send({
          title: 'Event with Ordered Steps',
          eventDate: '2026-07-15T10:00:00Z',
          activitySlots: [
            {
              activityTypeId: activityType.id,
              capacity: 5,
              steps: [
                { stepText: 'First step' },
                { stepText: 'Second step' },
                { stepText: 'Third step' },
              ],
            },
          ],
        })
        .expect(201);

      const eventId = createRes.body.id;

      // Fetch event and verify step order
      return request(app.getHttpServer())
        .get(`/api/events/${eventId}`)
        .set('Cookie', cookies)
        .expect(200)
        .expect((res) => {
          const slot = res.body.activitySlots[0];
          expect(slot.steps).toHaveLength(3);
          expect(slot.steps[0].stepText).toBe('First step');
          expect(slot.steps[0].orderIndex).toBe(0);
          expect(slot.steps[1].stepText).toBe('Second step');
          expect(slot.steps[1].orderIndex).toBe(1);
          expect(slot.steps[2].stepText).toBe('Third step');
          expect(slot.steps[2].orderIndex).toBe(2);
        });
    });
  });
});
