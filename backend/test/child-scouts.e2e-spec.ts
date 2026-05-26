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
 * Contract tests for Child Scout Management API (User Story 1)
 * 
 * Tests:
 * - T041: POST /api/child-scouts (create child record)
 * - T042: GET /api/child-scouts (list accessible children)
 * - T043: GET /api/child-scouts/:id (get child details)
 * 
 * Following TDD approach: these tests should FAIL until implementation is complete
 */
describe('Child Scouts API (e2e)', () => {
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
  // T041: Contract test for POST /child-scouts
  // ====================================================================
  describe('POST /api/child-scouts', () => {
    it('should create child scout as admin', async () => {
      const createDto = {
        firstName: 'John',
        lastName: 'Doe',
        currentRank: RankLevel.WOLF,
      };

      return request(app.getHttpServer())
        .post('/api/child-scouts')
        .set('Cookie', adminCookies)
        .send(createDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.id).toBeDefined();
          expect(res.body.firstName).toBe('John');
          expect(res.body.lastName).toBe('Doe');
          expect(res.body.currentRank).toBe(RankLevel.WOLF);
          expect(res.body.isActive).toBe(true);
          expect(res.body.createdAt).toBeDefined();
          expect(res.body.createdBy).toBeDefined();
        });
    });

    it('should create child scout with scoutbookId', async () => {
      const createDto = {
        firstName: 'Jane',
        lastName: 'Smith',
        currentRank: RankLevel.BEAR,
        scoutbookId: 'SB12345',
      };

      return request(app.getHttpServer())
        .post('/api/child-scouts')
        .set('Cookie', adminCookies)
        .send(createDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.scoutbookId).toBe('SB12345');
        });
    });

    it('should reject non-admin users', async () => {
      const createDto = {
        firstName: 'Test',
        lastName: 'Child',
        currentRank: RankLevel.TIGER,
      };

      await request(app.getHttpServer())
        .post('/api/child-scouts')
        .set('Cookie', leaderCookies)
        .send(createDto)
        .expect(403);

      return request(app.getHttpServer())
        .post('/api/child-scouts')
        .set('Cookie', parentCookies)
        .send(createDto)
        .expect(403);
    });

    it('should validate required fields', async () => {
      return request(app.getHttpServer())
        .post('/api/child-scouts')
        .set('Cookie', adminCookies)
        .send({})
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('firstName');
          expect(res.body.message).toContain('lastName');
          expect(res.body.message).toContain('currentRank');
        });
    });

    it('should validate firstName length', async () => {
      const createDto = {
        firstName: 'A'.repeat(51), // Too long
        lastName: 'Doe',
        currentRank: RankLevel.WOLF,
      };

      return request(app.getHttpServer())
        .post('/api/child-scouts')
        .set('Cookie', adminCookies)
        .send(createDto)
        .expect(400);
    });

    it('should validate currentRank enum', async () => {
      const createDto = {
        firstName: 'John',
        lastName: 'Doe',
        currentRank: 'INVALID_RANK',
      };

      return request(app.getHttpServer())
        .post('/api/child-scouts')
        .set('Cookie', adminCookies)
        .send(createDto)
        .expect(400);
    });

    it('should require authentication', async () => {
      const createDto = {
        firstName: 'Test',
        lastName: 'Child',
        currentRank: RankLevel.LION,
      };

      return request(app.getHttpServer())
        .post('/api/child-scouts')
        .send(createDto)
        .expect(401);
    });
  });

  // ====================================================================
  // T042: Contract test for GET /child-scouts
  // ====================================================================
  describe('GET /api/child-scouts', () => {
    beforeEach(async () => {
      // Create test children
      await prisma.childScout.createMany({
        data: [
          {
            firstName: 'Lion',
            lastName: 'Cub',
            currentRank: RankLevel.LION,
            isActive: true,
          },
          {
            firstName: 'Tiger',
            lastName: 'Cub',
            currentRank: RankLevel.TIGER,
            isActive: true,
          },
          {
            firstName: 'Wolf',
            lastName: 'Cub',
            currentRank: RankLevel.WOLF,
            isActive: true,
          },
          {
            firstName: 'Inactive',
            lastName: 'Scout',
            currentRank: RankLevel.BEAR,
            isActive: false,
          },
        ],
      });
    });

    it('should list all children as admin', async () => {
      return request(app.getHttpServer())
        .get('/api/child-scouts')
        .set('Cookie', adminCookies)
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveLength(3); // Only active by default
          expect(res.body.pagination).toBeDefined();
          expect(res.body.pagination.total).toBe(3);
        });
    });

    it('should filter by rankLevel', async () => {
      return request(app.getHttpServer())
        .get('/api/child-scouts')
        .query({ rankLevel: RankLevel.WOLF })
        .set('Cookie', adminCookies)
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveLength(1);
          expect(res.body.data[0].currentRank).toBe(RankLevel.WOLF);
        });
    });

    it('should include inactive children when requested', async () => {
      return request(app.getHttpServer())
        .get('/api/child-scouts')
        .query({ isActive: false })
        .set('Cookie', adminCookies)
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveLength(1);
          expect(res.body.data[0].isActive).toBe(false);
        });
    });

    it('should paginate results', async () => {
      return request(app.getHttpServer())
        .get('/api/child-scouts')
        .query({ page: 1, limit: 2 })
        .set('Cookie', adminCookies)
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveLength(2);
          expect(res.body.pagination.limit).toBe(2);
          expect(res.body.pagination.totalPages).toBe(2);
        });
    });

    it('should enforce max limit', async () => {
      return request(app.getHttpServer())
        .get('/api/child-scouts')
        .query({ limit: 200 })
        .set('Cookie', adminCookies)
        .expect(200)
        .expect((res) => {
          expect(res.body.pagination.limit).toBeLessThanOrEqual(100);
        });
    });

    it('should return only linked children for parents', async () => {
      // Create child and approved link
      const child = await prisma.childScout.create({
        data: {
          firstName: 'My',
          lastName: 'Child',
          currentRank: RankLevel.TIGER,
          isActive: true,
        },
      });

      const parent = await prisma.volunteer.findFirst({
        where: { email: 'parent@test.com' },
      });

      await prisma.parentChildLink.create({
        data: {
          parentId: parent!.id,
          childId: child.id,
          status: 'APPROVED',
        },
      });

      return request(app.getHttpServer())
        .get('/api/child-scouts')
        .set('Cookie', parentCookies)
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveLength(1);
          expect(res.body.data[0].id).toBe(child.id);
        });
    });

    it('should require authentication', async () => {
      return request(app.getHttpServer())
        .get('/api/child-scouts')
        .expect(401);
    });
  });

  // ====================================================================
  // T043: Contract test for GET /child-scouts/:id
  // ====================================================================
  describe('GET /api/child-scouts/:id', () => {
    let testChild: any;

    beforeEach(async () => {
      testChild = await prisma.childScout.create({
        data: {
          firstName: 'Test',
          lastName: 'Scout',
          currentRank: RankLevel.BEAR,
          scoutbookId: 'SB999',
          isActive: true,
        },
      });
    });

    it('should get child details as admin', async () => {
      return request(app.getHttpServer())
        .get(`/api/child-scouts/${testChild.id}`)
        .set('Cookie', adminCookies)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(testChild.id);
          expect(res.body.firstName).toBe('Test');
          expect(res.body.lastName).toBe('Scout');
          expect(res.body.currentRank).toBe(RankLevel.BEAR);
          expect(res.body.scoutbookId).toBe('SB999');
          expect(res.body.isActive).toBe(true);
          expect(res.body.parentLinks).toBeDefined();
          expect(res.body.createdAt).toBeDefined();
          expect(res.body.updatedAt).toBeDefined();
        });
    });

    it('should include current den if assigned', async () => {
      // Create den and assign child
      const den = await prisma.den.create({
        data: {
          name: 'Bear Den 1',
          denNumber: 10,
          rankLevel: RankLevel.BEAR,
          isActive: true,
        },
      });

      await prisma.denMembership.create({
        data: {
          childId: testChild.id,
          denNumber: den.denNumber,
          denId: den.id,
          validFrom: new Date(),
        },
      });

      return request(app.getHttpServer())
        .get(`/api/child-scouts/${testChild.id}`)
        .set('Cookie', adminCookies)
        .expect(200)
        .expect((res) => {
          expect(res.body.currentDen).toBeDefined();
          expect(res.body.currentDen.id).toBe(den.id);
          expect(res.body.currentDen.name).toBe('Bear Den 1');
          expect(res.body.currentDen.denNumber).toBe(10);
        });
    });

    it('should include parent links', async () => {
      const parent = await prisma.volunteer.findFirst({
        where: { email: 'parent@test.com' },
      });

      await prisma.parentChildLink.create({
        data: {
          parentId: parent!.id,
          childId: testChild.id,
          status: 'APPROVED',
          relationshipType: 'father',
        },
      });

      return request(app.getHttpServer())
        .get(`/api/child-scouts/${testChild.id}`)
        .set('Cookie', adminCookies)
        .expect(200)
        .expect((res) => {
          expect(res.body.parentLinks).toHaveLength(1);
          expect(res.body.parentLinks[0].parentName).toBe('Parent User');
          expect(res.body.parentLinks[0].status).toBe('APPROVED');
          expect(res.body.parentLinks[0].relationshipType).toBe('father');
        });
    });

    it('should allow access with approved parent link', async () => {
      const parent = await prisma.volunteer.findFirst({
        where: { email: 'parent@test.com' },
      });

      await prisma.parentChildLink.create({
        data: {
          parentId: parent!.id,
          childId: testChild.id,
          status: 'APPROVED',
        },
      });

      return request(app.getHttpServer())
        .get(`/api/child-scouts/${testChild.id}`)
        .set('Cookie', parentCookies)
        .expect(200);
    });

    it('should deny access without approved link', async () => {
      return request(app.getHttpServer())
        .get(`/api/child-scouts/${testChild.id}`)
        .set('Cookie', parentCookies)
        .expect(403);
    });

    it('should return 404 for non-existent child', async () => {
      return request(app.getHttpServer())
        .get('/api/child-scouts/nonexistent')
        .set('Cookie', adminCookies)
        .expect(404);
    });

    it('should require authentication', async () => {
      return request(app.getHttpServer())
        .get(`/api/child-scouts/${testChild.id}`)
        .expect(401);
    });
  });
});
