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

describe('Admin API (e2e)', () => {
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
    // Clean up test data in correct order for foreign key constraints
    await prisma.auditLog.deleteMany();
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

  /**
   * Helper function to create a test admin user with unique email
   */
  async function createTestAdmin() {
    const uniqueId = Date.now() + Math.random();
    const password = 'Admin123!';
    const passwordHash = await bcrypt.hash(password, 12);
    const admin = await createTestVolunteer({
      email: `admin-${uniqueId}@example.com`,
      passwordHash,
      name: 'Admin User',
      authTier: AuthTier.ADMIN,
    });

    const cookies = await loginVolunteer(`admin-${uniqueId}@example.com`, password);
    return { admin, cookies, password };
  }

  /**
   * Helper function to create a test parent user with unique email
   */
  async function createTestParent() {
    const uniqueId = Date.now() + Math.random();
    const password = 'Parent123!';
    const passwordHash = await bcrypt.hash(password, 12);
    const parent = await createTestVolunteer({
      email: `parent-${uniqueId}@example.com`,
      passwordHash,
      name: 'Parent User',
      authTier: AuthTier.PARENT,
    });

    const cookies = await loginVolunteer(`parent-${uniqueId}@example.com`, password);
    return { parent, cookies, password };
  }

  /**
   * Helper function to create a test leader user with unique email
   */
  async function createTestLeader() {
    const uniqueId = Date.now() + Math.random();
    const password = 'Leader123!';
    const passwordHash = await bcrypt.hash(password, 12);
    const leader = await createTestVolunteer({
      email: `leader-${uniqueId}@example.com`,
      passwordHash,
      name: 'Leader User',
      authTier: AuthTier.LEADER,
    });

    const cookies = await loginVolunteer(`leader-${uniqueId}@example.com`, password);
    return { leader, cookies, password };
  }

  describe('GET /api/admin/volunteers', () => {
    it('should list all volunteers as admin', async () => {
      const { cookies } = await createTestAdmin();

      // Create additional test volunteers
      const passwordHash = await bcrypt.hash('Password123!', 12);
      const volunteer1 = await createTestVolunteer({
        email: 'volunteer1@example.com',
        passwordHash,
        name: 'Alice Smith',
        authTier: AuthTier.PARENT,
      });

      const volunteer2 = await createTestVolunteer({
        email: 'volunteer2@example.com',
        passwordHash,
        name: 'Bob Jones',
        authTier: AuthTier.LEADER,
      });

      return request(app.getHttpServer())
        .get('/api/admin/volunteers')
        .set('Cookie', cookies)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toBeInstanceOf(Array);
          expect(res.body.data.length).toBeGreaterThanOrEqual(3); // Admin + 2 volunteers
          
          // Check structure of volunteer data
          const volunteer = res.body.data.find((v: any) => v.email === 'volunteer1@example.com');
          expect(volunteer).toBeDefined();
          expect(volunteer).toHaveProperty('id');
          expect(volunteer).toHaveProperty('email');
          expect(volunteer).toHaveProperty('name');
          expect(volunteer).toHaveProperty('phone');
          expect(volunteer).toHaveProperty('authTier');
          expect(volunteer).toHaveProperty('mustChangePassword');
          expect(volunteer).toHaveProperty('createdAt');
          expect(volunteer).toHaveProperty('updatedAt');
          expect(volunteer).toHaveProperty('volunteerRoles');
          expect(volunteer).not.toHaveProperty('passwordHash');
        });
    });

    it('should sort volunteers by name ascending', async () => {
      const { cookies } = await createTestAdmin();

      const passwordHash = await bcrypt.hash('Password123!', 12);
      await createTestVolunteer({
        email: 'zebra@example.com',
        passwordHash,
        name: 'Zebra User',
      });

      await createTestVolunteer({
        email: 'apple@example.com',
        passwordHash,
        name: 'Apple User',
      });

      return request(app.getHttpServer())
        .get('/api/admin/volunteers')
        .set('Cookie', cookies)
        .expect(200)
        .expect((res) => {
          const names = res.body.data.map((v: any) => v.name);
          const sortedNames = [...names].sort();
          expect(names).toEqual(sortedNames);
        });
    });

    it('should exclude soft-deleted volunteers', async () => {
      const { cookies } = await createTestAdmin();

      const passwordHash = await bcrypt.hash('Password123!', 12);
      const volunteer = await createTestVolunteer({
        email: 'deleted@example.com',
        passwordHash,
        name: 'Deleted User',
      });

      // Soft delete the volunteer
      await prisma.volunteer.update({
        where: { id: volunteer.id },
        data: { deletedAt: new Date() },
      });

      return request(app.getHttpServer())
        .get('/api/admin/volunteers')
        .set('Cookie', cookies)
        .expect(200)
        .expect((res) => {
          const deletedVolunteer = res.body.data.find((v: any) => v.email === 'deleted@example.com');
          expect(deletedVolunteer).toBeUndefined();
        });
    });

    it('should include volunteer roles', async () => {
      const { cookies } = await createTestAdmin();

      const passwordHash = await bcrypt.hash('Password123!', 12);
      const volunteer = await createTestVolunteer({
        email: 'volunteer@example.com',
        passwordHash,
        name: 'Test Volunteer',
      });

      // Get a volunteer role and assign it
      const role = await prisma.volunteerRole.findFirst({
        where: { deletedAt: null },
      });

      if (role) {
        await prisma.volunteerToRole.create({
          data: {
            volunteerId: volunteer.id,
            roleId: role.id,
          },
        });
      }

      return request(app.getHttpServer())
        .get('/api/admin/volunteers')
        .set('Cookie', cookies)
        .expect(200)
        .expect((res) => {
          const testVolunteer = res.body.data.find((v: any) => v.email === 'volunteer@example.com');
          expect(testVolunteer).toBeDefined();
          expect(testVolunteer.volunteerRoles).toBeInstanceOf(Array);
          if (role) {
            expect(testVolunteer.volunteerRoles.length).toBeGreaterThan(0);
            expect(testVolunteer.volunteerRoles[0]).toHaveProperty('role');
          }
        });
    });

    it('should exclude removed volunteer roles', async () => {
      const { cookies } = await createTestAdmin();

      const passwordHash = await bcrypt.hash('Password123!', 12);
      const volunteer = await createTestVolunteer({
        email: 'volunteer@example.com',
        passwordHash,
        name: 'Test Volunteer',
      });

      const role = await prisma.volunteerRole.findFirst({
        where: { deletedAt: null },
      });

      if (role) {
        // Create and then remove a role assignment
        await prisma.volunteerToRole.create({
          data: {
            volunteerId: volunteer.id,
            roleId: role.id,
            removedAt: new Date(),
          },
        });
      }

      return request(app.getHttpServer())
        .get('/api/admin/volunteers')
        .set('Cookie', cookies)
        .expect(200)
        .expect((res) => {
          const testVolunteer = res.body.data.find((v: any) => v.email === 'volunteer@example.com');
          expect(testVolunteer).toBeDefined();
          expect(testVolunteer.volunteerRoles).toHaveLength(0);
        });
    });

    it('should require authentication', () => {
      return request(app.getHttpServer())
        .get('/api/admin/volunteers')
        .expect(401);
    });

    it('should reject non-admin (parent tier)', async () => {
      const { cookies } = await createTestParent();

      return request(app.getHttpServer())
        .get('/api/admin/volunteers')
        .set('Cookie', cookies)
        .expect(403)
        .expect((res) => {
          expect(res.body.message).toContain('Admin access required');
        });
    });

    it('should reject non-admin (leader tier)', async () => {
      const { cookies } = await createTestLeader();

      return request(app.getHttpServer())
        .get('/api/admin/volunteers')
        .set('Cookie', cookies)
        .expect(403)
        .expect((res) => {
          expect(res.body.message).toContain('Admin access required');
        });
    });
  });

  describe('POST /api/admin/volunteers/:id/reset-password', () => {
    it('should reset volunteer password as admin', async () => {
      const { cookies, admin } = await createTestAdmin();

      const passwordHash = await bcrypt.hash('OldPassword123!', 12);
      const volunteer = await createTestVolunteer({
        email: 'user@example.com',
        passwordHash,
        name: 'Test User',
        mustChangePassword: false,
      });

      return request(app.getHttpServer())
        .post(`/api/admin/volunteers/${volunteer.id}/reset-password`)
        .set('Cookie', cookies)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.message).toContain('Password reset successfully');
          expect(res.body.data).toHaveProperty('email', 'user@example.com');
          expect(res.body.data).toHaveProperty('name', 'Test User');
          expect(res.body.data).toHaveProperty('temporaryPassword');
          
          // Check temporary password format (word-word-#### pattern)
          const tempPassword = res.body.data.temporaryPassword;
          expect(tempPassword).toMatch(/^[a-z]+-[a-z]+-\d{4}$/);
        });
    });

    it('should set mustChangePassword flag on reset', async () => {
      const { cookies } = await createTestAdmin();

      const passwordHash = await bcrypt.hash('OldPassword123!', 12);
      const volunteer = await createTestVolunteer({
        email: 'user@example.com',
        passwordHash,
        mustChangePassword: false,
      });

      await request(app.getHttpServer())
        .post(`/api/admin/volunteers/${volunteer.id}/reset-password`)
        .set('Cookie', cookies)
        .expect(200);

      // Verify mustChangePassword flag is set
      const updated = await prisma.volunteer.findUnique({
        where: { id: volunteer.id },
      });

      expect(updated?.mustChangePassword).toBe(true);
    });

    it('should update password hash on reset', async () => {
      const { cookies } = await createTestAdmin();

      const oldPasswordHash = await bcrypt.hash('OldPassword123!', 12);
      const volunteer = await createTestVolunteer({
        email: 'user@example.com',
        passwordHash: oldPasswordHash,
      });

      const response = await request(app.getHttpServer())
        .post(`/api/admin/volunteers/${volunteer.id}/reset-password`)
        .set('Cookie', cookies)
        .expect(200);

      const tempPassword = response.body.data.temporaryPassword;

      // Verify new password works
      const updated = await prisma.volunteer.findUnique({
        where: { id: volunteer.id },
      });

      const isValid = await bcrypt.compare(tempPassword, updated!.passwordHash);
      expect(isValid).toBe(true);
    });

    it('should create audit log entry on password reset', async () => {
      const { cookies, admin } = await createTestAdmin();

      const passwordHash = await bcrypt.hash('Password123!', 12);
      const volunteer = await createTestVolunteer({
        email: 'user@example.com',
        passwordHash,
        name: 'Test User',
      });

      await request(app.getHttpServer())
        .post(`/api/admin/volunteers/${volunteer.id}/reset-password`)
        .set('Cookie', cookies)
        .expect(200);

      // Verify audit log was created
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          userId: admin.id,
          action: 'PASSWORD_RESET_BY_ADMIN',
          entityType: 'Volunteer',
          entityId: volunteer.id,
        },
      });

      expect(auditLog).not.toBeNull();
      expect(auditLog?.userId).toBe(admin.id);
      
      const changes = JSON.parse(auditLog!.changes as string);
      expect(changes.targetEmail).toBe('user@example.com');
      expect(changes.action).toBe('password_reset');
      expect(changes).toHaveProperty('resetAt');
    });

    it('should reject admin resetting their own password', async () => {
      const { cookies, admin } = await createTestAdmin();

      return request(app.getHttpServer())
        .post(`/api/admin/volunteers/${admin.id}/reset-password`)
        .set('Cookie', cookies)
        .expect(403)
        .expect((res) => {
          expect(res.body.message).toContain('cannot reset their own password');
        });
    });

    it('should reject reset for non-existent volunteer', async () => {
      const { cookies } = await createTestAdmin();

      return request(app.getHttpServer())
        .post('/api/admin/volunteers/non-existent-id/reset-password')
        .set('Cookie', cookies)
        .expect(404)
        .expect((res) => {
          expect(res.body.message).toContain('Volunteer not found');
        });
    });

    it('should reject reset for soft-deleted volunteer', async () => {
      const { cookies } = await createTestAdmin();

      const passwordHash = await bcrypt.hash('Password123!', 12);
      const volunteer = await createTestVolunteer({
        email: 'deleted@example.com',
        passwordHash,
      });

      // Soft delete the volunteer
      await prisma.volunteer.update({
        where: { id: volunteer.id },
        data: { deletedAt: new Date() },
      });

      return request(app.getHttpServer())
        .post(`/api/admin/volunteers/${volunteer.id}/reset-password`)
        .set('Cookie', cookies)
        .expect(404)
        .expect((res) => {
          expect(res.body.message).toContain('Volunteer not found');
        });
    });

    it('should require authentication', async () => {
      const passwordHash = await bcrypt.hash('Password123!', 12);
      const volunteer = await createTestVolunteer({
        email: 'user@example.com',
        passwordHash,
      });

      return request(app.getHttpServer())
        .post(`/api/admin/volunteers/${volunteer.id}/reset-password`)
        .expect(401);
    });

    it('should reject non-admin (parent tier)', async () => {
      const { cookies } = await createTestParent();

      const passwordHash = await bcrypt.hash('Password123!', 12);
      const volunteer = await createTestVolunteer({
        email: 'user@example.com',
        passwordHash,
      });

      return request(app.getHttpServer())
        .post(`/api/admin/volunteers/${volunteer.id}/reset-password`)
        .set('Cookie', cookies)
        .expect(403)
        .expect((res) => {
          expect(res.body.message).toContain('Admin access required');
        });
    });

    it('should reject non-admin (leader tier)', async () => {
      const { cookies } = await createTestLeader();

      const passwordHash = await bcrypt.hash('Password123!', 12);
      const volunteer = await createTestVolunteer({
        email: 'user@example.com',
        passwordHash,
      });

      return request(app.getHttpServer())
        .post(`/api/admin/volunteers/${volunteer.id}/reset-password`)
        .set('Cookie', cookies)
        .expect(403)
        .expect((res) => {
          expect(res.body.message).toContain('Admin access required');
        });
    });

    it('should allow admin to reset different admin\'s password', async () => {
      const { cookies } = await createTestAdmin();

      // Create another admin
      const passwordHash = await bcrypt.hash('Admin123!', 12);
      const otherAdmin = await createTestVolunteer({
        email: 'other-admin@example.com',
        passwordHash,
        name: 'Other Admin',
        authTier: AuthTier.ADMIN,
      });

      return request(app.getHttpServer())
        .post(`/api/admin/volunteers/${otherAdmin.id}/reset-password`)
        .set('Cookie', cookies)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('temporaryPassword');
        });
    });

    it('should generate different temporary passwords', async () => {
      const { cookies } = await createTestAdmin();

      const passwordHash = await bcrypt.hash('Password123!', 12);
      const volunteer1 = await createTestVolunteer({
        email: 'user1@example.com',
        passwordHash,
      });

      const volunteer2 = await createTestVolunteer({
        email: 'user2@example.com',
        passwordHash,
      });

      const response1 = await request(app.getHttpServer())
        .post(`/api/admin/volunteers/${volunteer1.id}/reset-password`)
        .set('Cookie', cookies)
        .expect(200);

      const response2 = await request(app.getHttpServer())
        .post(`/api/admin/volunteers/${volunteer2.id}/reset-password`)
        .set('Cookie', cookies)
        .expect(200);

      const tempPassword1 = response1.body.data.temporaryPassword;
      const tempPassword2 = response2.body.data.temporaryPassword;

      // Passwords should be different (extremely high probability)
      expect(tempPassword1).not.toBe(tempPassword2);
    });
  });
});
