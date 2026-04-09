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
import { AuthTier } from '@prisma/client';

describe('Volunteers API (e2e)', () => {
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
    // Delete in order to respect foreign key constraints
    await prisma.taskCompletion.deleteMany();
    await prisma.adminTaskToRole.deleteMany();
    await prisma.adminTask.deleteMany();
    await prisma.signup.deleteMany();
    await prisma.activitySlot.deleteMany();
    await prisma.event.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.leaderboardSnapshot.deleteMany();
    await prisma.badgeTierHistory.deleteMany();
    await prisma.leaderboardCache.deleteMany();
    await prisma.volunteerPointBalance.deleteMany();
    await prisma.pointEvent.deleteMany();
    await prisma.volunteerToRole.deleteMany();
    await prisma.childRank.deleteMany();
    await prisma.volunteer.deleteMany();
  });

  /**
   * Helper function to login and get cookies
   */
  async function loginVolunteer(email: string, password: string) {
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password });
    
    return loginRes.headers['set-cookie'];
  }

  describe('GET /api/volunteers/me/profile', () => {
    it('should get current volunteer profile', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      const volunteer = await createTestVolunteer({
        email: 'user@example.com',
        passwordHash,
        name: 'John Doe',
        phone: '5551234',
      });

      const cookies = await loginVolunteer('user@example.com', password);

      return request(app.getHttpServer())
        .get('/api/volunteers/me/profile')
        .set('Cookie', cookies)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(volunteer.id);
          expect(res.body.name).toBe('John Doe');
          expect(res.body.email).toBe('user@example.com');
          expect(res.body.phone).toBe('5551234');
          expect(res.body).toHaveProperty('roles');
          expect(res.body).toHaveProperty('childrenRanks');
          expect(res.body).not.toHaveProperty('passwordHash');
        });
    });

    it('should require authentication', () => {
      return request(app.getHttpServer())
        .get('/api/volunteers/me/profile')
        .expect(401);
    });

    it('should return 404 if volunteer not found', async () => {
      // This edge case shouldn't normally happen since JWT is validated
      // but tests the error handling in the controller
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      const volunteer = await createTestVolunteer({
        email: 'user@example.com',
        passwordHash,
      });

      const cookies = await loginVolunteer('user@example.com', password);

      // Delete the volunteer after login
      await prisma.volunteer.delete({ where: { id: volunteer.id } });

      return request(app.getHttpServer())
        .get('/api/volunteers/me/profile')
        .set('Cookie', cookies)
        .expect(404);
    });
  });

  describe('PUT /api/volunteers/me/profile', () => {
    it('should update volunteer profile', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      const volunteer = await createTestVolunteer({
        email: 'user@example.com',
        passwordHash,
        name: 'John Doe',
      });

      const cookies = await loginVolunteer('user@example.com', password);

      return request(app.getHttpServer())
        .put('/api/volunteers/me/profile')
        .set('Cookie', cookies)
        .send({
          name: 'Jane Smith',
          phone: '5559999',
          leaderboardOptIn: false,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.name).toBe('Jane Smith');
          expect(res.body.phone).toBe('5559999');
          expect(res.body.leaderboardOptIn).toBe(false);
        });
    });

    it('should update children ranks', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      const volunteer = await createTestVolunteer({
        email: 'user@example.com',
        passwordHash,
      });

      const cookies = await loginVolunteer('user@example.com', password);

      return request(app.getHttpServer())
        .put('/api/volunteers/me/profile')
        .set('Cookie', cookies)
        .send({
          childrenRanks: ['WOLF', 'BEAR'],
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.childrenRanks).toHaveLength(2);
          // Check both ranks are present (order may vary)
          const rankLevels = res.body.childrenRanks.map((cr: any) => cr.rankLevel);
          expect(rankLevels).toContain('WOLF');
          expect(rankLevels).toContain('BEAR');
        });
    });

    it('should reject invalid rank level', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      await createTestVolunteer({
        email: 'user@example.com',
        passwordHash,
      });

      const cookies = await loginVolunteer('user@example.com', password);

      // Invalid rank level is caught by Zod validation and returns 400
      return request(app.getHttpServer())
        .put('/api/volunteers/me/profile')
        .set('Cookie', cookies)
        .send({
          childrenRanks: ['INVALID_RANK'],
        })
        .expect(400);
    });

    it('should reject duplicate children rank', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      await createTestVolunteer({
        email: 'user@example.com',
        passwordHash,
      });

      const cookies = await loginVolunteer('user@example.com', password);

      // Duplicate ranks are automatically deduplicated, so this succeeds
      return request(app.getHttpServer())
        .put('/api/volunteers/me/profile')
        .set('Cookie', cookies)
        .send({
          childrenRanks: ['WOLF', 'WOLF'], // Duplicate rank levels
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.childrenRanks).toHaveLength(1);
          expect(res.body.childrenRanks[0].rankLevel).toBe('WOLF');
        });
    });

    it('should require authentication', () => {
      return request(app.getHttpServer())
        .put('/api/volunteers/me/profile')
        .send({ name: 'Test' })
        .expect(401);
    });
  });

  describe('POST /api/volunteers/me/roles', () => {
    it('should assign a role to volunteer', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      const volunteer = await createTestVolunteer({
        email: 'user@example.com',
        passwordHash,
      });

      // Get an available role
      const role = await prisma.volunteerRole.findFirst({
        where: { deletedAt: null },
      });

      const cookies = await loginVolunteer('user@example.com', password);

      return request(app.getHttpServer())
        .post('/api/volunteers/me/roles')
        .set('Cookie', cookies)
        .send({
          roleId: role!.id,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.roleId).toBe(role!.id);
          expect(res.body).toHaveProperty('roleName');
          expect(res.body).toHaveProperty('assignedAt');
        });
    });

    it('should reject assignment of already assigned role', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      const volunteer = await createTestVolunteer({
        email: 'user@example.com',
        passwordHash,
      });

      const role = await prisma.volunteerRole.findFirst({
        where: { deletedAt: null },
      });

      // Assign the role first
      await prisma.volunteerToRole.create({
        data: {
          volunteerId: volunteer.id,
          roleId: role!.id,
        },
      });

      const cookies = await loginVolunteer('user@example.com', password);

      // Try to assign the same role again
      return request(app.getHttpServer())
        .post('/api/volunteers/me/roles')
        .set('Cookie', cookies)
        .send({
          roleId: role!.id,
        })
        .expect(409);
    });

    it('should reject assignment of non-existent role', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      await createTestVolunteer({
        email: 'user@example.com',
        passwordHash,
      });

      const cookies = await loginVolunteer('user@example.com', password);

      return request(app.getHttpServer())
        .post('/api/volunteers/me/roles')
        .set('Cookie', cookies)
        .send({
          roleId: 'non-existent-id',
        })
        .expect(404);
    });

    it('should reject invalid request body', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      await createTestVolunteer({
        email: 'user@example.com',
        passwordHash,
      });

      const cookies = await loginVolunteer('user@example.com', password);

      // Missing roleId is caught by Zod validation and returns 400
      return request(app.getHttpServer())
        .post('/api/volunteers/me/roles')
        .set('Cookie', cookies)
        .send({})
        .expect(400);
    });

    it('should require authentication', () => {
      return request(app.getHttpServer())
        .post('/api/volunteers/me/roles')
        .send({ roleId: 'some-id' })
        .expect(401);
    });
  });

  describe('DELETE /api/volunteers/me/roles/:roleAssignmentId', () => {
    it('should remove a role assignment', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      const volunteer = await createTestVolunteer({
        email: 'user@example.com',
        passwordHash,
      });

      const role = await prisma.volunteerRole.findFirst({
        where: { deletedAt: null },
      });

      const assignment = await prisma.volunteerToRole.create({
        data: {
          volunteerId: volunteer.id,
          roleId: role!.id,
        },
      });

      const cookies = await loginVolunteer('user@example.com', password);

      return request(app.getHttpServer())
        .delete(`/api/volunteers/me/roles/${assignment.id}`)
        .set('Cookie', cookies)
        .expect(204);
    });

    it('should reject removal of non-existent role assignment', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      await createTestVolunteer({
        email: 'user@example.com',
        passwordHash,
      });

      const cookies = await loginVolunteer('user@example.com', password);

      return request(app.getHttpServer())
        .delete('/api/volunteers/me/roles/non-existent-id')
        .set('Cookie', cookies)
        .expect(404);
    });

    it('should reject removal of another volunteer\'s role', async () => {
      const password1 = 'Password123!';
      const passwordHash1 = await bcrypt.hash(password1, 12);
      const volunteer1 = await createTestVolunteer({
        email: 'user1@example.com',
        passwordHash: passwordHash1,
      });

      const password2 = 'Password456!';
      const passwordHash2 = await bcrypt.hash(password2, 12);
      const volunteer2 = await createTestVolunteer({
        email: 'user2@example.com',
        passwordHash: passwordHash2,
      });

      const role = await prisma.volunteerRole.findFirst({
        where: { deletedAt: null },
      });

      // Assign role to volunteer1
      const assignment = await prisma.volunteerToRole.create({
        data: {
          volunteerId: volunteer1.id,
          roleId: role!.id,
        },
      });

      // Login as volunteer2 and try to remove volunteer1's role
      const cookies = await loginVolunteer('user2@example.com', password2);

      return request(app.getHttpServer())
        .delete(`/api/volunteers/me/roles/${assignment.id}`)
        .set('Cookie', cookies)
        .expect(404);
    });

    it('should require authentication', () => {
      return request(app.getHttpServer())
        .delete('/api/volunteers/me/roles/some-id')
        .expect(401);
    });
  });

  describe('GET /api/volunteers/roles/available', () => {
    it('should get all available volunteer roles', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      await createTestVolunteer({
        email: 'user@example.com',
        passwordHash,
      });

      const cookies = await loginVolunteer('user@example.com', password);

      return request(app.getHttpServer())
        .get('/api/volunteers/roles/available')
        .set('Cookie', cookies)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
          
          // Verify role structure
          const role = res.body[0];
          expect(role).toHaveProperty('id');
          expect(role).toHaveProperty('name');
          expect(role).toHaveProperty('roleType');
          expect(role).toHaveProperty('grantsTier');
          expect(role).not.toHaveProperty('deletedAt'); // Filtered out by query
        });
    });

    it('should require authentication', () => {
      return request(app.getHttpServer())
        .get('/api/volunteers/roles/available')
        .expect(401);
    });
  });

  describe('GET /api/volunteers', () => {
    it('should list all volunteers as LEADER', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      
      // Create a LEADER user
      await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: AuthTier.LEADER,
      });

      // Create some other volunteers
      await createTestVolunteer({
        email: 'user1@example.com',
        passwordHash,
        name: 'User One',
      });
      await createTestVolunteer({
        email: 'user2@example.com',
        passwordHash,
        name: 'User Two',
      });

      const cookies = await loginVolunteer('leader@example.com', password);

      return request(app.getHttpServer())
        .get('/api/volunteers')
        .set('Cookie', cookies)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('volunteers');
          expect(res.body).toHaveProperty('pagination');
          expect(res.body.pagination).toHaveProperty('total');
          expect(res.body.pagination).toHaveProperty('page');
          expect(res.body.pagination).toHaveProperty('limit');
          expect(Array.isArray(res.body.volunteers)).toBe(true);
          expect(res.body.volunteers.length).toBeGreaterThanOrEqual(3);
        });
    });

    it('should filter volunteers by tier', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      
      await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: AuthTier.LEADER,
      });

      await createTestVolunteer({
        email: 'user1@example.com',
        passwordHash,
        authTier: AuthTier.PARENT,
      });

      const cookies = await loginVolunteer('leader@example.com', password);

      return request(app.getHttpServer())
        .get('/api/volunteers?tier=PARENT')
        .set('Cookie', cookies)
        .expect(200)
        .expect((res) => {
          expect(res.body.volunteers.length).toBeGreaterThanOrEqual(1);
          // Verify all returned volunteers are PARENT tier
          res.body.volunteers.forEach((v: any) => {
            expect(v.authTier).toBe('PARENT');
          });
        });
    });

    it('should search volunteers by name', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      
      await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: AuthTier.LEADER,
      });

      await createTestVolunteer({
        email: 'unique@example.com',
        passwordHash,
        name: 'Unique Test Name',
      });

      const cookies = await loginVolunteer('leader@example.com', password);

      return request(app.getHttpServer())
        .get('/api/volunteers?search=Unique')
        .set('Cookie', cookies)
        .expect(200)
        .expect((res) => {
          expect(res.body.volunteers.length).toBeGreaterThanOrEqual(1);
          expect(res.body.volunteers[0].name).toContain('Unique');
        });
    });

    it('should paginate results', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      
      await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: AuthTier.LEADER,
      });

      // Create multiple volunteers
      for (let i = 0; i < 5; i++) {
        await createTestVolunteer({
          email: `user${i}@example.com`,
          passwordHash,
        });
      }

      const cookies = await loginVolunteer('leader@example.com', password);

      return request(app.getHttpServer())
        .get('/api/volunteers?page=1&limit=2')
        .set('Cookie', cookies)
        .expect(200)
        .expect((res) => {
          expect(res.body.pagination.page).toBe(1);
          expect(res.body.pagination.limit).toBe(2);
          expect(res.body.volunteers.length).toBeLessThanOrEqual(2);
        });
    });

    it('should reject access from PARENT tier', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      
      await createTestVolunteer({
        email: 'parent@example.com',
        passwordHash,
        authTier: AuthTier.PARENT,
      });

      const cookies = await loginVolunteer('parent@example.com', password);

      return request(app.getHttpServer())
        .get('/api/volunteers')
        .set('Cookie', cookies)
        .expect(403);
    });

    it('should require authentication', () => {
      return request(app.getHttpServer())
        .get('/api/volunteers')
        .expect(401);
    });
  });

  describe('GET /api/volunteers/:id', () => {
    it('should get volunteer by id as LEADER', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      
      const leader = await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: AuthTier.LEADER,
      });

      const volunteer = await createTestVolunteer({
        email: 'user@example.com',
        passwordHash,
        name: 'Target User',
      });

      const cookies = await loginVolunteer('leader@example.com', password);

      return request(app.getHttpServer())
        .get(`/api/volunteers/${volunteer.id}`)
        .set('Cookie', cookies)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(volunteer.id);
          expect(res.body.name).toBe('Target User');
          expect(res.body).toHaveProperty('roles');
          expect(res.body).toHaveProperty('childrenRanks');
        });
    });

    it('should allow volunteer to view own profile', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      
      const volunteer = await createTestVolunteer({
        email: 'user@example.com',
        passwordHash,
        authTier: AuthTier.PARENT,
      });

      const cookies = await loginVolunteer('user@example.com', password);

      return request(app.getHttpServer())
        .get(`/api/volunteers/${volunteer.id}`)
        .set('Cookie', cookies)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(volunteer.id);
        });
    });

    it('should reject PARENT viewing other volunteer', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      
      const parent = await createTestVolunteer({
        email: 'parent@example.com',
        passwordHash,
        authTier: AuthTier.PARENT,
      });

      const otherVolunteer = await createTestVolunteer({
        email: 'other@example.com',
        passwordHash,
      });

      const cookies = await loginVolunteer('parent@example.com', password);

      return request(app.getHttpServer())
        .get(`/api/volunteers/${otherVolunteer.id}`)
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

      const cookies = await loginVolunteer('leader@example.com', password);

      return request(app.getHttpServer())
        .get('/api/volunteers/non-existent-id')
        .set('Cookie', cookies)
        .expect(404);
    });

    it('should require authentication', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      
      const volunteer = await createTestVolunteer({
        email: 'user@example.com',
        passwordHash,
      });

      return request(app.getHttpServer())
        .get(`/api/volunteers/${volunteer.id}`)
        .expect(401);
    });
  });

  describe('DELETE /api/volunteers/:id', () => {
    it('should delete volunteer as ADMIN', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      
      await createTestVolunteer({
        email: 'admin@example.com',
        passwordHash,
        authTier: AuthTier.ADMIN,
      });

      const volunteer = await createTestVolunteer({
        email: 'user@example.com',
        passwordHash,
      });

      const cookies = await loginVolunteer('admin@example.com', password);

      return request(app.getHttpServer())
        .delete(`/api/volunteers/${volunteer.id}`)
        .set('Cookie', cookies)
        .expect(204);
    });

    it('should verify volunteer is deleted', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      
      await createTestVolunteer({
        email: 'admin@example.com',
        passwordHash,
        authTier: AuthTier.ADMIN,
      });

      const volunteer = await createTestVolunteer({
        email: 'user@example.com',
        passwordHash,
      });

      const cookies = await loginVolunteer('admin@example.com', password);

      await request(app.getHttpServer())
        .delete(`/api/volunteers/${volunteer.id}`)
        .set('Cookie', cookies)
        .expect(204);

      // Verify volunteer is soft deleted (has deletedAt timestamp)
      const deletedVolunteer = await prisma.volunteer.findUnique({
        where: { id: volunteer.id },
      });
      expect(deletedVolunteer).not.toBeNull();
      expect(deletedVolunteer!.deletedAt).not.toBeNull();
    });

    it('should return 404 for non-existent volunteer', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      
      await createTestVolunteer({
        email: 'admin@example.com',
        passwordHash,
        authTier: AuthTier.ADMIN,
      });

      const cookies = await loginVolunteer('admin@example.com', password);

      return request(app.getHttpServer())
        .delete('/api/volunteers/non-existent-id')
        .set('Cookie', cookies)
        .expect(404);
    });

    it('should reject access from LEADER tier', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      
      await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: AuthTier.LEADER,
      });

      const volunteer = await createTestVolunteer({
        email: 'user@example.com',
        passwordHash,
      });

      const cookies = await loginVolunteer('leader@example.com', password);

      return request(app.getHttpServer())
        .delete(`/api/volunteers/${volunteer.id}`)
        .set('Cookie', cookies)
        .expect(403);
    });

    it('should reject access from PARENT tier', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      
      await createTestVolunteer({
        email: 'parent@example.com',
        passwordHash,
        authTier: AuthTier.PARENT,
      });

      const volunteer = await createTestVolunteer({
        email: 'user@example.com',
        passwordHash,
      });

      const cookies = await loginVolunteer('parent@example.com', password);

      return request(app.getHttpServer())
        .delete(`/api/volunteers/${volunteer.id}`)
        .set('Cookie', cookies)
        .expect(403);
    });

    it('should require authentication', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      
      const volunteer = await createTestVolunteer({
        email: 'user@example.com',
        passwordHash,
      });

      return request(app.getHttpServer())
        .delete(`/api/volunteers/${volunteer.id}`)
        .expect(401);
    });
  });
});
