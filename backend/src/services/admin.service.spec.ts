import { AdminService } from './admin.service';
import { AuthService } from './auth.service';
import {
  setupTests,
  teardownTests,
  createTestVolunteer,
  createTestVolunteerWithRole,
  prisma,
} from '../test/test-utils';

describe('AdminService', () => {
  let service: AdminService;
  let authService: AuthService;
  let testAdmin: any;

  beforeAll(async () => {
    await setupTests();
  });

  afterAll(async () => {
    await teardownTests();
  });

  beforeEach(async () => {
    // AdminService has dependency on AuthService, so create both
    authService = new AuthService();
    service = new AdminService(authService);
    
    // Create test admin
    testAdmin = await createTestVolunteer({ authTier: 'ADMIN' });
  });

  afterEach(async () => {
    // Clean up in order to respect foreign key constraints
    await prisma.signup.deleteMany();
    await prisma.activitySlot.deleteMany();
    await prisma.event.deleteMany();
    await prisma.pointEvent.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.badgeTierHistory.deleteMany();
    await prisma.volunteerPointBalance.deleteMany();
    await prisma.leaderboardCache.deleteMany();
    await prisma.childRank.deleteMany();
    await prisma.volunteerToRole.deleteMany();
    await prisma.volunteer.deleteMany();
  });

  describe('getAllVolunteers', () => {
    it('should return all active volunteers', async () => {
      await createTestVolunteer({ name: 'Volunteer 1' });
      await createTestVolunteer({ name: 'Volunteer 2' });
      await createTestVolunteer({ name: 'Volunteer 3' });

      const volunteers = await service.getAllVolunteers();

      expect(volunteers.length).toBeGreaterThanOrEqual(4); // 3 + testAdmin
      const names = volunteers.map(v => v.name);
      expect(names).toContain('Volunteer 1');
      expect(names).toContain('Volunteer 2');
      expect(names).toContain('Volunteer 3');
    });

    it('should not return soft-deleted volunteers', async () => {
      const active = await createTestVolunteer({ name: 'Active User' });
      const deleted = await createTestVolunteer({ name: 'Deleted User' });

      await prisma.volunteer.update({
        where: { id: deleted.id },
        data: { deletedAt: new Date() },
      });

      const volunteers = await service.getAllVolunteers();

      expect(volunteers.some(v => v.name === 'Active User')).toBe(true);
      expect(volunteers.some(v => v.name === 'Deleted User')).toBe(false);
    });

    it('should include volunteer roles', async () => {
      const volunteer = await createTestVolunteerWithRole('LEADER', 'Den Leader - Wolf');

      const volunteers = await service.getAllVolunteers();
      const found = volunteers.find(v => v.id === volunteer.id);

      expect(found).toBeTruthy();
      expect(found!.volunteerRoles).toBeDefined();
      expect(found!.volunteerRoles.length).toBeGreaterThan(0);
      expect(found!.volunteerRoles[0].role).toBeDefined();
    });

    it('should not include removed roles', async () => {
      const volunteer = await createTestVolunteerWithRole('LEADER', 'Den Leader - Wolf');

      // Remove the role
      await prisma.volunteerToRole.updateMany({
        where: { volunteerId: volunteer.id },
        data: { removedAt: new Date() },
      });

      const volunteers = await service.getAllVolunteers();
      const found = volunteers.find(v => v.id === volunteer.id);

      expect(found!.volunteerRoles).toHaveLength(0);
    });

    it('should include all required fields', async () => {
      const volunteer = await createTestVolunteer({
        name: 'Test User',
        email: 'test@example.com',
        phone: '555-1234',
        authTier: 'PARENT',
      });

      const volunteers = await service.getAllVolunteers();
      const found = volunteers.find(v => v.id === volunteer.id);

      expect(found).toHaveProperty('id');
      expect(found).toHaveProperty('email');
      expect(found).toHaveProperty('name');
      expect(found).toHaveProperty('phone');
      expect(found).toHaveProperty('authTier');
      expect(found).toHaveProperty('mustChangePassword');
      expect(found).toHaveProperty('createdAt');
      expect(found).toHaveProperty('updatedAt');
    });

    it('should order results by name ascending', async () => {
      await createTestVolunteer({ name: 'Charlie' });
      await createTestVolunteer({ name: 'Alice' });
      await createTestVolunteer({ name: 'Bob' });

      const volunteers = await service.getAllVolunteers();

      const charlieIndex = volunteers.findIndex(v => v.name === 'Charlie');
      const aliceIndex = volunteers.findIndex(v => v.name === 'Alice');
      const bobIndex = volunteers.findIndex(v => v.name === 'Bob');

      expect(aliceIndex).toBeLessThan(bobIndex);
      expect(bobIndex).toBeLessThan(charlieIndex);
    });

    it('should not include password hashes', async () => {
      const volunteers = await service.getAllVolunteers();

      volunteers.forEach(v => {
        expect(v).not.toHaveProperty('passwordHash');
      });
    });
  });

  describe('resetVolunteerPassword', () => {
    it('should generate temporary password and set mustChangePassword flag', async () => {
      const volunteer = await createTestVolunteer({ 
        name: 'User to Reset',
        mustChangePassword: false,
      });

      const result = await service.resetVolunteerPassword(volunteer.id, testAdmin.id);

      expect(result).toHaveProperty('temporaryPassword');
      expect(result.temporaryPassword).toBeTruthy();
      expect(result.email).toBe(volunteer.email);
      expect(result.name).toBe(volunteer.name);

      // Check that password was updated
      const updated = await prisma.volunteer.findUnique({
        where: { id: volunteer.id },
      });

      expect(updated!.mustChangePassword).toBe(true);
    });

    it('should hash the temporary password', async () => {
      const volunteer = await createTestVolunteer();

      const { temporaryPassword } = await service.resetVolunteerPassword(
        volunteer.id,
        testAdmin.id
      );

      const updated = await prisma.volunteer.findUnique({
        where: { id: volunteer.id },
      });

      // Password hash should not match the plaintext password
      expect(updated!.passwordHash).not.toBe(temporaryPassword);
      expect(updated!.passwordHash.length).toBeGreaterThan(30);
    });

    it('should throw error when volunteer not found', async () => {
      await expect(
        service.resetVolunteerPassword('non-existent-id', testAdmin.id)
      ).rejects.toThrow('Volunteer not found');
    });

    it('should throw error when volunteer is soft-deleted', async () => {
      const volunteer = await createTestVolunteer();

      await prisma.volunteer.update({
        where: { id: volunteer.id },
        data: { deletedAt: new Date() },
      });

      await expect(
        service.resetVolunteerPassword(volunteer.id, testAdmin.id)
      ).rejects.toThrow('Volunteer not found');
    });

    it('should prevent admin from resetting their own password', async () => {
      await expect(
        service.resetVolunteerPassword(testAdmin.id, testAdmin.id)
      ).rejects.toThrow('Admins cannot reset their own password');
    });

    it('should create audit log entry', async () => {
      const volunteer = await createTestVolunteer();

      await service.resetVolunteerPassword(volunteer.id, testAdmin.id);

      const auditLog = await prisma.auditLog.findFirst({
        where: {
          userId: testAdmin.id,
          action: 'PASSWORD_RESET_BY_ADMIN',
          entityId: volunteer.id,
        },
      });

      expect(auditLog).toBeTruthy();
      expect(auditLog!.entityType).toBe('Volunteer');
    });

    it('should generate readable temporary password format', async () => {
      const volunteer = await createTestVolunteer();

      const { temporaryPassword } = await service.resetVolunteerPassword(
        volunteer.id,
        testAdmin.id
      );

      // Format should be: word-word-#### (e.g., blue-tiger-4729)
      const parts = temporaryPassword.split('-');
      expect(parts).toHaveLength(3);
      expect(parts[0]).toMatch(/^[a-z]+$/); // First word
      expect(parts[1]).toMatch(/^[a-z]+$/); // Second word
      expect(parts[2]).toMatch(/^\d{4}$/);  // Four digits
    });

    it('should generate different passwords for consecutive resets', async () => {
      const volunteer1 = await createTestVolunteer({ name: 'User 1' });
      const volunteer2 = await createTestVolunteer({ name: 'User 2' });

      const result1 = await service.resetVolunteerPassword(volunteer1.id, testAdmin.id);
      const result2 = await service.resetVolunteerPassword(volunteer2.id, testAdmin.id);

      // Passwords should be different (statistically very likely)
      expect(result1.temporaryPassword).not.toBe(result2.temporaryPassword);
    });

    it('should set password that can be verified by bcrypt', async () => {
      const volunteer = await createTestVolunteer({ email: 'temp@example.com' });

      const { temporaryPassword } = await service.resetVolunteerPassword(
        volunteer.id,
        testAdmin.id
      );

      // Get the updated volunteer
      const updated = await prisma.volunteer.findUnique({
        where: { id: volunteer.id },
      });

      // Verify the temporary password matches the hash
      const bcrypt = require('bcrypt');
      const isValid = await bcrypt.compare(temporaryPassword, updated!.passwordHash);
      
      expect(isValid).toBe(true);
    });
  });
});
