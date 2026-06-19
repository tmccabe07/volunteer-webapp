import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { createTestVolunteer, prisma, setupTests, teardownTests } from '../src/test/test-utils';

describe('Den Chiefs API (e2e)', () => {
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
    await prisma.denChiefAssignment.deleteMany();
    await prisma.denChief.deleteMany();
    await prisma.denMembership.deleteMany();
    await prisma.den.deleteMany();
    await prisma.volunteerToRole.deleteMany();
    await prisma.pointEvent.deleteMany();
    await prisma.volunteerPointBalance.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.childRank.deleteMany();
    await prisma.volunteer.deleteMany();
    await setupTests();
  });

  async function login(email: string, password: string) {
    const response = await request(app.getHttpServer()).post('/api/auth/login').send({ email, password });
    return response.headers['set-cookie'];
  }

  it('POST /api/den-chiefs should create Den Chief', async () => {
    const password = 'Password123!';
    const admin = await createTestVolunteer({
      email: 'admin.denchief@example.com',
      passwordHash: await bcrypt.hash(password, 12),
      authTier: 'ADMIN',
    });
    const cookies = await login(admin.email, password);

    await request(app.getHttpServer())
      .post('/api/den-chiefs')
      .set('Cookie', cookies)
      .send({
        firstName: 'Alex',
        lastName: 'Chief',
        email: 'alex.chief@example.com',
        password: 'DenChief123!',
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.email).toBe('alex.chief@example.com');
        expect(res.body).toHaveProperty('id');
      });
  });

  it('GET /api/den-chiefs should list Den Chiefs', async () => {
    const password = 'Password123!';
    const leader = await createTestVolunteer({
      email: 'leader.denchief@example.com',
      passwordHash: await bcrypt.hash(password, 12),
      authTier: 'LEADER',
    });
    await prisma.denChief.create({
      data: {
        email: 'list.chief@example.com',
        firstName: 'List',
        lastName: 'Chief',
        passwordHash: await bcrypt.hash('DenChief123!', 12),
      },
    });

    const cookies = await login(leader.email, password);

    await request(app.getHttpServer())
      .get('/api/den-chiefs')
      .set('Cookie', cookies)
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
      });
  });

  it('POST /api/den-chiefs/:id/assign-den should assign den to Den Chief', async () => {
    const password = 'Password123!';
    const admin = await createTestVolunteer({
      email: 'admin.assign.denchief@example.com',
      passwordHash: await bcrypt.hash(password, 12),
      authTier: 'ADMIN',
    });
    const denChief = await prisma.denChief.create({
      data: {
        email: 'assign.chief@example.com',
        firstName: 'Assign',
        lastName: 'Chief',
        passwordHash: await bcrypt.hash('DenChief123!', 12),
      },
    });
    const den = await prisma.den.create({
      data: { name: 'Den 12', denNumber: 12, rankLevel: 'BEAR' },
    });

    const cookies = await login(admin.email, password);

    await request(app.getHttpServer())
      .post(`/api/den-chiefs/${denChief.id}/assign-den`)
      .set('Cookie', cookies)
      .send({ denId: den.id })
      .expect(201)
      .expect((res) => {
        expect(res.body.denId).toBe(den.id);
        expect(res.body.denNumber).toBe(12);
      });
  });

  it('DELETE /api/den-chiefs/:id/assignments/:assignmentId should deactivate assignment', async () => {
    const password = 'Password123!';
    const admin = await createTestVolunteer({
      email: 'admin.remove.denchief@example.com',
      passwordHash: await bcrypt.hash(password, 12),
      authTier: 'ADMIN',
    });
    const denChief = await prisma.denChief.create({
      data: {
        email: 'remove.chief@example.com',
        firstName: 'Remove',
        lastName: 'Chief',
        passwordHash: await bcrypt.hash('DenChief123!', 12),
      },
    });
    const den = await prisma.den.create({
      data: { name: 'Den 13', denNumber: 13, rankLevel: 'WEBELOS' },
    });
    const assignment = await prisma.denChiefAssignment.create({
      data: {
        denChiefId: denChief.id,
        denId: den.id,
        assignedBy: admin.id,
      },
    });

    const cookies = await login(admin.email, password);

    await request(app.getHttpServer())
      .delete(`/api/den-chiefs/${denChief.id}/assignments/${assignment.id}`)
      .set('Cookie', cookies)
      .expect(204);

    const updated = await prisma.denChiefAssignment.findUnique({ where: { id: assignment.id } });
    expect(updated?.validTo).not.toBeNull();
  });
});
