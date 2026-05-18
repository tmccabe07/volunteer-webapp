import { SignupService } from './signup.service';
import {
  setupTests,
  teardownTests,
  createTestVolunteer,
  createTestEvent,
  prisma,
} from '../test/test-utils';

describe('SignupService', () => {
  let service: SignupService;
  let testVolunteer: any;
  let testEvent: any;
  let testActivitySlot: any;

  beforeAll(async () => {
    await setupTests();
  });

  afterAll(async () => {
    await teardownTests();
  });

  beforeEach(async () => {
    // SignupService doesn't use DI, just instantiate directly
    service = new SignupService();
    
    // Create test volunteer
    testVolunteer = await createTestVolunteer({ name: 'Test Volunteer' });
    
    // Create test event with activity slot
    testEvent = await createTestEvent(testVolunteer.id, {
      eventDate: new Date('2026-06-15'),
    });
    
    // Get the activity slot created with the event
    testActivitySlot = await prisma.activitySlot.findFirst({
      where: { eventId: testEvent.id },
    });
  });

  afterEach(async () => {
    // Clean up in order to respect foreign key constraints
    await prisma.signup.deleteMany();
    await prisma.activitySlot.deleteMany();
    await prisma.event.deleteMany();
    await prisma.pointEvent.deleteMany();
    await prisma.volunteerPointBalance.deleteMany();
    await prisma.leaderboardCache.deleteMany();
    await prisma.childRank.deleteMany();
    await prisma.volunteerToRole.deleteMany();
    await prisma.volunteer.deleteMany();
  });

  describe('signupForActivity', () => {
    it('should successfully sign up a volunteer for an activity slot', async () => {
      const signup = await service.signupForActivity(
        testVolunteer.id,
        testActivitySlot.id
      );

      expect(signup).toBeTruthy();
      expect(signup.volunteerId).toBe(testVolunteer.id);
      expect(signup.activitySlotId).toBe(testActivitySlot.id);
      expect(signup.withdrawn).toBe(false);
      expect(signup.withdrawnAt).toBeNull();
    });

    it('should throw error when activity slot does not exist', async () => {
      await expect(
        service.signupForActivity(testVolunteer.id, 'non-existent-id')
      ).rejects.toThrow('Activity slot not found');
    });

    it('should throw error for soft-deleted events', async () => {
      await prisma.event.update({
        where: { id: testEvent.id },
        data: { deletedAt: new Date() },
      });

      await expect(
        service.signupForActivity(testVolunteer.id, testActivitySlot.id)
      ).rejects.toThrow('Activity slot not found');
    });

    it('should throw error when signing up for past events', async () => {
      const pastEvent = await createTestEvent(testVolunteer.id, {
        eventDate: new Date('2020-01-01'),
      });
      
      const pastSlot = await prisma.activitySlot.findFirst({
        where: { eventId: pastEvent.id },
      });

      await expect(
        service.signupForActivity(testVolunteer.id, pastSlot!.id)
      ).rejects.toThrow('Cannot sign up for past events');
    });

    it('should throw error when signing up for completed events', async () => {
      await prisma.event.update({
        where: { id: testEvent.id },
        data: { isComplete: true },
      });

      await expect(
        service.signupForActivity(testVolunteer.id, testActivitySlot.id)
      ).rejects.toThrow('Cannot sign up for completed events');
    });

    it('should throw error when already signed up', async () => {
      // First signup should succeed
      await service.signupForActivity(testVolunteer.id, testActivitySlot.id);

      // Second signup should fail
      await expect(
        service.signupForActivity(testVolunteer.id, testActivitySlot.id)
      ).rejects.toThrow('Already signed up for this activity');
    });

    it('should throw error when activity slot is at capacity', async () => {
      // Update slot to have capacity of 1
      await prisma.activitySlot.update({
        where: { id: testActivitySlot.id },
        data: { capacity: 1 },
      });

      // First volunteer signs up
      const volunteer1 = await createTestVolunteer({ name: 'Volunteer 1' });
      await service.signupForActivity(volunteer1.id, testActivitySlot.id);

      // Second volunteer should be rejected
      const volunteer2 = await createTestVolunteer({ name: 'Volunteer 2' });
      await expect(
        service.signupForActivity(volunteer2.id, testActivitySlot.id)
      ).rejects.toThrow('Activity slot is at capacity');
    });

    it('should allow signup when capacity is null (unlimited)', async () => {
      // Update slot to have null capacity
      await prisma.activitySlot.update({
        where: { id: testActivitySlot.id },
        data: { capacity: null },
      });

      // Create multiple signups
      const volunteer1 = await createTestVolunteer({ name: 'Volunteer 1' });
      const volunteer2 = await createTestVolunteer({ name: 'Volunteer 2' });
      const volunteer3 = await createTestVolunteer({ name: 'Volunteer 3' });

      await service.signupForActivity(volunteer1.id, testActivitySlot.id);
      await service.signupForActivity(volunteer2.id, testActivitySlot.id);
      await service.signupForActivity(volunteer3.id, testActivitySlot.id);

      const signups = await prisma.signup.findMany({
        where: { activitySlotId: testActivitySlot.id },
      });

      expect(signups).toHaveLength(3);
    });

    it('should allow re-signup after withdrawal by reactivating the signup', async () => {
      // Sign up
      const initialSignup = await service.signupForActivity(testVolunteer.id, testActivitySlot.id);

      // Withdraw
      await service.withdrawFromActivity(testVolunteer.id, testActivitySlot.id);

      // Verify withdrawal
      const withdrawnSignup = await prisma.signup.findFirst({
        where: { 
          volunteerId: testVolunteer.id,
          activitySlotId: testActivitySlot.id,
        },
      });
      expect(withdrawnSignup?.withdrawn).toBe(true);
      expect(withdrawnSignup?.withdrawnAt).toBeTruthy();

      // Sign up again - should reactivate the existing signup
      const reactivatedSignup = await service.signupForActivity(testVolunteer.id, testActivitySlot.id);

      // Should be the same signup ID, now reactivated
      expect(reactivatedSignup.id).toBe(initialSignup.id);
      expect(reactivatedSignup.withdrawn).toBe(false);
      expect(reactivatedSignup.withdrawnAt).toBeNull();

      // Verify only one signup record exists
      const allSignups = await prisma.signup.findMany({
        where: {
          volunteerId: testVolunteer.id,
          activitySlotId: testActivitySlot.id,
        },
      });
      expect(allSignups).toHaveLength(1);
    });

    it('should count only non-withdrawn signups for capacity', async () => {
      // Set capacity to 2
      await prisma.activitySlot.update({
        where: { id: testActivitySlot.id },
        data: { capacity: 2 },
      });

      const volunteer1 = await createTestVolunteer({ name: 'Volunteer 1' });
      const volunteer2 = await createTestVolunteer({ name: 'Volunteer 2' });
      const volunteer3 = await createTestVolunteer({ name: 'Volunteer 3' });

      // Two volunteers sign up
      await service.signupForActivity(volunteer1.id, testActivitySlot.id);
      await service.signupForActivity(volunteer2.id, testActivitySlot.id);

      // First volunteer withdraws
      await service.withdrawFromActivity(volunteer1.id, testActivitySlot.id);

      // Third volunteer should be able to sign up (capacity freed by withdrawal)
      const signup = await service.signupForActivity(volunteer3.id, testActivitySlot.id);
      expect(signup).toBeTruthy();
    });
  });

  describe('withdrawFromActivity', () => {
    it('should successfully withdraw a volunteer from an activity slot', async () => {
      // Sign up first
      await service.signupForActivity(testVolunteer.id, testActivitySlot.id);

      // Withdraw
      const withdrawn = await service.withdrawFromActivity(
        testVolunteer.id,
        testActivitySlot.id
      );

      expect(withdrawn.withdrawn).toBe(true);
      expect(withdrawn.withdrawnAt).toBeTruthy();
    });

    it('should throw error when signup not found', async () => {
      await expect(
        service.withdrawFromActivity(testVolunteer.id, testActivitySlot.id)
      ).rejects.toThrow('Signup not found or already withdrawn');
    });

    it('should throw error when trying to withdraw twice', async () => {
      // Sign up and withdraw
      await service.signupForActivity(testVolunteer.id, testActivitySlot.id);
      await service.withdrawFromActivity(testVolunteer.id, testActivitySlot.id);

      // Try to withdraw again
      await expect(
        service.withdrawFromActivity(testVolunteer.id, testActivitySlot.id)
      ).rejects.toThrow('Signup not found or already withdrawn');
    });

    it('should mark exactly one signup as withdrawn when volunteer has multiple signups', async () => {
      // Create another event and activity slot
      const event2 = await createTestEvent(testVolunteer.id, {
        eventDate: new Date('2026-07-01'),
      });
      
      const slot2 = await prisma.activitySlot.findFirst({
        where: { eventId: event2.id },
      });

      // Sign up for both
      await service.signupForActivity(testVolunteer.id, testActivitySlot.id);
      await service.signupForActivity(testVolunteer.id, slot2!.id);

      // Withdraw from first only
      await service.withdrawFromActivity(testVolunteer.id, testActivitySlot.id);

      // Check both signups
      const signup1 = await prisma.signup.findFirst({
        where: {
          volunteerId: testVolunteer.id,
          activitySlotId: testActivitySlot.id,
        },
      });

      const signup2 = await prisma.signup.findFirst({
        where: {
          volunteerId: testVolunteer.id,
          activitySlotId: slot2!.id,
        },
      });

      expect(signup1!.withdrawn).toBe(true);
      expect(signup2!.withdrawn).toBe(false);
    });
  });

  describe('getVolunteerSignups', () => {
    it('should return active signups for a volunteer', async () => {
      await service.signupForActivity(testVolunteer.id, testActivitySlot.id);

      const signups = await service.getVolunteerSignups(testVolunteer.id);

      expect(signups).toHaveLength(1);
      expect(signups[0].volunteerId).toBe(testVolunteer.id);
      expect(signups[0].withdrawn).toBe(false);
      expect(signups[0].activitySlot).toBeDefined();
      expect(signups[0].activitySlot.event).toBeDefined();
      expect(signups[0].activitySlot.activityType).toBeDefined();
    });

    it('should return empty array when volunteer has no signups', async () => {
      const signups = await service.getVolunteerSignups(testVolunteer.id);

      expect(signups).toHaveLength(0);
    });

    it('should exclude withdrawn signups by default', async () => {
      // Sign up and withdraw
      await service.signupForActivity(testVolunteer.id, testActivitySlot.id);
      await service.withdrawFromActivity(testVolunteer.id, testActivitySlot.id);

      const signups = await service.getVolunteerSignups(testVolunteer.id);

      expect(signups).toHaveLength(0);
    });

    it('should include withdrawn signups when requested', async () => {
      // Sign up and withdraw
      await service.signupForActivity(testVolunteer.id, testActivitySlot.id);
      await service.withdrawFromActivity(testVolunteer.id, testActivitySlot.id);

      const signups = await service.getVolunteerSignups(testVolunteer.id, true);

      expect(signups).toHaveLength(1);
      expect(signups[0].withdrawn).toBe(true);
    });

    it('should return signups ordered by createdAt desc (newest first)', async () => {
      // Create another event
      const event2 = await createTestEvent(testVolunteer.id, {
        eventDate: new Date('2026-07-01'),
      });
      
      const slot2 = await prisma.activitySlot.findFirst({
        where: { eventId: event2.id },
      });

      // Sign up for both (with slight delay to ensure different timestamps)
      await service.signupForActivity(testVolunteer.id, testActivitySlot.id);
      
      // Wait a moment to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await service.signupForActivity(testVolunteer.id, slot2!.id);

      const signups = await service.getVolunteerSignups(testVolunteer.id);

      expect(signups).toHaveLength(2);
      // Newest should be first
      expect(new Date(signups[0].createdAt).getTime()).toBeGreaterThan(
        new Date(signups[1].createdAt).getTime()
      );
    });

    it('should include event and activity type details', async () => {
      await service.signupForActivity(testVolunteer.id, testActivitySlot.id);

      const signups = await service.getVolunteerSignups(testVolunteer.id);

      expect(signups[0].activitySlot.event.title).toBe(testEvent.title);
      expect(signups[0].activitySlot.event.eventDate).toBeTruthy();
      expect(signups[0].activitySlot.activityType.name).toBeDefined();
      expect(signups[0].activitySlot.activityType.pointValue).toBeDefined();
    });

    it('should only return signups for the specified volunteer', async () => {
      const volunteer2 = await createTestVolunteer({ name: 'Volunteer 2' });

      await service.signupForActivity(testVolunteer.id, testActivitySlot.id);
      
      const signups = await service.getVolunteerSignups(volunteer2.id);

      expect(signups).toHaveLength(0);
    });
  });

  describe('getActivitySlotSignups', () => {
    it('should return all signups for an activity slot', async () => {
      const volunteer2 = await createTestVolunteer({ name: 'Volunteer 2' });
      const volunteer3 = await createTestVolunteer({ name: 'Volunteer 3' });

      await service.signupForActivity(testVolunteer.id, testActivitySlot.id);
      await service.signupForActivity(volunteer2.id, testActivitySlot.id);
      await service.signupForActivity(volunteer3.id, testActivitySlot.id);

      const signups = await service.getActivitySlotSignups(testActivitySlot.id);

      expect(signups).toHaveLength(3);
      expect(signups[0].volunteer).toBeDefined();
    });

    it('should return empty array when no signups exist', async () => {
      const signups = await service.getActivitySlotSignups(testActivitySlot.id);

      expect(signups).toHaveLength(0);
    });

    it('should include withdrawn signups', async () => {
      const volunteer2 = await createTestVolunteer({ name: 'Volunteer 2' });

      await service.signupForActivity(testVolunteer.id, testActivitySlot.id);
      await service.signupForActivity(volunteer2.id, testActivitySlot.id);
      
      // Withdraw one
      await service.withdrawFromActivity(testVolunteer.id, testActivitySlot.id);

      const signups = await service.getActivitySlotSignups(testActivitySlot.id);

      expect(signups).toHaveLength(2);
      expect(signups.some(s => s.withdrawn)).toBe(true);
      expect(signups.some(s => !s.withdrawn)).toBe(true);
    });

    it('should return signups ordered by createdAt asc (first to sign up first)', async () => {
      const volunteer2 = await createTestVolunteer({ name: 'Volunteer 2' });
      const volunteer3 = await createTestVolunteer({ name: 'Volunteer 3' });

      await service.signupForActivity(testVolunteer.id, testActivitySlot.id);
      await new Promise(resolve => setTimeout(resolve, 10));
      await service.signupForActivity(volunteer2.id, testActivitySlot.id);
      await new Promise(resolve => setTimeout(resolve, 10));
      await service.signupForActivity(volunteer3.id, testActivitySlot.id);

      const signups = await service.getActivitySlotSignups(testActivitySlot.id);

      expect(signups).toHaveLength(3);
      // Oldest should be first
      expect(new Date(signups[0].createdAt).getTime()).toBeLessThan(
        new Date(signups[1].createdAt).getTime()
      );
      expect(new Date(signups[1].createdAt).getTime()).toBeLessThan(
        new Date(signups[2].createdAt).getTime()
      );
    });

    it('should include volunteer contact information', async () => {
      await service.signupForActivity(testVolunteer.id, testActivitySlot.id);

      const signups = await service.getActivitySlotSignups(testActivitySlot.id);

      expect(signups[0].volunteer.name).toBe(testVolunteer.name);
      expect(signups[0].volunteer.email).toBe(testVolunteer.email);
      expect(signups[0].volunteer.phone).toBeDefined();
    });

    it('should only return signups for the specified activity slot', async () => {
      // Create another event and slot
      const event2 = await createTestEvent(testVolunteer.id, {
        eventDate: new Date('2026-07-01'),
      });
      
      const slot2 = await prisma.activitySlot.findFirst({
        where: { eventId: event2.id },
      });

      // Sign up for both slots
      await service.signupForActivity(testVolunteer.id, testActivitySlot.id);
      await service.signupForActivity(testVolunteer.id, slot2!.id);

      const signups = await service.getActivitySlotSignups(testActivitySlot.id);

      expect(signups).toHaveLength(1);
      expect(signups[0].activitySlotId).toBe(testActivitySlot.id);
    });
  });
});
