import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { createTestVolunteer, prisma, setupTests, teardownTests } from '../src/test/test-utils';

describe('Roles API (e2e)', () => {
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
    await prisma.volunteerToRole.deleteMany();
    await prisma.denMembership.deleteMany();
    await prisma.den.deleteMany();
    await prisma.volunteerRole.deleteMany();
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

  it('POST /api/roles/assign-scoped should create scoped assignment', async () => {
    const password = 'Password123!';
    const admin = await createTestVolunteer({
      email: 'admin.roles@example.com',
      passwordHash: await bcrypt.hash(password, 12),
      authTier: 'ADMIN',
    });
    const volunteer = await createTestVolunteer({ email: 'member.roles@example.com' });
    const den = await prisma.den.create({
      data: { name: 'Den 9', denNumber: 9, rankLevel: 'WOLF' },
    });
    const role = await prisma.volunteerRole.create({
      data: {
        name: 'Scoped Den Leader',
        roleType: 'DEN_LEADER',
        grantsTier: 'LEADER',
        scopeType: 'DEN',
        rankLevel: 'WOLF',
      },
    });

    const cookies = await login(admin.email, password);

    await request(app.getHttpServer())
      .post('/api/roles/assign-scoped')
      .set('Cookie', cookies)
      .send({
        volunteerId: volunteer.id,
        roleId: role.id,
        scopeType: 'DEN',
        denNumber: den.denNumber,
      })
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('id');
        expect(res.body.volunteerId).toBe(volunteer.id);
        expect(res.body.roleId).toBe(role.id);
        expect(res.body.scopeType).toBe('DEN');
      });
  });

  it('GET /api/roles/assignments should list active assignments', async () => {
    const password = 'Password123!';
    const admin = await createTestVolunteer({
      email: 'admin.roles.list@example.com',
      passwordHash: await bcrypt.hash(password, 12),
      authTier: 'ADMIN',
    });
    const volunteer = await createTestVolunteer({ email: 'member.roles.list@example.com' });
    const role = await prisma.volunteerRole.findFirstOrThrow({ where: { roleType: 'PARENT_GUARDIAN' } });
    await prisma.volunteerToRole.create({ data: { volunteerId: volunteer.id, roleId: role.id } });

    const cookies = await login(admin.email, password);

    await request(app.getHttpServer())
      .get('/api/roles/assignments')
      .set('Cookie', cookies)
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
      });
  });

  it('DELETE /api/roles/assignments/:id should soft-remove assignment', async () => {
    const password = 'Password123!';
    const admin = await createTestVolunteer({
      email: 'admin.roles.delete@example.com',
      passwordHash: await bcrypt.hash(password, 12),
      authTier: 'ADMIN',
    });
    const volunteer = await createTestVolunteer({ email: 'member.roles.delete@example.com' });
    const role = await prisma.volunteerRole.findFirstOrThrow({ where: { roleType: 'PARENT_GUARDIAN' } });
    const assignment = await prisma.volunteerToRole.create({ data: { volunteerId: volunteer.id, roleId: role.id } });

    const cookies = await login(admin.email, password);

    await request(app.getHttpServer())
      .delete(`/api/roles/assignments/${assignment.id}`)
      .set('Cookie', cookies)
      .expect(204);

    const updated = await prisma.volunteerToRole.findUnique({ where: { id: assignment.id } });
    expect(updated?.removedAt).not.toBeNull();
  });
});
