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
import { AuthTier, RankLevel } from '@prisma/client';

/**
 * Contract tests for Den Management API (User Story 1)
 * 
 * Tests:
 * - T044: POST /api/dens (create den)
 * - T045: GET /api/dens (list dens)
 * - T046: POST /api/dens/:id/members (assign child to den)
 * - T047: GET /api/dens/:id/roster (get den roster)
 * 
 * Following TDD approach: these tests should FAIL until implementation is complete
 */
describe('Dens API (e2e)', () => {
  let app: INestApplication;
  let adminCookies: string[];
  let leaderCookies: string[];
  let parentCookies: string[];

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

  beforeEach(async () => {
    // Create test users with different tiers
    const password = 'Test123!';
    const passwordHash = await bcrypt.hash(password, 12);

    const admin = await createTestVolunteer({
      email: 'admin@test.com',
      passwordHash,
      name: 'Admin User',
      authTier: AuthTier.ADMIN,
    });

    const leader = await createTestVolunteer({
      email: 'leader@test.com',
      passwordHash,
      name: 'Den Leader',
      authTier: AuthTier.LEADER,
    });

    const parent = await createTestVolunteer({
      email: 'parent@test.com',
      passwordHash,
      name: 'Parent User',
      authTier: AuthTier.PARENT,
    });

    // Login to get cookies
    adminCookies = await loginVolunteer('admin@test.com', password);
    leaderCookies = await loginVolunteer('leader@test.com', password);
    parentCookies = await loginVolunteer('parent@test.com', password);
  });

  afterEach(async () => {
    // Clean up in dependency order
    await prisma.requirementProgress.deleteMany();
    await prisma.childAttendance.deleteMany();
    await prisma.denEvent.deleteMany();
    await prisma.denMembership.deleteMany();
    await prisma.parentChildLink.deleteMany();
    await prisma.childScout.deleteMany();
    await prisma.den.deleteMany();
    await prisma.volunteerToRole.deleteMany();
    await prisma.volunteerPointBalance.deleteMany();
    await prisma.pointEvent.deleteMany();
    await prisma.childRank.deleteMany();
    await prisma.volunteer.deleteMany();
  });

  /**
   * Helper function to login and get cookies
   */
  async function loginVolunteer(email: string, password: string): Promise<string[]> {
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password });
    
    return loginRes.headers['set-cookie'];
  }

  // ====================================================================
  // T044: Contract test for POST /dens
  // ====================================================================
  describe('POST /api/dens', () => {
    it('should create den as admin', async () => {
      const createDto = {
        name: 'Tiger Den 1',
        denNumber: 1,
        rankLevel: RankLevel.TIGER,
      };

      return request(app.getHttpServer())
        .post('/api/dens')
        .set('Cookie', adminCookies)
        .send(createDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.id).toBeDefined();
          expect(res.body.name).toBe('Tiger Den 1');
          expect(res.body.denNumber).toBe(1);
          expect(res.body.rankLevel).toBe(RankLevel.TIGER);
          expect(res.body.isActive).toBe(true);
          expect(res.body.createdAt).toBeDefined();
        });
    });

    it('should reject duplicate den number', async () => {
      // Create first den
      await prisma.den.create({
        data: {
          name: 'Wolf Den 2',
          denNumber: 2,
          rankLevel: RankLevel.WOLF,
          isActive: true,
        },
      });

      // Try to create another with same number
      const createDto = {
        name: 'Bear Den 2',
        denNumber: 2,
        rankLevel: RankLevel.BEAR,
      };

      return request(app.getHttpServer())
        .post('/api/dens')
        .set('Cookie', adminCookies)
        .send(createDto)
        .expect(409)
        .expect((res) => {
          expect(res.body.message).toContain('already in use');
        });
    });

    it('should allow reusing den number after deletion', async () => {
      // Create and delete den
      await prisma.den.create({
        data: {
          name: 'Old Den 3',
          denNumber: 3,
          rankLevel: RankLevel.AOL,
          isActive: false,
          deletedAt: new Date(),
        },
      });

      // Create new den with same number
      const createDto = {
        name: 'New Den 3',
        denNumber: 3,
        rankLevel: RankLevel.LION,
      };

      return request(app.getHttpServer())
        .post('/api/dens')
        .set('Cookie', adminCookies)
        .send(createDto)
        .expect(201);
    });

    it('should reject non-admin users', async () => {
      const createDto = {
        name: 'Test Den',
        denNumber: 5,
        rankLevel: RankLevel.WOLF,
      };

      await request(app.getHttpServer())
        .post('/api/dens')
        .set('Cookie', leaderCookies)
        .send(createDto)
        .expect(403);

      return request(app.getHttpServer())
        .post('/api/dens')
        .set('Cookie', parentCookies)
        .send(createDto)
        .expect(403);
    });

    it('should validate required fields', async () => {
      return request(app.getHttpServer())
        .post('/api/dens')
        .set('Cookie', adminCookies)
        .send({})
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('name');
          expect(res.body.message).toContain('denNumber');
          expect(res.body.message).toContain('rankLevel');
        });
    });

    it('should validate denNumber is positive', async () => {
      const createDto = {
        name: 'Test Den',
        denNumber: 0,
        rankLevel: RankLevel.WOLF,
      };

      return request(app.getHttpServer())
        .post('/api/dens')
        .set('Cookie', adminCookies)
        .send(createDto)
        .expect(400);
    });

    it('should validate rankLevel enum', async () => {
      const createDto = {
        name: 'Test Den',
        denNumber: 1,
        rankLevel: 'INVALID_RANK',
      };

      return request(app.getHttpServer())
        .post('/api/dens')
        .set('Cookie', adminCookies)
        .send(createDto)
        .expect(400);
    });

    it('should require authentication', async () => {
      const createDto = {
        name: 'Test Den',
        denNumber: 1,
        rankLevel: RankLevel.TIGER,
      };

      return request(app.getHttpServer())
        .post('/api/dens')
        .send(createDto)
        .expect(401);
    });
  });

  // ====================================================================
  // T045: Contract test for GET /dens
  // ====================================================================
  describe('GET /api/dens', () => {
    beforeEach(async () => {
      // Create test dens
      await prisma.den.createMany({
        data: [
          {
            name: 'Lion Den 1',
            denNumber: 11,
            rankLevel: RankLevel.LION,
            isActive: true,
          },
          {
            name: 'Tiger Den 2',
            denNumber: 12,
            rankLevel: RankLevel.TIGER,
            isActive: true,
          },
          {
            name: 'Wolf Den 3',
            denNumber: 13,
            rankLevel: RankLevel.WOLF,
            isActive: true,
          },
          {
            name: 'Inactive Den',
            denNumber: 99,
            rankLevel: RankLevel.BEAR,
            isActive: false,
            deletedAt: new Date(),
          },
        ],
      });
    });

    it('should list all active dens as admin', async () => {
      return request(app.getHttpServer())
        .get('/api/dens')
        .set('Cookie', adminCookies)
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveLength(3);
          expect(res.body.data.every((d: any) => d.isActive)).toBe(true);
        });
    });

    it('should filter by rankLevel', async () => {
      return request(app.getHttpServer())
        .get('/api/dens')
        .query({ rankLevel: RankLevel.WOLF })
        .set('Cookie', adminCookies)
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveLength(1);
          expect(res.body.data[0].rankLevel).toBe(RankLevel.WOLF);
        });
    });

    it('should include inactive dens when requested', async () => {
      return request(app.getHttpServer())
        .get('/api/dens')
        .query({ isActive: false })
        .set('Cookie', adminCookies)
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveLength(1);
          expect(res.body.data[0].isActive).toBe(false);
        });
    });

    it('should include current member count', async () => {
      const den = await prisma.den.findFirst({
        where: { denNumber: 11 },
      });

      // Add 2 members
      await prisma.childScout.create({
        data: {
          firstName: 'Child1',
          lastName: 'Test',
          currentRank: RankLevel.LION,
          isActive: true,
          denMemberships: {
            create: {
              denNumber: den!.denNumber,
              denId: den!.id,
              validFrom: new Date(),
            },
          },
        },
      });

      await prisma.childScout.create({
        data: {
          firstName: 'Child2',
          lastName: 'Test',
          currentRank: RankLevel.LION,
          isActive: true,
          denMemberships: {
            create: {
              denNumber: den!.denNumber,
              denId: den!.id,
              validFrom: new Date(),
            },
          },
        },
      });

      return request(app.getHttpServer())
        .get('/api/dens')
        .set('Cookie', adminCookies)
        .expect(200)
        .expect((res) => {
          const lionDen = res.body.data.find((d: any) => d.denNumber === 11);
          expect(lionDen.currentMemberCount).toBe(2);
        });
    });

    it('should allow leader access', async () => {
      return request(app.getHttpServer())
        .get('/api/dens')
        .set('Cookie', leaderCookies)
        .expect(200);
    });

    it('should deny parent access', async () => {
      return request(app.getHttpServer())
        .get('/api/dens')
        .set('Cookie', parentCookies)
        .expect(403);
    });

    it('should require authentication', async () => {
      return request(app.getHttpServer())
        .get('/api/dens')
        .expect(401);
    });
  });

  // ====================================================================
  // T046: Contract test for POST /dens/:id/members
  // ====================================================================
  describe('POST /api/dens/:id/members', () => {
    let testDen: any;
    let testChild: any;

    beforeEach(async () => {
      testDen = await prisma.den.create({
        data: {
          name: 'Test Den',
          denNumber: 20,
          rankLevel: RankLevel.BEAR,
          isActive: true,
        },
      });

      testChild = await prisma.childScout.create({
        data: {
          firstName: 'Test',
          lastName: 'Scout',
          currentRank: RankLevel.BEAR,
          isActive: true,
        },
      });
    });

    it('should assign child to den as admin', async () => {
      const assignDto = {
        childScoutId: testChild.id,
        reason: 'New Scout',
      };

      return request(app.getHttpServer())
        .post(`/api/dens/${testDen.id}/members`)
        .set('Cookie', adminCookies)
        .send(assignDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.id).toBeDefined();
          expect(res.body.denId).toBe(testDen.id);
          expect(res.body.childScoutId).toBe(testChild.id);
          expect(res.body.validFrom).toBeDefined();
          expect(res.body.validTo).toBeNull();
          expect(res.body.assignedBy).toBeDefined();
          expect(res.body.reason).toBe('New Scout');
        });
    });

    it('should assign with effective date', async () => {
      const effectiveDate = new Date('2026-09-01').toISOString();
      const assignDto = {
        childScoutId: testChild.id,
        effectiveDate,
      };

      return request(app.getHttpServer())
        .post(`/api/dens/${testDen.id}/members`)
        .set('Cookie', adminCookies)
        .send(assignDto)
        .expect(201)
        .expect((res) => {
          expect(new Date(res.body.validFrom).toISOString()).toBe(effectiveDate);
        });
    });

    it('should reject duplicate assignment', async () => {
      // Create existing membership
      await prisma.denMembership.create({
        data: {
          childId: testChild.id,
          denNumber: testDen.denNumber,
          denId: testDen.id,
          validFrom: new Date(),
        },
      });

      const assignDto = {
        childScoutId: testChild.id,
      };

      return request(app.getHttpServer())
        .post(`/api/dens/${testDen.id}/members`)
        .set('Cookie', adminCookies)
        .send(assignDto)
        .expect(409)
        .expect((res) => {
          expect(res.body.message).toContain('already assigned');
        });
    });

    it('should close existing membership when assigning to new den', async () => {
      // Create first den and assign child
      const den1 = await prisma.den.create({
        data: {
          name: 'Den 1',
          denNumber: 21,
          rankLevel: RankLevel.BEAR,
          isActive: true,
        },
      });

      await prisma.denMembership.create({
        data: {
          childId: testChild.id,
          denNumber: den1.denNumber,
          denId: den1.id,
          validFrom: new Date(),
        },
      });

      // Assign to new den
      const assignDto = {
        childScoutId: testChild.id,
        reason: 'Den Transfer',
      };

      await request(app.getHttpServer())
        .post(`/api/dens/${testDen.id}/members`)
        .set('Cookie', adminCookies)
        .send(assignDto)
        .expect(201);

      // Verify old membership was closed
      const oldMembership = await prisma.denMembership.findFirst({
        where: {
          childId: testChild.id,
          denId: den1.id,
        },
      });

      expect(oldMembership!.validTo).not.toBeNull();
    });

    it('should validate required fields', async () => {
      return request(app.getHttpServer())
        .post(`/api/dens/${testDen.id}/members`)
        .set('Cookie', adminCookies)
        .send({})
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('childScoutId');
        });
    });

    it('should return 404 for non-existent den', async () => {
      const assignDto = {
        childScoutId: testChild.id,
      };

      return request(app.getHttpServer())
        .post('/api/dens/nonexistent/members')
        .set('Cookie', adminCookies)
        .send(assignDto)
        .expect(404);
    });

    it('should return 404 for non-existent child', async () => {
      const assignDto = {
        childScoutId: 'nonexistent',
      };

      return request(app.getHttpServer())
        .post(`/api/dens/${testDen.id}/members`)
        .set('Cookie', adminCookies)
        .send(assignDto)
        .expect(404);
    });

    it('should allow leader with scope', async () => {
      const assignDto = {
        childScoutId: testChild.id,
      };

      return request(app.getHttpServer())
        .post(`/api/dens/${testDen.id}/members`)
        .set('Cookie', leaderCookies)
        .send(assignDto)
        .expect(201);
    });

    it('should deny parent access', async () => {
      const assignDto = {
        childScoutId: testChild.id,
      };

      return request(app.getHttpServer())
        .post(`/api/dens/${testDen.id}/members`)
        .set('Cookie', parentCookies)
        .send(assignDto)
        .expect(403);
    });

    it('should require authentication', async () => {
      const assignDto = {
        childScoutId: testChild.id,
      };

      return request(app.getHttpServer())
        .post(`/api/dens/${testDen.id}/members`)
        .send(assignDto)
        .expect(401);
    });
  });

  // ====================================================================
  // T047: Contract test for GET /dens/:id/roster
  // ====================================================================
  describe('GET /api/dens/:id/roster', () => {
    let testDen: any;

    beforeEach(async () => {
      testDen = await prisma.den.create({
        data: {
          name: 'Test Roster Den',
          denNumber: 30,
          rankLevel: RankLevel.WOLF,
          isActive: true,
        },
      });

      // Create children and assign to den
      const child1 = await prisma.childScout.create({
        data: {
          firstName: 'Alice',
          lastName: 'Smith',
          currentRank: RankLevel.WOLF,
          isActive: true,
        },
      });

      const child2 = await prisma.childScout.create({
        data: {
          firstName: 'Bob',
          lastName: 'Jones',
          currentRank: RankLevel.WOLF,
          isActive: true,
        },
      });

      await prisma.denMembership.createMany({
        data: [
          {
            childId: child1.id,
            denNumber: testDen.denNumber,
            denId: testDen.id,
            validFrom: new Date('2026-01-01'),
          },
          {
            childId: child2.id,
            denNumber: testDen.denNumber,
            denId: testDen.id,
            validFrom: new Date('2026-02-01'),
          },
        ],
      });

      // Add parent link for child1
      const parent = await prisma.volunteer.findFirst({
        where: { email: 'parent@test.com' },
      });

      await prisma.parentChildLink.create({
        data: {
          parentId: parent!.id,
          childId: child1.id,
          status: 'APPROVED',
          relationshipType: 'mother',
        },
      });
    });

    it('should get den roster as admin', async () => {
      return request(app.getHttpServer())
        .get(`/api/dens/${testDen.id}/roster`)
        .set('Cookie', adminCookies)
        .expect(200)
        .expect((res) => {
          expect(res.body.den).toBeDefined();
          expect(res.body.den.id).toBe(testDen.id);
          expect(res.body.den.name).toBe('Test Roster Den');
          expect(res.body.den.denNumber).toBe(30);
          expect(res.body.members).toHaveLength(2);
        });
    });

    it('should include member details', async () => {
      return request(app.getHttpServer())
        .get(`/api/dens/${testDen.id}/roster`)
        .set('Cookie', adminCookies)
        .expect(200)
        .expect((res) => {
          const alice = res.body.members.find((m: any) => m.firstName === 'Alice');
          expect(alice).toBeDefined();
          expect(alice.lastName).toBe('Smith');
          expect(alice.memberSince).toBeDefined();
        });
    });

    it('should include parent information', async () => {
      return request(app.getHttpServer())
        .get(`/api/dens/${testDen.id}/roster`)
        .set('Cookie', adminCookies)
        .expect(200)
        .expect((res) => {
          const alice = res.body.members.find((m: any) => m.firstName === 'Alice');
          expect(alice.parents).toHaveLength(1);
          expect(alice.parents[0].name).toBe('Parent User');
          expect(alice.parents[0].email).toBe('parent@test.com');
          expect(alice.parents[0].relationshipType).toBe('mother');
        });
    });

    it('should only show current members', async () => {
      // Add a former member
      const formerChild = await prisma.childScout.create({
        data: {
          firstName: 'Former',
          lastName: 'Scout',
          currentRank: RankLevel.WOLF,
          isActive: true,
        },
      });

      await prisma.denMembership.create({
        data: {
          childId: formerChild.id,
          denNumber: testDen.denNumber,
          denId: testDen.id,
          validFrom: new Date('2025-09-01'),
          validTo: new Date('2026-01-01'), // Membership ended
        },
      });

      return request(app.getHttpServer())
        .get(`/api/dens/${testDen.id}/roster`)
        .set('Cookie', adminCookies)
        .expect(200)
        .expect((res) => {
          expect(res.body.members).toHaveLength(2); // Should not include former member
          expect(res.body.members.every((m: any) => m.firstName !== 'Former')).toBe(true);
        });
    });

    it('should return 404 for non-existent den', async () => {
      return request(app.getHttpServer())
        .get('/api/dens/nonexistent/roster')
        .set('Cookie', adminCookies)
        .expect(404);
    });

    it('should allow leader with scope', async () => {
      return request(app.getHttpServer())
        .get(`/api/dens/${testDen.id}/roster`)
        .set('Cookie', leaderCookies)
        .expect(200);
    });

    it('should deny parent access', async () => {
      return request(app.getHttpServer())
        .get(`/api/dens/${testDen.id}/roster`)
        .set('Cookie', parentCookies)
        .expect(403);
    });

    it('should require authentication', async () => {
      return request(app.getHttpServer())
        .get(`/api/dens/${testDen.id}/roster`)
        .expect(401);
    });
  });
});
