import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuthTier, PromptCategory, PromptStatus } from '@prisma/client';
import { ScoutbookPromptService } from './scoutbook-prompt.service';

const mockPrisma = {
  event: {
    findUnique: jest.fn(),
  },
  denEvent: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  childAttendance: {
    findMany: jest.fn(),
  },
  childScout: {
    findMany: jest.fn(),
  },
  scoutbookPrompt: {
    createMany: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  parentChildLink: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
};

jest.mock('../../utils/prisma', () => ({
  __esModule: true,
  get default() {
    return mockPrisma;
  },
}));

describe('ScoutbookPromptService', () => {
  let service: ScoutbookPromptService;
  const notificationService = {
    createNotification: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
    service = new ScoutbookPromptService(notificationService as any);
  });

  it('generates prompts with event defaults', async () => {
    const eventDate = new Date('2026-05-26T00:00:00.000Z');

    mockPrisma.event.findUnique.mockResolvedValue({
      id: 'event-1',
      title: 'Den Hike',
      description: null,
      eventDate,
      eventTime: null,
      endTime: null,
      fullDay: false,
      location: 'Trailhead',
      createdById: 'leader-1',
      deletedAt: null,
    });
    mockPrisma.denEvent.findUnique.mockResolvedValue({ id: 'event-1' });
    mockPrisma.childAttendance.findMany.mockResolvedValue([{ childScoutId: 'child-1' }]);
    mockPrisma.childScout.findMany.mockResolvedValue([
      { id: 'child-1', firstName: 'Alex', lastName: 'Scout' },
    ]);
    mockPrisma.scoutbookPrompt.createMany.mockResolvedValue({ count: 1 });
    mockPrisma.scoutbookPrompt.findMany.mockResolvedValue([
      {
        id: 'prompt-1',
        childScoutId: 'child-1',
        category: PromptCategory.HIKING,
        categoryData: { miles: 2, trailName: 'Den Hike' },
        status: PromptStatus.PENDING,
      },
    ]);
    mockPrisma.parentChildLink.findMany.mockResolvedValue([]);

    const result = await service.generatePrompts('event-1', {
      categoryPrompts: [
        {
          category: PromptCategory.HIKING,
          categoryData: { miles: 2 },
          childScoutIds: ['child-1'],
        },
      ],
    });

    expect(result.eventId).toBe('event-1');
    expect(result.promptsGenerated).toBe(1);
    expect(result.prompts[0].status).toBe(PromptStatus.PENDING);
  });

  it('throws when child does not have attendance for event', async () => {
    mockPrisma.event.findUnique.mockResolvedValue({
      id: 'event-1',
      title: 'Den Service',
      description: null,
      eventDate: new Date(),
      eventTime: null,
      endTime: null,
      fullDay: false,
      location: null,
      createdById: 'leader-1',
      deletedAt: null,
    });
    mockPrisma.denEvent.findUnique.mockResolvedValue({ id: 'event-1' });
    mockPrisma.childAttendance.findMany.mockResolvedValue([{ childScoutId: 'child-2' }]);
    mockPrisma.childScout.findMany.mockResolvedValue([
      { id: 'child-1', firstName: 'Alex', lastName: 'Scout' },
    ]);

    await expect(
      service.generatePrompts('event-1', {
        categoryPrompts: [
          {
            category: PromptCategory.SERVICE,
            categoryData: { hours: 1 },
            childScoutIds: ['child-1'],
          },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lists prompts for parent linked children', async () => {
    const generatedAt = new Date('2026-05-26T10:00:00.000Z');
    const eventDate = new Date('2026-05-20T00:00:00.000Z');

    mockPrisma.parentChildLink.findMany.mockResolvedValue([{ childScoutId: 'child-1' }]);
    mockPrisma.scoutbookPrompt.findMany.mockResolvedValue([
      {
        id: 'prompt-1',
        childScout: { id: 'child-1', firstName: 'Alex', lastName: 'Scout' },
        event: { id: 'event-1', title: 'Campout', eventDate },
        category: PromptCategory.CAMPING,
        categoryData: { nights: 1, location: 'Camp Bob' },
        status: PromptStatus.PENDING,
        generatedAt,
        sentAt: null,
      },
    ]);

    const result = await service.listPrompts('parent-1', AuthTier.PARENT, {});

    expect(result.data).toHaveLength(1);
    expect(result.data[0].childScout.id).toBe('child-1');
    expect(result.data[0].message).toContain('Suggested Scoutbook entry');
  });

  it('denies parent access for non-linked prompt', async () => {
    mockPrisma.scoutbookPrompt.findUnique.mockResolvedValue({
      id: 'prompt-1',
      childScout: { id: 'child-1' },
    });
    mockPrisma.parentChildLink.findFirst.mockResolvedValue(null);

    await expect(
      service.acknowledgePrompt('prompt-1', 'parent-1', AuthTier.PARENT),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws not found for missing prompt on dismiss', async () => {
    mockPrisma.scoutbookPrompt.findUnique.mockResolvedValue(null);

    await expect(
      service.dismissPrompt('missing', 'parent-1', AuthTier.PARENT),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
