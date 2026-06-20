import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { createTestVolunteer, prisma, setupTests, teardownTests } from '../src/test/test-utils';
import * as bcrypt from 'bcrypt';

describe('Calendar Feed API (e2e)', () => {
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
    await prisma.feedAccessAudit.deleteMany();
    await prisma.calendarFeedToken.deleteMany();
    await prisma.denChiefAssignment.deleteMany();
    await prisma.denChief.deleteMany();
    await prisma.eventTargetDen.deleteMany();
    await prisma.event.deleteMany();
    await prisma.denMembership.deleteMany();
    await prisma.parentChildLink.deleteMany();
    await prisma.childScout.deleteMany();
    await prisma.den.deleteMany();
    await prisma.volunteer.deleteMany();
  });

  async function loginUser(email: string, password: string) {
    const res = await request(app.getHttpServer()).post('/api/auth/login').send({ email, password });
    return res.headers['set-cookie'];
  }

  it('returns pack and den feed links for authenticated volunteers', async () => {
    const password = 'Password123!';
    const passwordHash = await bcrypt.hash(password, 12);
    const parent = await createTestVolunteer({
      email: 'calendar-parent@example.com',
      passwordHash,
      authTier: 'PARENT',
    });

    const den = await prisma.den.create({
      data: {
        name: 'Den 8',
        denNumber: 8,
        rankLevel: 'WOLF',
      },
    });

    const child = await prisma.childScout.create({
      data: {
        firstName: 'Cub',
        lastName: 'Scout',
        currentRank: 'WOLF',
        createdBy: parent.id,
      },
    });

    await prisma.denMembership.create({
      data: {
        denId: den.id,
        childScoutId: child.id,
        assignedBy: parent.id,
      },
    });

    await prisma.parentChildLink.create({
      data: {
        parentId: parent.id,
        childScoutId: child.id,
        status: 'APPROVED',
        requestedBy: parent.id,
      },
    });

    const cookies = await loginUser(parent.email, password);
    const response = await request(app.getHttpServer())
      .get('/api/me/calendar-feeds')
      .set('Cookie', cookies)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.some((feed: any) => feed.scopeType === 'PACK')).toBe(true);
    expect(response.body.some((feed: any) => feed.scopeType === 'DEN' && feed.denId === den.id)).toBe(true);
  });

  it('returns scoped ICS payload for den feed token', async () => {
    const password = 'Password123!';
    const passwordHash = await bcrypt.hash(password, 12);
    const parent = await createTestVolunteer({
      email: 'calendar-parent2@example.com',
      passwordHash,
      authTier: 'PARENT',
    });

    const denA = await prisma.den.create({
      data: {
        name: 'Den Alpha',
        denNumber: 10,
        rankLevel: 'WOLF',
      },
    });

    const denB = await prisma.den.create({
      data: {
        name: 'Den Beta',
        denNumber: 11,
        rankLevel: 'WOLF',
      },
    });

    const child = await prisma.childScout.create({
      data: {
        firstName: 'Alex',
        lastName: 'Scout',
        currentRank: 'WOLF',
        createdBy: parent.id,
      },
    });

    await prisma.denMembership.create({
      data: {
        denId: denA.id,
        childScoutId: child.id,
        assignedBy: parent.id,
      },
    });

    await prisma.parentChildLink.create({
      data: {
        parentId: parent.id,
        childScoutId: child.id,
        status: 'APPROVED',
        requestedBy: parent.id,
      },
    });

    const now = new Date();
    const leader = await createTestVolunteer({ email: 'leader-calendar@example.com', passwordHash, authTier: 'LEADER' });

    const denEventA = await prisma.event.create({
      data: {
        title: 'Den Alpha Meeting',
        eventDate: now,
        scopeType: 'DEN',
        createdById: leader.id,
      },
    });

    const denEventB = await prisma.event.create({
      data: {
        title: 'Den Beta Meeting',
        eventDate: now,
        scopeType: 'DEN',
        createdById: leader.id,
      },
    });

    await prisma.eventTargetDen.createMany({
      data: [
        { eventId: denEventA.id, denId: denA.id },
        { eventId: denEventB.id, denId: denB.id },
      ],
    });

    const cookies = await loginUser(parent.email, password);
    const feedRes = await request(app.getHttpServer())
      .get('/api/me/calendar-feeds')
      .set('Cookie', cookies)
      .expect(200);

    const denFeed = feedRes.body.find((feed: any) => feed.scopeType === 'DEN' && feed.denId === denA.id);
    expect(denFeed).toBeDefined();

    const token = denFeed.feedUrl.split('/calendar/feeds/')[1].replace('.ics', '');

    const icsResponse = await request(app.getHttpServer())
      .get(`/api/calendar/feeds/${token}.ics`)
      .expect(200);

    expect(icsResponse.headers['content-type']).toContain('text/calendar');
    expect(icsResponse.text).toContain('BEGIN:VCALENDAR');
    expect(icsResponse.text).toContain('Den Alpha Meeting');
    expect(icsResponse.text).not.toContain('Den Beta Meeting');
  });

  it('supports den chief users for listing and regenerating scoped feed links', async () => {
    const password = 'Password123!';
    const passwordHash = await bcrypt.hash(password, 12);

    const denChief = await prisma.denChief.create({
      data: {
        email: 'calendar-denchief@example.com',
        firstName: 'Casey',
        lastName: 'Chief',
        passwordHash,
        authTier: 'DEN_CHIEF',
        isActive: true,
      },
    });

    const den = await prisma.den.create({
      data: {
        name: 'Den Chief Den',
        denNumber: 21,
        rankLevel: 'BEAR',
      },
    });

    await prisma.denChiefAssignment.create({
      data: {
        denChiefId: denChief.id,
        denId: den.id,
        assignedBy: denChief.id,
      },
    });

    const cookies = await loginUser(denChief.email, password);

    const listResponse = await request(app.getHttpServer())
      .get('/api/me/calendar-feeds')
      .set('Cookie', cookies)
      .expect(200);

    expect(Array.isArray(listResponse.body)).toBe(true);
    expect(listResponse.body.some((feed: any) => feed.scopeType === 'PACK')).toBe(true);
    const denFeed = listResponse.body.find((feed: any) => feed.scopeType === 'DEN' && feed.denId === den.id);
    expect(denFeed).toBeDefined();

    const regenerateResponse = await request(app.getHttpServer())
      .post('/api/me/calendar-feeds/regenerate')
      .set('Cookie', cookies)
      .send({ scopeType: 'DEN', denId: den.id })
      .expect(200);

    expect(regenerateResponse.body.scopeType).toBe('DEN');
    expect(regenerateResponse.body.denId).toBe(den.id);
    expect(typeof regenerateResponse.body.feedUrl).toBe('string');
    expect(regenerateResponse.body.feedUrl).toContain('/api/calendar/feeds/');
  });
});
