import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import {
  AdventureType,
  AuthTier,
  AwardState,
  CompletionType,
  LinkStatus,
  RankLevel,
  ReconciliationStatus,
} from '@prisma/client';
import {
  createTestVolunteer,
  prisma,
  setupTests,
  teardownTests,
} from '../src/test/test-utils';

describe('Advancement API (e2e)', () => {
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
      email: 'adv-parent@test.com',
      name: 'Adv Parent',
      passwordHash,
      authTier: AuthTier.PARENT,
    });

    await createTestVolunteer({
      email: 'adv-admin@test.com',
      name: 'Adv Admin',
      passwordHash,
      authTier: AuthTier.ADMIN,
    });

    parentCookies = await loginVolunteer('adv-parent@test.com', password);
    adminCookies = await loginVolunteer('adv-admin@test.com', password);
  });

  afterEach(async () => {
    await prisma.awardStateHistory.deleteMany();
    await prisma.awardItem.deleteMany();
    await prisma.requirementProgress.deleteMany();
    await prisma.requirement.deleteMany();
    await prisma.adventure.deleteMany();
    await prisma.rank.deleteMany();
    await prisma.parentChildLink.deleteMany();
    await prisma.denMembership.deleteMany();
    await prisma.childScout.deleteMany();
    await prisma.den.deleteMany();
    await prisma.volunteer.deleteMany({
      where: {
        email: {
          contains: 'adv-',
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

  async function seedRankAdventureRequirement() {
    const rank = await prisma.rank.create({
      data: {
        rankLevel: RankLevel.WOLF,
        displayName: 'Wolf',
        displayOrder: 3,
        requiredAdventureCount: 1,
        electiveAdventureCount: 0,
      },
    });

    const adventure = await prisma.adventure.create({
      data: {
        rankId: rank.id,
        name: 'Call of the Wild',
        classification: AdventureType.REQUIRED,
        displayOrder: 1,
      },
    });

    const requirement = await prisma.requirement.create({
      data: {
        adventureId: adventure.id,
        displayOrder: 1,
        requirementText: 'Complete one outdoor skills requirement',
      },
    });

    return { rank, adventure, requirement };
  }

  async function seedCubScoutAndApprovedParentLink() {
    const admin = await prisma.volunteer.findFirstOrThrow({
      where: { email: 'adv-admin@test.com' },
    });

    const cubScout = await prisma.childScout.create({
      data: {
        firstName: 'Adv',
        lastName: 'CubScout',
        currentRank: RankLevel.WOLF,
        isActive: true,
        createdBy: admin.id,
      },
    });

    const parent = await prisma.volunteer.findFirstOrThrow({
      where: { email: 'adv-parent@test.com' },
    });

    await prisma.parentChildLink.create({
      data: {
        parentId: parent.id,
        childScoutId: cubScout.id,
        status: LinkStatus.APPROVED,
        requestedBy: parent.id,
        processedBy: parent.id,
        processedAt: new Date(),
      },
    });

    return { cubScout, parent };
  }

  it('T100: POST /api/requirements/:id/complete should create requirement progress', async () => {
    const { requirement } = await seedRankAdventureRequirement();
    const { cubScout } = await seedCubScoutAndApprovedParentLink();

    await request(app.getHttpServer())
      .post(`/api/requirements/${requirement.id}/complete`)
      .set('Cookie', parentCookies)
      .send({
        childScoutId: cubScout.id,
        completionType: CompletionType.PARENT_SUBMIT,
        notes: 'Completed at home',
      })
      .expect(201)
      .expect(res => {
        expect(res.body.id).toBeDefined();
        expect(res.body.requirementId).toBe(requirement.id);
        expect(res.body.childScoutId).toBe(cubScout.id);
        expect(res.body.scoutbookStatus).toBe(ReconciliationStatus.PENDING);
      });
  });

  it('T101: GET /api/requirements/pending-reconciliation should return pending queue', async () => {
    const { adventure, requirement } = await seedRankAdventureRequirement();
    const { cubScout } = await seedCubScoutAndApprovedParentLink();
    const admin = await prisma.volunteer.findFirstOrThrow({
      where: { email: 'adv-admin@test.com' },
    });

    await prisma.requirementProgress.create({
      data: {
        childScoutId: cubScout.id,
        requirementId: requirement.id,
        adventureId: adventure.id,
        completionType: CompletionType.MEETING,
        completedBy: admin.id,
        scoutbookStatus: ReconciliationStatus.PENDING,
      },
    });

    await request(app.getHttpServer())
      .get('/api/requirements/pending-reconciliation')
      .set('Cookie', adminCookies)
      .expect(200)
      .expect(res => {
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBeGreaterThan(0);
        expect(res.body.data[0]).toHaveProperty('requirement');
      });
  });

  it('T102: PATCH /api/requirement-progress/:id/reconcile should mark requirement as entered', async () => {
    const { adventure, requirement } = await seedRankAdventureRequirement();
    const { cubScout } = await seedCubScoutAndApprovedParentLink();
    const admin = await prisma.volunteer.findFirstOrThrow({
      where: { email: 'adv-admin@test.com' },
    });

    const progress = await prisma.requirementProgress.create({
      data: {
        childScoutId: cubScout.id,
        requirementId: requirement.id,
        adventureId: adventure.id,
        completionType: CompletionType.MEETING,
        completedBy: admin.id,
        scoutbookStatus: ReconciliationStatus.PENDING,
        version: 1,
      },
    });

    await request(app.getHttpServer())
      .patch(`/api/requirement-progress/${progress.id}/reconcile`)
      .set('Cookie', adminCookies)
      .send({
        version: 1,
        notes: 'Entered in Scoutbook',
      })
      .expect(200)
      .expect(res => {
        expect(res.body.id).toBe(progress.id);
        expect(res.body.scoutbookStatus).toBe(ReconciliationStatus.ENTERED);
        expect(res.body.version).toBe(2);
      });

    const createdAward = await prisma.awardItem.findFirst({
      where: {
        childScoutId: cubScout.id,
        adventureId: adventure.id,
      },
    });

    expect(createdAward).toBeTruthy();
    expect(createdAward?.currentState).toBe(AwardState.ELIGIBLE);
  });

  it('T103: GET /api/child-scouts/:id/advancement-progress should return Cub Scout progress summary', async () => {
    const { requirement } = await seedRankAdventureRequirement();
    const { cubScout } = await seedCubScoutAndApprovedParentLink();

    await request(app.getHttpServer())
      .get(`/api/child-scouts/${cubScout.id}/advancement-progress`)
      .set('Cookie', adminCookies)
      .expect(200)
      .expect(res => {
        expect(res.body.childScout.id).toBe(cubScout.id);
        expect(res.body.rankProgress).toBeDefined();
        expect(Array.isArray(res.body.adventures)).toBe(true);
      });
  });
});
