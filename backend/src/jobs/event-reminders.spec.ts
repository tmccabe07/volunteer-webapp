/**
 * Event Reminders Job Tests
 * 
 * Tests event reminder notification job logic
 */

import { sendEventReminders } from './event-reminders';
import { prisma } from '../utils/prisma';
import { NotificationType } from '@prisma/client';

// Mock Prisma
jest.mock('../utils/prisma', () => ({
  prisma: {
    event: {
      findMany: jest.fn(),
    },
    notification: {
      create: jest.fn(),
    },
  },
}));

describe('Event Reminders Job', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should send reminders for events in 48-hour window', async () => {
    const now = new Date();
    const event48HoursAway = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const mockEvent = {
      id: 'event-1',
      title: 'Pack Meeting',
      location: 'Community Center',
      eventDate: event48HoursAway,
      eventTime: '6:00 PM',
      activitySlots: [
        {
          signups: [
            { volunteerId: 'vol-1' },
            { volunteerId: 'vol-2' },
          ],
        },
      ],
    };

    (prisma.event.findMany as jest.Mock).mockResolvedValue([mockEvent]);
    (prisma.notification.create as jest.Mock).mockResolvedValue({});

    const result = await sendEventReminders();

    expect(prisma.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          eventDate: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date),
          }),
          deletedAt: null,
        }),
      })
    );

    expect(prisma.notification.create).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ sent: 2, events: 1 });
  });

  it('should not send reminders for events outside 48-hour window', async () => {
    (prisma.event.findMany as jest.Mock).mockResolvedValue([]);

    const result = await sendEventReminders();

    expect(prisma.notification.create).not.toHaveBeenCalled();
    expect(result).toEqual({ sent: 0, events: 0 });
  });

  it('should not send reminders for soft-deleted events', async () => {
    (prisma.event.findMany as jest.Mock).mockResolvedValue([]);

    await sendEventReminders();

    expect(prisma.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
        }),
      })
    );
  });

  it('should skip events with no signups', async () => {
    const now = new Date();
    const event48HoursAway = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const mockEvent = {
      id: 'event-1',
      title: 'Pack Meeting',
      location: 'Community Center',
      eventDate: event48HoursAway,
      eventTime: '6:00 PM',
      activitySlots: [], // No activity slots = no signups
    };

    (prisma.event.findMany as jest.Mock).mockResolvedValue([mockEvent]);

    const result = await sendEventReminders();

    expect(prisma.notification.create).not.toHaveBeenCalled();
    expect(result).toEqual({ sent: 0, events: 1 });
  });

  it('should include only non-withdrawn signups', async () => {
    const now = new Date();
    const event48HoursAway = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    (prisma.event.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'event-1',
        title: 'Pack Meeting',
        location: 'Community Center',
        eventDate: event48HoursAway,
        eventTime: '6:00 PM',
        activitySlots: [
          {
            signups: [{ volunteerId: 'vol-1' }],
          },
        ],
      },
    ]);

    await sendEventReminders();

    expect(prisma.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          activitySlots: expect.objectContaining({
            include: expect.objectContaining({
              signups: expect.objectContaining({
                where: { withdrawn: false },
              }),
            }),
          }),
        }),
      })
    );
  });

  it('should create notifications with correct type and message', async () => {
    const now = new Date();
    const event48HoursAway = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    (prisma.event.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'event-1',
        title: 'Pack Meeting',
        location: 'Community Center',
        eventDate: event48HoursAway,
        eventTime: '6:00 PM',
        activitySlots: [
          {
            signups: [{ volunteerId: 'vol-1' }],
          },
        ],
      },
    ]);

    (prisma.notification.create as jest.Mock).mockResolvedValue({});

    await sendEventReminders();

    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: {
        volunteerId: 'vol-1',
        type: NotificationType.EVENT_REMINDER,
        message: expect.stringContaining('Pack Meeting'),
      },
    });

    const callArgs = (prisma.notification.create as jest.Mock).mock.calls[0][0];
    expect(callArgs.data.message).toContain('Pack Meeting');
    expect(callArgs.data.message).toContain('Community Center');
    expect(callArgs.data.message).toContain('tomorrow');
  });

  it('should handle multiple events', async () => {
    const now = new Date();
    const event1 = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const event2 = new Date(now.getTime() + 47.5 * 60 * 60 * 1000);

    (prisma.event.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'event-1',
        title: 'Event 1',
        location: 'Location 1',
        eventDate: event1,
        eventTime: '6:00 PM',
        activitySlots: [
          {
            signups: [{ volunteerId: 'vol-1' }],
          },
        ],
      },
      {
        id: 'event-2',
        title: 'Event 2',
        location: 'Location 2',
        eventDate: event2,
        eventTime: '7:00 PM',
        activitySlots: [
          {
            signups: [{ volunteerId: 'vol-2' }, { volunteerId: 'vol-3' }],
          },
        ],
      },
    ]);

    (prisma.notification.create as jest.Mock).mockResolvedValue({});

    const result = await sendEventReminders();

    expect(prisma.notification.create).toHaveBeenCalledTimes(3);
    expect(result).toEqual({ sent: 3, events: 2 });
  });

  it('should continue on individual notification errors', async () => {
    const now = new Date();
    const event48HoursAway = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    (prisma.event.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'event-1',
        title: 'Pack Meeting',
        location: 'Community Center',
        eventDate: event48HoursAway,
        eventTime: '6:00 PM',
        activitySlots: [
          {
            signups: [{ volunteerId: 'vol-1' }, { volunteerId: 'vol-2' }],
          },
        ],
      },
    ]);

    // First notification fails, second succeeds
    (prisma.notification.create as jest.Mock)
      .mockRejectedValueOnce(new Error('Database error'))
      .mockResolvedValueOnce({});

    const result = await sendEventReminders();

    expect(prisma.notification.create).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ sent: 1, events: 1 });
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to send notification'),
      expect.any(Error)
    );
  });

  it('should throw error when event query fails', async () => {
    (prisma.event.findMany as jest.Mock).mockRejectedValue(
      new Error('Database connection failed')
    );

    await expect(sendEventReminders()).rejects.toThrow('Database connection failed');
  });

  it('should log job start and completion', async () => {
    (prisma.event.findMany as jest.Mock).mockResolvedValue([]);

    await sendEventReminders();

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Starting event reminder job')
    );
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Job complete')
    );
  });

  it('should handle events with null location', async () => {
    const now = new Date();
    const event48HoursAway = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    (prisma.event.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'event-1',
        title: 'Pack Meeting',
        location: null,
        eventDate: event48HoursAway,
        eventTime: '6:00 PM',
        activitySlots: [
          {
            signups: [{ volunteerId: 'vol-1' }],
          },
        ],
      },
    ]);

    (prisma.notification.create as jest.Mock).mockResolvedValue({});

    await sendEventReminders();

    const callArgs = (prisma.notification.create as jest.Mock).mock.calls[0][0];
    expect(callArgs.data.message).toContain('TBD');
  });

  it('should use 47-49 hour window for reminders', async () => {
    const now = new Date();
    const expectedStart = new Date(now.getTime() + 47 * 60 * 60 * 1000);
    const expectedEnd = new Date(now.getTime() + 49 * 60 * 60 * 1000);

    (prisma.event.findMany as jest.Mock).mockResolvedValue([]);

    await sendEventReminders();

    const callArgs = (prisma.event.findMany as jest.Mock).mock.calls[0][0];
    const startTime = callArgs.where.eventDate.gte.getTime();
    const endTime = callArgs.where.eventDate.lte.getTime();

    // Allow 1 second tolerance for test execution time
    expect(startTime).toBeGreaterThanOrEqual(expectedStart.getTime() - 1000);
    expect(startTime).toBeLessThanOrEqual(expectedStart.getTime() + 1000);
    expect(endTime).toBeGreaterThanOrEqual(expectedEnd.getTime() - 1000);
    expect(endTime).toBeLessThanOrEqual(expectedEnd.getTime() + 1000);
  });
});
