import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AwardState, ReconciliationStatus } from '@prisma/client';
import { AwardFulfillmentService } from './award-fulfillment.service';
import { AuthorizationService } from '../role-scope/authorization.service';

const mockPrisma = {
  awardItem: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  requirement: {
    count: jest.fn(),
  },
  requirementProgress: {
    count: jest.fn(),
  },
  awardStateHistory: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

jest.mock('../../utils/prisma', () => ({
  __esModule: true,
  get default() {
    return mockPrisma;
  },
}));

describe('AwardFulfillmentService', () => {
  let service: AwardFulfillmentService;
  let authorizationService: jest.Mocked<AuthorizationService>;

  beforeEach(() => {
    authorizationService = {
      canAccessChild: jest.fn(),
      hasPackScope: jest.fn(),
    } as unknown as jest.Mocked<AuthorizationService>;

    service = new AwardFulfillmentService(authorizationService);
    jest.clearAllMocks();
  });

  it('lists awards and maps API response', async () => {
    authorizationService.hasPackScope.mockResolvedValue(true);
    mockPrisma.awardItem.findMany.mockResolvedValue([
      {
        id: 'award-1',
        childScoutId: 'child-1',
        specialAwardId: null,
        currentState: AwardState.ELIGIBLE,
        quantityNeeded: 1,
        createdAt: new Date('2026-05-01T00:00:00.000Z'),
        updatedAt: new Date('2026-05-02T00:00:00.000Z'),
        childScout: {
          id: 'child-1',
          firstName: 'Alex',
          lastName: 'Scout',
          currentRank: 'WOLF',
        },
        adventure: { name: 'Call of the Wild' },
        specialAward: null,
      },
    ]);

    const result = await service.getAwards('leader-1', 'LEADER', {});

    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({
      id: 'award-1',
      currentState: AwardState.ELIGIBLE,
      award: {
        type: 'ADVENTURE',
        name: 'Call of the Wild',
      },
    });
  });

  it('transitions award and appends history', async () => {
    mockPrisma.awardItem.findUnique.mockResolvedValueOnce({
      id: 'award-1',
      childScoutId: 'child-1',
      currentState: AwardState.APPROVED,
    });
    authorizationService.canAccessChild.mockResolvedValue(true);

    mockPrisma.awardItem.update.mockResolvedValue({
      id: 'award-1',
      currentState: AwardState.PURCHASED,
    });
    mockPrisma.awardStateHistory.create.mockResolvedValue({ id: 'history-1' });
    mockPrisma.$transaction.mockResolvedValue([
      { id: 'award-1', currentState: AwardState.PURCHASED },
      { id: 'history-1' },
    ]);
    mockPrisma.awardStateHistory.findMany.mockResolvedValue([
      {
        fromState: AwardState.APPROVED,
        toState: AwardState.PURCHASED,
        changedAt: new Date('2026-05-03T00:00:00.000Z'),
        changedBy: 'leader-1',
        notes: 'Bought at scout shop',
      },
    ]);

    const result = await service.transitionAward(
      'award-1',
      { toState: AwardState.PURCHASED, notes: 'Bought at scout shop' },
      'leader-1',
      'LEADER',
    );

    expect(result.currentState).toBe(AwardState.PURCHASED);
    expect(result.history[0].toState).toBe(AwardState.PURCHASED);
  });

  it('validates eligibility before ELIGIBLE -> APPROVED transition', async () => {
    mockPrisma.awardItem.findUnique
      .mockResolvedValueOnce({
        id: 'award-1',
        childScoutId: 'child-1',
        currentState: AwardState.ELIGIBLE,
      })
      .mockResolvedValueOnce({
        id: 'award-1',
        childScoutId: 'child-1',
        adventureId: 'adv-1',
        specialAwardId: null,
      });

    authorizationService.canAccessChild.mockResolvedValue(true);
    mockPrisma.requirement.count.mockResolvedValue(3);
    mockPrisma.requirementProgress.count.mockResolvedValue(1);

    await expect(
      service.transitionAward('award-1', { toState: AwardState.APPROVED }, 'leader-1', 'LEADER'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when award does not exist', async () => {
    mockPrisma.awardItem.findUnique.mockResolvedValue(null);

    await expect(
      service.transitionAward('missing', { toState: AwardState.APPROVED }, 'leader-1', 'LEADER'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects parent access for batch transition', async () => {
    await expect(
      service.batchTransition(
        {
          awardIds: ['award-1'],
          toState: AwardState.PURCHASED,
        },
        'parent-1',
        'PARENT',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns per-award success and failure in batch transition', async () => {
    mockPrisma.awardItem.findUnique
      .mockResolvedValueOnce({
        id: 'award-1',
        childScoutId: 'child-1',
        currentState: AwardState.APPROVED,
      })
      .mockResolvedValueOnce(null);

    authorizationService.canAccessChild.mockResolvedValue(true);

    mockPrisma.awardItem.update.mockResolvedValue({
      id: 'award-1',
      currentState: AwardState.PURCHASED,
    });
    mockPrisma.awardStateHistory.create.mockResolvedValue({ id: 'history-1' });
    mockPrisma.$transaction.mockResolvedValue([
      { id: 'award-1', currentState: AwardState.PURCHASED },
      { id: 'history-1' },
    ]);
    mockPrisma.awardStateHistory.findMany.mockResolvedValue([]);

    const result = await service.batchTransition(
      {
        awardIds: ['award-1', 'award-missing'],
        toState: AwardState.PURCHASED,
      },
      'leader-1',
      'LEADER',
    );

    expect(result.successCount).toBe(1);
    expect(result.failedCount).toBe(1);
    expect(result.results).toHaveLength(2);
  });
});
