import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from '@/lib/axios';
import {
  VolunteerApiService,
  type VolunteerProfile,
  type VolunteerDetail,
  type ListVolunteersResponse,
  type RoleAssignment,
  type AvailableRole,
} from './volunteer.service';

vi.mock('@/lib/axios');

const mockAxios = axios as unknown as {
  get: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

describe('VolunteerApiService', () => {
  let service: VolunteerApiService;

  beforeEach(() => {
    service = new VolunteerApiService();
    vi.clearAllMocks();
  });

  describe('getMyProfile', () => {
    it('should fetch current volunteer profile with all relations', async () => {
      const mockProfile: VolunteerProfile = {
        id: '1',
        email: 'user@test.com',
        name: 'Test User',
        phone: '555-1234',
        authTier: 'LEADER',
        leaderboardOptIn: true,
        roles: [
          {
            id: 'assign-1',
            roleId: 'role-1',
            roleName: 'Den Leader',
            roleType: 'DEN_LEADER',
            specialty: null,
            rankLevel: 'WOLF',
            denId: 'den-1',
            denName: 'Wolf Den 1',
            denNumber: 8,
            denRankLevel: 'WOLF',
            assignedAt: '2024-01-15T10:00:00Z',
          },
        ],
        childrenRanks: [
          {
            id: 'child-1',
            rankLevel: 'WOLF',
          },
        ],
        pointBalance: {
          totalPoints: 150,
          currentYearPoints: 50,
          badgeTier: 'Bronze',
          rank: 5,
        },
        createdAt: '2024-01-01T00:00:00Z',
      };

      mockAxios.get.mockResolvedValue({ data: mockProfile });

      const result = await service.getMyProfile();

      expect(mockAxios.get).toHaveBeenCalledWith('/volunteers/me/profile');
      expect(result).toEqual(mockProfile);
    });

    it('should handle profile not found', async () => {
      mockAxios.get.mockRejectedValue({
        response: {
          status: 404,
          data: { message: 'Profile not found' },
        },
      });

      await expect(service.getMyProfile()).rejects.toMatchObject({
        response: { status: 404 },
      });
    });
  });

  describe('updateMyProfile', () => {
    it('should update all profile fields', async () => {
      const updateData = {
        name: 'Updated Name',
        phone: '555-5678',
        leaderboardOptIn: false,
        childrenRanks: ['BEAR', 'TIGER'],
      };

      const mockResponse = { ...updateData };

      mockAxios.put.mockResolvedValue({ data: mockResponse });

      const result = await service.updateMyProfile(updateData);

      expect(mockAxios.put).toHaveBeenCalledWith('/volunteers/me/profile', updateData);
      expect(result).toEqual(mockResponse);
    });

    it('should update only name', async () => {
      const updateData = { name: 'New Name' };

      mockAxios.put.mockResolvedValue({ data: updateData });

      const result = await service.updateMyProfile(updateData);

      expect(result).toEqual(updateData);
    });

    it('should clear phone number', async () => {
      const updateData = { phone: null };

      mockAxios.put.mockResolvedValue({ data: { phone: null } });

      const result = await service.updateMyProfile(updateData);

      expect(result.phone).toBeNull();
    });

    it('should handle validation errors', async () => {
      mockAxios.put.mockRejectedValue({
        response: {
          status: 400,
          data: { message: 'Name is required' },
        },
      });

      await expect(
        service.updateMyProfile({ name: '' })
      ).rejects.toMatchObject({
        response: { status: 400 },
      });
    });
  });

  describe('assignRole', () => {
    it('should assign a role successfully', async () => {
      const mockAssignment: RoleAssignment = {
        assignments: [
          {
            id: 'assign-1',
            roleId: 'role-1',
            roleName: 'Den Leader',
            denId: 'den-1',
            denNumber: 8,
            assignedAt: '2024-01-15T10:00:00Z',
          },
        ],
        tierUpgraded: true,
      };

      mockAxios.post.mockResolvedValue({ data: mockAssignment });

      const result = await service.assignRole({ roleId: 'role-1', denIds: ['den-1'] });

      expect(mockAxios.post).toHaveBeenCalledWith('/volunteers/me/roles', {
        roleId: 'role-1',
        denIds: ['den-1'],
      });
      expect(result).toEqual(mockAssignment);
    });

    it('should handle role already assigned', async () => {
      mockAxios.post.mockRejectedValue({
        response: {
          status: 409,
          data: { message: 'Role already assigned' },
        },
      });

      await expect(service.assignRole({ roleId: 'role-1' })).rejects.toMatchObject({
        response: { status: 409 },
      });
    });

    it('should handle invalid role ID', async () => {
      mockAxios.post.mockRejectedValue({
        response: {
          status: 404,
          data: { message: 'Role not found' },
        },
      });

      await expect(service.assignRole({ roleId: 'invalid-role' })).rejects.toMatchObject({
        response: { status: 404 },
      });
    });
  });

  describe('getAssignableDens', () => {
    it('should fetch assignable dens with rank filter', async () => {
      const mockDens = [
        {
          id: 'den-1',
          name: 'Wolf Den 1',
          denNumber: 8,
          rankLevel: 'WOLF',
        },
      ];

      mockAxios.get.mockResolvedValue({ data: mockDens });

      const result = await service.getAssignableDens({ rankLevel: 'WOLF' });

      expect(mockAxios.get).toHaveBeenCalledWith('/volunteers/roles/assignable-dens', {
        params: { rankLevel: 'WOLF' },
      });
      expect(result).toEqual(mockDens);
    });
  });

  describe('removeRole', () => {
    it('should remove a role assignment', async () => {
      mockAxios.delete.mockResolvedValue({});

      await service.removeRole('assign-1');

      expect(mockAxios.delete).toHaveBeenCalledWith('/volunteers/me/roles/assign-1');
    });

    it('should handle assignment not found', async () => {
      mockAxios.delete.mockRejectedValue({
        response: {
          status: 404,
          data: { message: 'Assignment not found' },
        },
      });

      await expect(service.removeRole('invalid-id')).rejects.toMatchObject({
        response: { status: 404 },
      });
    });
  });

  describe('getAvailableRoles', () => {
    it('should fetch all available roles', async () => {
      const mockRoles: AvailableRole[] = [
        {
          id: 'role-1',
          name: 'Den Leader',
          description: 'Leads a den',
          roleType: 'DEN_LEADER',
          specialty: null,
          rankLevel: 'WOLF',
          grantsTier: 'LEADER',
        },
        {
          id: 'role-2',
          name: 'Committee Chair',
          description: 'Chairs committee',
          roleType: 'COMMITTEE_CHAIR',
          specialty: 'ADVANCEMENT',
          rankLevel: null,
          grantsTier: 'ADMIN',
        },
      ];

      mockAxios.get.mockResolvedValue({ data: mockRoles });

      const result = await service.getAvailableRoles();

      expect(mockAxios.get).toHaveBeenCalledWith('/volunteers/roles/available');
      expect(result).toEqual(mockRoles);
    });

    it('should return empty array when no roles available', async () => {
      mockAxios.get.mockResolvedValue({ data: [] });

      const result = await service.getAvailableRoles();

      expect(result).toEqual([]);
    });
  });

  describe('listVolunteers', () => {
    it('should list all volunteers with default pagination', async () => {
      const mockResponse: ListVolunteersResponse = {
        volunteers: [
          {
            id: '1',
            email: 'user1@test.com',
            name: 'User One',
            authTier: 'LEADER',
            roles: [{ roleName: 'Den Leader' }],
            pointBalance: {
              totalPoints: 150,
              currentYearPoints: 50,
            },
            createdAt: '2024-01-01T00:00:00Z',
          },
          {
            id: '2',
            email: 'user2@test.com',
            name: 'User Two',
            authTier: 'PARENT',
            roles: [],
            pointBalance: {
              totalPoints: 25,
              currentYearPoints: 10,
            },
            createdAt: '2024-02-01T00:00:00Z',
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1,
        },
      };

      mockAxios.get.mockResolvedValue({ data: mockResponse });

      const result = await service.listVolunteers();

      expect(mockAxios.get).toHaveBeenCalledWith('/volunteers', { params: undefined });
      expect(result).toEqual(mockResponse);
    });

    it('should list volunteers with filters', async () => {
      const mockResponse: ListVolunteersResponse = {
        volunteers: [],
        pagination: {
          page: 2,
          limit: 10,
          total: 25,
          totalPages: 3,
        },
      };

      mockAxios.get.mockResolvedValue({ data: mockResponse });

      await service.listVolunteers({
        page: 2,
        limit: 10,
        search: 'John',
        tier: 'LEADER',
        roleId: 'role-1',
      });

      expect(mockAxios.get).toHaveBeenCalledWith('/volunteers', {
        params: {
          page: 2,
          limit: 10,
          search: 'John',
          tier: 'LEADER',
          roleId: 'role-1',
        },
      });
    });

    it('should handle unauthorized access (Tier 1)', async () => {
      mockAxios.get.mockRejectedValue({
        response: {
          status: 403,
          data: { message: 'Insufficient permissions' },
        },
      });

      await expect(service.listVolunteers()).rejects.toMatchObject({
        response: { status: 403 },
      });
    });
  });

  describe('getVolunteerById', () => {
    it('should fetch volunteer details with point history', async () => {
      const mockDetail: VolunteerDetail = {
        id: '1',
        email: 'user@test.com',
        name: 'Test User',
        phone: '555-1234',
        authTier: 'LEADER',
        leaderboardOptIn: true,
        roles: [
          {
            id: 'assign-1',
            roleId: 'role-1',
            roleName: 'Den Leader',
            roleType: 'DEN_LEADER',
            specialty: null,
            rankLevel: 'WOLF',
            assignedAt: '2024-01-15T10:00:00Z',
          },
        ],
        childrenRanks: [{ id: 'child-1', rankLevel: 'WOLF' }],
        pointBalance: {
          totalPoints: 150,
          currentYearPoints: 50,
          badgeTier: 'Bronze',
          rank: 5,
        },
        createdAt: '2024-01-01T00:00:00Z',
        pointHistory: [
          {
            id: 'event-1',
            points: 25,
            eventType: 'EVENT_PARTICIPATION',
            reason: 'Pack Meeting',
            createdAt: '2024-03-01T10:00:00Z',
            activityType: {
              name: 'Pack Meeting',
            },
          },
          {
            id: 'event-2',
            points: 50,
            eventType: 'ROLE_ASSIGNMENT',
            reason: null,
            createdAt: '2024-01-15T10:00:00Z',
            activityType: null,
          },
        ],
      };

      mockAxios.get.mockResolvedValue({ data: mockDetail });

      const result = await service.getVolunteerById('1');

      expect(mockAxios.get).toHaveBeenCalledWith('/volunteers/1');
      expect(result).toEqual(mockDetail);
    });

    it('should handle volunteer not found', async () => {
      mockAxios.get.mockRejectedValue({
        response: {
          status: 404,
          data: { message: 'Volunteer not found' },
        },
      });

      await expect(service.getVolunteerById('999')).rejects.toMatchObject({
        response: { status: 404 },
      });
    });

    it('should handle unauthorized access to other volunteer', async () => {
      mockAxios.get.mockRejectedValue({
        response: {
          status: 403,
          data: { message: 'Cannot view other volunteers without Tier 2+' },
        },
      });

      await expect(service.getVolunteerById('2')).rejects.toMatchObject({
        response: { status: 403 },
      });
    });
  });
});
