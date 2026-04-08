/**
 * Database connection and basic operations test
 * This test verifies that the test database setup works correctly
 */

import { prisma, setupTests, teardownTests, cleanupDatabase } from './test/test-utils';

describe('Test Database Infrastructure', () => {
  beforeAll(async () => {
    await setupTests();
  });

  afterAll(async () => {
    await teardownTests();
  });

  afterEach(async () => {
    await prisma.volunteer.deleteMany();
  });

  describe('Database Connection', () => {
    it('should connect to test database successfully', async () => {
      const result = await prisma.volunteer.count();
      expect(result).toBeGreaterThanOrEqual(0);
    });

    it('should have seeded pack configuration', async () => {
      const packConfig = await prisma.packConfig.findFirst();
      expect(packConfig).toBeDefined();
      expect(packConfig?.packName).toBe('Test Pack');
      expect(packConfig?.packNumber).toBe('123');
    });

    it('should have seeded badge tiers', async () => {
      const tiers = await prisma.badgeTier.findMany();
      expect(tiers.length).toBe(6);
      expect(tiers[0].tierName).toBe('Bobcat');
      expect(tiers[5].tierName).toBe('Arrow of Light');
    });

    it('should have seeded volunteer roles', async () => {
      const roles = await prisma.volunteerRole.findMany();
      expect(roles.length).toBeGreaterThanOrEqual(4);
      
      const parentRole = roles.find(r => r.name === 'Parent/Guardian Volunteer');
      expect(parentRole).toBeDefined();
      expect(parentRole?.grantsTier).toBe('PARENT');
    });

    it('should have seeded activity types', async () => {
      const activities = await prisma.activityType.findMany();
      expect(activities.length).toBeGreaterThanOrEqual(4);
      
      const setupActivity = activities.find(a => a.name === 'Event Setup');
      expect(setupActivity).toBeDefined();
      expect(setupActivity?.category).toBe('LOW');
      expect(setupActivity?.pointValue).toBe(3);
    });
  });

  describe('Basic CRUD Operations', () => {
    it('should create a volunteer', async () => {
      const volunteer = await prisma.volunteer.create({
        data: {
          email: 'test@example.com',
          name: 'Test User',
          passwordHash: 'hashedpassword123',
          phone: '555-1234',
          authTier: 'PARENT',
        },
      });

      expect(volunteer.id).toBeDefined();
      expect(volunteer.email).toBe('test@example.com');
      expect(volunteer.name).toBe('Test User');
      expect(volunteer.authTier).toBe('PARENT');
    });

    it('should find a volunteer by email', async () => {
      await prisma.volunteer.create({
        data: {
          email: 'findme@example.com',
          name: 'Find Me',
          passwordHash: 'hash123',
          authTier: 'PARENT',
        },
      });

      const found = await prisma.volunteer.findUnique({
        where: { email: 'findme@example.com' },
      });

      expect(found).toBeDefined();
      expect(found?.name).toBe('Find Me');
    });

    it('should update a volunteer', async () => {
      const volunteer = await prisma.volunteer.create({
        data: {
          email: 'update@example.com',
          name: 'Original Name',
          passwordHash: 'hash123',
          authTier: 'PARENT',
        },
      });

      const updated = await prisma.volunteer.update({
        where: { id: volunteer.id },
        data: { name: 'Updated Name' },
      });

      expect(updated.name).toBe('Updated Name');
    });

    it('should delete a volunteer', async () => {
      const volunteer = await prisma.volunteer.create({
        data: {
          email: 'delete@example.com',
          name: 'Delete Me',
          passwordHash: 'hash123',
          authTier: 'PARENT',
        },
      });

      await prisma.volunteer.delete({
        where: { id: volunteer.id },
      });

      const found = await prisma.volunteer.findUnique({
        where: { id: volunteer.id },
      });

      expect(found).toBeNull();
    });
  });

  describe('Relationships', () => {
    it('should create volunteer with child rank', async () => {
      const volunteer = await prisma.volunteer.create({
        data: {
          email: 'parent@example.com',
          name: 'Parent User',
          passwordHash: 'hash123',
          authTier: 'PARENT',
          childrenRanks: {
            create: [
              { rankLevel: 'WOLF' },
              { rankLevel: 'TIGER' },
            ],
          },
        },
        include: {
          childrenRanks: true,
        },
      });

      expect(volunteer.childrenRanks).toHaveLength(2);
      expect(volunteer.childrenRanks.map(r => r.rankLevel)).toContain('WOLF');
      expect(volunteer.childrenRanks.map(r => r.rankLevel)).toContain('TIGER');
    });

    it('should create volunteer with role assignment', async () => {
      const role = await prisma.volunteerRole.findFirst({
        where: { name: 'Parent/Guardian Volunteer' },
      });

      const volunteer = await prisma.volunteer.create({
        data: {
          email: 'withrole@example.com',
          name: 'Role User',
          passwordHash: 'hash123',
          authTier: 'PARENT',
          volunteerRoles: {
            create: [
              {
                roleId: role!.id,
              },
            ],
          },
        },
        include: {
          volunteerRoles: {
            include: {
              role: true,
            },
          },
        },
      });

      expect(volunteer.volunteerRoles).toHaveLength(1);
      expect(volunteer.volunteerRoles[0].role.name).toBe('Parent/Guardian Volunteer');
    });
  });
});
