import { LeaderboardService } from './leaderboard.service';
import {
  setupTests,
  teardownTests,
  createTestVolunteer,
  prisma,
} from '../test/test-utils';

describe('LeaderboardService', () => {
  let service: LeaderboardService;

  beforeAll(async () => {
    await setupTests();
  });

  afterAll(async () => {
    await teardownTests();
  });

  beforeEach(() => {
    // LeaderboardService doesn't use DI, just instantiate directly
    service = new LeaderboardService();
  });

  afterEach(async () => {
    // Clean up in order to respect foreign key constraints
    await prisma.signup.deleteMany();
    await prisma.activitySlot.deleteMany();
    await prisma.event.deleteMany();
    await prisma.pointEvent.deleteMany();
    await prisma.leaderboardSnapshot.deleteMany();
    await prisma.badgeTierHistory.deleteMany();
    await prisma.volunteerPointBalance.deleteMany();
    await prisma.leaderboardCache.deleteMany();
    await prisma.childRank.deleteMany();
    await prisma.volunteerToRole.deleteMany();
    await prisma.volunteer.deleteMany();
  });

  describe('recalculateRanks', () => {
    it('should assign correct ranks in descending order by points', async () => {
      const volunteer1 = await createTestVolunteer({ name: 'First Place' });
      const volunteer2 = await createTestVolunteer({ name: 'Second Place' });
      const volunteer3 = await createTestVolunteer({ name: 'Third Place' });

      // Create leaderboard entries with different points
      await prisma.leaderboardCache.createMany({
        data: [
          { volunteerId: volunteer1.id, totalPoints: 100, rank: null, badgeTier: null },
          { volunteerId: volunteer2.id, totalPoints: 75, rank: null, badgeTier: null },
          { volunteerId: volunteer3.id, totalPoints: 50, rank: null, badgeTier: null },
        ],
      });

      await service.recalculateRanks();

      const entries = await prisma.leaderboardCache.findMany({
        orderBy: { rank: 'asc' },
      });

      expect(entries[0].volunteerId).toBe(volunteer1.id);
      expect(entries[0].rank).toBe(1);
      expect(entries[1].volunteerId).toBe(volunteer2.id);
      expect(entries[1].rank).toBe(2);
      expect(entries[2].volunteerId).toBe(volunteer3.id);
      expect(entries[2].rank).toBe(3);
    });

    it('should handle tied ranks correctly', async () => {
      const volunteer1 = await createTestVolunteer({ name: 'Tied First - A' });
      const volunteer2 = await createTestVolunteer({ name: 'Tied First - B' });
      const volunteer3 = await createTestVolunteer({ name: 'Third Place' });

      // Create entries where two volunteers have the same points
      await prisma.leaderboardCache.createMany({
        data: [
          { volunteerId: volunteer1.id, totalPoints: 100, rank: null, badgeTier: null },
          { volunteerId: volunteer2.id, totalPoints: 100, rank: null, badgeTier: null },
          { volunteerId: volunteer3.id, totalPoints: 75, rank: null, badgeTier: null },
        ],
      });

      await service.recalculateRanks();

      const entries = await prisma.leaderboardCache.findMany({
        orderBy: { rank: 'asc' },
      });

      // Both tied volunteers should have rank 1
      expect(entries[0].rank).toBe(1);
      expect(entries[1].rank).toBe(1);
      
      // Next volunteer should skip to rank 3 (not rank 2)
      expect(entries[2].rank).toBe(3);
    });

    it('should order tied volunteers alphabetically by name', async () => {
      const volunteerC = await createTestVolunteer({ name: 'Charlie' });
      const volunteerA = await createTestVolunteer({ name: 'Alice' });
      const volunteerB = await createTestVolunteer({ name: 'Bob' });

      // Create entries where all three volunteers have the same points
      await prisma.leaderboardCache.createMany({
        data: [
          { volunteerId: volunteerC.id, totalPoints: 100, rank: null, badgeTier: null },
          { volunteerId: volunteerA.id, totalPoints: 100, rank: null, badgeTier: null },
          { volunteerId: volunteerB.id, totalPoints: 100, rank: null, badgeTier: null },
        ],
      });

      await service.recalculateRanks();

      const entries = await prisma.leaderboardCache.findMany({
        include: { volunteer: true },
        orderBy: [
          { totalPoints: 'desc' },
          { volunteer: { name: 'asc' } },
        ],
      });

      // All should have rank 1, but ordered alphabetically
      expect(entries[0].volunteer.name).toBe('Alice');
      expect(entries[0].rank).toBe(1);
      expect(entries[1].volunteer.name).toBe('Bob');
      expect(entries[1].rank).toBe(1);
      expect(entries[2].volunteer.name).toBe('Charlie');
      expect(entries[2].rank).toBe(1);
    });

    it('should handle multiple tied groups correctly', async () => {
      const v1 = await createTestVolunteer({ name: 'Tied 1st - A' });
      const v2 = await createTestVolunteer({ name: 'Tied 1st - B' });
      const v3 = await createTestVolunteer({ name: 'Tied 3rd - A' });
      const v4 = await createTestVolunteer({ name: 'Tied 3rd - B' });
      const v5 = await createTestVolunteer({ name: 'Tied 3rd - C' });
      const v6 = await createTestVolunteer({ name: '6th Place' });

      await prisma.leaderboardCache.createMany({
        data: [
          { volunteerId: v1.id, totalPoints: 100, rank: null, badgeTier: null },
          { volunteerId: v2.id, totalPoints: 100, rank: null, badgeTier: null },
          { volunteerId: v3.id, totalPoints: 50, rank: null, badgeTier: null },
          { volunteerId: v4.id, totalPoints: 50, rank: null, badgeTier: null },
          { volunteerId: v5.id, totalPoints: 50, rank: null, badgeTier: null },
          { volunteerId: v6.id, totalPoints: 25, rank: null, badgeTier: null },
        ],
      });

      await service.recalculateRanks();

      const entries = await prisma.leaderboardCache.findMany({
        orderBy: { totalPoints: 'desc' },
      });

      expect(entries[0].rank).toBe(1); // 100 points
      expect(entries[1].rank).toBe(1); // 100 points
      expect(entries[2].rank).toBe(3); // 50 points (skip to 3)
      expect(entries[3].rank).toBe(3); // 50 points
      expect(entries[4].rank).toBe(3); // 50 points
      expect(entries[5].rank).toBe(6); // 25 points (skip to 6)
    });

    it('should handle single volunteer correctly', async () => {
      const volunteer = await createTestVolunteer();

      await prisma.leaderboardCache.create({
        data: { volunteerId: volunteer.id, totalPoints: 50, rank: null, badgeTier: null },
      });

      await service.recalculateRanks();

      const entry = await prisma.leaderboardCache.findUnique({
        where: { volunteerId: volunteer.id },
      });

      expect(entry!.rank).toBe(1);
    });

    it('should handle empty leaderboard without error', async () => {
      await expect(service.recalculateRanks()).resolves.not.toThrow();
    });

    it('should update existing ranks correctly', async () => {
      const volunteer1 = await createTestVolunteer();
      const volunteer2 = await createTestVolunteer();

      // Create with initial ranks
      await prisma.leaderboardCache.createMany({
        data: [
          { volunteerId: volunteer1.id, totalPoints: 100, rank: 5, badgeTier: null },
          { volunteerId: volunteer2.id, totalPoints: 75, rank: 10, badgeTier: null },
        ],
      });

      await service.recalculateRanks();

      const entries = await prisma.leaderboardCache.findMany({
        orderBy: { rank: 'asc' },
      });

      // Ranks should be recalculated correctly
      expect(entries[0].rank).toBe(1);
      expect(entries[1].rank).toBe(2);
    });
  });

  describe('getLeaderboard', () => {
    it('should return paginated leaderboard with opted-in volunteers only', async () => {
      const volunteer1 = await createTestVolunteer({ name: 'Opted In 1', leaderboardOptIn: true });
      const volunteer2 = await createTestVolunteer({ name: 'Opted Out', leaderboardOptIn: false });
      const volunteer3 = await createTestVolunteer({ name: 'Opted In 2', leaderboardOptIn: true });

      // Create leaderboard entries
      await prisma.leaderboardCache.createMany({
        data: [
          { volunteerId: volunteer1.id, totalPoints: 100, rank: 1, badgeTier: 'Diamond' },
          { volunteerId: volunteer2.id, totalPoints: 75, rank: 2, badgeTier: 'Gold' },
          { volunteerId: volunteer3.id, totalPoints: 50, rank: 3, badgeTier: 'Silver' },
        ],
      });

      const result = await service.getLeaderboard(1, 10);

      expect(result.leaderboard).toHaveLength(2);
      expect(result.leaderboard[0].volunteer.name).toBe('Opted In 1');
      expect(result.leaderboard[1].volunteer.name).toBe('Opted In 2');
    });

    it('should include rank, points, and badge tier in results', async () => {
      const volunteer = await createTestVolunteer({ leaderboardOptIn: true });

      await prisma.leaderboardCache.create({
        data: { volunteerId: volunteer.id, totalPoints: 85, rank: 1, badgeTier: 'Platinum' },
      });

      const result = await service.getLeaderboard(1, 10);

      expect(result.leaderboard[0]).toEqual({
        rank: 1,
        volunteer: {
          id: volunteer.id,
          name: volunteer.name,
        },
        totalPoints: 85,
        badgeTier: 'Platinum',
      });
    });

    it('should return results ordered by points descending, then name ascending', async () => {
      const v1 = await createTestVolunteer({ name: 'Third', leaderboardOptIn: true });
      const v2 = await createTestVolunteer({ name: 'First', leaderboardOptIn: true });
      const v3 = await createTestVolunteer({ name: 'Second', leaderboardOptIn: true });

      await prisma.leaderboardCache.createMany({
        data: [
          { volunteerId: v1.id, totalPoints: 50, rank: 3, badgeTier: null },
          { volunteerId: v2.id, totalPoints: 100, rank: 1, badgeTier: null },
          { volunteerId: v3.id, totalPoints: 75, rank: 2, badgeTier: null },
        ],
      });

      const result = await service.getLeaderboard(1, 10);

      // Ordered by points desc: 100, 75, 50
      expect(result.leaderboard[0].volunteer.name).toBe('First');
      expect(result.leaderboard[0].totalPoints).toBe(100);
      expect(result.leaderboard[1].volunteer.name).toBe('Second');
      expect(result.leaderboard[1].totalPoints).toBe(75);
      expect(result.leaderboard[2].volunteer.name).toBe('Third');
      expect(result.leaderboard[2].totalPoints).toBe(50);
    });

    it('should order tied volunteers alphabetically by name in leaderboard', async () => {
      const v1 = await createTestVolunteer({ name: 'Zoe', leaderboardOptIn: true });
      const v2 = await createTestVolunteer({ name: 'Alice', leaderboardOptIn: true });
      const v3 = await createTestVolunteer({ name: 'Mike', leaderboardOptIn: true });

      // All have same points
      await prisma.leaderboardCache.createMany({
        data: [
          { volunteerId: v1.id, totalPoints: 100, rank: 1, badgeTier: null },
          { volunteerId: v2.id, totalPoints: 100, rank: 1, badgeTier: null },
          { volunteerId: v3.id, totalPoints: 100, rank: 1, badgeTier: null },
        ],
      });

      const result = await service.getLeaderboard(1, 10);

      // Should be alphabetically ordered: Alice, Mike, Zoe
      expect(result.leaderboard[0].volunteer.name).toBe('Alice');
      expect(result.leaderboard[1].volunteer.name).toBe('Mike');
      expect(result.leaderboard[2].volunteer.name).toBe('Zoe');
    });

    it('should handle pagination correctly', async () => {
      const volunteers = [];
      for (let i = 0; i < 5; i++) {
        const v = await createTestVolunteer({ name: `Volunteer ${i}`, leaderboardOptIn: true });
        volunteers.push(v);
        await prisma.leaderboardCache.create({
          data: { volunteerId: v.id, totalPoints: 100 - i * 10, rank: i + 1, badgeTier: null },
        });
      }

      // Get first page (2 items)
      const page1 = await service.getLeaderboard(1, 2);
      expect(page1.leaderboard).toHaveLength(2);
      expect(page1.leaderboard[0].rank).toBe(1);
      expect(page1.leaderboard[1].rank).toBe(2);

      // Get second page (2 items)
      const page2 = await service.getLeaderboard(2, 2);
      expect(page2.leaderboard).toHaveLength(2);
      expect(page2.leaderboard[0].rank).toBe(3);
      expect(page2.leaderboard[1].rank).toBe(4);
    });

    it('should return correct pagination metadata', async () => {
      const v1 = await createTestVolunteer({ leaderboardOptIn: true });
      const v2 = await createTestVolunteer({ leaderboardOptIn: true });
      const v3 = await createTestVolunteer({ leaderboardOptIn: true });

      await prisma.leaderboardCache.createMany({
        data: [
          { volunteerId: v1.id, totalPoints: 100, rank: 1, badgeTier: null },
          { volunteerId: v2.id, totalPoints: 75, rank: 2, badgeTier: null },
          { volunteerId: v3.id, totalPoints: 50, rank: 3, badgeTier: null },
        ],
      });

      const result = await service.getLeaderboard(1, 2);

      expect(result.pagination).toEqual({
        page: 1,
        limit: 2,
        total: 3,
      });
    });

    it('should return empty array when no volunteers opted in', async () => {
      const volunteer = await createTestVolunteer({ leaderboardOptIn: false });

      await prisma.leaderboardCache.create({
        data: { volunteerId: volunteer.id, totalPoints: 100, rank: 1, badgeTier: null },
      });

      const result = await service.getLeaderboard(1, 10);

      expect(result.leaderboard).toHaveLength(0);
    });

    it('should not include volunteer password or email', async () => {
      const volunteer = await createTestVolunteer({ leaderboardOptIn: true });

      await prisma.leaderboardCache.create({
        data: { volunteerId: volunteer.id, totalPoints: 100, rank: 1, badgeTier: null },
      });

      const result = await service.getLeaderboard(1, 10);

      expect(result.leaderboard[0].volunteer).not.toHaveProperty('email');
      expect(result.leaderboard[0].volunteer).not.toHaveProperty('passwordHash');
    });
  });

  describe('getCurrentUserPosition', () => {
    it('should return rank and points for volunteer with leaderboard entry', async () => {
      const volunteer = await createTestVolunteer();

      await prisma.leaderboardCache.create({
        data: { volunteerId: volunteer.id, totalPoints: 85, rank: 5, badgeTier: 'Platinum' },
      });

      const position = await service.getCurrentUserPosition(volunteer.id);

      expect(position).toEqual({
        rank: 5,
        totalPoints: 85,
      });
    });

    it('should return null rank and 0 points when no leaderboard entry', async () => {
      const volunteer = await createTestVolunteer();

      const position = await service.getCurrentUserPosition(volunteer.id);

      expect(position).toEqual({
        rank: null,
        totalPoints: 0,
      });
    });

    it('should return position even if volunteer opted out', async () => {
      const volunteer = await createTestVolunteer({ leaderboardOptIn: false });

      await prisma.leaderboardCache.create({
        data: { volunteerId: volunteer.id, totalPoints: 50, rank: 3, badgeTier: null },
      });

      const position = await service.getCurrentUserPosition(volunteer.id);

      expect(position.rank).toBe(3);
      expect(position.totalPoints).toBe(50);
    });
  });

  describe('updateVolunteerEntry', () => {
    it('should create leaderboard entry for opted-in volunteer', async () => {
      const volunteer = await createTestVolunteer({ leaderboardOptIn: true });

      // Create point balance
      await prisma.volunteerPointBalance.create({
        data: {
          volunteerId: volunteer.id,
          totalPoints: 75,
          currentYearPoints: 75,
        },
      });

      await service.updateVolunteerEntry(volunteer.id);

      const entry = await prisma.leaderboardCache.findUnique({
        where: { volunteerId: volunteer.id },
      });

      expect(entry).toBeTruthy();
      expect(entry!.totalPoints).toBe(75);
    });

    it('should update existing leaderboard entry', async () => {
      const volunteer = await createTestVolunteer({ leaderboardOptIn: true });

      // Create initial point balance and leaderboard entry
      await prisma.volunteerPointBalance.create({
        data: {
          volunteerId: volunteer.id,
          totalPoints: 50,
          currentYearPoints: 50,
        },
      });

      await prisma.leaderboardCache.create({
        data: { volunteerId: volunteer.id, totalPoints: 50, rank: 1, badgeTier: null },
      });

      // Update point balance
      await prisma.volunteerPointBalance.update({
        where: { volunteerId: volunteer.id },
        data: { totalPoints: 100, currentYearPoints: 100 },
      });

      await service.updateVolunteerEntry(volunteer.id);

      const entry = await prisma.leaderboardCache.findUnique({
        where: { volunteerId: volunteer.id },
      });

      expect(entry!.totalPoints).toBe(100);
    });

    it('should remove leaderboard entry when volunteer opts out', async () => {
      const volunteer = await createTestVolunteer({ leaderboardOptIn: false });

      // Create existing entry
      await prisma.leaderboardCache.create({
        data: { volunteerId: volunteer.id, totalPoints: 75, rank: 1, badgeTier: null },
      });

      await service.updateVolunteerEntry(volunteer.id);

      const entry = await prisma.leaderboardCache.findUnique({
        where: { volunteerId: volunteer.id },
      });

      expect(entry).toBeNull();
    });

    it('should set correct badge tier based on points', async () => {
      const volunteer = await createTestVolunteer({ leaderboardOptIn: true });

      await prisma.volunteerPointBalance.create({
        data: {
          volunteerId: volunteer.id,
          totalPoints: 85,
          currentYearPoints: 85,
        },
      });

      await service.updateVolunteerEntry(volunteer.id);

      const entry = await prisma.leaderboardCache.findUnique({
        where: { volunteerId: volunteer.id },
      });

      expect(entry!.badgeTier).toBe('Platinum');
    });

    it('should handle volunteer with no point balance', async () => {
      const volunteer = await createTestVolunteer({ leaderboardOptIn: true });

      await service.updateVolunteerEntry(volunteer.id);

      const entry = await prisma.leaderboardCache.findUnique({
        where: { volunteerId: volunteer.id },
      });

      expect(entry!.totalPoints).toBe(0);
      expect(entry!.badgeTier).toBeNull();
    });

    it('should trigger rank recalculation', async () => {
      const v1 = await createTestVolunteer({ name: 'First', leaderboardOptIn: true });
      const v2 = await createTestVolunteer({ name: 'Second', leaderboardOptIn: true });

      // Create point balances
      await prisma.volunteerPointBalance.createMany({
        data: [
          { volunteerId: v1.id, totalPoints: 50, currentYearPoints: 50 },
          { volunteerId: v2.id, totalPoints: 75, currentYearPoints: 75 },
        ],
      });

      // Create initial entries with null ranks
      await prisma.leaderboardCache.createMany({
        data: [
          { volunteerId: v1.id, totalPoints: 50, rank: null, badgeTier: null },
          { volunteerId: v2.id, totalPoints: 75, rank: null, badgeTier: null },
        ],
      });

      // Update one volunteer (should trigger recalculation)
      await service.updateVolunteerEntry(v1.id);

      const entries = await prisma.leaderboardCache.findMany({
        orderBy: { rank: 'asc' },
      });

      // Ranks should be calculated
      expect(entries[0].rank).toBe(1);
      expect(entries[1].rank).toBe(2);
    });

    it('should handle non-existent volunteer gracefully', async () => {
      await expect(
        service.updateVolunteerEntry('non-existent-id')
      ).resolves.not.toThrow();
    });

    it('should set correct badge tiers for all point ranges', async () => {
      const testCases = [
        { points: 10, expectedTier: null },
        { points: 20, expectedTier: 'Bronze' },
        { points: 40, expectedTier: 'Silver' },
        { points: 60, expectedTier: 'Gold' },
        { points: 80, expectedTier: 'Platinum' },
        { points: 100, expectedTier: 'Diamond' },
        { points: 500, expectedTier: 'Diamond' },
      ];

      for (const testCase of testCases) {
        const volunteer = await createTestVolunteer({ leaderboardOptIn: true });

        await prisma.volunteerPointBalance.create({
          data: {
            volunteerId: volunteer.id,
            totalPoints: testCase.points,
            currentYearPoints: testCase.points,
          },
        });

        await service.updateVolunteerEntry(volunteer.id);

        const entry = await prisma.leaderboardCache.findUnique({
          where: { volunteerId: volunteer.id },
        });

        expect(entry!.badgeTier).toBe(testCase.expectedTier);
      }
    });
  });

  describe('createAnnualSnapshot', () => {
    it('should create snapshot for all leaderboard entries', async () => {
      const v1 = await createTestVolunteer({ leaderboardOptIn: true });
      const v2 = await createTestVolunteer({ leaderboardOptIn: true });
      const v3 = await createTestVolunteer({ leaderboardOptIn: true });

      await prisma.leaderboardCache.createMany({
        data: [
          { volunteerId: v1.id, totalPoints: 100, rank: 1, badgeTier: 'Diamond' },
          { volunteerId: v2.id, totalPoints: 75, rank: 2, badgeTier: 'Gold' },
          { volunteerId: v3.id, totalPoints: 50, rank: 3, badgeTier: 'Silver' },
        ],
      });

      await service.createAnnualSnapshot();

      const snapshots = await prisma.leaderboardSnapshot.findMany({
        orderBy: { rank: 'asc' },
      });

      expect(snapshots).toHaveLength(3);
      expect(snapshots[0].volunteerId).toBe(v1.id);
      expect(snapshots[0].totalPoints).toBe(100);
      expect(snapshots[0].rank).toBe(1);
      expect(snapshots[1].volunteerId).toBe(v2.id);
      expect(snapshots[2].volunteerId).toBe(v3.id);
    });

    it('should record snapshot date', async () => {
      const volunteer = await createTestVolunteer({ leaderboardOptIn: true });

      await prisma.leaderboardCache.create({
        data: { volunteerId: volunteer.id, totalPoints: 100, rank: 1, badgeTier: 'Diamond' },
      });

      const beforeSnapshot = new Date();
      await service.createAnnualSnapshot();
      const afterSnapshot = new Date();

      const snapshot = await prisma.leaderboardSnapshot.findFirst({
        where: { volunteerId: volunteer.id },
      });

      expect(snapshot).toBeTruthy();
      expect(new Date(snapshot!.snapshotDate).getTime()).toBeGreaterThanOrEqual(beforeSnapshot.getTime());
      expect(new Date(snapshot!.snapshotDate).getTime()).toBeLessThanOrEqual(afterSnapshot.getTime());
    });

    it('should preserve badge tier in snapshot', async () => {
      const volunteer = await createTestVolunteer({ leaderboardOptIn: true });

      await prisma.leaderboardCache.create({
        data: { volunteerId: volunteer.id, totalPoints: 85, rank: 1, badgeTier: 'Platinum' },
      });

      await service.createAnnualSnapshot();

      const snapshot = await prisma.leaderboardSnapshot.findFirst({
        where: { volunteerId: volunteer.id },
      });

      expect(snapshot!.badgeTier).toBe('Platinum');
    });

    it('should handle empty leaderboard without error', async () => {
      await expect(service.createAnnualSnapshot()).resolves.not.toThrow();

      const snapshots = await prisma.leaderboardSnapshot.findMany();
      expect(snapshots).toHaveLength(0);
    });

    it('should allow multiple snapshots over time', async () => {
      const volunteer = await createTestVolunteer({ leaderboardOptIn: true });

      await prisma.leaderboardCache.create({
        data: { volunteerId: volunteer.id, totalPoints: 50, rank: 1, badgeTier: 'Silver' },
      });

      // First snapshot
      await service.createAnnualSnapshot();

      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 10));

      // Update points
      await prisma.leaderboardCache.update({
        where: { volunteerId: volunteer.id },
        data: { totalPoints: 100, badgeTier: 'Diamond' },
      });

      // Second snapshot
      await service.createAnnualSnapshot();

      const snapshots = await prisma.leaderboardSnapshot.findMany({
        where: { volunteerId: volunteer.id },
        orderBy: { snapshotDate: 'asc' },
      });

      expect(snapshots).toHaveLength(2);
      expect(snapshots[0].totalPoints).toBe(50);
      expect(snapshots[1].totalPoints).toBe(100);
    });
  });
});
