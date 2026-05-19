import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PasswordResetService } from './password-reset.service';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import {
  setupTests,
  teardownTests,
  createTestVolunteer,
  prisma,
} from '../test/test-utils';

describe('AuthService', () => {
  let service: AuthService;
  let passwordResetService: PasswordResetService;

  beforeAll(async () => {
    await setupTests();
  });

  afterAll(async () => {
    await teardownTests();
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        PasswordResetService,
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    passwordResetService = module.get<PasswordResetService>(PasswordResetService);
  });

  afterEach(async () => {
    // Clean up volunteers and related data created during tests
    // Delete in order to respect foreign key constraints
    await prisma.passwordReset.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.volunteerToRole.deleteMany();
    await prisma.childRank.deleteMany();
    await prisma.volunteerPointBalance.deleteMany();
    await prisma.volunteer.deleteMany();
  });

  describe('registerVolunteer', () => {
    it('should create a new volunteer with hashed password', async () => {
      const email = 'newuser@example.com';
      const password = 'SecurePass123!';
      const name = 'John Doe';
      const phone = '555-1234';

      const result = await service.registerVolunteer(email, password, name, phone);

      expect(result).toHaveProperty('volunteer');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.volunteer.email).toBe(email);
      expect(result.volunteer.name).toBe(name);
      expect(result.volunteer.authTier).toBe('PARENT');
      expect(result.volunteer.mustChangePassword).toBe(false);

      // Verify password was hashed
      const volunteer = await prisma.volunteer.findUnique({
        where: { email },
      });
      expect(volunteer?.passwordHash).not.toBe(password);
      const isPasswordValid = await bcrypt.compare(
        password,
        volunteer!.passwordHash
      );
      expect(isPasswordValid).toBe(true);
    });

    it('should throw error if email already exists', async () => {
      const email = 'duplicate@example.com';
      await createTestVolunteer({ email });

      await expect(
        service.registerVolunteer(email, 'SecurePass123!', 'Jane Doe', '555-5678')
      ).rejects.toThrow('Email already in use');
    });

    it('should create point balance for new volunteer', async () => {
      const email = 'withpoints@example.com';
      const result = await service.registerVolunteer(
        email,
        'SecurePass123!',
        'Test User',
        '555-0000'
      );

      // Verify point balance was created
      const volunteer = await prisma.volunteer.findUnique({
        where: { email },
        include: { pointBalance: true },
      });
      
      expect(volunteer?.pointBalance).toBeDefined();
      expect(volunteer?.pointBalance?.totalPoints).toBe(0);
      expect(volunteer?.pointBalance?.currentYearPoints).toBe(0);
    });
  });

  describe('loginVolunteer', () => {
    it('should return volunteer and tokens for valid credentials', async () => {
      const email = 'login@example.com';
      const password = 'ValidPass123!';
      const passwordHash = await bcrypt.hash(password, 12);
      await createTestVolunteer({ email, passwordHash });

      const result = await service.loginVolunteer(email, password);

      expect(result).not.toBeNull();
      expect(result!.volunteer.email).toBe(email);
      expect(result!.accessToken).toBeTruthy();
      expect(result!.refreshToken).toBeTruthy();

      // Verify access token
      const decoded = jwt.verify(
        result!.accessToken,
        process.env.JWT_SECRET || 'test-secret'
      ) as any;
      expect(decoded.email).toBe(email);
      expect(decoded.type).toBe('access');
      expect(decoded.userId).toBeTruthy();
    });

    it('should return null for invalid email', async () => {
      const result = await service.loginVolunteer(
        'nonexistent@example.com',
        'anypassword'
      );
      expect(result).toBeNull();
    });

    it('should return null for invalid password', async () => {
      const email = 'user@example.com';
      const password = 'CorrectPass123!';
      const passwordHash = await bcrypt.hash(password, 12);
      await createTestVolunteer({ email, passwordHash });

      const result = await service.loginVolunteer(email, 'WrongPassword');
      expect(result).toBeNull();
    });

    it('should include mustChangePassword flag in response', async () => {
      const email = 'mustchange@example.com';
      const password = 'TempPass123!';
      const passwordHash = await bcrypt.hash(password, 12);
      await createTestVolunteer({
        email,
        passwordHash,
        mustChangePassword: true,
      });

      const result = await service.loginVolunteer(email, password);

      expect(result).not.toBeNull();
      expect(result!.volunteer.mustChangePassword).toBe(true);
    });

    it('should not return passwordHash in response', async () => {
      const email = 'secure@example.com';
      const password = 'SecurePass123!';
      const passwordHash = await bcrypt.hash(password, 12);
      await createTestVolunteer({ email, passwordHash });

      const result = await service.loginVolunteer(email, password);

      expect(result).not.toBeNull();
      expect(result!.volunteer).not.toHaveProperty('passwordHash');
    });
  });

  describe('token generation', () => {
    it('should generate access token with correct payload', async () => {
      const volunteer = await createTestVolunteer();

      const accessToken = service.generateAccessToken(
        volunteer.id,
        volunteer.email,
        volunteer.authTier
      );

      expect(accessToken).toBeTruthy();

      // Verify access token structure
      const decoded = jwt.verify(
        accessToken,
        process.env.JWT_SECRET || 'test-secret'
      ) as any;
      expect(decoded.userId).toBe(volunteer.id);
      expect(decoded.email).toBe(volunteer.email);
      expect(decoded.authTier).toBe(volunteer.authTier);
      expect(decoded.type).toBe('access');
    });

    it('should generate refresh token with correct payload', async () => {
      const volunteer = await createTestVolunteer();

      const refreshToken = service.generateRefreshToken(volunteer.id, false);

      expect(refreshToken).toBeTruthy();

      // Verify refresh token structure
      const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET || 'test-refresh-secret'
      ) as any;
      expect(decoded.userId).toBe(volunteer.id);
      expect(decoded.type).toBe('refresh');
    });

    it('should set proper expiration times', async () => {
      const volunteer = await createTestVolunteer();

      const accessToken = service.generateAccessToken(
        volunteer.id,
        volunteer.email,
        volunteer.authTier
      );
      const refreshToken = service.generateRefreshToken(volunteer.id, false);

      const accessDecoded = jwt.decode(accessToken) as any;
      const refreshDecoded = jwt.decode(refreshToken) as any;

      // Access token expires in 15 minutes
      expect(accessDecoded.exp - accessDecoded.iat).toBe(15 * 60);

      // Refresh token expires in 7 days (rememberMe: false)
      expect(refreshDecoded.exp - refreshDecoded.iat).toBe(7 * 24 * 60 * 60);
    });

    it('should generate longer refresh token when rememberMe is true', async () => {
      const volunteer = await createTestVolunteer();

      const refreshToken = service.generateRefreshToken(volunteer.id, true);

      const decoded = jwt.decode(refreshToken) as any;

      // Refresh token expires in 30 days (rememberMe: true)
      expect(decoded.exp - decoded.iat).toBe(30 * 24 * 60 * 60);
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify and decode valid access token', async () => {
      const volunteer = await createTestVolunteer();
      const accessToken = service.generateAccessToken(
        volunteer.id,
        volunteer.email,
        volunteer.authTier
      );

      const decoded = service.verifyAccessToken(accessToken);

      expect(decoded.userId).toBe(volunteer.id);
      expect(decoded.email).toBe(volunteer.email);
      expect(decoded.authTier).toBe(volunteer.authTier);
    });

    it('should throw error for invalid token', () => {
      expect(() =>
        service.verifyAccessToken('invalid.token.here')
      ).toThrow('Invalid or expired access token');
    });

    it('should throw error for expired token', () => {
      const expiredToken = jwt.sign(
        { userId: 'test-id', email: 'test@example.com', type: 'access' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '-1h' }
      );

      expect(() => service.verifyAccessToken(expiredToken)).toThrow(
        'Invalid or expired access token'
      );
    });

    it('should throw error for refresh token', async () => {
      const volunteer = await createTestVolunteer();
      const refreshToken = service.generateRefreshToken(volunteer.id, false);

      // Should reject refresh token when expecting access token
      expect(() => service.verifyAccessToken(refreshToken)).toThrow(
        'Invalid or expired access token'
      );
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify and decode valid refresh token', async () => {
      const volunteer = await createTestVolunteer();
      const refreshToken = service.generateRefreshToken(volunteer.id, false);

      const decoded = service.verifyRefreshToken(refreshToken);

      expect(decoded.userId).toBe(volunteer.id);
    });

    it('should throw error for invalid token', () => {
      expect(() =>
        service.verifyRefreshToken('invalid.token.here')
      ).toThrow('Invalid or expired refresh token');
    });

    it('should throw error for access token', async () => {
      const volunteer = await createTestVolunteer();
      const accessToken = service.generateAccessToken(
        volunteer.id,
        volunteer.email,
        volunteer.authTier
      );

      // Should reject access token when expecting refresh token
      expect(() => service.verifyRefreshToken(accessToken)).toThrow(
        'Invalid or expired refresh token'
      );
    });
  });

  describe('changePassword', () => {
    it('should update password and clear mustChangePassword flag', async () => {
      const oldPassword = 'OldPass123!';
      const newPassword = 'NewPass456!';
      const passwordHash = await bcrypt.hash(oldPassword, 12);
      const volunteer = await createTestVolunteer({
        passwordHash,
        mustChangePassword: true,
      });

      const result = await service.changePassword(
        volunteer.id,
        oldPassword,
        newPassword
      );

      expect(result).toBe(true);

      const updated = await prisma.volunteer.findUnique({
        where: { id: volunteer.id },
      });

      expect(updated?.mustChangePassword).toBe(false);
      const isNewPasswordValid = await bcrypt.compare(
        newPassword,
        updated!.passwordHash
      );
      expect(isNewPasswordValid).toBe(true);
    });

    it('should throw error for incorrect old password', async () => {
      const oldPassword = 'OldPass123!';
      const passwordHash = await bcrypt.hash(oldPassword, 12);
      const volunteer = await createTestVolunteer({ passwordHash });

      await expect(
        service.changePassword(volunteer.id, 'WrongOldPass', 'NewPass456!')
      ).rejects.toThrow('Current password is incorrect');
    });

    it('should throw error if volunteer not found', async () => {
      await expect(
        service.changePassword('nonexistent-id', 'OldPass123!', 'NewPass456!')
      ).rejects.toThrow('Volunteer not found');
    });
  });

  describe('getCurrentUser', () => {
    it('should return volunteer with roles and point balance', async () => {
      const volunteer = await createTestVolunteer();
      
      // Create point balance for volunteer
      await prisma.volunteerPointBalance.create({
        data: {
          volunteerId: volunteer.id,
          totalPoints: 50,
          currentYearPoints: 50,
        },
      });

      const result = await service.getCurrentUser(volunteer.id);

      expect(result.id).toBe(volunteer.id);
      expect(result.email).toBe(volunteer.email);
      expect(result.name).toBe(volunteer.name);
      expect(result).toHaveProperty('roles');
      expect(result).toHaveProperty('pointBalance');
      expect(result.pointBalance?.totalPoints).toBe(50);
      expect(result.pointBalance?.currentYearPoints).toBe(50);
    });

    it('should return volunteer with child ranks', async () => {
      const volunteer = await createTestVolunteer();
      
      // Create child rank
      await prisma.childRank.create({
        data: {
          volunteerId: volunteer.id,
          rankLevel: 'WOLF',
        },
      });

      const result = await service.getCurrentUser(volunteer.id);

      expect(result.childrenRanks).toBeDefined();
      expect(result.childrenRanks).toHaveLength(1);
      expect(result.childrenRanks[0].rankLevel).toBe('WOLF');
    });

    it('should throw error if volunteer not found', async () => {
      await expect(
        service.getCurrentUser('nonexistent-id')
      ).rejects.toThrow('Volunteer not found');
    });
  });
});

