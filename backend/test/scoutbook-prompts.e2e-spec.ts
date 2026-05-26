import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import {
  AuthTier,
  LinkStatus,
  PromptCategory,
  PromptStatus,
  RankLevel,
} from '@prisma/client';
import {
  createTestVolunteer,
  prisma,
  setupTests,
  teardownTests,
} from '../src/test/test-utils';

describe('Scoutbook Prompt API (e2e)', () => {
  let app: INestApplication;
  let leaderCookies: string[];
  let parentCookies: string[];
  let leaderId: string;
  let parentId: string;
  let childId: string;
  let eventId: string;

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
      email: 'prompt-leader@test.com',
      name: 'Prompt Leader',
      passwordHash,
      authTier: AuthTier.LEADER,
    });
    leaderId = leader.id;

    const parent = await createTestVolunteer({
      email: 'prompt-parent@test.com',
      name: 'Prompt Parent',
      passwordHash,
      authTier: AuthTier.PARENT,
    });
    parentId = parent.id;

    leaderCookies = await loginVolunteer('prompt-leader@test.com', password);
    parentCookies = await loginVolunteer('prompt-parent@test.com', password);

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
        createdBy: leaderId,
      },
    });
    childId = child.id;

    await prisma.denMembership.create({
      data: {
        denId: den.id,
        childScoutId: child.id,
        assignedBy: leaderId,
      },
    });

    const event = await prisma.event.create({
      data: {
        title: 'Wolf Hike',
        eventDate: new Date('2026-05-20T00:00:00.000Z'),
        createdById: leaderId,
        scopeType: 'DEN',
      },
    });
    eventId = event.id;

    await prisma.denEvent.create({
      data: {
        id: event.id,
        title: event.title,
        eventDate: event.eventDate,
        createdById: leaderId,
      },
    });

    await prisma.childAttendance.create({
      data: {
        eventId: eventId,
        childScoutId: childId,
        attendanceStatus: 'PRESENT',
        recordedBy: leaderId,
      },
    });

    await prisma.parentChildLink.create({
      data: {
        parentId,
        childScoutId: childId,
        status: LinkStatus.APPROVED,
        requestedBy: parentId,
        processedBy: leaderId,
        processedAt: new Date(),
      },
    });
  });

  afterEach(async () => {
    await prisma.notification.deleteMany();
    await prisma.scoutbookPrompt.deleteMany();
    await prisma.childAttendance.deleteMany();
    await prisma.denEvent.deleteMany();
    await prisma.event.deleteMany();
    await prisma.parentChildLink.deleteMany();
    await prisma.denMembership.deleteMany();
    await prisma.childScout.deleteMany();
    await prisma.den.deleteMany();
    await prisma.volunteer.deleteMany({
      where: {
        email: {
          contains: 'prompt-',
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

  it('T195: POST /api/events/:id/generate-prompts should create prompts', async () => {
    await request(app.getHttpServer())
      .post(`/api/events/${eventId}/generate-prompts`)
      .set('Cookie', leaderCookies)
      .send({
        categoryPrompts: [
          {
            category: PromptCategory.HIKING,
            categoryData: { miles: 3 },
            childScoutIds: [childId],
          },
        ],
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.eventId).toBe(eventId);
        expect(res.body.promptsGenerated).toBe(1);
        expect(res.body.prompts[0].status).toBe(PromptStatus.PENDING);
      });
  });

  it('T196: GET /api/scoutbook-prompts should list prompts for linked parent', async () => {
    await prisma.scoutbookPrompt.create({
      data: {
        childScoutId: childId,
        eventId,
        category: PromptCategory.CAMPING,
        categoryData: { nights: 1, location: 'Camp Bob' },
        status: PromptStatus.PENDING,
      },
    });

    await request(app.getHttpServer())
      .get('/api/scoutbook-prompts')
      .set('Cookie', parentCookies)
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBe(1);
        expect(res.body.data[0].childScout.id).toBe(childId);
      });
  });

  it('T197: PATCH /api/scoutbook-prompts/:id/acknowledge should mark prompt as acknowledged', async () => {
    const prompt = await prisma.scoutbookPrompt.create({
      data: {
        childScoutId: childId,
        eventId,
        category: PromptCategory.SERVICE,
        categoryData: { hours: 2, projectName: 'Park cleanup' },
      },
    });

    await request(app.getHttpServer())
      .patch(`/api/scoutbook-prompts/${prompt.id}/acknowledge`)
      .set('Cookie', parentCookies)
      .send({})
      .expect(200)
      .expect((res) => {
        expect(res.body.id).toBe(prompt.id);
        expect(res.body.status).toBe(PromptStatus.ACKNOWLEDGED);
        expect(res.body.acknowledgedAt).toBeDefined();
      });
  });

  it('T198: PATCH /api/scoutbook-prompts/:id/dismiss should mark prompt as dismissed', async () => {
    const prompt = await prisma.scoutbookPrompt.create({
      data: {
        childScoutId: childId,
        eventId,
        category: PromptCategory.SERVICE,
        categoryData: { hours: 2, projectName: 'Food pantry' },
      },
    });

    await request(app.getHttpServer())
      .patch(`/api/scoutbook-prompts/${prompt.id}/dismiss`)
      .set('Cookie', parentCookies)
      .send({})
      .expect(200)
      .expect((res) => {
        expect(res.body.id).toBe(prompt.id);
        expect(res.body.status).toBe(PromptStatus.DISMISSED);
        expect(res.body.dismissedAt).toBeDefined();
      });
  });
});
