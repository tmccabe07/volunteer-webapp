import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuthTier, LinkStatus, RankLevel } from '@prisma/client';
import {
  createTestVolunteer,
  prisma,
  setupTests,
  teardownTests,
} from '../src/test/test-utils';

describe('Parent-Child Links API (e2e)', () => {
  let app: INestApplication;
  let parentCookies: string[];
  let adminCookies: string[];

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
    const password = 'Test123!';
    const passwordHash = await bcrypt.hash(password, 12);

    await createTestVolunteer({
      email: 'parent-link-parent@test.com',
      name: 'Parent Volunteer',
      passwordHash,
      authTier: AuthTier.PARENT,
    });

    await createTestVolunteer({
      email: 'parent-link-admin@test.com',
      name: 'Admin Volunteer',
      passwordHash,
      authTier: AuthTier.ADMIN,
    });

    parentCookies = await loginVolunteer('parent-link-parent@test.com', password);
    adminCookies = await loginVolunteer('parent-link-admin@test.com', password);
  });

  afterEach(async () => {
    await prisma.parentChildLink.deleteMany();
    await prisma.denMembership.deleteMany();
    await prisma.childScout.deleteMany();
    await prisma.den.deleteMany();
    await prisma.volunteer.deleteMany({
      where: {
        email: {
          contains: 'parent-link-',
        },
      },
    });
  });

  async function loginVolunteer(email: string, password: string): Promise<string[]> {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password });
    return response.headers['set-cookie'];
  }

  async function createCubScout() {
    const creator = await prisma.volunteer.findFirstOrThrow({
      where: { email: 'parent-link-admin@test.com' },
    });

    return prisma.childScout.create({
      data: {
        firstName: 'Test',
        lastName: 'CubScout',
        currentRank: RankLevel.WOLF,
        isActive: true,
        createdBy: creator.id,
      },
    });
  }

  it('T096: POST /api/parent-child-links/request should create a pending link request', async () => {
    const cubScout = await createCubScout();

    await request(app.getHttpServer())
      .post('/api/parent-child-links/request')
      .set('Cookie', parentCookies)
      .send({
        childScoutId: cubScout.id,
        relationshipType: 'guardian',
      })
      .expect(201)
      .expect(res => {
        expect(res.body.id).toBeDefined();
        expect(res.body.childScoutId).toBe(cubScout.id);
        expect(res.body.status).toBe(LinkStatus.PENDING);
      });
  });

  it('T097: GET /api/parent-child-links/pending should list pending requests for leaders/admins', async () => {
    const cubScout = await createCubScout();
    const parent = await prisma.volunteer.findFirstOrThrow({
      where: { email: 'parent-link-parent@test.com' },
    });

    await prisma.parentChildLink.create({
      data: {
        parentId: parent.id,
        childScoutId: cubScout.id,
        status: LinkStatus.PENDING,
        requestedBy: parent.id,
        relationshipType: 'mother',
      },
    });

    await request(app.getHttpServer())
      .get('/api/parent-child-links/pending')
      .set('Cookie', adminCookies)
      .expect(200)
      .expect(res => {
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBeGreaterThan(0);
      });
  });

  it('T098: POST /api/parent-child-links/:id/approve should approve pending request', async () => {
    const cubScout = await createCubScout();
    const parent = await prisma.volunteer.findFirstOrThrow({
      where: { email: 'parent-link-parent@test.com' },
    });

    const link = await prisma.parentChildLink.create({
      data: {
        parentId: parent.id,
        childScoutId: cubScout.id,
        status: LinkStatus.PENDING,
        requestedBy: parent.id,
      },
    });

    await request(app.getHttpServer())
      .post(`/api/parent-child-links/${link.id}/approve`)
      .set('Cookie', adminCookies)
      .expect(200)
      .expect(res => {
        expect(res.body.id).toBe(link.id);
        expect(res.body.status).toBe(LinkStatus.APPROVED);
      });
  });

  it('T099: POST /api/parent-child-links/:id/reject should reject pending request with reason', async () => {
    const cubScout = await createCubScout();
    const parent = await prisma.volunteer.findFirstOrThrow({
      where: { email: 'parent-link-parent@test.com' },
    });

    const link = await prisma.parentChildLink.create({
      data: {
        parentId: parent.id,
        childScoutId: cubScout.id,
        status: LinkStatus.PENDING,
        requestedBy: parent.id,
      },
    });

    await request(app.getHttpServer())
      .post(`/api/parent-child-links/${link.id}/reject`)
      .set('Cookie', adminCookies)
      .send({ reason: 'Unable to verify relationship' })
      .expect(200)
      .expect(res => {
        expect(res.body.id).toBe(link.id);
        expect(res.body.status).toBe(LinkStatus.REJECTED);
        expect(res.body.rejectionReason).toContain('Unable to verify relationship');
      });
  });
});
