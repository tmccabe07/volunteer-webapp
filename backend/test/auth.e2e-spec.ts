import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import {
  setupTests,
  teardownTests,
  createTestVolunteer,
  createPasswordResetToken,
  prisma,
} from '../src/test/test-utils';
import * as bcrypt from 'bcrypt';

describe('Auth API (e2e)', () => {
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
    await prisma.passwordReset.deleteMany();
    await prisma.denChiefAssignment.deleteMany();
    await prisma.denChief.deleteMany();
    await prisma.volunteer.deleteMany();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new volunteer', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'SecurePassword123!',
          name: 'John Doe',
          phone: '5551234',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('user');
          expect(res.body.user).toHaveProperty('id');
          expect(res.body.user.email).toBe('newuser@example.com');
          expect(res.body.user.name).toBe('John Doe');
          expect(res.body.user.authTier).toBe('PARENT');
          expect(res.body.user).not.toHaveProperty('passwordHash');
        });
    });

    it('should reject registration with duplicate email', async () => {
      await createTestVolunteer({ email: 'existing@example.com' });

      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'Password123!',
          name: 'Jane Doe',
          phone: '5555678',
        })
        .expect(409);
    });

    it('should reject registration with invalid email', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'not-an-email',
          password: 'Password123!',
          name: 'Test User',
          phone: '5550000',
        })
        .expect(400);
    });

    it('should reject registration with weak password', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: '123', // Too short
          name: 'Test User',
          phone: '5550000',
        })
        .expect(400);
    });

    it('should reject registration with missing required fields', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          // Missing password, name, phone
        })
        .expect(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials and return tokens', async () => {
      const password = 'ValidPassword123!';
      const passwordHash = await bcrypt.hash(password, 12);
      await createTestVolunteer({
        email: 'user@example.com',
        passwordHash,
      });

      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('user');
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body.user.email).toBe('user@example.com');
          expect(res.body.user).not.toHaveProperty('passwordHash');

          // Check HttpOnly cookies are set
          expect(res.headers['set-cookie']).toBeDefined();
        });
    });

    it('should reject login with invalid email', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'AnyPassword123!',
        })
        .expect(401);
    });

    it('should reject login with invalid password', async () => {
      const password = 'CorrectPassword123!';
      const passwordHash = await bcrypt.hash(password, 12);
      await createTestVolunteer({
        email: 'user@example.com',
        passwordHash,
      });

      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: 'WrongPassword123!',
        })
        .expect(401);
    });

    it('should login a den chief account', async () => {
      const email = 'e2e-denchief@example.com';
      const password = 'DenChiefPass123!';
      await prisma.denChief.create({
        data: {
          email,
          firstName: 'E2E',
          lastName: 'Chief',
          passwordHash: await bcrypt.hash(password, 12),
          authTier: 'DEN_CHIEF',
        },
      });

      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email,
          password,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.user.email).toBe(email);
          expect(res.body.user.authTier).toBe('DEN_CHIEF');
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
        });
    });

    it('should include mustChangePassword flag in response', async () => {
      const password = 'TempPassword123!';
      const passwordHash = await bcrypt.hash(password, 12);
      await createTestVolunteer({
        email: 'tempuser@example.com',
        passwordHash,
        mustChangePassword: true,
      });

      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'tempuser@example.com',
          password,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.user.mustChangePassword).toBe(true);
        });
    });

    it.skip('should enforce rate limiting on login attempts', async () => {
      const requests = [];

      // Attempt 10 logins in rapid succession
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app.getHttpServer())
            .post('/api/auth/login')
            .send({
              email: 'test@example.com',
              password: 'Password123!',
            })
        );
      }

      const responses = await Promise.all(requests);
      const tooManyRequests = responses.filter((r) => r.status === 429);

      expect(tooManyRequests.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout and clear cookies', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      const volunteer = await createTestVolunteer({
        email: 'user@example.com',
        passwordHash,
      });

      // First login to get tokens
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'user@example.com', password });

      const cookies = loginRes.headers['set-cookie'];

      return request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Cookie', cookies)
        .expect(204);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh access token with valid refresh token', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      await createTestVolunteer({
        email: 'user@example.com',
        passwordHash,
      });

      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'user@example.com', password });

      const cookies = loginRes.headers['set-cookie'];

      return request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Cookie', cookies)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          // Tokens should be valid JWTs (we can't guarantee they're different if generated in same second)
          expect(typeof res.body.accessToken).toBe('string');
          expect(res.body.accessToken).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
        });
    });

    it('should reject invalid refresh token', () => {
      return request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Cookie', ['refresh_token=invalid.token.here'])
        .expect(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user info with valid token', async () => {
      const password = 'Password123!';
      const passwordHash = await bcrypt.hash(password, 12);
      const volunteer = await createTestVolunteer({
        email: 'user@example.com',
        passwordHash,
      });

      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'user@example.com', password });

      const cookies = loginRes.headers['set-cookie'];

      return request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Cookie', cookies)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(volunteer.id);
          expect(res.body.email).toBe('user@example.com');
          expect(res.body).toHaveProperty('roles');
          expect(res.body).not.toHaveProperty('passwordHash');
        });
    });

    it('should reject request without token', () => {
      return request(app.getHttpServer()).get('/api/auth/me').expect(401);
    });

    it('should reject request with invalid token', () => {
      return request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Cookie', ['access_token=invalid.token.here'])
        .expect(401);
    });
  });

  describe('POST /api/auth/change-password', () => {
    it('should change password with valid old password', async () => {
      const oldPassword = 'OldPassword123!';
      const newPassword = 'NewPassword456!';
      const passwordHash = await bcrypt.hash(oldPassword, 12);
      const volunteer = await createTestVolunteer({
        email: 'user@example.com',
        passwordHash,
        mustChangePassword: true,
      });

      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'user@example.com', password: oldPassword });

      const cookies = loginRes.headers['set-cookie'];

      return request(app.getHttpServer())
        .post('/api/auth/change-password')
        .set('Cookie', cookies)
        .send({
          currentPassword: oldPassword,
          newPassword,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toContain('Password changed');
        });
    });

    it('should clear mustChangePassword flag after password change', async () => {
      const oldPassword = 'TempPassword123!';
      const newPassword = 'NewPassword456!';
      const passwordHash = await bcrypt.hash(oldPassword, 12);
      const volunteer = await createTestVolunteer({
        email: 'user@example.com',
        passwordHash,
        mustChangePassword: true,
      });

      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'user@example.com', password: oldPassword });

      const cookies = loginRes.headers['set-cookie'];

      await request(app.getHttpServer())
        .post('/api/auth/change-password')
        .set('Cookie', cookies)
        .send({ currentPassword: oldPassword, newPassword });

      const updated = await prisma.volunteer.findUnique({
        where: { id: volunteer.id },
      });

      expect(updated?.mustChangePassword).toBe(false);
    });

    it('should reject change with incorrect old password', async () => {
      const oldPassword = 'CorrectPassword123!';
      const passwordHash = await bcrypt.hash(oldPassword, 12);
      await createTestVolunteer({
        email: 'user@example.com',
        passwordHash,
      });

      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'user@example.com', password: oldPassword });

      const cookies = loginRes.headers['set-cookie'];

      return request(app.getHttpServer())
        .post('/api/auth/change-password')
        .set('Cookie', cookies)
        .send({
          currentPassword: 'WrongPassword123!',
          newPassword: 'NewPassword456!',
        })
        .expect(401);
    });

    it('should require authentication', () => {
      return request(app.getHttpServer())
        .post('/api/auth/change-password')
        .send({
          currentPassword: 'OldPassword123!',
          newPassword: 'NewPassword456!',
        })
        .expect(401);
    });
  });

  describe('POST /api/auth/request-reset', () => {
    it('should create password reset request', async () => {
      const volunteer = await createTestVolunteer({
        email: 'user@example.com',
      });

      return request(app.getHttpServer())
        .post('/api/auth/request-reset')
        .send({ email: 'user@example.com' })
        .expect(201)
        .expect((res) => {
          expect(res.body.message).toContain('account exists');
        });
    });

    it('should return success even for non-existent email (security)', () => {
      // Don't reveal whether email exists
      return request(app.getHttpServer())
        .post('/api/auth/request-reset')
        .send({ email: 'nonexistent@example.com' })
        .expect(201);
    });

    it.skip('should enforce rate limiting', async () => {
      const volunteer = await createTestVolunteer({
        email: 'user@example.com',
      });

      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(
          request(app.getHttpServer())
            .post('/api/auth/request-reset')
            .send({ email: 'user@example.com' })
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter((r) => r.status === 429);

      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('should reset password with valid token', async () => {
      const volunteer = await createTestVolunteer({
        email: 'user@example.com',
      });
      const token = await createPasswordResetToken(volunteer.email);

      return request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({
          token,
          newPassword: 'NewSecurePassword123!',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.message).toContain('Password reset successful');
        });
    });

    it('should reject invalid token', () => {
      return request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({
          token: 'invalid-token',
          newPassword: 'NewPassword123!',
        })
        .expect(400);
    });

    it('should reject expired token', async () => {
      const volunteer = await createTestVolunteer({
        email: 'user@example.com',
      });

      // Create an expired token
      const token = 'expired-token';

      await prisma.passwordReset.create({
        data: {
          email: volunteer.email,
          token,
          expiresAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
        },
      });

      return request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({
          token,
          newPassword: 'NewPassword123!',
        })
        .expect(400);
    });
  });
});
