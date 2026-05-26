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

describe('Awards API (e2e)', () => {
  let app: INestApplication;
  let adminCookies: string[];
  let leaderId: string;
  let childScoutId: string;
  let adventureId: string;
  let requirementId: string;

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

    const leader = await createTestVolunteer({
      email: 'awards-leader@test.com',
      name: 'Awards Leader',
      passwordHash,
      authTier: AuthTier.LEADER,
    });
    leaderId = leader.id;

    await createTestVolunteer({
      email: 'awards-admin@test.com',
      name: 'Awards Admin',
      passwordHash,
      authTier: AuthTier.ADMIN,
    });

    adminCookies = await loginVolunteer('awards-admin@test.com', password);

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
    adventureId = adventure.id;

    const requirement = await prisma.requirement.create({
      data: {
        adventureId: adventure.id,
        displayOrder: 1,
        requirementText: 'Complete requirement 1',
      },
    });
    requirementId = requirement.id;

    const den = await prisma.den.create({
      data: {
        name: 'Wolf Den 1',
        denNumber: 1,
        rankLevel: RankLevel.WOLF,
      },
    });

    const child = await prisma.childScout.create({
      data: {
        firstName: 'Alex',
        lastName: 'Scout',
        currentRank: RankLevel.WOLF,
        createdBy: leader.id,
      },
    });
    childScoutId = child.id;

    await prisma.denMembership.create({
      data: {
        denId: den.id,
        childScoutId: child.id,
        assignedBy: leader.id,
        reason: 'Initial assignment',
      },
    });

    await prisma.parentChildLink.create({
      data: {
        parentId: leader.id,
        childScoutId: child.id,
        status: LinkStatus.APPROVED,
        requestedBy: leader.id,
        processedBy: leader.id,
        processedAt: new Date(),
      },
    });

    await prisma.requirementProgress.create({
      data: {
        childScoutId: child.id,
        requirementId: requirement.id,
        adventureId: adventure.id,
        completedBy: leader.id,
        scoutbookStatus: ReconciliationStatus.ENTERED,
      },
    });

    await prisma.awardItem.createMany({
      data: [
        {
          childScoutId,
          adventureId,
          currentState: AwardState.ELIGIBLE,
          quantityNeeded: 1,
        },
        {
          childScoutId,
          adventureId,
          currentState: AwardState.APPROVED,
          quantityNeeded: 1,
        },
      ],
    });

    await prisma.inventoryItem.create({
      data: {
        itemName: 'Wolf Badge',
        rankLevel: RankLevel.WOLF,
        onHandQuantity: 5,
        reorderPoint: 2,
        unitCost: 1.25,
      },
    });
  });

  afterEach(async () => {
    await prisma.awardStateHistory.deleteMany();
    await prisma.awardItem.deleteMany();
    await prisma.inventoryAdjustment.deleteMany();
    await prisma.inventoryItem.deleteMany();
    await prisma.specialAward.deleteMany();
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
          contains: 'awards-',
        },
      },
    });
  });

  async function loginVolunteer(email: string, password: string): Promise<string[]> {
    const response = await request(app.getHttpServer()).post('/api/auth/login').send({ email, password });
    return response.headers['set-cookie'];
  }

  it('T148: GET /api/awards should list awards', async () => {
    await request(app.getHttpServer())
      .get('/api/awards')
      .set('Cookie', adminCookies)
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBeGreaterThan(0);
      });
  });

  it('T149: POST /api/awards/:id/transition should transition one award', async () => {
    const award = await prisma.awardItem.findFirstOrThrow({ where: { currentState: AwardState.APPROVED } });

    await request(app.getHttpServer())
      .post(`/api/awards/${award.id}/transition`)
      .set('Cookie', adminCookies)
      .send({ toState: AwardState.PURCHASED, notes: 'Purchased from scout shop' })
      .expect(200)
      .expect((res) => {
        expect(res.body.id).toBe(award.id);
        expect(res.body.currentState).toBe(AwardState.PURCHASED);
        expect(Array.isArray(res.body.history)).toBe(true);
      });
  });

  it('T150: POST /api/awards/batch-transition should transition multiple awards', async () => {
    const awards = await prisma.awardItem.findMany({ where: { currentState: AwardState.APPROVED } });

    await request(app.getHttpServer())
      .post('/api/awards/batch-transition')
      .set('Cookie', adminCookies)
      .send({
        awardIds: awards.map((item) => item.id),
        toState: AwardState.PURCHASED,
        notes: 'Batch purchase',
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.batchId).toBeDefined();
        expect(res.body.successCount).toBe(awards.length);
      });
  });

  it('T151: GET /api/inventory should list inventory', async () => {
    await request(app.getHttpServer())
      .get('/api/inventory')
      .set('Cookie', adminCookies)
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data[0].itemName).toBe('Wolf Badge');
      });
  });

  it('should create inventory item via POST /api/inventory', async () => {
    await request(app.getHttpServer())
      .post('/api/inventory')
      .set('Cookie', adminCookies)
      .send({
        itemName: 'Bear Badge',
        rankLevel: RankLevel.BEAR,
        onHandQuantity: 8,
        reorderPoint: 3,
        unitCost: 1.5,
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.id).toBeDefined();
        expect(res.body.itemName).toBe('Bear Badge');
        expect(res.body.rankLevel).toBe(RankLevel.BEAR);
      });
  });

  it('T152: POST /api/inventory/adjust should adjust inventory', async () => {
    const item = await prisma.inventoryItem.findFirstOrThrow();

    await request(app.getHttpServer())
      .post('/api/inventory/adjust')
      .set('Cookie', adminCookies)
      .send({
        inventoryItemId: item.id,
        quantityChange: -1,
        reason: 'Distribution',
        notes: 'Given to den leader',
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.id).toBe(item.id);
        expect(res.body.onHandQuantity).toBe(4);
      });
  });

  it('T153: POST /api/special-awards should create special award', async () => {
    await request(app.getHttpServer())
      .post('/api/special-awards')
      .set('Cookie', adminCookies)
      .send({
        name: 'Summit Achievement',
        category: 'Character',
        description: 'Special pack recognition',
        requiresNomination: true,
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.id).toBeDefined();
        expect(res.body.name).toBe('Summit Achievement');
        expect(res.body.requiresNomination).toBe(true);
      });
  });
});
