import { Test, TestingModule } from '@nestjs/testing';
import { PointsService } from './points.service';
import { PointEventType } from '@prisma/client';
import {
  setupTests,
  teardownTests,
  createTestVolunteer,
  createTestActivityType,
  createTestEvent,
  prisma,
} from '../test/test-utils';

describe('PointsService', () => {
  let service: PointsService;

  beforeAll(async () => {
    await setupTests();
  });

  afterAll(async () => {
    await teardownTests();
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PointsService],
    }).compile();

    service = module.get<PointsService>(PointsService);
  });

  afterEach(async () => {
    await prisma.leaderboardSnapshot.deleteMany();
    await prisma.leaderboardCache.deleteMany();
    await prisma.volunteerPointBalance.deleteMany();
    await prisma.pointEvent.deleteMany();
    await prisma.badgeTierHistory.deleteMany();
    await prisma.activitySlot.deleteMany();
    await prisma.event.deleteMany();
    await prisma.volunteer.deleteMany();
    await prisma.activityType.deleteMany({
      where: { name: { contains: 'Test Activity' } },
    });
  });

  describe('awardRoleAssignmentPoints', () => {
    it('should award 100 points for role assignment and create point event', async () => {
      const volunteer = await createTestVolunteer();
      const roleAssignmentId = 'role-assignment-123';

      await service.awardRoleAssignmentPoints(
        volunteer.id,
        roleAssignmentId,
        volunteer.id
      );

      const pointEvent = await prisma.pointEvent.findFirst({
        where: { volunteerId: volunteer.id },
      });

      expect(pointEvent).toBeDefined();
      expect(pointEvent?.points).toBe(100);
      expect(pointEvent?.eventType).toBe(PointEventType.ROLE_ASSIGNMENT);
      expect(pointEvent?.referenceId).toBe(roleAssignmentId);
      expect(pointEvent?.createdById).toBe(volunteer.id);
      expect(pointEvent?.reason).toBe('Role assignment bonus');
    });

    it('should update volunteer point balance', async () => {
      const volunteer = await createTestVolunteer();
      const roleAssignmentId = 'role-assignment-456';

      await service.awardRoleAssignmentPoints(
        volunteer.id,
        roleAssignmentId,
        volunteer.id
      );

      const balance = await prisma.volunteerPointBalance.findUnique({
        where: { volunteerId: volunteer.id },
      });

      expect(balance?.totalPoints).toBe(100);
      expect(balance?.currentYearPoints).toBe(100);
    });

    it('should update leaderboard cache with badge tier', async () => {
      const volunteer = await createTestVolunteer();
      const roleAssignmentId = 'role-assignment-789';

      await service.awardRoleAssignmentPoints(
        volunteer.id,
        roleAssignmentId,
        volunteer.id
      );

      const leaderboard = await prisma.leaderboardCache.findUnique({
        where: { volunteerId: volunteer.id },
      });

      expect(leaderboard?.totalPoints).toBe(100);
      expect(leaderboard?.badgeTier).toBe('Diamond'); // 100 points = Diamond
    });
  });

  describe('awardEventPoints', () => {
    it('should award points for event participation', async () => {
      const volunteer = await createTestVolunteer();
      const activityType = await createTestActivityType({ pointValue: 5 });
      const event = await createTestEvent(volunteer.id);

      await service.awardEventPoints(
        volunteer.id,
        event.id,
        activityType.id,
        5,
        volunteer.id
      );

      const pointEvent = await prisma.pointEvent.findFirst({
        where: { volunteerId: volunteer.id },
      });

      expect(pointEvent?.points).toBe(5);
      expect(pointEvent?.eventType).toBe(PointEventType.EVENT_PARTICIPATION);
      expect(pointEvent?.referenceId).toBe(event.id);
      expect(pointEvent?.activityTypeId).toBe(activityType.id);
      expect(pointEvent?.reason).toBe('Event participation');
    });

    it('should accumulate points correctly', async () => {
      const volunteer = await createTestVolunteer();
      const activityType = await createTestActivityType({ pointValue: 5 });
      const event1 = await createTestEvent(volunteer.id, { title: 'Event 1' });
      const event2 = await createTestEvent(volunteer.id, { title: 'Event 2' });

      await service.awardEventPoints(volunteer.id, event1.id, activityType.id, 5, volunteer.id);
      await service.awardEventPoints(volunteer.id, event2.id, activityType.id, 5, volunteer.id);

      const balance = await prisma.volunteerPointBalance.findUnique({
        where: { volunteerId: volunteer.id },
      });

      expect(balance?.totalPoints).toBe(10);
    });

    it('should update badge tier after reaching threshold', async () => {
      const volunteer = await createTestVolunteer();
      const activityType = await createTestActivityType({ pointValue: 25 });
      const event = await createTestEvent(volunteer.id);

      await service.awardEventPoints(volunteer.id, event.id, activityType.id, 25, volunteer.id);

      const leaderboard = await prisma.leaderboardCache.findUnique({
        where: { volunteerId: volunteer.id },
      });

      expect(leaderboard?.badgeTier).toBe('Bronze'); // 25 points = Bronze (20-39)
    });
  });

  describe('awardTaskPoints', () => {
    it('should award points for task completion', async () => {
      const volunteer = await createTestVolunteer();
      const taskId = 'task-123';

      await service.awardTaskPoints(
        volunteer.id,
        taskId,
        10,
        volunteer.id
      );

      const pointEvent = await prisma.pointEvent.findFirst({
        where: { volunteerId: volunteer.id },
      });

      expect(pointEvent?.points).toBe(10);
      expect(pointEvent?.eventType).toBe(PointEventType.TASK_COMPLETION);
      expect(pointEvent?.referenceId).toBe(taskId);
      expect(pointEvent?.reason).toBe('Task completion');
    });

    it('should update point balance', async () => {
      const volunteer = await createTestVolunteer();
      const taskId = 'task-456';

      await service.awardTaskPoints(volunteer.id, taskId, 10, volunteer.id);

      const balance = await prisma.volunteerPointBalance.findUnique({
        where: { volunteerId: volunteer.id },
      });

      expect(balance?.totalPoints).toBe(10);
      expect(balance?.currentYearPoints).toBe(10);
    });
  });

  describe('revokePoints', () => {
    it('should create a negative point event for revocation', async () => {
      const volunteer = await createTestVolunteer();
      const activityType = await createTestActivityType({ pointValue: 15 });
      const event = await createTestEvent(volunteer.id);

      // Award points first
      await service.awardEventPoints(volunteer.id, event.id, activityType.id, 15, volunteer.id);

      const originalEvent = await prisma.pointEvent.findFirst({
        where: { volunteerId: volunteer.id },
      });

      // Revoke the points
      await service.revokePoints(originalEvent!.id, 'Duplicate entry', volunteer.id);

      const revocationEvent = await prisma.pointEvent.findFirst({
        where: { 
          volunteerId: volunteer.id,
          eventType: PointEventType.ADMIN_REVOCATION,
        },
      });

      expect(revocationEvent).toBeDefined();
      expect(revocationEvent?.points).toBe(-15); // Negative value
      expect(revocationEvent?.referenceId).toBe(originalEvent!.id);
      expect(revocationEvent?.reason).toBe('Duplicate entry');
      expect(revocationEvent?.createdById).toBe(volunteer.id);
    });

    it('should update volunteer balance after revocation', async () => {
      const volunteer = await createTestVolunteer();
      const activityType = await createTestActivityType({ pointValue: 20 });
      const event = await createTestEvent(volunteer.id);

      await service.awardEventPoints(volunteer.id, event.id, activityType.id, 20, volunteer.id);

      const originalEvent = await prisma.pointEvent.findFirst({
        where: { volunteerId: volunteer.id },
      });

      await service.revokePoints(originalEvent!.id, 'Error', volunteer.id);

      const balance = await prisma.volunteerPointBalance.findUnique({
        where: { volunteerId: volunteer.id },
      });

      expect(balance?.totalPoints).toBe(0); // Back to 0 after revocation
    });

    it('should update badge tier after revocation drops points', async () => {
      const volunteer = await createTestVolunteer();
      const activityType = await createTestActivityType({ pointValue: 25 });
      const event1 = await createTestEvent(volunteer.id, { title: 'Event 1' });
      const event2 = await createTestEvent(volunteer.id, { title: 'Event 2' });

      // Award 50 points total (Silver tier, 40-59)
      await service.awardEventPoints(volunteer.id, event1.id, activityType.id, 25, volunteer.id);
      await service.awardEventPoints(volunteer.id, event2.id, activityType.id, 25, volunteer.id);

      const leaderboardBefore = await prisma.leaderboardCache.findUnique({
        where: { volunteerId: volunteer.id },
      });
      expect(leaderboardBefore?.badgeTier).toBe('Silver');

      // Revoke one event's points
      const eventToRevoke = await prisma.pointEvent.findFirst({
        where: { 
          volunteerId: volunteer.id,
          referenceId: event2.id,
        },
      });

      await service.revokePoints(eventToRevoke!.id, 'Cancelled', volunteer.id);

      const leaderboardAfter = await prisma.leaderboardCache.findUnique({
        where: { volunteerId: volunteer.id },
      });

      expect(leaderboardAfter?.totalPoints).toBe(25);
      expect(leaderboardAfter?.badgeTier).toBe('Bronze'); // Down to Bronze (20-39)
    });

    it('should throw error if point event not found', async () => {
      const volunteer = await createTestVolunteer();

      await expect(
        service.revokePoints('nonexistent-id', 'Reason', volunteer.id)
      ).rejects.toThrow('Point event not found');
    });

    it('should throw error when trying to revoke a revocation', async () => {
      const volunteer = await createTestVolunteer();
      const activityType = await createTestActivityType({ pointValue: 10 });
      const event = await createTestEvent(volunteer.id);

      await service.awardEventPoints(volunteer.id, event.id, activityType.id, 10, volunteer.id);

      const originalEvent = await prisma.pointEvent.findFirst({
        where: { volunteerId: volunteer.id },
      });

      await service.revokePoints(originalEvent!.id, 'First revocation', volunteer.id);

      const revocationEvent = await prisma.pointEvent.findFirst({
        where: { 
          volunteerId: volunteer.id,
          eventType: PointEventType.ADMIN_REVOCATION,
        },
      });

      // Try to revoke the revocation (should fail)
      await expect(
        service.revokePoints(revocationEvent!.id, 'Cannot do this', volunteer.id)
      ).rejects.toThrow('Cannot revoke a revocation');
    });

    it('should keep both original and revocation events in history', async () => {
      const volunteer = await createTestVolunteer();
      const activityType = await createTestActivityType({ pointValue: 10 });
      const event = await createTestEvent(volunteer.id);

      await service.awardEventPoints(volunteer.id, event.id, activityType.id, 10, volunteer.id);

      const originalEvent = await prisma.pointEvent.findFirst({
        where: { volunteerId: volunteer.id },
      });

      await service.revokePoints(originalEvent!.id, 'Test', volunteer.id);

      const allEvents = await prisma.pointEvent.findMany({
        where: { volunteerId: volunteer.id },
        orderBy: { createdAt: 'asc' },
      });

      expect(allEvents).toHaveLength(2);
      expect(allEvents[0].points).toBe(10); // Original award
      expect(allEvents[1].points).toBe(-10); // Revocation
    });
  });

  describe('leaderboard cache', () => {
    it('should not create leaderboard entry if volunteer opts out', async () => {
      const volunteer = await createTestVolunteer({ leaderboardOptIn: false });
      const activityType = await createTestActivityType({ pointValue: 25 });
      const event = await createTestEvent(volunteer.id);

      await service.awardEventPoints(volunteer.id, event.id, activityType.id, 25, volunteer.id);

      const leaderboard = await prisma.leaderboardCache.findUnique({
        where: { volunteerId: volunteer.id },
      });

      expect(leaderboard).toBeNull();
    });

    it('should create leaderboard entry if volunteer is opted in', async () => {
      const volunteer = await createTestVolunteer({ leaderboardOptIn: true });
      const activityType = await createTestActivityType({ pointValue: 25 });
      const event = await createTestEvent(volunteer.id);

      await service.awardEventPoints(volunteer.id, event.id, activityType.id, 25, volunteer.id);

      const leaderboard = await prisma.leaderboardCache.findUnique({
        where: { volunteerId: volunteer.id },
      });

      expect(leaderboard).toBeDefined();
      expect(leaderboard?.totalPoints).toBe(25);
      expect(leaderboard?.badgeTier).toBe('Bronze');
    });

    it('should assign correct badge tiers based on points', async () => {
      const testCases = [
        { points: 5, expectedTier: null }, // No badge yet
        { points: 20, expectedTier: 'Bronze' },
        { points: 40, expectedTier: 'Silver' },
        { points: 60, expectedTier: 'Gold' },
        { points: 80, expectedTier: 'Platinum' },
        { points: 100, expectedTier: 'Diamond' },
        { points: 150, expectedTier: 'Diamond' }, // Still Diamond at max
      ];

      for (const testCase of testCases) {
        const volunteer = await createTestVolunteer();
        const activityType = await createTestActivityType({ pointValue: testCase.points });
        const event = await createTestEvent(volunteer.id);

        await service.awardEventPoints(volunteer.id, event.id, activityType.id, testCase.points, volunteer.id);

        const leaderboard = await prisma.leaderboardCache.findUnique({
          where: { volunteerId: volunteer.id },
        });

        expect(leaderboard?.badgeTier).toBe(testCase.expectedTier);
      }
    });
  });

  describe('resetAnnualPoints', () => {
    it('should reset currentYearPoints for all volunteers', async () => {
      const volunteer1 = await createTestVolunteer();
      const volunteer2 = await createTestVolunteer();
      const activityType = await createTestActivityType({ pointValue: 50 });
      const event1 = await createTestEvent(volunteer1.id);
      const event2 = await createTestEvent(volunteer2.id);

      // Award points to both volunteers
      await service.awardEventPoints(volunteer1.id, event1.id, activityType.id, 50, volunteer1.id);
      await service.awardEventPoints(volunteer2.id, event2.id, activityType.id, 50, volunteer2.id);

      // Verify points are set
      const balance1Before = await prisma.volunteerPointBalance.findUnique({
        where: { volunteerId: volunteer1.id },
      });
      expect(balance1Before?.currentYearPoints).toBe(50);

      // Reset annual points
      await service.resetAnnualPoints();

      // Check that currentYearPoints is reset but totalPoints remains
      const balance1After = await prisma.volunteerPointBalance.findUnique({
        where: { volunteerId: volunteer1.id },
      });
      const balance2After = await prisma.volunteerPointBalance.findUnique({
        where: { volunteerId: volunteer2.id },
      });

      expect(balance1After?.currentYearPoints).toBe(0);
      expect(balance1After?.totalPoints).toBe(50); // Total points unchanged
      expect(balance2After?.currentYearPoints).toBe(0);
      expect(balance2After?.totalPoints).toBe(50);
    });

    it('should create leaderboard snapshot when resetting', async () => {
      const volunteer = await createTestVolunteer();
      const activityType = await createTestActivityType({ pointValue: 60 });
      const event = await createTestEvent(volunteer.id);

      await service.awardEventPoints(volunteer.id, event.id, activityType.id, 60, volunteer.id);

      // Manually set rank for testing (normally done by leaderboard service)
      await prisma.leaderboardCache.update({
        where: { volunteerId: volunteer.id },
        data: { rank: 1 },
      });

      await service.resetAnnualPoints();

      const snapshot = await prisma.leaderboardSnapshot.findFirst({
        where: { volunteerId: volunteer.id },
      });

      expect(snapshot).toBeDefined();
      expect(snapshot?.rank).toBe(1);
      expect(snapshot?.totalPoints).toBe(60);
      expect(snapshot?.badgeTier).toBe('Gold');
      expect(snapshot?.snapshotDate).toBeDefined();
    });

    it('should handle volunteers with no leaderboard entry', async () => {
      const volunteer = await createTestVolunteer({ leaderboardOptIn: false });
      const activityType = await createTestActivityType({ pointValue: 25 });
      const event = await createTestEvent(volunteer.id);

      await service.awardEventPoints(volunteer.id, event.id, activityType.id, 25, volunteer.id);

      // Reset should not fail even if volunteer has no leaderboard entry
      await expect(service.resetAnnualPoints()).resolves.not.toThrow();
    });
  });

  describe('point balance edge cases', () => {
    it('should handle creating initial point balance', async () => {
      const volunteer = await createTestVolunteer();
      const activityType = await createTestActivityType({ pointValue: 10 });
      const event = await createTestEvent(volunteer.id);

      // First point award should create the balance
      await service.awardEventPoints(volunteer.id, event.id, activityType.id, 10, volunteer.id);

      const balance = await prisma.volunteerPointBalance.findUnique({
        where: { volunteerId: volunteer.id },
      });

      expect(balance).toBeDefined();
      expect(balance?.totalPoints).toBe(10);
      expect(balance?.currentYearPoints).toBe(10);
    });

    it('should handle negative balance from revocation when starting at zero', async () => {
      const volunteer = await createTestVolunteer();
      const activityType = await createTestActivityType({ pointValue: 10 });
      const event = await createTestEvent(volunteer.id);

      await service.awardEventPoints(volunteer.id, event.id, activityType.id, 10, volunteer.id);

      const originalEvent = await prisma.pointEvent.findFirst({
        where: { volunteerId: volunteer.id },
      });

      await service.revokePoints(originalEvent!.id, 'Test', volunteer.id);

      const balance = await prisma.volunteerPointBalance.findUnique({
        where: { volunteerId: volunteer.id },
      });

      // Balance should not go negative (clamped at 0)
      expect(balance?.totalPoints).toBe(0);
      expect(balance?.currentYearPoints).toBe(0);
    });

    it('should accumulate points from multiple sources', async () => {
      const volunteer = await createTestVolunteer();
      const activityType = await createTestActivityType({ pointValue: 5 });
      const event = await createTestEvent(volunteer.id);

      // Role assignment: 100 points
      await service.awardRoleAssignmentPoints(volunteer.id, 'role-1', volunteer.id);

      // Event participation: 5 points
      await service.awardEventPoints(volunteer.id, event.id, activityType.id, 5, volunteer.id);

      // Task completion: 10 points
      await service.awardTaskPoints(volunteer.id, 'task-1', 10, volunteer.id);

      const balance = await prisma.volunteerPointBalance.findUnique({
        where: { volunteerId: volunteer.id },
      });

      expect(balance?.totalPoints).toBe(115); // 100 + 5 + 10
    });
  });
});
