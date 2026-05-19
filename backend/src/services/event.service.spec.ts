import { EventService } from './event.service';
import { NotificationService } from './notification.service';
import {
  setupTests,
  teardownTests,
  createTestVolunteer,
  createTestEvent,
  createTestActivityType,
  prisma,
} from '../test/test-utils';

describe('EventService', () => {
  let service: EventService;
  let notificationService: NotificationService;
  let testVolunteer: any;
  let testActivityType: any;

  beforeAll(async () => {
    await setupTests();
  });

  afterAll(async () => {
    await teardownTests();
  });

  beforeEach(async () => {
    // Create NotificationService and EventService with dependency injection
    notificationService = new NotificationService();
    service = new EventService(notificationService);
    
    // Create test volunteer for use in tests
    testVolunteer = await createTestVolunteer({ authTier: 'LEADER' });
    
    // Get or create test activity type
    testActivityType = await prisma.activityType.findFirst();
  });

  afterEach(async () => {
    // Clean up in order to respect foreign key constraints
    await prisma.notification.deleteMany();
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

  describe('createEvent', () => {
    it('should create a new event with activity slots', async () => {
      const eventData = {
        title: 'Summer Campout',
        description: 'Annual summer camping trip',
        eventDate: new Date('2026-07-15'),
        rankLevel: 'WOLF',
        isRecurring: false,
        activitySlots: [
          {
            activityTypeId: testActivityType.id,
            capacity: 10,
          },
        ],
      };

      const event = await service.createEvent(eventData, testVolunteer.id);

      expect(event.title).toBe('Summer Campout');
      expect(event.description).toBe('Annual summer camping trip');
      expect(event.rankLevel).toBe('WOLF');
      expect(event.isRecurring).toBe(false);
      expect(event.activitySlots).toHaveLength(1);
      expect(event.activitySlots[0].capacity).toBe(10);
      expect(event.activitySlots[0].activityType.id).toBe(testActivityType.id);
      expect(event.createdBy.id).toBe(testVolunteer.id);
    });

    it('should set recurringEndDate from PackConfig when isRecurring is true', async () => {
      const eventData = {
        title: 'Weekly Den Meeting',
        description: 'Recurring den meeting',
        eventDate: new Date('2026-06-01'),
        rankLevel: 'WOLF',
        isRecurring: true,
        activitySlots: [
          {
            activityTypeId: testActivityType.id,
            capacity: null,
          },
        ],
      };

      const event = await service.createEvent(eventData, testVolunteer.id);

      expect(event.isRecurring).toBe(true);
      expect(event.recurringEndDate).toBeTruthy();
      
      // Should match the pack config year end date
      const packConfig = await prisma.packConfig.findFirst();
      expect(event.recurringEndDate).toEqual(packConfig!.yearEndDate);
    });

    it('should set rankLevel to null when not provided', async () => {
      const eventData = {
        title: 'Pack-wide Event',
        description: 'Event for all ranks',
        eventDate: new Date('2026-06-15'),
        isRecurring: false,
        activitySlots: [
          {
            activityTypeId: testActivityType.id,
            capacity: 20,
          },
        ],
      };

      const event = await service.createEvent(eventData, testVolunteer.id);

      expect(event.rankLevel).toBeNull();
    });

    it('should throw error when no activity slots provided', async () => {
      const eventData = {
        title: 'Invalid Event',
        description: 'Event with no slots',
        eventDate: new Date('2026-06-15'),
        isRecurring: false,
        activitySlots: [],
      };

      await expect(
        service.createEvent(eventData, testVolunteer.id)
      ).rejects.toThrow('At least one activity slot is required');
    });

    it('should throw error when event date is in the past', async () => {
      const eventData = {
        title: 'Past Event',
        description: 'Event in the past',
        eventDate: new Date('2020-01-01'),
        isRecurring: false,
        activitySlots: [
          {
            activityTypeId: testActivityType.id,
            capacity: 10,
          },
        ],
      };

      await expect(
        service.createEvent(eventData, testVolunteer.id)
      ).rejects.toThrow('Event date must be in the future');
    });

    it('should throw error when activity type does not exist', async () => {
      const eventData = {
        title: 'Invalid Activity Event',
        description: 'Event with non-existent activity type',
        eventDate: new Date('2026-06-15'),
        isRecurring: false,
        activitySlots: [
          {
            activityTypeId: 'non-existent-id',
            capacity: 10,
          },
        ],
      };

      await expect(
        service.createEvent(eventData, testVolunteer.id)
      ).rejects.toThrow('One or more activity types do not exist');
    });

    it('should create event with multiple activity slots', async () => {
      const activityType2 = await createTestActivityType({ name: 'Event Cleanup' });

      const eventData = {
        title: 'Multi-Slot Event',
        description: 'Event with multiple activity types',
        eventDate: new Date('2026-06-15'),
        rankLevel: 'BEAR',
        isRecurring: false,
        activitySlots: [
          {
            activityTypeId: testActivityType.id,
            capacity: 5,
          },
          {
            activityTypeId: activityType2.id,
            capacity: 3,
          },
        ],
      };

      const event = await service.createEvent(eventData, testVolunteer.id);

      expect(event.activitySlots).toHaveLength(2);
      expect(event.activitySlots[0].activityType.id).toBe(testActivityType.id);
      expect(event.activitySlots[1].activityType.id).toBe(activityType2.id);
    });

    it('should send notifications to relevant volunteers for pack-wide events', async () => {
      // Create additional test volunteers
      const volunteer1 = await createTestVolunteer({ email: 'parent1@test.com' });
      const volunteer2 = await createTestVolunteer({ email: 'parent2@test.com' });

      const eventData = {
        title: 'Pack-wide Campout',
        description: 'All ranks invited',
        eventDate: new Date('2026-07-15'),
        rankLevel: null, // Pack-wide
        isRecurring: false,
        activitySlots: [
          {
            activityTypeId: testActivityType.id,
            capacity: 20,
          },
        ],
      };

      const event = await service.createEvent(eventData, testVolunteer.id);

      // Check that notifications were created for other volunteers (but not creator)
      const notifications = await prisma.notification.findMany({
        where: { type: 'NEW_EVENT' },
      });

      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications.some(n => n.volunteerId === volunteer1.id)).toBe(true);
      expect(notifications.some(n => n.volunteerId === volunteer2.id)).toBe(true);
      expect(notifications.some(n => n.volunteerId === testVolunteer.id)).toBe(false); // Creator should not get notification
      expect(notifications[0].message).toContain('Pack-wide Campout');
      expect(notifications[0].link).toBe(`/events/${event.id}`);
    });

    it('should send notifications only to volunteers with children in the specified rank', async () => {
      // Create volunteers with different rank children
      const wolfParent = await createTestVolunteer({ email: 'wolf@test.com' });
      const bearParent = await createTestVolunteer({ email: 'bear@test.com' });

      // Add child ranks
      await prisma.childRank.create({
        data: { volunteerId: wolfParent.id, rankLevel: 'WOLF' },
      });
      await prisma.childRank.create({
        data: { volunteerId: bearParent.id, rankLevel: 'BEAR' },
      });

      const eventData = {
        title: 'Wolf Den Meeting',
        description: 'Wolf rank only',
        eventDate: new Date('2026-07-15'),
        rankLevel: 'WOLF',
        isRecurring: false,
        activitySlots: [
          {
            activityTypeId: testActivityType.id,
            capacity: 10,
          },
        ],
      };

      const event = await service.createEvent(eventData, testVolunteer.id);

      // Check that only wolf parent received notification
      const notifications = await prisma.notification.findMany({
        where: { type: 'NEW_EVENT' },
      });

      const wolfNotifications = notifications.filter(n => n.volunteerId === wolfParent.id);
      const bearNotifications = notifications.filter(n => n.volunteerId === bearParent.id);

      expect(wolfNotifications.length).toBe(1);
      expect(bearNotifications.length).toBe(0);
      expect(wolfNotifications[0].message).toContain('Wolf Den Meeting');
    });
  });

  describe('updateEvent', () => {
    it('should update event details', async () => {
      const event = await createTestEvent(testVolunteer.id, {
        title: 'Original Title',
        description: 'Original description',
      });

      const updateData = {
        title: 'Updated Title',
        description: 'Updated description',
      };

      const updated = await service.updateEvent(event.id, updateData);

      expect(updated.title).toBe('Updated Title');
      expect(updated.description).toBe('Updated description');
    });

    it('should update activity slots', async () => {
      const event = await createTestEvent(testVolunteer.id);
      const activityType2 = await createTestActivityType({ name: 'New Activity' });

      const updateData = {
        activitySlots: [
          {
            activityTypeId: activityType2.id,
            capacity: 15,
          },
        ],
      };

      const updated = await service.updateEvent(event.id, updateData);

      expect(updated.activitySlots).toHaveLength(1);
      expect(updated.activitySlots[0].activityType.id).toBe(activityType2.id);
      expect(updated.activitySlots[0].capacity).toBe(15);
    });

    it('should throw error when event not found', async () => {
      await expect(
        service.updateEvent('non-existent-id', { title: 'New Title' })
      ).rejects.toThrow('Event not found');
    });

    it('should throw error when trying to update completed event', async () => {
      const event = await createTestEvent(testVolunteer.id, {
        isComplete: true,
      });

      await expect(
        service.updateEvent(event.id, { title: 'New Title' })
      ).rejects.toThrow('Cannot modify completed events');
    });

    it('should throw error when updated event date is in the past', async () => {
      const event = await createTestEvent(testVolunteer.id);

      await expect(
        service.updateEvent(event.id, { eventDate: new Date('2020-01-01') })
      ).rejects.toThrow('Event date must be in the future');
    });

    it('should set recurringEndDate when isRecurring changed to true', async () => {
      const event = await createTestEvent(testVolunteer.id, {
        isRecurring: false,
      });

      const updated = await service.updateEvent(event.id, { isRecurring: true });

      expect(updated.recurringEndDate).toBeTruthy();
      const packConfig = await prisma.packConfig.findFirst();
      expect(updated.recurringEndDate).toEqual(packConfig!.yearEndDate);
    });

    it('should clear recurringEndDate when isRecurring changed to false', async () => {
      const event = await createTestEvent(testVolunteer.id, {
        isRecurring: true,
        recurringEndDate: new Date('2026-05-31'),
      });

      const updated = await service.updateEvent(event.id, { isRecurring: false });

      expect(updated.recurringEndDate).toBeNull();
    });

    it('should throw error when activity type does not exist', async () => {
      const event = await createTestEvent(testVolunteer.id);

      await expect(
        service.updateEvent(event.id, {
          activitySlots: [
            {
              activityTypeId: 'non-existent-id',
              capacity: 10,
            },
          ],
        })
      ).rejects.toThrow('One or more activity types do not exist');
    });
  });

  describe('completeEvent', () => {
    it('should mark event as complete and award points to participants', async () => {
      const volunteer1 = await createTestVolunteer({ name: 'Volunteer 1' });
      const volunteer2 = await createTestVolunteer({ name: 'Volunteer 2' });
      
      const event = await createTestEvent(testVolunteer.id);
      
      // Get activity slot
      const activitySlot = await prisma.activitySlot.findFirst({
        where: { eventId: event.id },
      });

      // Create signups
      await prisma.signup.create({
        data: {
          volunteerId: volunteer1.id,
          activitySlotId: activitySlot!.id,
          withdrawn: false,
        },
      });

      await prisma.signup.create({
        data: {
          volunteerId: volunteer2.id,
          activitySlotId: activitySlot!.id,
          withdrawn: false,
        },
      });

      const result = await service.completeEvent(
        event.id,
        {},
        testVolunteer.id
      );

      expect(result.isComplete).toBe(true);
      expect(result.pointsAwarded).toHaveLength(2);
      expect(result.pointsAwarded[0].volunteerName).toBe('Volunteer 1');
      expect(result.pointsAwarded[1].volunteerName).toBe('Volunteer 2');

      // Verify event is marked complete
      const updatedEvent = await prisma.event.findUnique({
        where: { id: event.id },
      });
      expect(updatedEvent!.isComplete).toBe(true);

      // Verify point events were created
      const pointEvents = await prisma.pointEvent.findMany({
        where: { referenceId: event.id },
      });
      expect(pointEvents).toHaveLength(2);
    });

    it('should skip withdrawn signups when awarding points', async () => {
      const volunteer1 = await createTestVolunteer({ name: 'Volunteer 1' });
      const volunteer2 = await createTestVolunteer({ name: 'Volunteer 2' });
      
      const event = await createTestEvent(testVolunteer.id);
      
      const activitySlot = await prisma.activitySlot.findFirst({
        where: { eventId: event.id },
      });

      // Create one active signup and one withdrawn
      await prisma.signup.create({
        data: {
          volunteerId: volunteer1.id,
          activitySlotId: activitySlot!.id,
          withdrawn: false,
        },
      });

      await prisma.signup.create({
        data: {
          volunteerId: volunteer2.id,
          activitySlotId: activitySlot!.id,
          withdrawn: true,
        },
      });

      const result = await service.completeEvent(
        event.id,
        {},
        testVolunteer.id
      );

      expect(result.pointsAwarded).toHaveLength(1);
      expect(result.pointsAwarded[0].volunteerName).toBe('Volunteer 1');
    });

    it('should add manual volunteers and award points', async () => {
      const volunteer1 = await createTestVolunteer({ name: 'Manual Volunteer' });
      
      const event = await createTestEvent(testVolunteer.id);
      
      const activitySlot = await prisma.activitySlot.findFirst({
        where: { eventId: event.id },
      });

      const completeData = {
        manualVolunteers: [
          {
            volunteerId: volunteer1.id,
            activitySlotId: activitySlot!.id,
          },
        ],
      };

      const result = await service.completeEvent(
        event.id,
        completeData,
        testVolunteer.id
      );

      expect(result.pointsAwarded).toHaveLength(1);
      expect(result.pointsAwarded[0].volunteerName).toBe('Manual Volunteer');

      // Verify signup was created
      const signup = await prisma.signup.findFirst({
        where: {
          volunteerId: volunteer1.id,
          activitySlotId: activitySlot!.id,
        },
      });
      expect(signup).toBeTruthy();
      expect(signup!.withdrawn).toBe(false);
    });

    it('should update volunteer point balances', async () => {
      const volunteer1 = await createTestVolunteer();
      
      const event = await createTestEvent(testVolunteer.id);
      
      const activitySlot = await prisma.activitySlot.findFirst({
        where: { eventId: event.id },
        include: { activityType: true },
      });

      await prisma.signup.create({
        data: {
          volunteerId: volunteer1.id,
          activitySlotId: activitySlot!.id,
          withdrawn: false,
        },
      });

      await service.completeEvent(event.id, {}, testVolunteer.id);

      const pointBalance = await prisma.volunteerPointBalance.findUnique({
        where: { volunteerId: volunteer1.id },
      });

      expect(pointBalance).toBeTruthy();
      expect(pointBalance!.totalPoints).toBe(activitySlot!.activityType.pointValue);
      expect(pointBalance!.currentYearPoints).toBe(activitySlot!.activityType.pointValue);
    });

    it('should throw error when event not found', async () => {
      await expect(
        service.completeEvent('non-existent-id', {}, testVolunteer.id)
      ).rejects.toThrow('Event not found');
    });

    it('should throw error when event is already complete', async () => {
      const event = await createTestEvent(testVolunteer.id, {
        isComplete: true,
      });

      await expect(
        service.completeEvent(event.id, {}, testVolunteer.id)
      ).rejects.toThrow('Event is already marked complete');
    });
  });

  describe('getEventById', () => {
    it('should return event with all details', async () => {
      const event = await createTestEvent(testVolunteer.id, {
        title: 'Test Event',
        description: 'Test Description',
      });

      const result = await service.getEventById(event.id);

      expect(result).toBeTruthy();
      expect(result!.title).toBe('Test Event');
      expect(result!.description).toBe('Test Description');
      expect(result!.activitySlots).toBeDefined();
      expect(result!.createdBy).toBeDefined();
    });

    it('should return null when event not found', async () => {
      const result = await service.getEventById('non-existent-id');

      expect(result).toBeNull();
    });

    it('should return null for soft-deleted events', async () => {
      const event = await createTestEvent(testVolunteer.id);
      
      await prisma.event.update({
        where: { id: event.id },
        data: { deletedAt: new Date() },
      });

      const result = await service.getEventById(event.id);

      expect(result).toBeNull();
    });

    it('should include activity slots with activity types and signups', async () => {
      const volunteer1 = await createTestVolunteer({ name: 'Signed Up User' });
      
      const event = await createTestEvent(testVolunteer.id);
      
      const activitySlot = await prisma.activitySlot.findFirst({
        where: { eventId: event.id },
      });

      await prisma.signup.create({
        data: {
          volunteerId: volunteer1.id,
          activitySlotId: activitySlot!.id,
          withdrawn: false,
        },
      });

      const result = await service.getEventById(event.id);

      expect(result!.activitySlots).toHaveLength(1);
      expect(result!.activitySlots[0].activityType).toBeDefined();
      expect(result!.activitySlots[0].signups).toHaveLength(1);
      expect(result!.activitySlots[0].signups[0].volunteer.name).toBe('Signed Up User');
    });
  });

  describe('listEvents', () => {
    beforeEach(async () => {
      // Clean up events from createTestEvent in other tests
      await prisma.signup.deleteMany();
      await prisma.activitySlot.deleteMany();
      await prisma.event.deleteMany();
    });

    it('should return paginated list of events', async () => {
      await createTestEvent(testVolunteer.id, { title: 'Event 1', eventDate: new Date('2026-06-01') });
      await createTestEvent(testVolunteer.id, { title: 'Event 2', eventDate: new Date('2026-06-15') });
      await createTestEvent(testVolunteer.id, { title: 'Event 3', eventDate: new Date('2026-07-01') });

      const result = await service.listEvents(1, 2, {});

      expect(result.events).toHaveLength(2);
      expect(result.pagination.total).toBe(3);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.totalPages).toBe(2);
    });

    it('should filter by upcoming events', async () => {
      await createTestEvent(testVolunteer.id, { eventDate: new Date('2020-01-01') });
      await createTestEvent(testVolunteer.id, { eventDate: new Date('2026-06-01') });
      await createTestEvent(testVolunteer.id, { eventDate: new Date('2026-07-01') });

      const result = await service.listEvents(1, 10, { upcoming: true });

      expect(result.events.length).toBeGreaterThanOrEqual(2);
      // All events should be in the future
      result.events.forEach(event => {
        expect(new Date(event.eventDate).getTime()).toBeGreaterThan(Date.now());
      });
    });

    it('should filter by rank level', async () => {
      await createTestEvent(testVolunteer.id, { rankLevel: 'WOLF' });
      await createTestEvent(testVolunteer.id, { rankLevel: 'BEAR' });
      await createTestEvent(testVolunteer.id, { rankLevel: 'TIGER' });

      const result = await service.listEvents(1, 10, { rankLevel: 'WOLF' });

      expect(result.events).toHaveLength(1);
      expect(result.events[0].rankLevel).toBe('WOLF');
    });

    it('should filter by user rank levels including pack-wide events', async () => {
      await createTestEvent(testVolunteer.id, { rankLevel: 'WOLF' });
      await createTestEvent(testVolunteer.id, { rankLevel: 'BEAR' });
      
      // Create pack-wide event (rankLevel: null) manually
      const activitySlot = await prisma.activityType.findFirst();
      await prisma.event.create({
        data: {
          title: 'Pack-wide Event',
          description: 'Event for all ranks',
          eventDate: new Date('2026-06-20'),
          rankLevel: null,
          isRecurring: false,
          createdById: testVolunteer.id,
          activitySlots: {
            create: [
              {
                activityTypeId: activitySlot!.id,
                capacity: 10,
              },
            ],
          },
        },
      });

      const result = await service.listEvents(1, 10, { userRankLevels: ['WOLF'] });

      expect(result.events).toHaveLength(2);
      const rankLevels = result.events.map(e => e.rankLevel);
      expect(rankLevels).toContain('WOLF');
      expect(rankLevels).toContain(null);
    });

    it('should filter by user signups', async () => {
      const volunteer1 = await createTestVolunteer();
      
      const event1 = await createTestEvent(testVolunteer.id, { title: 'Signed Up Event' });
      const event2 = await createTestEvent(testVolunteer.id, { title: 'Not Signed Up Event' });

      const activitySlot1 = await prisma.activitySlot.findFirst({
        where: { eventId: event1.id },
      });

      await prisma.signup.create({
        data: {
          volunteerId: volunteer1.id,
          activitySlotId: activitySlot1!.id,
          withdrawn: false,
        },
      });

      const result = await service.listEvents(
        1,
        10,
        { mySignups: true },
        volunteer1.id
      );

      expect(result.events).toHaveLength(1);
      expect(result.events[0].title).toBe('Signed Up Event');
    });

    it('should sort events by date ascending', async () => {
      await createTestEvent(testVolunteer.id, { eventDate: new Date('2026-07-01') });
      await createTestEvent(testVolunteer.id, { eventDate: new Date('2026-06-01') });
      await createTestEvent(testVolunteer.id, { eventDate: new Date('2026-06-15') });

      const result = await service.listEvents(1, 10, {});

      expect(result.events).toHaveLength(3);
      expect(new Date(result.events[0].eventDate).getTime()).toBeLessThan(
        new Date(result.events[1].eventDate).getTime()
      );
      expect(new Date(result.events[1].eventDate).getTime()).toBeLessThan(
        new Date(result.events[2].eventDate).getTime()
      );
    });

    it('should include signup counts and current user signup info', async () => {
      const volunteer1 = await createTestVolunteer();
      const volunteer2 = await createTestVolunteer();
      
      const event = await createTestEvent(testVolunteer.id);

      const activitySlot = await prisma.activitySlot.findFirst({
        where: { eventId: event.id },
      });

      await prisma.signup.create({
        data: {
          volunteerId: volunteer1.id,
          activitySlotId: activitySlot!.id,
          withdrawn: false,
        },
      });

      await prisma.signup.create({
        data: {
          volunteerId: volunteer2.id,
          activitySlotId: activitySlot!.id,
          withdrawn: false,
        },
      });

      const result = await service.listEvents(1, 10, {}, volunteer1.id);

      expect(result.events).toHaveLength(1);
      expect(result.events[0].activitySlots[0].signedUpCount).toBe(2);
      expect(result.events[0].activitySlots[0].currentUserSignup).toBeTruthy();
    });

    it('should not include soft-deleted events', async () => {
      await createTestEvent(testVolunteer.id, { title: 'Active Event' });
      const deletedEvent = await createTestEvent(testVolunteer.id, { title: 'Deleted Event' });

      await prisma.event.update({
        where: { id: deletedEvent.id },
        data: { deletedAt: new Date() },
      });

      const result = await service.listEvents(1, 10, {});

      expect(result.events).toHaveLength(1);
      expect(result.events[0].title).toBe('Active Event');
    });
  });

  describe('deleteEvent', () => {
    it('should soft delete an event', async () => {
      const event = await createTestEvent(testVolunteer.id);

      await service.deleteEvent(event.id);

      const deletedEvent = await prisma.event.findUnique({
        where: { id: event.id },
      });

      expect(deletedEvent!.deletedAt).toBeTruthy();
    });

    it('should make deleted event invisible to listEvents', async () => {
      const event = await createTestEvent(testVolunteer.id);

      await service.deleteEvent(event.id);

      const result = await service.listEvents(1, 10, {});

      expect(result.events.find(e => e.id === event.id)).toBeUndefined();
    });

    it('should make deleted event invisible to getEventById', async () => {
      const event = await createTestEvent(testVolunteer.id);

      await service.deleteEvent(event.id);

      const result = await service.getEventById(event.id);

      expect(result).toBeNull();
    });
  });
});
