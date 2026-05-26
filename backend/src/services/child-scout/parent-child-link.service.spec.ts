import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AuthTier, LinkStatus, RankLevel } from '@prisma/client';
import { ParentChildLinkService } from './parent-child-link.service';
import { AuthorizationService } from '../role-scope/authorization.service';

const mockPrisma = {
  volunteer: {
    findFirst: jest.fn(),
  },
  childScout: {
    findFirst: jest.fn(),
  },
  parentChildLink: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

jest.mock('../../utils/prisma', () => ({
  __esModule: true,
  get default() {
    return mockPrisma;
  },
}));

describe('ParentChildLinkService', () => {
  let service: ParentChildLinkService;
  let authorizationService: jest.Mocked<AuthorizationService>;

  beforeEach(() => {
    jest.resetAllMocks();

    authorizationService = {
      getUserRoleAssignments: jest.fn(),
      hasPackScope: jest.fn(),
      canAccessChild: jest.fn(),
    } as unknown as jest.Mocked<AuthorizationService>;

    service = new ParentChildLinkService(authorizationService);
  });

  describe('requestLink', () => {
    it('throws NotFoundException when child scout does not exist', async () => {
      mockPrisma.childScout.findFirst.mockResolvedValue(null);

      await expect(
        service.requestLink('parent-1', { childScoutId: 'missing-child' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ConflictException when link is already approved', async () => {
      mockPrisma.childScout.findFirst.mockResolvedValue({ id: 'child-1' });
      mockPrisma.parentChildLink.findFirst
        .mockResolvedValueOnce({ id: 'approved-1', status: LinkStatus.APPROVED })
        .mockResolvedValueOnce(null);

      await expect(
        service.requestLink('parent-1', { childScoutId: 'child-1' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('returns existing pending request instead of creating duplicate', async () => {
      const requestedAt = new Date('2026-05-24T10:00:00.000Z');

      mockPrisma.childScout.findFirst.mockResolvedValue({ id: 'child-1' });
      mockPrisma.parentChildLink.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'pending-1',
          parentId: 'parent-1',
          childScoutId: 'child-1',
          status: LinkStatus.PENDING,
          relationshipType: 'guardian',
          requestedAt,
        });

      const result = await service.requestLink('parent-1', {
        childScoutId: 'child-1',
        relationshipType: 'guardian',
      });

      expect(mockPrisma.parentChildLink.create).not.toHaveBeenCalled();
      expect(result).toEqual({
        id: 'pending-1',
        parentId: 'parent-1',
        childScoutId: 'child-1',
        status: LinkStatus.PENDING,
        relationshipType: 'guardian',
        requestedAt: requestedAt.toISOString(),
      });
    });

    it('creates a new pending link when no duplicate exists', async () => {
      const requestedAt = new Date('2026-05-24T10:00:00.000Z');

      mockPrisma.childScout.findFirst.mockResolvedValue({ id: 'child-1' });
      mockPrisma.parentChildLink.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockPrisma.parentChildLink.create.mockResolvedValue({
        id: 'link-1',
        parentId: 'parent-1',
        childScoutId: 'child-1',
        status: LinkStatus.PENDING,
        relationshipType: 'mother',
        requestedAt,
      });

      const result = await service.requestLink('parent-1', {
        childScoutId: 'child-1',
        relationshipType: 'mother',
      });

      expect(mockPrisma.parentChildLink.create).toHaveBeenCalledWith({
        data: {
          parentId: 'parent-1',
          childScoutId: 'child-1',
          relationshipType: 'mother',
          status: LinkStatus.PENDING,
          requestedBy: 'parent-1',
        },
      });
      expect(result.id).toBe('link-1');
    });
  });

  describe('getPendingLinks', () => {
    it('throws ForbiddenException for effective parent tier', async () => {
      mockPrisma.volunteer.findFirst.mockResolvedValue({ authTier: AuthTier.PARENT });
      authorizationService.getUserRoleAssignments.mockResolvedValue([]);

      await expect(service.getPendingLinks('user-1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('filters leader results by child access when not pack-scoped', async () => {
      const requestedAt = new Date('2026-05-24T11:00:00.000Z');

      mockPrisma.volunteer.findFirst.mockResolvedValue({ authTier: AuthTier.LEADER });
      authorizationService.getUserRoleAssignments.mockResolvedValue([]);
      authorizationService.hasPackScope.mockResolvedValue(false);
      authorizationService.canAccessChild
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      mockPrisma.parentChildLink.findMany.mockResolvedValue([
        {
          id: 'link-1',
          childScoutId: 'child-1',
          requestedAt,
          relationshipType: 'guardian',
          parent: { id: 'p-1', name: 'Parent One', email: 'p1@test.com' },
          childScout: {
            id: 'child-1',
            firstName: 'A',
            lastName: 'Scout',
            currentRank: RankLevel.WOLF,
            denMemberships: [{ den: { id: 'den-1', name: 'Den 1' } }],
          },
        },
        {
          id: 'link-2',
          childScoutId: 'child-2',
          requestedAt,
          relationshipType: 'father',
          parent: { id: 'p-2', name: 'Parent Two', email: 'p2@test.com' },
          childScout: {
            id: 'child-2',
            firstName: 'B',
            lastName: 'Scout',
            currentRank: RankLevel.BEAR,
            denMemberships: [{ den: { id: 'den-2', name: 'Den 2' } }],
          },
        },
      ]);

      const result = await service.getPendingLinks('user-1');

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('link-1');
      expect(authorizationService.canAccessChild).toHaveBeenNthCalledWith(
        1,
        'user-1',
        'child-1',
        'LEADER',
      );
      expect(authorizationService.canAccessChild).toHaveBeenNthCalledWith(
        2,
        'user-1',
        'child-2',
        'LEADER',
      );
    });
  });

  describe('approveLink and rejectLink', () => {
    it('approves a pending link and returns mapped response', async () => {
      const processedAt = new Date('2026-05-24T12:00:00.000Z');

      mockPrisma.parentChildLink.findUnique.mockResolvedValue({
        id: 'link-1',
        childScoutId: 'child-1',
        status: LinkStatus.PENDING,
        childScout: { id: 'child-1', deletedAt: null },
      });
      mockPrisma.volunteer.findFirst.mockResolvedValue({ authTier: AuthTier.ADMIN });
      authorizationService.getUserRoleAssignments.mockResolvedValue([]);
      mockPrisma.parentChildLink.update.mockResolvedValue({
        id: 'link-1',
        status: LinkStatus.APPROVED,
        rejectionReason: null,
        processedAt,
        processedBy: 'admin-1',
      });

      const result = await service.approveLink('link-1', 'admin-1');

      expect(result).toEqual({
        id: 'link-1',
        status: LinkStatus.APPROVED,
        rejectionReason: undefined,
        processedAt: processedAt.toISOString(),
        processedBy: 'admin-1',
      });
      expect(authorizationService.canAccessChild).not.toHaveBeenCalled();
    });

    it('rejects pending link for leader with access and keeps reason', async () => {
      const processedAt = new Date('2026-05-24T12:30:00.000Z');

      mockPrisma.parentChildLink.findUnique.mockResolvedValue({
        id: 'link-2',
        childScoutId: 'child-2',
        status: LinkStatus.PENDING,
        childScout: { id: 'child-2', deletedAt: null },
      });
      mockPrisma.volunteer.findFirst.mockResolvedValue({ authTier: AuthTier.LEADER });
      authorizationService.getUserRoleAssignments.mockResolvedValue([]);
      authorizationService.canAccessChild.mockResolvedValue(true);
      mockPrisma.parentChildLink.update.mockResolvedValue({
        id: 'link-2',
        status: LinkStatus.REJECTED,
        rejectionReason: 'Unable to verify relationship',
        processedAt,
        processedBy: 'leader-1',
      });

      const result = await service.rejectLink(
        'link-2',
        'leader-1',
        'Unable to verify relationship',
      );

      expect(authorizationService.canAccessChild).toHaveBeenCalledWith(
        'leader-1',
        'child-2',
        'LEADER',
      );
      expect(result.status).toBe(LinkStatus.REJECTED);
      expect(result.rejectionReason).toBe('Unable to verify relationship');
    });

    it('throws ConflictException when link already processed', async () => {
      mockPrisma.parentChildLink.findUnique.mockResolvedValue({
        id: 'link-3',
        childScoutId: 'child-3',
        status: LinkStatus.APPROVED,
        childScout: { id: 'child-3', deletedAt: null },
      });

      await expect(service.approveLink('link-3', 'admin-1')).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });
});
