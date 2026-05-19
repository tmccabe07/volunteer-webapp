import { BadgeTierService } from './badge-tier.service';
import { NotificationService } from './notification.service';
import {
  setupTests,
  teardownTests,
  createTestVolunteer,
  prisma,
} from '../test/test-utils';

describe('BadgeTierService', () => {
  let service: BadgeTierService;
  let notificationService: NotificationService;
  let testVolunteer: any;

  beforeAll(async () => {
    await setupTests();
  });

  afterAll(async () => {
    await teardownTests();
  });

  beforeEach(async () => {
    // Create NotificationService and BadgeTierService with dependency injection
    notificationService = new NotificationService();
    service = new BadgeTierService(notificationService);
    
    // Create test volunteer
    testVolunteer = await createTestVolunteer({ name: 'Test Volunteer' });
  });

  afterEach(async () => {
    // Clean up in order to respect foreign key constraints
    await prisma.notification.deleteMany();
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

      // From test-utils.ts seed data (achievement-based)
      const tierNames = tiers.map(t => t.tierName);
      expect(tierNames).toContain('Bronze');
      expect(tierNames).toContain('Silver');
      expect(tierNames).toContain('Gold');
      expect(tierNames).toContain('Platinum');
      expect(tierNames).toContain('Diamond');
      expect(tierNames).toContain('Titanium');
    });
  });

  describe('calculateBadgeTierForPoints', () => {
    it('should return correct tier for points in range', async () => {
      // From test-utils.ts: Silver tier is 50-79 points
      const tier = await service.calculateBadgeTierForPoints(55);

      expect(tier).toBe('Silver');
    });

    it('should return lowest tier for minimum points', async () => {
      // From test-utils.ts: Bronze tier starts at 0 points
      const tier = await service.calculateBadgeTierForPoints(0);

      expect(tier).toBe('Bronze');
    });

    it('should return highest tier for points above maximum', async () => {
      // From test-utils.ts: Titanium tier is 170+ (no max)
      const tier = await service.calculateBadgeTierForPoints(500);

      expect(tier).toBe('Titanium');
    });

    it('should return correct tier at boundary - lower edge', async () => {
      // From test-utils.ts: Silver tier is 50-79 points
      const tier = await service.calculateBadgeTierForPoints(50);

      expect(tier).toBe('Silver');
    });

    it('should return correct tier at boundary - upper edge', async () => {
      // From test-utils.ts: Silver tier is 50-79 points
      const tier = await service.calculateBadgeTierForPoints(79);

      expect(tier).toBe('Silver');
    });

    it('should handle tier transitions correctly', async () => {
      // From test-utils.ts: Gold tier is 80-99, Platinum is 100-129
      const goldTier = await service.calculateBadgeTierForPoints(99);
      const platinumTier = await service.calculateBadgeTierForPoints(100);

      expect(goldTier).toBe('Gold');
      expect(platinumTier).toBe('Platinum');
    });

    it('should return highest tier for exact min of highest tier', async () => {
      // From test-utils.ts: Titanium tier starts at 170
      const tier = await service.calculateBadgeTierForPoints(170);

      expect(tier).toBe('Titanium');
    });
  });

  describe('checkAndUpdateBadgeTier', () => {
    beforeEach(async () => {
      // Create initial leaderboard entry with Bronze tier (0-49 points)
      await prisma.leaderboardCache.create({
        data: {
          volunteerId: testVolunteer.id,
          totalPoints: 10,
          badgeTier: 'Bronze',
          rank: 1,
        },
      });
    });

    it('should update badge tier when points increase to new tier', async () => {
      // Upgrade from Bronze (0-49) to Silver (50-79)
      const changed = await service.checkAndUpdateBadgeTier(testVolunteer.id, 55);

      expect(changed).toBe(true);

      const updatedCache = await prisma.leaderboardCache.findUnique({
        where: { volunteerId: testVolunteer.id },
      });

      expect(updatedCache!.badgeTier).toBe('Silver');
    });

    it('should record tier change in history', async () => {
      await service.checkAndUpdateBadgeTier(testVolunteer.id, 85);

      const history = await prisma.badgeTierHistory.findFirst({
        where: { volunteerId: testVolunteer.id },
      });

      expect(history).toBeTruthy();
      expect(history!.oldTier).toBe('Bronze');
      expect(history!.newTier).toBe('Gold');
      expect(history!.pointsAtChange).toBe(85);
    });

    it('should return false when tier does not change', async () => {
      // Stay in Bronze tier (0-49)
      const changed = await service.checkAndUpdateBadgeTier(testVolunteer.id, 25);

      expect(changed).toBe(false);

      // No history should be created
      const history = await prisma.badgeTierHistory.findMany({
        where: { volunteerId: testVolunteer.id },
      });

      expect(history).toHaveLength(0);
    });

    it('should handle tier upgrades across multiple tiers', async () => {
      // Jump from Bronze (0-49) to Platinum (100-129)
      const changed = await service.checkAndUpdateBadgeTier(testVolunteer.id, 105);

      expect(changed).toBe(true);

      const updatedCache = await prisma.leaderboardCache.findUnique({
        where: { volunteerId: testVolunteer.id },
      });

      expect(updatedCache!.badgeTier).toBe('Platinum');
    });

    it('should handle tier downgrades when points decrease', async () => {
      // First upgrade to Gold (80-99)
      await service.checkAndUpdateBadgeTier(testVolunteer.id, 85);

      // Clear history to isolate downgrade test
      await prisma.badgeTierHistory.deleteMany({
        where: { volunteerId: testVolunteer.id },
      });

      // Then downgrade back to Silver (50-79)
      const changed = await service.checkAndUpdateBadgeTier(testVolunteer.id, 55);

      expect(changed).toBe(true);

      const history = await prisma.badgeTierHistory.findFirst({
        where: { volunteerId: testVolunteer.id },
      });

      expect(history!.oldTier).toBe('Gold');
      expect(history!.newTier).toBe('Silver');
    });

    it('should handle upgrade to highest tier', async () => {
      // Upgrade to Titanium (170+)
      const changed = await service.checkAndUpdateBadgeTier(testVolunteer.id, 175);

      expect(changed).toBe(true);

      const updatedCache = await prisma.leaderboardCache.findUnique({
        where: { volunteerId: testVolunteer.id },
      });

      expect(updatedCache!.badgeTier).toBe('Titanium');
    });

    it('should stay at highest tier when points increase further', async () => {
      // First get to Titanium (170+)
      await service.checkAndUpdateBadgeTier(testVolunteer.id, 170);

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
      expect(history!.newTier).toBe('Bronze');
    });
  });

  describe('getTierHistory', () => {
    it('should return tier history ordered by achievedAt desc', async () => {
      // Create leaderboard entry
      await prisma.leaderboardCache.create({
        data: {
          volunteerId: testVolunteer.id,
          totalPoints: 10,
          badgeTier: 'Bronze',
          rank: 1,
        },
      });

      // Create multiple tier changes
      await service.checkAndUpdateBadgeTier(testVolunteer.id, 55); // Silver
      await new Promise(resolve => setTimeout(resolve, 10));
      await service.checkAndUpdateBadgeTier(testVolunteer.id, 85); // Gold
      await new Promise(resolve => setTimeout(resolve, 10));
      await service.checkAndUpdateBadgeTier(testVolunteer.id, 105); // Platinum

      const history = await service.getTierHistory(testVolunteer.id);

      expect(history).toHaveLength(3);
      
      // Most recent should be first (Platinum upgrade)
      expect(history[0].newTier).toBe('Platinum');
      expect(history[1].newTier).toBe('Gold');
      expect(history[2].newTier).toBe('Silver');

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
          badgeTier: 'Bronze',
          rank: 1,
        },
      });

      await service.checkAndUpdateBadgeTier(testVolunteer.id, 55);

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
            badgeTier: 'Bronze',
            rank: 1,
          },
          {
            volunteerId: volunteer2.id,
            totalPoints: 15,
            badgeTier: 'Bronze',
            rank: 2,
          },
        ],
      });

      // Create tier changes for both
      await service.checkAndUpdateBadgeTier(testVolunteer.id, 55);
      await service.checkAndUpdateBadgeTier(volunteer2.id, 60);

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
          totalPoints: 85,
          badgeTier: 'Gold',
          rank: 1,
        },
      });

      const tier = await service.getCurrentTier(testVolunteer.id);

      expect(tier).toBe('Gold');
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
          badgeTier: 'Bronze',
          rank: 1,
        },
      });

      // Check tier before upgrade
      const tierBefore = await service.getCurrentTier(testVolunteer.id);
      expect(tierBefore).toBe('Bronze');

      // Upgrade tier
      await service.checkAndUpdateBadgeTier(testVolunteer.id, 85);

      // Check tier after upgrade
      const tierAfter = await service.getCurrentTier(testVolunteer.id);
      expect(tierAfter).toBe('Gold');
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

  describe('checkAndUpdateBadgeTier - Notification Creation', () => {
    beforeEach(async () => {
      // Create initial leaderboard entry with Bronze tier (0-49 points)
      await prisma.leaderboardCache.create({
        data: {
          volunteerId: testVolunteer.id,
          totalPoints: 10,
          badgeTier: 'Bronze',
          rank: 1,
        },
      });
    });

    it('should create BADGE_ACHIEVEMENT notification when tier upgrades', async () => {
      // Upgrade from Bronze (0-49) to Silver (50-79)
      await service.checkAndUpdateBadgeTier(testVolunteer.id, 55);

      const notification = await prisma.notification.findFirst({
        where: {
          volunteerId: testVolunteer.id,
          type: 'BADGE_ACHIEVEMENT',
        },
      });

      expect(notification).toBeTruthy();
      expect(notification!.message).toContain('Silver');
      expect(notification!.message).toContain('55 points');
      expect(notification!.isRead).toBe(false);
    });

    it('should not create notification when tier does not change', async () => {
      // Stay in Bronze tier (0-49)
      await service.checkAndUpdateBadgeTier(testVolunteer.id, 25);

      const notifications = await prisma.notification.findMany({
        where: {
          volunteerId: testVolunteer.id,
          type: 'BADGE_ACHIEVEMENT',
        },
      });

      expect(notifications).toHaveLength(0);
    });

    it('should create notification for each tier upgrade', async () => {
      // Upgrade to Silver (50-79)
      await service.checkAndUpdateBadgeTier(testVolunteer.id, 55);

      // Upgrade to Gold (80-99)
      await service.checkAndUpdateBadgeTier(testVolunteer.id, 85);

      // Upgrade to Platinum (100-129)
      await service.checkAndUpdateBadgeTier(testVolunteer.id, 105);

      const notifications = await prisma.notification.findMany({
        where: {
          volunteerId: testVolunteer.id,
          type: 'BADGE_ACHIEVEMENT',
        },
        orderBy: { createdAt: 'asc' },
      });

      expect(notifications).toHaveLength(3);
      expect(notifications[0].message).toContain('Silver');
      expect(notifications[1].message).toContain('Gold');
      expect(notifications[2].message).toContain('Platinum');
    });

    it('should not create notification when downgrading tier', async () => {
      // First upgrade to Silver (50-79)
      await service.checkAndUpdateBadgeTier(testVolunteer.id, 55);

      // Clear notifications to isolate downgrade test
      await prisma.notification.deleteMany({
        where: { volunteerId: testVolunteer.id },
      });

      // Downgrade back to Bronze (points decreased to 25)
      await service.checkAndUpdateBadgeTier(testVolunteer.id, 25);

      // No notification should be created for downgrade
      const notifications = await prisma.notification.findMany({
        where: {
          volunteerId: testVolunteer.id,
          type: 'BADGE_ACHIEVEMENT',
        },
      });

      expect(notifications).toHaveLength(0);
    });

    it('should create notification when reaching highest tier', async () => {
      // Upgrade to Titanium (170+)
      await service.checkAndUpdateBadgeTier(testVolunteer.id, 175);

      const notification = await prisma.notification.findFirst({
        where: {
          volunteerId: testVolunteer.id,
          type: 'BADGE_ACHIEVEMENT',
        },
      });

      expect(notification).toBeTruthy();
      expect(notification!.message).toContain('Titanium');
      expect(notification!.message).toContain('175 points');
    });
  });
});
