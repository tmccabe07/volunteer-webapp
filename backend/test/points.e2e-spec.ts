import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import {
  setupTests,
  teardownTests,
  createTestVolunteer,
  createTestActivityType,
  prisma,
} from '../src/test/test-utils';
import * as bcrypt from 'bcrypt';
import { AuthTier, PointEventType } from '@prisma/client';

describe('Points API (e2e)', () => {
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
    await prisma.pointEvent.deleteMany();
    await prisma.volunteerPointBalance.deleteMany();
    await prisma.leaderboardCache.deleteMany();
    await prisma.badgeTierHistory.deleteMany();
    await prisma.volunteer.deleteMany();
  });

  /**
   * Helper function to login and get authentication cookies
   */
  async function loginAndGetCookies(email: string, password: string) {
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password });

    return loginRes.headers['set-cookie'];
  }

  describe('GET /api/points/me', () => {
    it('should return current volunteer\'s point history', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      const volunteer = await createTestVolunteer({
        email: 'user@example.com',
        passwordHash,
      });

      // Create point balance
      await prisma.volunteerPointBalance.create({
        data: {
          volunteerId: volunteer.id,
          totalPoints: 50,
          currentYearPoints: 30,
        },
      });

      // Create point events
      const activityType = await createTestActivityType({ pointValue: 10 });
      await prisma.pointEvent.create({
        data: {
          volunteerId: volunteer.id,
          points: 10,
          eventType: PointEventType.EVENT_PARTICIPATION,
          activityTypeId: activityType.id,
          createdById: volunteer.id,
          reason: 'Test event',
        },
      });

      const cookies = await loginAndGetCookies('user@example.com', password);

      return request(app.getHttpServer())
        .get('/api/points/me')
        .set('Cookie', cookies)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('balance');
          expect(res.body.balance.totalPoints).toBe(50);
          expect(res.body.balance.currentYearPoints).toBe(30);
          expect(res.body).toHaveProperty('pointEvents');
          expect(res.body.pointEvents).toHaveLength(1);
          expect(res.body.pointEvents[0].points).toBe(10);
          expect(res.body).toHaveProperty('pagination');
        });
    });

    it('should paginate point history results', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      const volunteer = await createTestVolunteer({
        email: 'user@example.com',
        passwordHash,
      });

      // Create 10 point events
      for (let i = 0; i < 10; i++) {
        await prisma.pointEvent.create({
          data: {
            volunteerId: volunteer.id,
            points: 5,
            eventType: PointEventType.TASK_COMPLETION,
            createdById: volunteer.id,
            reason: `Test task ${i}`,
          },
        });
      }

      const cookies = await loginAndGetCookies('user@example.com', password);

      return request(app.getHttpServer())
        .get('/api/points/me?page=1&limit=5')
        .set('Cookie', cookies)
        .expect(200)
        .expect((res) => {
          expect(res.body.pointEvents).toHaveLength(5);
          expect(res.body.pagination.page).toBe(1);
          expect(res.body.pagination.limit).toBe(5);
          expect(res.body.pagination.total).toBe(10);
        });
    });

    it('should filter point history by year', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      const volunteer = await createTestVolunteer({
        email: 'user@example.com',
        passwordHash,
      });

      // Create events in 2025
      await prisma.pointEvent.create({
        data: {
          volunteerId: volunteer.id,
          points: 10,
          eventType: PointEventType.TASK_COMPLETION,
          createdById: volunteer.id,
          reason: '2025 task',
          createdAt: new Date(2025, 5, 1), // June 1, 2025
        },
      });

      // Create events in 2026
      await prisma.pointEvent.create({
        data: {
          volunteerId: volunteer.id,
          points: 15,
          eventType: PointEventType.TASK_COMPLETION,
          createdById: volunteer.id,
          reason: '2026 task',
          createdAt: new Date(2026, 0, 15), // January 15, 2026
        },
      });

      const cookies = await loginAndGetCookies('user@example.com', password);

      return request(app.getHttpServer())
        .get('/api/points/me?year=2026')
        .set('Cookie', cookies)
        .expect(200)
        .expect((res) => {
          expect(res.body.pointEvents).toHaveLength(1);
          expect(res.body.pointEvents[0].points).toBe(15);
        });
    });

    it('should reject request without authentication', () => {
      return request(app.getHttpServer())
        .get('/api/points/me')
        .expect(401);
    });

    it('should reject invalid query parameters', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      await createTestVolunteer({
        email: 'user@example.com',
        passwordHash,
      });

      const cookies = await loginAndGetCookies('user@example.com', password);

      return request(app.getHttpServer())
        .get('/api/points/me?page=0')
        .set('Cookie', cookies)
        .expect(400);
    });

    it('should return empty results for volunteer with no points', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      await createTestVolunteer({
        email: 'user@example.com',
        passwordHash,
      });

      const cookies = await loginAndGetCookies('user@example.com', password);

      return request(app.getHttpServer())
        .get('/api/points/me')
        .set('Cookie', cookies)
        .expect(200)
        .expect((res) => {
          expect(res.body.balance.totalPoints).toBe(0);
          expect(res.body.pointEvents).toHaveLength(0);
        });
    });
  });

  describe('GET /api/points/volunteers/:volunteerId', () => {
    it('should allow volunteer to view their own points', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      const volunteer = await createTestVolunteer({
        email: 'user@example.com',
        passwordHash,
      });

      // Create point balance
      await prisma.volunteerPointBalance.create({
        data: {
          volunteerId: volunteer.id,
          totalPoints: 25,
          currentYearPoints: 25,
        },
      });

      const cookies = await loginAndGetCookies('user@example.com', password);

      return request(app.getHttpServer())
        .get(`/api/points/volunteers/${volunteer.id}`)
        .set('Cookie', cookies)
        .expect(200)
        .expect((res) => {
          expect(res.body.balance.totalPoints).toBe(25);
        });
    });

    it('should allow LEADER to view other volunteer\'s points', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      
      const leader = await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: AuthTier.LEADER,
      });

      const otherVolunteer = await createTestVolunteer({
        email: 'other@example.com',
      });

      // Create points for other volunteer
      await prisma.volunteerPointBalance.create({
        data: {
          volunteerId: otherVolunteer.id,
          totalPoints: 75,
          currentYearPoints: 50,
        },
      });

      const cookies = await loginAndGetCookies('leader@example.com', password);

      return request(app.getHttpServer())
        .get(`/api/points/volunteers/${otherVolunteer.id}`)
        .set('Cookie', cookies)
        .expect(200)
        .expect((res) => {
          expect(res.body.balance.totalPoints).toBe(75);
        });
    });

    it('should allow ADMIN to view other volunteer\'s points', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      
      const admin = await createTestVolunteer({
        email: 'admin@example.com',
        passwordHash,
        authTier: AuthTier.ADMIN,
      });

      const otherVolunteer = await createTestVolunteer({
        email: 'other@example.com',
      });

      // Create points for other volunteer
      await prisma.volunteerPointBalance.create({
        data: {
          volunteerId: otherVolunteer.id,
          totalPoints: 100,
          currentYearPoints: 60,
        },
      });

      const cookies = await loginAndGetCookies('admin@example.com', password);

      return request(app.getHttpServer())
        .get(`/api/points/volunteers/${otherVolunteer.id}`)
        .set('Cookie', cookies)
        .expect(200)
        .expect((res) => {
          expect(res.body.balance.totalPoints).toBe(100);
        });
    });

    it('should reject PARENT viewing other volunteer\'s points', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      
      const parent = await createTestVolunteer({
        email: 'parent@example.com',
        passwordHash,
        authTier: AuthTier.PARENT,
      });

      const otherVolunteer = await createTestVolunteer({
        email: 'other@example.com',
      });

      const cookies = await loginAndGetCookies('parent@example.com', password);

      return request(app.getHttpServer())
        .get(`/api/points/volunteers/${otherVolunteer.id}`)
        .set('Cookie', cookies)
        .expect(403);
    });

    it('should return 404 for non-existent volunteer', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      
      await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: AuthTier.LEADER,
      });

      const cookies = await loginAndGetCookies('leader@example.com', password);
      const fakeVolunteerId = '00000000-0000-4000-8000-000000000000';

      return request(app.getHttpServer())
        .get(`/api/points/volunteers/${fakeVolunteerId}`)
        .set('Cookie', cookies)
        .expect(404);
    });

    it('should reject request without authentication', async () => {
      const volunteer = await createTestVolunteer();

      return request(app.getHttpServer())
        .get(`/api/points/volunteers/${volunteer.id}`)
        .expect(401);
    });
  });

  describe('POST /api/points/revoke/:pointEventId', () => {
    it('should allow LEADER to revoke points', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      
      const leader = await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: AuthTier.LEADER,
      });

      const volunteer = await createTestVolunteer({
        email: 'volunteer@example.com',
      });

      // Create point balance
      await prisma.volunteerPointBalance.create({
        data: {
          volunteerId: volunteer.id,
          totalPoints: 50,
          currentYearPoints: 50,
        },
      });

      // Create point event
      const pointEvent = await prisma.pointEvent.create({
        data: {
          volunteerId: volunteer.id,
          points: 10,
          eventType: PointEventType.TASK_COMPLETION,
          createdById: leader.id,
          reason: 'Task completed',
        },
      });

      const cookies = await loginAndGetCookies('leader@example.com', password);

      return request(app.getHttpServer())
        .post(`/api/points/revoke/${pointEvent.id}`)
        .set('Cookie', cookies)
        .send({
          reason: 'Task was not actually completed',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('revocationEvent');
          expect(res.body.revocationEvent.points).toBe(-10);
          expect(res.body.revocationEvent.eventType).toBe('ADMIN_REVOCATION');
          expect(res.body.revocationEvent.referenceId).toBe(pointEvent.id);
          expect(res.body).toHaveProperty('newBalance');
          expect(res.body.newBalance.totalPoints).toBe(40);
        });
    });

    it('should allow ADMIN to revoke points', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      
      const admin = await createTestVolunteer({
        email: 'admin@example.com',
        passwordHash,
        authTier: AuthTier.ADMIN,
      });

      const volunteer = await createTestVolunteer({
        email: 'volunteer@example.com',
      });

      // Create point balance
      await prisma.volunteerPointBalance.create({
        data: {
          volunteerId: volunteer.id,
          totalPoints: 30,
          currentYearPoints: 30,
        },
      });

      // Create point event
      const pointEvent = await prisma.pointEvent.create({
        data: {
          volunteerId: volunteer.id,
          points: 15,
          eventType: PointEventType.EVENT_PARTICIPATION,
          createdById: admin.id,
          reason: 'Event participation',
        },
      });

      const cookies = await loginAndGetCookies('admin@example.com', password);

      return request(app.getHttpServer())
        .post(`/api/points/revoke/${pointEvent.id}`)
        .set('Cookie', cookies)
        .send({
          reason: 'Participant did not actually attend the event',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.revocationEvent.points).toBe(-15);
          expect(res.body.newBalance.totalPoints).toBe(15);
        });
    });

    it('should reject PARENT attempting to revoke points', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      
      const parent = await createTestVolunteer({
        email: 'parent@example.com',
        passwordHash,
        authTier: AuthTier.PARENT,
      });

      const volunteer = await createTestVolunteer({
        email: 'volunteer@example.com',
      });

      // Create point event
      const pointEvent = await prisma.pointEvent.create({
        data: {
          volunteerId: volunteer.id,
          points: 10,
          eventType: PointEventType.TASK_COMPLETION,
          createdById: volunteer.id,
          reason: 'Task completed',
        },
      });

      const cookies = await loginAndGetCookies('parent@example.com', password);

      return request(app.getHttpServer())
        .post(`/api/points/revoke/${pointEvent.id}`)
        .set('Cookie', cookies)
        .send({
          reason: 'Should not be allowed',
        })
        .expect(403);
    });

    it('should reject revoking non-existent point event', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      
      await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: AuthTier.LEADER,
      });

      const cookies = await loginAndGetCookies('leader@example.com', password);
      const fakePointEventId = '00000000-0000-4000-8000-000000000000';

      return request(app.getHttpServer())
        .post(`/api/points/revoke/${fakePointEventId}`)
        .set('Cookie', cookies)
        .send({
          reason: 'Valid reason but invalid event',
        })
        .expect(404);
    });

    it('should reject revoking already revoked points', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      
      const leader = await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: AuthTier.LEADER,
      });

      const volunteer = await createTestVolunteer({
        email: 'volunteer@example.com',
      });

      // Create already-revoked point event
      const pointEvent = await prisma.pointEvent.create({
        data: {
          volunteerId: volunteer.id,
          points: -10, // Already negative
          eventType: PointEventType.ADMIN_REVOCATION,
          createdById: leader.id,
          reason: 'Already revoked',
        },
      });

      const cookies = await loginAndGetCookies('leader@example.com', password);

      return request(app.getHttpServer())
        .post(`/api/points/revoke/${pointEvent.id}`)
        .set('Cookie', cookies)
        .send({
          reason: 'Trying to revoke again',
        })
        .expect(409);
    });

    it('should reject revocation with missing reason', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      
      const leader = await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: AuthTier.LEADER,
      });

      const volunteer = await createTestVolunteer({
        email: 'volunteer@example.com',
      });

      // Create point event
      const pointEvent = await prisma.pointEvent.create({
        data: {
          volunteerId: volunteer.id,
          points: 10,
          eventType: PointEventType.TASK_COMPLETION,
          createdById: leader.id,
          reason: 'Task completed',
        },
      });

      const cookies = await loginAndGetCookies('leader@example.com', password);

      return request(app.getHttpServer())
        .post(`/api/points/revoke/${pointEvent.id}`)
        .set('Cookie', cookies)
        .send({})
        .expect(400);
    });

    it('should reject revocation with reason too short', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      
      const leader = await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: AuthTier.LEADER,
      });

      const volunteer = await createTestVolunteer({
        email: 'volunteer@example.com',
      });

      // Create point event
      const pointEvent = await prisma.pointEvent.create({
        data: {
          volunteerId: volunteer.id,
          points: 10,
          eventType: PointEventType.TASK_COMPLETION,
          createdById: leader.id,
          reason: 'Task completed',
        },
      });

      const cookies = await loginAndGetCookies('leader@example.com', password);

      return request(app.getHttpServer())
        .post(`/api/points/revoke/${pointEvent.id}`)
        .set('Cookie', cookies)
        .send({
          reason: 'Short', // Too short (< 10 characters)
        })
        .expect(400);
    });

    it('should reject request without authentication', async () => {
      const volunteer = await createTestVolunteer();

      const pointEvent = await prisma.pointEvent.create({
        data: {
          volunteerId: volunteer.id,
          points: 10,
          eventType: PointEventType.TASK_COMPLETION,
          createdById: volunteer.id,
          reason: 'Task completed',
        },
      });

      return request(app.getHttpServer())
        .post(`/api/points/revoke/${pointEvent.id}`)
        .send({
          reason: 'Valid reason but no auth',
        })
        .expect(401);
    });
  });

  describe('GET /api/leaderboard', () => {
    it('should return leaderboard with opted-in volunteers', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      
      const user = await createTestVolunteer({
        email: 'user@example.com',
        passwordHash,
        leaderboardOptIn: true,
      });

      // Create volunteers with different points
      const volunteer1 = await createTestVolunteer({
        name: 'High Scorer',
        leaderboardOptIn: true,
      });
      const volunteer2 = await createTestVolunteer({
        name: 'Medium Scorer',
        leaderboardOptIn: true,
      });
      const volunteer3 = await createTestVolunteer({
        name: 'Low Scorer',
        leaderboardOptIn: true,
      });

      // Create leaderboard entries
      await prisma.leaderboardCache.create({
        data: {
          volunteerId: volunteer1.id,
          rank: 1,
          totalPoints: 100,
          badgeTier: 'Diamond',
        },
      });

      await prisma.leaderboardCache.create({
        data: {
          volunteerId: volunteer2.id,
          rank: 2,
          totalPoints: 50,
          badgeTier: 'Silver',
        },
      });

      await prisma.leaderboardCache.create({
        data: {
          volunteerId: volunteer3.id,
          rank: 3,
          totalPoints: 20,
          badgeTier: 'Bronze',
        },
      });

      const cookies = await loginAndGetCookies('user@example.com', password);

      return request(app.getHttpServer())
        .get('/api/leaderboard')
        .set('Cookie', cookies)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('leaderboard');
          expect(res.body.leaderboard).toHaveLength(3);
          expect(res.body.leaderboard[0].rank).toBe(1);
          expect(res.body.leaderboard[0].totalPoints).toBe(100);
          expect(res.body.leaderboard[0].badgeTier).toBe('Diamond');
          expect(res.body).toHaveProperty('currentUser');
          expect(res.body).toHaveProperty('pagination');
        });
    });

    it('should exclude opted-out volunteers from leaderboard', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      
      const user = await createTestVolunteer({
        email: 'user@example.com',
        passwordHash,
        leaderboardOptIn: true,
      });

      // Create volunteer who opted out
      const optedOutVolunteer = await createTestVolunteer({
        name: 'Opted Out',
        leaderboardOptIn: false,
      });

      // Create opted-in volunteer
      const optedInVolunteer = await createTestVolunteer({
        name: 'Opted In',
        leaderboardOptIn: true,
      });

      // Create leaderboard entries
      await prisma.leaderboardCache.create({
        data: {
          volunteerId: optedOutVolunteer.id,
          rank: 1,
          totalPoints: 100,
          badgeTier: 'Diamond',
        },
      });

      await prisma.leaderboardCache.create({
        data: {
          volunteerId: optedInVolunteer.id,
          rank: 2,
          totalPoints: 50,
          badgeTier: 'Silver',
        },
      });

      const cookies = await loginAndGetCookies('user@example.com', password);

      return request(app.getHttpServer())
        .get('/api/leaderboard')
        .set('Cookie', cookies)
        .expect(200)
        .expect((res) => {
          // Should only see opted-in volunteer
          expect(res.body.leaderboard).toHaveLength(1);
          expect(res.body.leaderboard[0].volunteer.name).toBe('Opted In');
        });
    });

    it('should paginate leaderboard results', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      
      const user = await createTestVolunteer({
        email: 'user@example.com',
        passwordHash,
        leaderboardOptIn: true,
      });

      // Create 10 volunteers with leaderboard entries
      for (let i = 0; i < 10; i++) {
        const volunteer = await createTestVolunteer({
          name: `Volunteer ${i}`,
          leaderboardOptIn: true,
        });

        await prisma.leaderboardCache.create({
          data: {
            volunteerId: volunteer.id,
            rank: i + 1,
            totalPoints: 100 - (i * 5),
            badgeTier: 'Silver',
          },
        });
      }

      const cookies = await loginAndGetCookies('user@example.com', password);

      return request(app.getHttpServer())
        .get('/api/leaderboard?page=1&limit=5')
        .set('Cookie', cookies)
        .expect(200)
        .expect((res) => {
          expect(res.body.leaderboard).toHaveLength(5);
          expect(res.body.pagination.page).toBe(1);
          expect(res.body.pagination.limit).toBe(5);
          expect(res.body.pagination.total).toBe(10);
        });
    });

    it('should return current user position if opted in', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      
      const user = await createTestVolunteer({
        email: 'user@example.com',
        passwordHash,
        leaderboardOptIn: true,
      });

      // Create leaderboard entry for current user
      await prisma.leaderboardCache.create({
        data: {
          volunteerId: user.id,
          rank: 5,
          totalPoints: 60,
          badgeTier: 'Gold',
        },
      });

      const cookies = await loginAndGetCookies('user@example.com', password);

      return request(app.getHttpServer())
        .get('/api/leaderboard')
        .set('Cookie', cookies)
        .expect(200)
        .expect((res) => {
          expect(res.body.currentUser).toBeDefined();
          expect(res.body.currentUser.rank).toBe(5);
          expect(res.body.currentUser.totalPoints).toBe(60);
        });
    });

    it('should return null rank for user with no leaderboard entry', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      
      await createTestVolunteer({
        email: 'user@example.com',
        passwordHash,
        leaderboardOptIn: true,
      });

      const cookies = await loginAndGetCookies('user@example.com', password);

      return request(app.getHttpServer())
        .get('/api/leaderboard')
        .set('Cookie', cookies)
        .expect(200)
        .expect((res) => {
          expect(res.body.currentUser.rank).toBeNull();
          expect(res.body.currentUser.totalPoints).toBe(0);
        });
    });

    it('should reject invalid pagination parameters', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      
      await createTestVolunteer({
        email: 'user@example.com',
        passwordHash,
      });

      const cookies = await loginAndGetCookies('user@example.com', password);

      return request(app.getHttpServer())
        .get('/api/leaderboard?page=0')
        .set('Cookie', cookies)
        .expect(400);
    });

    it('should reject request without authentication', () => {
      return request(app.getHttpServer())
        .get('/api/leaderboard')
        .expect(401);
    });
  });

  describe('GET /api/badge-tiers', () => {
    it('should return all badge tier definitions', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      
      await createTestVolunteer({
        email: 'user@example.com',
        passwordHash,
      });

      const cookies = await loginAndGetCookies('user@example.com', password);

      return request(app.getHttpServer())
        .get('/api/badge-tiers')
        .set('Cookie', cookies)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('tiers');
          expect(res.body.tiers.length).toBeGreaterThan(0);
          
          // Check structure of tier objects
          const tier = res.body.tiers[0];
          expect(tier).toHaveProperty('tierName');
          expect(tier).toHaveProperty('minPoints');
          expect(tier).toHaveProperty('maxPoints');
          expect(tier).toHaveProperty('displayOrder');
          expect(tier).toHaveProperty('badgeColor');
          expect(tier).toHaveProperty('iconPath');
        });
    });

    it('should return tiers in display order', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      
      await createTestVolunteer({
        email: 'user@example.com',
        passwordHash,
      });

      const cookies = await loginAndGetCookies('user@example.com', password);

      return request(app.getHttpServer())
        .get('/api/badge-tiers')
        .set('Cookie', cookies)
        .expect(200)
        .expect((res) => {
          const tiers = res.body.tiers;
          
          // Verify they are ordered by displayOrder
          for (let i = 1; i < tiers.length; i++) {
            expect(tiers[i].displayOrder).toBeGreaterThanOrEqual(tiers[i - 1].displayOrder);
          }
        });
    });

    it('should reject request without authentication', () => {
      return request(app.getHttpServer())
        .get('/api/badge-tiers')
        .expect(401);
    });
  });

  describe('GET /api/badge-tiers/me/history', () => {
    it('should return current volunteer\'s badge tier history', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      
      const volunteer = await createTestVolunteer({
        email: 'user@example.com',
        passwordHash,
      });

      // Create current tier entry
      await prisma.leaderboardCache.create({
        data: {
          volunteerId: volunteer.id,
          rank: 5,
          totalPoints: 60,
          badgeTier: 'Gold',
        },
      });

      // Create tier history
      await prisma.badgeTierHistory.create({
        data: {
          volunteerId: volunteer.id,
          oldTier: null,
          newTier: 'Bronze',
          pointsAtChange: 20,
          achievedAt: new Date('2026-01-01'),
        },
      });

      await prisma.badgeTierHistory.create({
        data: {
          volunteerId: volunteer.id,
          oldTier: 'Bronze',
          newTier: 'Gold',
          pointsAtChange: 60,
          achievedAt: new Date('2026-03-01'),
        },
      });

      const cookies = await loginAndGetCookies('user@example.com', password);

      return request(app.getHttpServer())
        .get('/api/badge-tiers/me/history')
        .set('Cookie', cookies)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('currentTier');
          expect(res.body.currentTier).toBe('Gold');
          expect(res.body).toHaveProperty('history');
          expect(res.body.history).toHaveLength(2);
          // History is returned in descending order (newest first)
          expect(res.body.history[0].newTier).toBe('Gold');
          expect(res.body.history[1].newTier).toBe('Bronze');
        });
    });

    it('should return null current tier for volunteer with no badge', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      
      await createTestVolunteer({
        email: 'user@example.com',
        passwordHash,
      });

      const cookies = await loginAndGetCookies('user@example.com', password);

      return request(app.getHttpServer())
        .get('/api/badge-tiers/me/history')
        .set('Cookie', cookies)
        .expect(200)
        .expect((res) => {
          expect(res.body.currentTier).toBeNull();
          expect(res.body.history).toHaveLength(0);
        });
    });

    it('should reject request without authentication', () => {
      return request(app.getHttpServer())
        .get('/api/badge-tiers/me/history')
        .expect(401);
    });
  });
});
