import {
  AwardState,
  CompletionType,
  ReconciliationStatus,
} from '@prisma/client';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { RequirementProgressService } from './requirement-progress.service';
import { AuthorizationService } from '../role-scope/authorization.service';

const mockPrisma = {
  requirement: {
    findUnique: jest.fn(),
    count: jest.fn(),
  },
  childScout: {
    findFirst: jest.fn(),
  },
  requirementProgress: {
    create: jest.fn(),
    count: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    updateMany: jest.fn(),
    findUniqueOrThrow: jest.fn(),
  },
  awardItem: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  awardStateHistory: {
    create: jest.fn(),
  },
};

jest.mock('../../utils/prisma', () => ({
  __esModule: true,
  get default() {
    return mockPrisma;
  },
}));

describe('RequirementProgressService', () => {
  let service: RequirementProgressService;
  let authorizationService: jest.Mocked<AuthorizationService>;

  beforeEach(() => {
    authorizationService = {
      canAccessChild: jest.fn(),
      hasPackScope: jest.fn(),
    } as unknown as jest.Mocked<AuthorizationService>;

    service = new RequirementProgressService(authorizationService);
    jest.clearAllMocks();
  });

  describe('completeRequirement', () => {
    it('creates progress and returns mapped response', async () => {
      const completedAt = new Date('2026-05-24T12:00:00.000Z');

      mockPrisma.requirement.findUnique.mockResolvedValue({
        id: 'req-1',
        adventure: { id: 'adv-1' },
      });
      mockPrisma.childScout.findFirst.mockResolvedValue({ id: 'child-1' });
      authorizationService.canAccessChild.mockResolvedValue(true);
      mockPrisma.requirementProgress.create.mockResolvedValue({
        id: 'prog-1',
        requirementId: 'req-1',
        childScoutId: 'child-1',
        completedAt,
        completedBy: 'leader-1',
        completionType: CompletionType.PARENT_REPORTED,
        scoutbookStatus: ReconciliationStatus.PENDING,
        version: 1,
      });

      const result = await service.completeRequirement(
        'req-1',
        {
          childScoutId: 'child-1',
          completionType: CompletionType.PARENT_REPORTED,
          notes: 'Completed at home',
        },
        'leader-1',
        'LEADER',
      );

      expect(authorizationService.canAccessChild).toHaveBeenCalledWith(
        'leader-1',
        'child-1',
        'LEADER',
      );
      expect(mockPrisma.requirementProgress.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          childScoutId: 'child-1',
          requirementId: 'req-1',
          adventureId: 'adv-1',
          completedBy: 'leader-1',
          completionType: CompletionType.PARENT_REPORTED,
          notes: 'Completed at home',
          scoutbookStatus: ReconciliationStatus.PENDING,
        }),
      });
      expect(result).toEqual({
        id: 'prog-1',
        requirementId: 'req-1',
        childScoutId: 'child-1',
        completedAt: completedAt.toISOString(),
        completedBy: 'leader-1',
        completionType: CompletionType.PARENT_REPORTED,
        scoutbookStatus: ReconciliationStatus.PENDING,
        version: 1,
      });
    });

    it('throws ConflictException on duplicate completion', async () => {
      mockPrisma.requirement.findUnique.mockResolvedValue({
        id: 'req-1',
        adventure: { id: 'adv-1' },
      });
      mockPrisma.childScout.findFirst.mockResolvedValue({ id: 'child-1' });
      authorizationService.canAccessChild.mockResolvedValue(true);
      mockPrisma.requirementProgress.create.mockRejectedValue({ code: 'P2002' });

      await expect(
        service.completeRequirement(
          'req-1',
          {
            childScoutId: 'child-1',
            completionType: CompletionType.DEN_MEETING,
          },
          'leader-1',
          'LEADER',
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('getPendingReconciliation', () => {
    it('throws ForbiddenException for parent tier', async () => {
      await expect(
        service.getPendingReconciliation('parent-1', 'PARENT', {}),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('filters to accessible children for non-pack leaders', async () => {
      const completedAt = new Date('2026-05-22T12:00:00.000Z');

      authorizationService.hasPackScope.mockResolvedValue(false);
      authorizationService.canAccessChild
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      mockPrisma.requirementProgress.findMany.mockResolvedValue([
        {
          id: 'prog-1',
          childScoutId: 'child-1',
          childScout: {
            id: 'child-1',
            firstName: 'A',
            lastName: 'Scout',
            currentRank: 'WOLF',
            denMemberships: [{ den: { name: 'Den 1' } }],
          },
          requirement: {
            id: 'req-1',
            requirementText: 'Do your best',
            adventure: { name: 'Adventure 1' },
          },
          completedAt,
          completionType: CompletionType.PARENT_REPORTED,
        },
        {
          id: 'prog-2',
          childScoutId: 'child-2',
          childScout: {
            id: 'child-2',
            firstName: 'B',
            lastName: 'Scout',
            currentRank: 'WOLF',
            denMemberships: [{ den: { name: 'Den 2' } }],
          },
          requirement: {
            id: 'req-2',
            requirementText: 'Do more',
            adventure: { name: 'Adventure 2' },
          },
          completedAt,
          completionType: CompletionType.DEN_MEETING,
        },
      ]);

      const result = await service.getPendingReconciliation('leader-1', 'LEADER', {});

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('prog-1');
      expect(authorizationService.canAccessChild).toHaveBeenNthCalledWith(
        1,
        'leader-1',
        'child-1',
        'LEADER',
      );
      expect(authorizationService.canAccessChild).toHaveBeenNthCalledWith(
        2,
        'leader-1',
        'child-2',
        'LEADER',
      );
    });
  });

  describe('reconcileRequirement', () => {
    it('updates progress when version matches', async () => {
      const enteredAt = new Date('2026-05-24T14:00:00.000Z');

      mockPrisma.requirementProgress.findUnique.mockResolvedValue({
        id: 'prog-1',
        childScoutId: 'child-1',
        adventureId: 'adv-1',
      });
      authorizationService.canAccessChild.mockResolvedValue(true);
      mockPrisma.requirementProgress.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.requirementProgress.findUniqueOrThrow.mockResolvedValue({
        id: 'prog-1',
        scoutbookStatus: ReconciliationStatus.ENTERED,
        scoutbookEnteredAt: enteredAt,
        scoutbookEnteredBy: 'leader-1',
        version: 2,
      });
      mockPrisma.requirement.count.mockResolvedValue(1);
      mockPrisma.requirementProgress.count.mockResolvedValue(1);
      mockPrisma.awardItem.findFirst.mockResolvedValue(null);
      mockPrisma.awardItem.create.mockResolvedValue({ id: 'award-1' });
      mockPrisma.awardStateHistory.create.mockResolvedValue({ id: 'history-1' });

      const result = await service.reconcileRequirement(
        'prog-1',
        'leader-1',
        'LEADER',
        { version: 1, notes: 'Entered in Scoutbook' },
      );

      expect(mockPrisma.requirementProgress.updateMany).toHaveBeenCalledWith({
        where: { id: 'prog-1', version: 1 },
        data: expect.objectContaining({
          scoutbookStatus: ReconciliationStatus.ENTERED,
          scoutbookEnteredBy: 'leader-1',
          scoutbookNotes: 'Entered in Scoutbook',
          version: { increment: 1 },
        }),
      });
      expect(result).toEqual({
        id: 'prog-1',
        scoutbookStatus: ReconciliationStatus.ENTERED,
        scoutbookEnteredAt: enteredAt.toISOString(),
        scoutbookEnteredBy: 'leader-1',
        version: 2,
      });
      expect(mockPrisma.awardItem.create).toHaveBeenCalledWith({
        data: {
          childScoutId: 'child-1',
          adventureId: 'adv-1',
          currentState: AwardState.ELIGIBLE,
          quantityNeeded: 1,
        },
        select: {
          id: true,
        },
      });
    });

    it('does not create award when adventure is not fully reconciled', async () => {
      mockPrisma.requirementProgress.findUnique.mockResolvedValue({
        id: 'prog-1',
        childScoutId: 'child-1',
        adventureId: 'adv-1',
      });
      authorizationService.canAccessChild.mockResolvedValue(true);
      mockPrisma.requirementProgress.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.requirementProgress.findUniqueOrThrow.mockResolvedValue({
        id: 'prog-1',
        scoutbookStatus: ReconciliationStatus.ENTERED,
        scoutbookEnteredAt: new Date('2026-05-24T14:00:00.000Z'),
        scoutbookEnteredBy: 'leader-1',
        version: 2,
      });
      mockPrisma.requirement.count.mockResolvedValue(3);
      mockPrisma.requirementProgress.count.mockResolvedValue(2);

      await service.reconcileRequirement('prog-1', 'leader-1', 'LEADER', { version: 1 });

      expect(mockPrisma.awardItem.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException with current state when version is stale', async () => {
      mockPrisma.requirementProgress.findUnique
        .mockResolvedValueOnce({
          id: 'prog-1',
          childScoutId: 'child-1',
          adventureId: 'adv-1',
        })
        .mockResolvedValueOnce({
          id: 'prog-1',
          scoutbookStatus: ReconciliationStatus.PENDING,
          version: 3,
        });

      authorizationService.canAccessChild.mockResolvedValue(true);
      mockPrisma.requirementProgress.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.reconcileRequirement('prog-1', 'leader-1', 'LEADER', {
          version: 1,
        }),
      ).rejects.toMatchObject({
        response: {
          error: 'Conflict: requirement progress was updated by another request',
          current: {
            id: 'prog-1',
            scoutbookStatus: ReconciliationStatus.PENDING,
            version: 3,
          },
        },
      });
    });

    it('throws NotFoundException when progress record does not exist', async () => {
      mockPrisma.requirementProgress.findUnique.mockResolvedValue(null);

      await expect(
        service.reconcileRequirement('missing', 'leader-1', 'LEADER', { version: 1 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
