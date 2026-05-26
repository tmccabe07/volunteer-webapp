/**
 * Unit tests for AuthorizationService
 * 
 * Tests role-scoped access control logic per research.md patterns
 */

import { Test, TestingModule } from '@nestjs/testing';
import { AuthorizationService } from './authorization.service';
import { PrismaClient, RankLevel } from '@prisma/client';

describe('AuthorizationService', () => {
  let service: AuthorizationService;
  let prisma: PrismaClient;

  // Mock data
  const mockUserId = 'user-123';
  const mockChildId = 'child-456';
  const mockDenNumber = 1;
  const mockRankLevel: RankLevel = 'WOLF';

  beforeEach(async () => {
    // Create Prisma mock
    prisma = {
      volunteerToRole: {
        findMany: jest.fn()
      },
      parentChildLink: {
        findFirst: jest.fn()
      },
      childScout: {
        findUnique: jest.fn()
      },
      den: {
        findFirst: jest.fn()
      }
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthorizationService,
        {
          provide: PrismaClient,
          useValue: prisma
        }
      ]
    }).compile();

    service = module.get<AuthorizationService>(AuthorizationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserRoleAssignments', () => {
    it('should return active role assignments', async () => {
      const mockAssignments = [
        {
          roleId: 'role-1',
          volunteerId: mockUserId,
          denNumber: 1,
          denId: 'den-1',
          removedAt: null,
          role: {
            roleType: 'DEN_LEADER',
            scopeType: 'DEN',
            rankLevel: 'WOLF'
          },
          den: {
            id: 'den-1',
            denNumber: 1
          }
        }
      ];

      (prisma.volunteerToRole.findMany as jest.Mock).mockResolvedValue(mockAssignments);

      const result = await service.getUserRoleAssignments(mockUserId);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        roleId: 'role-1',
        roleName: 'DEN_LEADER',
        scopeType: 'DEN',
        rankLevel: 'WOLF',
        denNumber: 1,
        denId: 'den-1'
      });
    });

    it('should exclude removed role assignments', async () => {
      (prisma.volunteerToRole.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getUserRoleAssignments(mockUserId);

      expect(result).toHaveLength(0);
      expect(prisma.volunteerToRole.findMany).toHaveBeenCalledWith({
        where: {
          volunteerId: mockUserId,
          removedAt: null
        },
        include: {
          role: true,
          den: true
        }
      });
    });
  });

  describe('hasPackScope', () => {
    it('should return true when user has PACK scope', async () => {
      (prisma.volunteerToRole.findMany as jest.Mock).mockResolvedValue([
        {
          roleId: 'role-1',
          role: { scopeType: 'PACK', roleType: 'COMMITTEE_CHAIR' },
          den: null
        }
      ]);

      const result = await service.hasPackScope(mockUserId);

      expect(result).toBe(true);
    });

    it('should return false when user has no PACK scope', async () => {
      (prisma.volunteerToRole.findMany as jest.Mock).mockResolvedValue([
        {
          roleId: 'role-1',
          role: { scopeType: 'DEN', roleType: 'DEN_LEADER' },
          den: null
        }
      ]);

      const result = await service.hasPackScope(mockUserId);

      expect(result).toBe(false);
    });
  });

  describe('hasRankScope', () => {
    it('should return true when user has RANK scope for specified rank', async () => {
      (prisma.volunteerToRole.findMany as jest.Mock).mockResolvedValue([
        {
          roleId: 'role-1',
          role: { scopeType: 'RANK', rankLevel: 'WOLF', roleType: 'DEN_LEADER' },
          den: null
        }
      ]);

      const result = await service.hasRankScope(mockUserId, 'WOLF');

      expect(result).toBe(true);
    });

    it('should return false when user has RANK scope for different rank', async () => {
      (prisma.volunteerToRole.findMany as jest.Mock).mockResolvedValue([
        {
          roleId: 'role-1',
          role: { scopeType: 'RANK', rankLevel: 'BEAR', roleType: 'DEN_LEADER' },
          den: null
        }
      ]);

      const result = await service.hasRankScope(mockUserId, 'WOLF');

      expect(result).toBe(false);
    });
  });

  describe('hasDenScope', () => {
    it('should return true when user has DEN scope for specified den', async () => {
      (prisma.volunteerToRole.findMany as jest.Mock).mockResolvedValue([
        {
          roleId: 'role-1',
          denNumber: 1,
          role: { scopeType: 'DEN', roleType: 'DEN_LEADER' },
          den: null
        }
      ]);

      const result = await service.hasDenScope(mockUserId, 1);

      expect(result).toBe(true);
    });

    it('should return false when user has DEN scope for different den', async () => {
      (prisma.volunteerToRole.findMany as jest.Mock).mockResolvedValue([
        {
          roleId: 'role-1',
          denNumber: 2,
          role: { scopeType: 'DEN', roleType: 'DEN_LEADER' },
          den: null
        }
      ]);

      const result = await service.hasDenScope(mockUserId, 1);

      expect(result).toBe(false);
    });
  });

  describe('canAccessChild', () => {
    it('should return true for ADMIN tier', async () => {
      const result = await service.canAccessChild(mockUserId, mockChildId, 'ADMIN');

      expect(result).toBe(true);
      expect(prisma.volunteerToRole.findMany).not.toHaveBeenCalled();
    });

    it('should return true for PARENT with approved link', async () => {
      (prisma.parentChildLink.findFirst as jest.Mock).mockResolvedValue({
        parentId: mockUserId,
        childId: mockChildId,
        status: 'APPROVED'
      });

      const result = await service.canAccessChild(mockUserId, mockChildId, 'PARENT');

      expect(result).toBe(true);
      expect(prisma.parentChildLink.findFirst).toHaveBeenCalledWith({
        where: {
          parentId: mockUserId,
          childId: mockChildId,
          status: 'APPROVED'
        }
      });
    });

    it('should return false for PARENT without approved link', async () => {
      (prisma.parentChildLink.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.canAccessChild(mockUserId, mockChildId, 'PARENT');

      expect(result).toBe(false);
    });

    it('should return true for LEADER with PACK scope', async () => {
      (prisma.volunteerToRole.findMany as jest.Mock).mockResolvedValue([
        {
          roleId: 'role-1',
          role: { scopeType: 'PACK', roleType: 'COMMITTEE_CHAIR' },
          den: null
        }
      ]);

      const result = await service.canAccessChild(mockUserId, mockChildId, 'LEADER');

      expect(result).toBe(true);
    });

    it('should return true for LEADER with RANK scope matching child\'s den', async () => {
      (prisma.volunteerToRole.findMany as jest.Mock).mockResolvedValue([
        {
          roleId: 'role-1',
          role: { scopeType: 'RANK', rankLevel: 'WOLF', roleType: 'DEN_LEADER' },
          den: null
        }
      ]);

      (prisma.childScout.findUnique as jest.Mock).mockResolvedValue({
        id: mockChildId,
        denMemberships: [
          {
            denNumber: 1,
            validTo: null,
            den: { rankLevel: 'WOLF' }
          }
        ]
      });

      const result = await service.canAccessChild(mockUserId, mockChildId, 'LEADER');

      expect(result).toBe(true);
    });

    it('should return true for LEADER with DEN scope matching child\'s den', async () => {
      (prisma.volunteerToRole.findMany as jest.Mock).mockResolvedValue([
        {
          roleId: 'role-1',
          denNumber: 1,
          role: { scopeType: 'DEN', roleType: 'DEN_LEADER' },
          den: null
        }
      ]);

      (prisma.childScout.findUnique as jest.Mock).mockResolvedValue({
        id: mockChildId,
        denMemberships: [
          {
            denNumber: 1,
            validTo: null,
            den: { rankLevel: 'WOLF' }
          }
        ]
      });

      const result = await service.canAccessChild(mockUserId, mockChildId, 'LEADER');

      expect(result).toBe(true);
    });

    it('should return false for LEADER with no matching scope', async () => {
      (prisma.volunteerToRole.findMany as jest.Mock).mockResolvedValue([
        {
          roleId: 'role-1',
          denNumber: 2,
          role: { scopeType: 'DEN', roleType: 'DEN_LEADER' },
          den: null
        }
      ]);

      (prisma.childScout.findUnique as jest.Mock).mockResolvedValue({
        id: mockChildId,
        denMemberships: [
          {
            denNumber: 1,
            validTo: null,
            den: { rankLevel: 'WOLF' }
          }
        ]
      });

      const result = await service.canAccessChild(mockUserId, mockChildId, 'LEADER');

      expect(result).toBe(false);
    });
  });

  describe('canAccessDen', () => {
    it('should return true with PACK scope', async () => {
      (prisma.volunteerToRole.findMany as jest.Mock).mockResolvedValue([
        {
          roleId: 'role-1',
          role: { scopeType: 'PACK', roleType: 'COMMITTEE_CHAIR' },
          den: null
        }
      ]);

      const result = await service.canAccessDen(mockUserId, mockDenNumber);

      expect(result).toBe(true);
    });

    it('should return true with RANK scope matching den rank', async () => {
      (prisma.volunteerToRole.findMany as jest.Mock).mockResolvedValue([
        {
          roleId: 'role-1',
          role: { scopeType: 'RANK', rankLevel: 'WOLF', roleType: 'DEN_LEADER' },
          den: null
        }
      ]);

      (prisma.den.findFirst as jest.Mock).mockResolvedValue({
        denNumber: mockDenNumber,
        rankLevel: 'WOLF'
      });

      const result = await service.canAccessDen(mockUserId, mockDenNumber);

      expect(result).toBe(true);
    });

    it('should return true with DEN scope matching den number', async () => {
      (prisma.volunteerToRole.findMany as jest.Mock).mockResolvedValue([
        {
          roleId: 'role-1',
          denNumber: mockDenNumber,
          role: { scopeType: 'DEN', roleType: 'DEN_LEADER' },
          den: null
        }
      ]);

      (prisma.den.findFirst as jest.Mock).mockResolvedValue({
        denNumber: mockDenNumber,
        rankLevel: 'WOLF'
      });

      const result = await service.canAccessDen(mockUserId, mockDenNumber);

      expect(result).toBe(true);
    });

    it('should return false with no matching scope', async () => {
      (prisma.volunteerToRole.findMany as jest.Mock).mockResolvedValue([
        {
          roleId: 'role-1',
          denNumber: 2,
          role: { scopeType: 'DEN', roleType: 'DEN_LEADER' },
          den: null
        }
      ]);

      (prisma.den.findFirst as jest.Mock).mockResolvedValue({
        denNumber: mockDenNumber,
        rankLevel: 'WOLF'
      });

      const result = await service.canAccessDen(mockUserId, mockDenNumber);

      expect(result).toBe(false);
    });
  });

  describe('canAccessRank', () => {
    it('should return true with PACK scope', async () => {
      (prisma.volunteerToRole.findMany as jest.Mock).mockResolvedValue([
        {
          roleId: 'role-1',
          role: { scopeType: 'PACK', roleType: 'COMMITTEE_CHAIR' },
          den: null
        }
      ]);

      const result = await service.canAccessRank(mockUserId, mockRankLevel);

      expect(result).toBe(true);
    });

    it('should return true with RANK scope matching rank level', async () => {
      (prisma.volunteerToRole.findMany as jest.Mock).mockResolvedValue([
        {
          roleId: 'role-1',
          role: { scopeType: 'RANK', rankLevel: 'WOLF', roleType: 'DEN_LEADER' },
          den: null
        }
      ]);

      const result = await service.canAccessRank(mockUserId, mockRankLevel);

      expect(result).toBe(true);
    });

    it('should return false with no matching scope', async () => {
      (prisma.volunteerToRole.findMany as jest.Mock).mockResolvedValue([
        {
          roleId: 'role-1',
          role: { scopeType: 'RANK', rankLevel: 'BEAR', roleType: 'DEN_LEADER' },
          den: null
        }
      ]);

      const result = await service.canAccessRank(mockUserId, mockRankLevel);

      expect(result).toBe(false);
    });
  });

  describe('validateChildAccess', () => {
    it('should not throw for authorized access', async () => {
      (prisma.parentChildLink.findFirst as jest.Mock).mockResolvedValue({
        parentId: mockUserId,
        childId: mockChildId,
        status: 'APPROVED'
      });

      await expect(
        service.validateChildAccess(mockUserId, mockChildId, 'PARENT')
      ).resolves.not.toThrow();
    });

    it('should throw ForbiddenException for unauthorized access', async () => {
      (prisma.parentChildLink.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.validateChildAccess(mockUserId, mockChildId, 'PARENT')
      ).rejects.toThrow('Access denied: No permission to access this child');
    });
  });

  describe('validateDenAccess', () => {
    it('should not throw for authorized access', async () => {
      (prisma.volunteerToRole.findMany as jest.Mock).mockResolvedValue([
        {
          roleId: 'role-1',
          denNumber: mockDenNumber,
          role: { scopeType: 'DEN', roleType: 'DEN_LEADER' },
          den: null
        }
      ]);

      (prisma.den.findFirst as jest.Mock).mockResolvedValue({
        denNumber: mockDenNumber,
        rankLevel: 'WOLF'
      });

      await expect(
        service.validateDenAccess(mockUserId, mockDenNumber)
      ).resolves.not.toThrow();
    });

    it('should throw ForbiddenException for unauthorized access', async () => {
      (prisma.volunteerToRole.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.den.findFirst as jest.Mock).mockResolvedValue({
        denNumber: mockDenNumber,
        rankLevel: 'WOLF'
      });

      await expect(
        service.validateDenAccess(mockUserId, mockDenNumber)
      ).rejects.toThrow('Access denied: No permission to access this den');
    });
  });

  describe('validateRankAccess', () => {
    it('should not throw for authorized access', async () => {
      (prisma.volunteerToRole.findMany as jest.Mock).mockResolvedValue([
        {
          roleId: 'role-1',
          role: { scopeType: 'RANK', rankLevel: 'WOLF', roleType: 'DEN_LEADER' },
          den: null
        }
      ]);

      await expect(
        service.validateRankAccess(mockUserId, mockRankLevel)
      ).resolves.not.toThrow();
    });

    it('should throw ForbiddenException for unauthorized access', async () => {
      (prisma.volunteerToRole.findMany as jest.Mock).mockResolvedValue([]);

      await expect(
        service.validateRankAccess(mockUserId, mockRankLevel)
      ).rejects.toThrow('Access denied: No permission to access this rank');
    });
  });
});
