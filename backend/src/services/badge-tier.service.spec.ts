import { BadgeTierService } from './badge-tier.service';
import {
  setupTests,
  teardownTests,
  createTestVolunteer,
  prisma,
} from '../test/test-utils';

describe('BadgeTierService', () => {
  let service: BadgeTierService;
  let testVolunteer: any;

  beforeAll(async () => {
    await setupTests();
  });

  afterAll(async () => {
    await teardownTests();
  });

  beforeEach(async () => {
    // BadgeTierService doesn't use DI, just instantiate directly
    service = new BadgeTierService();
    
    // Create test volunteer
    testVolunteer = await createTestVolunteer({ name: 'Test Volunteer' });
  });

  afterEach(async () => {
    // Clean up in order to respect foreign key constraints
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

  describe('getAllTiers', () => {
    it('should return all badge tiers ordered by displayOrder', async () => {
      const tiers = await service.getAllTiers();

      expect(tiers.length).toBeGreaterThan(0);
      
      // Verify ordering
      for (let i = 1; i < tiers.length; i++) {
        expect(tiers[i].displayOrder).toBeGreaterThanOrEqual(tiers[i - 1].displayOrder);
      }
    });

    it('should include all tier properties', async () => {
      const tiers = await service.getAllTiers();
      const tier = tiers[0];

      expect(tier).toHaveProperty('id');
      expect(tier).toHaveProperty('tierName');
      expect(tier).toHaveProperty('minPoints');
      expect(tier).toHaveProperty('maxPoints');
      expect(tier).toHaveProperty('displayOrder');
      expect(tier).toHaveProperty('badgeColor');
      expect(tier).toHaveProperty('iconPath');
    });

    it('should return tiers that exist from test setup', async () => {
      const tiers = await service.getAllTiers();

      // From test-utils.ts seed data
      const tierNames = tiers.map(t => t.tierName);
      expect(tierNames).toContain('Bobcat');
      expect(tierNames).toContain('Tiger');
      expect(tierNames).toContain('Wolf');
      expect(tierNames).toContain('Bear');
      expect(tierNames).toContain('Webelos');
      expect(tierNames).toContain('Arrow of Light');
    });
  });

  describe('calculateBadgeTierForPoints', () => {
    it('should return correct tier for points in range', async () => {
      // From test-utils.ts: Wolf tier is 40-59 points
      const tier = await service.calculateBadgeTierForPoints(45);

      expect(tier).toBe('Wolf');
    });

    it('should return lowest tier for minimum points', async () => {
      // From test-utils.ts: Bobcat tier starts at 0 points
      const tier = await service.calculateBadgeTierForPoints(0);

      expect(tier).toBe('Bobcat');
    });

    it('should return highest tier for points above maximum', async () => {
      // From test-utils.ts: Arrow of Light tier is 100+ (no max)
      const tier = await service.calculateBadgeTierForPoints(500);

      expect(tier).toBe('Arrow of Light');
    });

    it('should return correct tier at boundary - lower edge', async () => {
      // From test-utils.ts: Tiger tier is 20-39 points
      const tier = await service.calculateBadgeTierForPoints(20);

      expect(tier).toBe('Tiger');
    });

    it('should return correct tier at boundary - upper edge', async () => {
      // From test-utils.ts: Tiger tier is 20-39 points
      const tier = await service.calculateBadgeTierForPoints(39);

      expect(tier).toBe('Tiger');
    });

    it('should handle tier transitions correctly', async () => {
      // From test-utils.ts: Bear tier is 60-79, Webelos is 80-99
      const bearTier = await service.calculateBadgeTierForPoints(79);
      const webelosTier = await service.calculateBadgeTierForPoints(80);

      expect(bearTier).toBe('Bear');
      expect(webelosTier).toBe('Webelos');
    });

    it('should return highest tier for exact min of highest tier', async () => {
      // From test-utils.ts: Arrow of Light tier starts at 100
      const tier = await service.calculateBadgeTierForPoints(100);

      expect(tier).toBe('Arrow of Light');
    });
  });

  describe('checkAndUpdateBadgeTier', () => {
    beforeEach(async () => {
      // Create initial leaderboard entry with Bobcat tier (0-19 points)
      await prisma.leaderboardCache.create({
        data: {
          volunteerId: testVolunteer.id,
          totalPoints: 10,
          badgeTier: 'Bobcat',
          rank: 1,
        },
      });
    });

    it('should update badge tier when points increase to new tier', async () => {
      // Upgrade from Bobcat (0-19) to Tiger (20-39)
      const changed = await service.checkAndUpdateBadgeTier(testVolunteer.id, 25);

      expect(changed).toBe(true);

      const updatedCache = await prisma.leaderboardCache.findUnique({
        where: { volunteerId: testVolunteer.id },
      });

      expect(updatedCache!.badgeTier).toBe('Tiger');
    });

    it('should record tier change in history', async () => {
      await service.checkAndUpdateBadgeTier(testVolunteer.id, 45);

      const history = await prisma.badgeTierHistory.findFirst({
        where: { volunteerId: testVolunteer.id },
      });

      expect(history).toBeTruthy();
      expect(history!.oldTier).toBe('Bobcat');
      expect(history!.newTier).toBe('Wolf');
      expect(history!.pointsAtChange).toBe(45);
    });

    it('should return false when tier does not change', async () => {
      // Stay in Bobcat tier (0-19)
      const changed = await service.checkAndUpdateBadgeTier(testVolunteer.id, 15);

      expect(changed).toBe(false);

      // No history should be created
      const history = await prisma.badgeTierHistory.findMany({
        where: { volunteerId: testVolunteer.id },
      });

      expect(history).toHaveLength(0);
    });

    it('should handle tier upgrades across multiple tiers', async () => {
      // Jump from Bobcat (0-19) to Bear (60-79)
      const changed = await service.checkAndUpdateBadgeTier(testVolunteer.id, 65);

      expect(changed).toBe(true);

      const updatedCache = await prisma.leaderboardCache.findUnique({
        where: { volunteerId: testVolunteer.id },
      });

      expect(updatedCache!.badgeTier).toBe('Bear');
    });

    it('should handle tier downgrades when points decrease', async () => {
      // First upgrade to Wolf
      await service.checkAndUpdateBadgeTier(testVolunteer.id, 45);

      // Clear history to isolate downgrade test
      await prisma.badgeTierHistory.deleteMany({
        where: { volunteerId: testVolunteer.id },
      });

      // Then downgrade back to Tiger (20-39)
      const changed = await service.checkAndUpdateBadgeTier(testVolunteer.id, 25);

      expect(changed).toBe(true);

      const history = await prisma.badgeTierHistory.findFirst({
        where: { volunteerId: testVolunteer.id },
      });

      expect(history!.oldTier).toBe('Wolf');
      expect(history!.newTier).toBe('Tiger');
    });

    it('should handle upgrade to highest tier', async () => {
      // Upgrade to Arrow of Light (100+)
      const changed = await service.checkAndUpdateBadgeTier(testVolunteer.id, 150);

      expect(changed).toBe(true);

      const updatedCache = await prisma.leaderboardCache.findUnique({
        where: { volunteerId: testVolunteer.id },
      });

      expect(updatedCache!.badgeTier).toBe('Arrow of Light');
    });

    it('should stay at highest tier when points increase further', async () => {
      // First get to Arrow of Light
      await service.checkAndUpdateBadgeTier(testVolunteer.id, 100);

      // Clear history
      await prisma.badgeTierHistory.deleteMany({
        where: { volunteerId: testVolunteer.id },
      });

      // Increase points but stay in same tier
      const changed = await service.checkAndUpdateBadgeTier(testVolunteer.id, 200);

      expect(changed).toBe(false);
    });

    it('should handle volunteer with no prior leaderboard entry', async () => {
      // Create new volunteer without leaderboard entry
      const newVolunteer = await createTestVolunteer({ name: 'New Volunteer' });

      // Create fresh leaderboard entry
      await prisma.leaderboardCache.create({
        data: {
          volunteerId: newVolunteer.id,
          totalPoints: 0,
          badgeTier: null,
          rank: 1,
        },
      });

      // Award points to trigger first tier
      const changed = await service.checkAndUpdateBadgeTier(newVolunteer.id, 25);

      expect(changed).toBe(true);

      const history = await prisma.badgeTierHistory.findFirst({
        where: { volunteerId: newVolunteer.id },
      });

      expect(history!.oldTier).toBeNull();
      expect(history!.newTier).toBe('Tiger');
    });
  });

  describe('getTierHistory', () => {
    it('should return tier history ordered by achievedAt desc', async () => {
      // Create leaderboard entry
      await prisma.leaderboardCache.create({
        data: {
          volunteerId: testVolunteer.id,
          totalPoints: 10,
          badgeTier: 'Bobcat',
          rank: 1,
        },
      });

      // Create multiple tier changes
      await service.checkAndUpdateBadgeTier(testVolunteer.id, 25); // Tiger
      await new Promise(resolve => setTimeout(resolve, 10));
      await service.checkAndUpdateBadgeTier(testVolunteer.id, 45); // Wolf
      await new Promise(resolve => setTimeout(resolve, 10));
      await service.checkAndUpdateBadgeTier(testVolunteer.id, 65); // Bear

      const history = await service.getTierHistory(testVolunteer.id);

      expect(history).toHaveLength(3);
      
      // Most recent should be first (Bear upgrade)
      expect(history[0].newTier).toBe('Bear');
      expect(history[1].newTier).toBe('Wolf');
      expect(history[2].newTier).toBe('Tiger');

      // Verify ordering by timestamp
      expect(new Date(history[0].achievedAt).getTime()).toBeGreaterThan(
        new Date(history[1].achievedAt).getTime()
      );
    });

    it('should return empty array when volunteer has no tier history', async () => {
      const history = await service.getTierHistory(testVolunteer.id);

      expect(history).toHaveLength(0);
    });

    it('should include all history fields', async () => {
      // Create leaderboard entry
      await prisma.leaderboardCache.create({
        data: {
          volunteerId: testVolunteer.id,
          totalPoints: 10,
          badgeTier: 'Bobcat',
          rank: 1,
        },
      });

      await service.checkAndUpdateBadgeTier(testVolunteer.id, 25);

      const history = await service.getTierHistory(testVolunteer.id);
      const entry = history[0];

      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('volunteerId');
      expect(entry).toHaveProperty('oldTier');
      expect(entry).toHaveProperty('newTier');
      expect(entry).toHaveProperty('pointsAtChange');
      expect(entry).toHaveProperty('achievedAt');
    });

    it('should only return history for specified volunteer', async () => {
      const volunteer2 = await createTestVolunteer({ name: 'Volunteer 2' });

      // Create leaderboard entries for both
      await prisma.leaderboardCache.createMany({
        data: [
          {
            volunteerId: testVolunteer.id,
            totalPoints: 10,
            badgeTier: 'Bobcat',
            rank: 1,
          },
          {
            volunteerId: volunteer2.id,
            totalPoints: 15,
            badgeTier: 'Bobcat',
            rank: 2,
          },
        ],
      });

      // Create tier changes for both
      await service.checkAndUpdateBadgeTier(testVolunteer.id, 25);
      await service.checkAndUpdateBadgeTier(volunteer2.id, 30);

      const history = await service.getTierHistory(testVolunteer.id);

      expect(history).toHaveLength(1);
      expect(history[0].volunteerId).toBe(testVolunteer.id);
    });
  });

  describe('getCurrentTier', () => {
    it('should return current badge tier for volunteer', async () => {
      await prisma.leaderboardCache.create({
        data: {
          volunteerId: testVolunteer.id,
          totalPoints: 45,
          badgeTier: 'Wolf',
          rank: 1,
        },
      });

      const tier = await service.getCurrentTier(testVolunteer.id);

      expect(tier).toBe('Wolf');
    });

    it('should return null when volunteer has no leaderboard entry', async () => {
      const tier = await service.getCurrentTier(testVolunteer.id);

      expect(tier).toBeNull();
    });

    it('should return null when volunteer has leaderboard entry but no tier', async () => {
      await prisma.leaderboardCache.create({
        data: {
          volunteerId: testVolunteer.id,
          totalPoints: 0,
          badgeTier: null,
          rank: 1,
        },
      });

      const tier = await service.getCurrentTier(testVolunteer.id);

      expect(tier).toBeNull();
    });

    it('should return updated tier after tier change', async () => {
      // Create initial entry
      await prisma.leaderboardCache.create({
        data: {
          volunteerId: testVolunteer.id,
          totalPoints: 10,
          badgeTier: 'Bobcat',
          rank: 1,
        },
      });

      // Check tier before upgrade
      const tierBefore = await service.getCurrentTier(testVolunteer.id);
      expect(tierBefore).toBe('Bobcat');

      // Upgrade tier
      await service.checkAndUpdateBadgeTier(testVolunteer.id, 45);

      // Check tier after upgrade
      const tierAfter = await service.getCurrentTier(testVolunteer.id);
      expect(tierAfter).toBe('Wolf');
    });
  });

  describe('seedDefaultTiers', () => {
    it('should not seed tiers when tiers already exist', async () => {
      const tiersBefore = await prisma.badgeTier.count();
      
      // Try to seed
      await service.seedDefaultTiers();
      
      const tiersAfter = await prisma.badgeTier.count();

      // Count should not change
      expect(tiersAfter).toBe(tiersBefore);
    });

    it('should create tiers when database is empty', async () => {
      // Delete all existing tiers
      await prisma.badgeTierHistory.deleteMany();
      await prisma.leaderboardCache.deleteMany();
      await prisma.badgeTier.deleteMany();

      // Verify empty
      const countBefore = await prisma.badgeTier.count();
      expect(countBefore).toBe(0);

      // Seed
      await service.seedDefaultTiers();

      // Verify tiers created
      const countAfter = await prisma.badgeTier.count();
      expect(countAfter).toBeGreaterThan(0);

      const tiers = await prisma.badgeTier.findMany({
        orderBy: { displayOrder: 'asc' },
      });

      expect(tiers.length).toBe(5);
      expect(tiers[0].tierName).toBe('Bronze');
      expect(tiers[1].tierName).toBe('Silver');
      expect(tiers[2].tierName).toBe('Gold');
      expect(tiers[3].tierName).toBe('Platinum');
      expect(tiers[4].tierName).toBe('Diamond');
    });

    it('should create tiers with correct point ranges', async () => {
      // Delete all existing tiers
      await prisma.badgeTierHistory.deleteMany();
      await prisma.leaderboardCache.deleteMany();
      await prisma.badgeTier.deleteMany();

      await service.seedDefaultTiers();

      const bronze = await prisma.badgeTier.findFirst({
        where: { tierName: 'Bronze' },
      });
      const diamond = await prisma.badgeTier.findFirst({
        where: { tierName: 'Diamond' },
      });

      expect(bronze!.minPoints).toBe(20);
      expect(bronze!.maxPoints).toBe(39);
      expect(diamond!.minPoints).toBe(100);
      expect(diamond!.maxPoints).toBeNull(); // No upper limit
    });

    it('should create tiers with correct display order', async () => {
      // Delete all existing tiers
      await prisma.badgeTierHistory.deleteMany();
      await prisma.leaderboardCache.deleteMany();
      await prisma.badgeTier.deleteMany();

      await service.seedDefaultTiers();

      const tiers = await prisma.badgeTier.findMany({
        orderBy: { displayOrder: 'asc' },
      });

      for (let i = 0; i < tiers.length; i++) {
        expect(tiers[i].displayOrder).toBe(i + 1);
      }
    });
  });
});
