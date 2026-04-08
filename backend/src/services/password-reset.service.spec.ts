import { PasswordResetService } from './password-reset.service';
import { hash } from 'bcrypt';
import {
  setupTests,
  teardownTests,
  createTestVolunteer,
  createPasswordResetToken,
  prisma,
} from '../test/test-utils';

describe('PasswordResetService', () => {
  let service: PasswordResetService;

  beforeAll(async () => {
    await setupTests();
  });

  afterAll(async () => {
    await teardownTests();
  });

  beforeEach(() => {
    // PasswordResetService doesn't use DI, just instantiate directly
    service = new PasswordResetService();
  });

  afterEach(async () => {
    // Clean up in order to respect foreign key constraints
    await prisma.passwordReset.deleteMany();
    await prisma.signup.deleteMany();
    await prisma.activitySlot.deleteMany();
    await prisma.event.deleteMany();
    await prisma.pointEvent.deleteMany();
    await prisma.badgeTierHistory.deleteMany();
    await prisma.volunteerPointBalance.deleteMany();
    await prisma.leaderboardCache.deleteMany();
    await prisma.childRank.deleteMany();
    await prisma.volunteerToRole.deleteMany();
    await prisma.volunteer.deleteMany();
  });

  describe('createResetRequest', () => {
    it('should create reset token for existing volunteer', async () => {
      const volunteer = await createTestVolunteer({ email: 'reset@example.com' });

      const token = await service.createResetRequest('reset@example.com');

      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token!.length).toBe(64); // 32 bytes = 64 hex characters
    });

    it('should return null for non-existent email without error', async () => {
      const token = await service.createResetRequest('nonexistent@example.com');

      expect(token).toBeNull();
    });

    it('should not reveal if email exists (prevents enumeration)', async () => {
      const volunteer = await createTestVolunteer({ email: 'exists@example.com' });

      const existingToken = await service.createResetRequest('exists@example.com');
      const nonExistingToken = await service.createResetRequest('notexists@example.com');

      // Both should complete without throwing
      expect(existingToken).toBeTruthy();
      expect(nonExistingToken).toBeNull();
    });

    it('should store hashed token in database', async () => {
      const volunteer = await createTestVolunteer({ email: 'hash@example.com' });

      const token = await service.createResetRequest('hash@example.com');

      const resetRecord = await prisma.passwordReset.findFirst({
        where: { email: 'hash@example.com' },
        orderBy: { createdAt: 'desc' },
      });

      expect(resetRecord).toBeTruthy();
      expect(resetRecord!.token).not.toBe(token); // Should be hashed
      expect(resetRecord!.token).toHaveLength(64); // SHA-256 hash = 64 hex chars
    });

    it('should set expiry time to 1 hour from now', async () => {
      const volunteer = await createTestVolunteer({ email: 'expiry@example.com' });

      const beforeCreate = new Date();
      await service.createResetRequest('expiry@example.com');
      const afterCreate = new Date();

      const resetRecord = await prisma.passwordReset.findFirst({
        where: { email: 'expiry@example.com' },
        orderBy: { createdAt: 'desc' },
      });

      const expectedExpiry = new Date(beforeCreate);
      expectedExpiry.setHours(expectedExpiry.getHours() + 1);

      const expiryTime = new Date(resetRecord!.expiresAt);
      expect(expiryTime.getTime()).toBeGreaterThanOrEqual(expectedExpiry.getTime() - 1000);
      expect(expiryTime.getTime()).toBeLessThanOrEqual(expectedExpiry.getTime() + 1000);
    });

    it('should invalidate existing tokens when creating new one', async () => {
      const volunteer = await createTestVolunteer({ email: 'invalidate@example.com' });

      const token1 = await service.createResetRequest('invalidate@example.com');
      const token2 = await service.createResetRequest('invalidate@example.com');

      const allTokens = await prisma.passwordReset.findMany({
        where: { email: 'invalidate@example.com' },
        orderBy: { createdAt: 'asc' },
      });

      expect(allTokens).toHaveLength(2);
      expect(allTokens[0].used).toBe(true); // First token should be invalidated
      expect(allTokens[1].used).toBe(false); // Second token should be active
    });

    it('should not invalidate expired tokens', async () => {
      const volunteer = await createTestVolunteer({ email: 'expired@example.com' });

      // Create an expired token manually
      const expiredDate = new Date();
      expiredDate.setHours(expiredDate.getHours() - 2);

      await prisma.passwordReset.create({
        data: {
          email: 'expired@example.com',
          token: 'expired-token-hash',
          expiresAt: expiredDate,
          used: false,
        },
      });

      await service.createResetRequest('expired@example.com');

      const expiredToken = await prisma.passwordReset.findFirst({
        where: { token: 'expired-token-hash' },
      });

      // Expired token should not be marked as used
      expect(expiredToken!.used).toBe(false);
    });

    it('should return null for soft-deleted volunteer', async () => {
      const volunteer = await createTestVolunteer({ email: 'deleted@example.com' });

      await prisma.volunteer.update({
        where: { id: volunteer.id },
        data: { deletedAt: new Date() },
      });

      const token = await service.createResetRequest('deleted@example.com');

      expect(token).toBeNull();
    });

    it('should generate unique tokens', async () => {
      const volunteer = await createTestVolunteer({ email: 'unique@example.com' });

      const token1 = await service.createResetRequest('unique@example.com');
      
      // Invalidate first and create second
      await prisma.passwordReset.updateMany({
        where: { email: 'unique@example.com' },
        data: { used: true },
      });

      const token2 = await service.createResetRequest('unique@example.com');

      expect(token1).not.toBe(token2);
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      const volunteer = await createTestVolunteer({ email: 'valid@example.com' });
      const token = await createPasswordResetToken('valid@example.com');

      const newPasswordHash = await hash('newpassword123', 12);
      const success = await service.resetPassword(token, newPasswordHash);

      expect(success).toBe(true);

      const updated = await prisma.volunteer.findUnique({
        where: { id: volunteer.id },
      });

      expect(updated!.passwordHash).toBe(newPasswordHash);
    });

    it('should mark token as used after successful reset', async () => {
      const volunteer = await createTestVolunteer({ email: 'mark@example.com' });
      const token = await createPasswordResetToken('mark@example.com');

      const newPasswordHash = await hash('newpassword123', 12);
      await service.resetPassword(token, newPasswordHash);

      const resetRecord = await prisma.passwordReset.findFirst({
        where: { email: 'mark@example.com' },
      });

      expect(resetRecord!.used).toBe(true);
    });

    it('should return false for invalid token', async () => {
      const volunteer = await createTestVolunteer({ email: 'invalid@example.com' });

      const newPasswordHash = await hash('newpassword123', 12);
      const success = await service.resetPassword('invalid-token-12345', newPasswordHash);

      expect(success).toBe(false);
    });

    it('should return false for used token', async () => {
      const volunteer = await createTestVolunteer({ email: 'used@example.com' });
      const token = await createPasswordResetToken('used@example.com');

      // Mark token as used
      await prisma.passwordReset.updateMany({
        where: { email: 'used@example.com' },
        data: { used: true },
      });

      const newPasswordHash = await hash('newpassword123', 12);
      const success = await service.resetPassword(token, newPasswordHash);

      expect(success).toBe(false);
    });

    it('should return false for expired token', async () => {
      const volunteer = await createTestVolunteer({ email: 'expired@example.com' });

      // Create an expired token
      const expiredDate = new Date();
      expiredDate.setHours(expiredDate.getHours() - 2);

      const token = await createPasswordResetToken('expired@example.com');

      // Update to be expired
      await prisma.passwordReset.updateMany({
        where: { email: 'expired@example.com' },
        data: { expiresAt: expiredDate },
      });

      const newPasswordHash = await hash('newpassword123', 12);
      const success = await service.resetPassword(token, newPasswordHash);

      expect(success).toBe(false);
    });

    it('should return false when volunteer is soft-deleted', async () => {
      const volunteer = await createTestVolunteer({ email: 'softdeleted@example.com' });
      const token = await createPasswordResetToken('softdeleted@example.com');

      // Soft delete the volunteer
      await prisma.volunteer.update({
        where: { id: volunteer.id },
        data: { deletedAt: new Date() },
      });

      const newPasswordHash = await hash('newpassword123', 12);
      const success = await service.resetPassword(token, newPasswordHash);

      expect(success).toBe(false);
    });

    it('should invalidate all other tokens for the same email', async () => {
      const volunteer = await createTestVolunteer({ email: 'multi@example.com' });
      
      // Create multiple tokens
      const token1 = await createPasswordResetToken('multi@example.com');
      const token2 = await createPasswordResetToken('multi@example.com');

      // Un-mark them as used (createPasswordResetToken creates valid ones)
      await prisma.passwordReset.updateMany({
        where: { email: 'multi@example.com' },
        data: { used: false },
      });

      const newPasswordHash = await hash('newpassword123', 12);
      await service.resetPassword(token1, newPasswordHash);

      const allTokens = await prisma.passwordReset.findMany({
        where: { email: 'multi@example.com' },
      });

      // All tokens should be marked as used
      allTokens.forEach(token => {
        expect(token.used).toBe(true);
      });
    });

    it('should update volunteer updatedAt timestamp', async () => {
      const volunteer = await createTestVolunteer({ email: 'timestamp@example.com' });
      const token = await createPasswordResetToken('timestamp@example.com');

      const originalUpdatedAt = volunteer.updatedAt;

      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 10));

      const newPasswordHash = await hash('newpassword123', 12);
      await service.resetPassword(token, newPasswordHash);

      const updated = await prisma.volunteer.findUnique({
        where: { id: volunteer.id },
      });

      expect(new Date(updated!.updatedAt).getTime()).toBeGreaterThan(
        new Date(originalUpdatedAt).getTime()
      );
    });

    it('should execute password update and token marking in transaction', async () => {
      const volunteer = await createTestVolunteer({ email: 'transaction@example.com' });
      const token = await createPasswordResetToken('transaction@example.com');

      const newPasswordHash = await hash('newpassword123', 12);
      await service.resetPassword(token, newPasswordHash);

      // Both updates should have succeeded
      const updated = await prisma.volunteer.findUnique({
        where: { id: volunteer.id },
      });

      const resetRecord = await prisma.passwordReset.findFirst({
        where: { email: 'transaction@example.com' },
      });

      expect(updated!.passwordHash).toBe(newPasswordHash);
      expect(resetRecord!.used).toBe(true);
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should delete expired tokens', async () => {
      const volunteer = await createTestVolunteer({ email: 'cleanup1@example.com' });

      // Create expired token
      const expiredDate = new Date();
      expiredDate.setHours(expiredDate.getHours() - 2);

      await prisma.passwordReset.create({
        data: {
          email: 'cleanup1@example.com',
          token: 'expired-token',
          expiresAt: expiredDate,
          used: false,
        },
      });

      const deletedCount = await service.cleanupExpiredTokens();

      expect(deletedCount).toBeGreaterThanOrEqual(1);

      const expiredToken = await prisma.passwordReset.findFirst({
        where: { token: 'expired-token' },
      });

      expect(expiredToken).toBeNull();
    });

    it('should not delete valid unexpired tokens', async () => {
      const volunteer = await createTestVolunteer({ email: 'cleanup2@example.com' });
      const token = await createPasswordResetToken('cleanup2@example.com');

      await service.cleanupExpiredTokens();

      const validToken = await prisma.passwordReset.findFirst({
        where: { email: 'cleanup2@example.com' },
      });

      expect(validToken).toBeTruthy();
    });

    it('should delete used tokens older than 30 days', async () => {
      const volunteer = await createTestVolunteer({ email: 'cleanup3@example.com' });

      // Create old used token
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 31);

      await prisma.passwordReset.create({
        data: {
          email: 'cleanup3@example.com',
          token: 'old-used-token',
          expiresAt: new Date(),
          used: true,
          createdAt: oldDate,
        },
      });

      const deletedCount = await service.cleanupExpiredTokens();

      expect(deletedCount).toBeGreaterThanOrEqual(1);

      const oldToken = await prisma.passwordReset.findFirst({
        where: { token: 'old-used-token' },
      });

      expect(oldToken).toBeNull();
    });

    it('should not delete used tokens less than 30 days old', async () => {
      const volunteer = await createTestVolunteer({ email: 'cleanup4@example.com' });

      // Create token and immediately use it (will have current createdAt)
      const token = await service.createResetRequest('cleanup4@example.com');
      
      // Mark as used
      await prisma.passwordReset.updateMany({
        where: { email: 'cleanup4@example.com' },
        data: { used: true },
      });

      await service.cleanupExpiredTokens();

      const recentToken = await prisma.passwordReset.findFirst({
        where: { email: 'cleanup4@example.com' },
      });

      // Should still exist because it was just created (less than 30 days old)
      expect(recentToken).toBeTruthy();
      expect(recentToken!.used).toBe(true);
    });

    it('should return count of deleted tokens', async () => {
      const volunteer = await createTestVolunteer({ email: 'count@example.com' });

      // Create multiple expired tokens
      const expiredDate = new Date();
      expiredDate.setHours(expiredDate.getHours() - 2);

      await prisma.passwordReset.createMany({
        data: [
          { email: 'count@example.com', token: 'token1', expiresAt: expiredDate, used: false },
          { email: 'count@example.com', token: 'token2', expiresAt: expiredDate, used: false },
          { email: 'count@example.com', token: 'token3', expiresAt: expiredDate, used: false },
        ],
      });

      const deletedCount = await service.cleanupExpiredTokens();

      expect(deletedCount).toBeGreaterThanOrEqual(3);
    });

    it('should return 0 when no tokens to delete', async () => {
      // Clean up any existing tokens first
      await prisma.passwordReset.deleteMany();

      const deletedCount = await service.cleanupExpiredTokens();

      expect(deletedCount).toBe(0);
    });
  });
});
