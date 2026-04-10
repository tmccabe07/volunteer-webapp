import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from '@/lib/axios';
import configService, {
  type ActivityType,
  type CreateActivityTypeData,
  type UpdateActivityTypeData,
  type PackConfig,
  type UpdatePackConfigData,
  type VolunteerRole,
  type CreateVolunteerRoleData,
  type UpdateVolunteerRoleData,
} from './config.service';

vi.mock('@/lib/axios');

const mockAxios = axios as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

describe('configService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getActivityTypes', () => {
    it('should fetch all active activity types', async () => {
      const mockActivityTypes: ActivityType[] = [
        {
          id: '1',
          name: 'Pack Meeting',
          pointValue: 25,
          category: 'MEDIUM',
          description: 'Monthly pack meeting',
        },
        {
          id: '2',
          name: 'Den Meeting',
          pointValue: 15,
          category: 'LOW',
          description: 'Weekly den meeting',
        },
        {
          id: '3',
          name: 'Special Event',
          pointValue: 50,
          category: 'SPECIAL',
          description: null,
        },
      ];

      mockAxios.get.mockResolvedValue({ data: mockActivityTypes });

      const result = await configService.getActivityTypes();

      expect(mockAxios.get).toHaveBeenCalledWith('/pack-config/activity-types');
      expect(result).toEqual(mockActivityTypes);
      expect(result).toHaveLength(3);
    });

    it('should handle empty activity types list', async () => {
      mockAxios.get.mockResolvedValue({ data: [] });

      const result = await configService.getActivityTypes();

      expect(result).toEqual([]);
    });

    it('should handle network errors', async () => {
      mockAxios.get.mockRejectedValue({
        message: 'Network Error',
      });

      await expect(configService.getActivityTypes()).rejects.toMatchObject({
        message: 'Network Error',
      });
    });
  });

  describe('createActivityType', () => {
    it('should create activity type with all fields', async () => {
      const createData: CreateActivityTypeData = {
        name: 'Campout',
        pointValue: 75,
        category: 'HIGH',
        description: 'Overnight camping event',
      };

      const mockResponse: ActivityType = {
        id: '4',
        ...createData,
      };

      mockAxios.post.mockResolvedValue({ data: mockResponse });

      const result = await configService.createActivityType(createData);

      expect(mockAxios.post).toHaveBeenCalledWith('/pack-config/activity-types', createData);
      expect(result).toEqual(mockResponse);
    });

    it('should create activity type without description', async () => {
      const createData: CreateActivityTypeData = {
        name: 'Quick Task',
        pointValue: 10,
        category: 'LOW',
      };

      const mockResponse: ActivityType = {
        id: '5',
        ...createData,
        description: null,
      };

      mockAxios.post.mockResolvedValue({ data: mockResponse });

      const result = await configService.createActivityType(createData);

      expect(result.description).toBeNull();
    });

    it('should handle validation errors', async () => {
      const createData: CreateActivityTypeData = {
        name: '',
        pointValue: -5,
        category: 'LOW',
      };

      mockAxios.post.mockRejectedValue({
        response: {
          status: 400,
          data: {
            message: 'Validation failed',
            errors: ['Name is required', 'Point value must be positive'],
          },
        },
      });

      await expect(configService.createActivityType(createData)).rejects.toMatchObject({
        response: { status: 400 },
      });
    });

    it('should handle unauthorized access (non-admin)', async () => {
      const createData: CreateActivityTypeData = {
        name: 'New Activity',
        pointValue: 20,
        category: 'MEDIUM',
      };

      mockAxios.post.mockRejectedValue({
        response: {
          status: 403,
          data: { message: 'Requires Tier 3 (ADMIN)' },
        },
      });

      await expect(configService.createActivityType(createData)).rejects.toMatchObject({
        response: { status: 403 },
      });
    });

    it('should handle duplicate activity type name', async () => {
      const createData: CreateActivityTypeData = {
        name: 'Pack Meeting',
        pointValue: 30,
        category: 'MEDIUM',
      };

      mockAxios.post.mockRejectedValue({
        response: {
          status: 409,
          data: { message: 'Activity type with this name already exists' },
        },
      });

      await expect(configService.createActivityType(createData)).rejects.toMatchObject({
        response: { status: 409 },
      });
    });
  });

  describe('updateActivityType', () => {
    it('should update all activity type fields', async () => {
      const updateData: UpdateActivityTypeData = {
        name: 'Updated Pack Meeting',
        pointValue: 30,
        category: 'HIGH',
        description: 'Updated description',
      };

      const mockResponse: ActivityType = {
        id: '1',
        name: 'Updated Pack Meeting',
        pointValue: 30,
        category: 'HIGH',
        description: 'Updated description',
      };

      mockAxios.put.mockResolvedValue({ data: mockResponse });

      const result = await configService.updateActivityType('1', updateData);

      expect(mockAxios.put).toHaveBeenCalledWith('/pack-config/activity-types/1', updateData);
      expect(result).toEqual(mockResponse);
    });

    it('should update only name', async () => {
      const updateData: UpdateActivityTypeData = {
        name: 'New Name',
      };

      const mockResponse: ActivityType = {
        id: '1',
        name: 'New Name',
        pointValue: 25,
        category: 'MEDIUM',
        description: 'Monthly pack meeting',
      };

      mockAxios.put.mockResolvedValue({ data: mockResponse });

      const result = await configService.updateActivityType('1', updateData);

      expect(result.name).toBe('New Name');
      expect(result.pointValue).toBe(25); // unchanged
    });

    it('should update only point value', async () => {
      const updateData: UpdateActivityTypeData = {
        pointValue: 35,
      };

      const mockResponse: ActivityType = {
        id: '1',
        name: 'Pack Meeting',
        pointValue: 35,
        category: 'MEDIUM',
        description: 'Monthly pack meeting',
      };

      mockAxios.put.mockResolvedValue({ data: mockResponse });

      const result = await configService.updateActivityType('1', updateData);

      expect(result.pointValue).toBe(35);
    });

    it('should handle activity type not found', async () => {
      const updateData: UpdateActivityTypeData = {
        name: 'Updated',
      };

      mockAxios.put.mockRejectedValue({
        response: {
          status: 404,
          data: { message: 'Activity type not found' },
        },
      });

      await expect(
        configService.updateActivityType('invalid-id', updateData)
      ).rejects.toMatchObject({
        response: { status: 404 },
      });
    });

    it('should handle unauthorized access (non-admin)', async () => {
      const updateData: UpdateActivityTypeData = {
        pointValue: 40,
      };

      mockAxios.put.mockRejectedValue({
        response: {
          status: 403,
          data: { message: 'Requires Tier 3 (ADMIN)' },
        },
      });

      await expect(
        configService.updateActivityType('1', updateData)
      ).rejects.toMatchObject({
        response: { status: 403 },
      });
    });

    it('should handle validation errors on update', async () => {
      const updateData: UpdateActivityTypeData = {
        pointValue: -10,
      };

      mockAxios.put.mockRejectedValue({
        response: {
          status: 400,
          data: { message: 'Point value must be positive' },
        },
      });

      await expect(
        configService.updateActivityType('1', updateData)
      ).rejects.toMatchObject({
        response: { status: 400 },
      });
    });
  });

  describe('deleteActivityType', () => {
    it('should delete an activity type', async () => {
      mockAxios.delete.mockResolvedValue({});

      await configService.deleteActivityType('1');

      expect(mockAxios.delete).toHaveBeenCalledWith('/pack-config/activity-types/1');
    });

    it('should handle activity type not found on delete', async () => {
      mockAxios.delete.mockRejectedValue({
        response: {
          status: 404,
          data: { message: 'Activity type not found' },
        },
      });

      await expect(configService.deleteActivityType('invalid-id')).rejects.toMatchObject({
        response: { status: 404 },
      });
    });

    it('should handle unauthorized delete (non-admin)', async () => {
      mockAxios.delete.mockRejectedValue({
        response: {
          status: 403,
          data: { message: 'Requires Tier 3 (ADMIN)' },
        },
      });

      await expect(configService.deleteActivityType('1')).rejects.toMatchObject({
        response: { status: 403 },
      });
    });

    it('should handle activity type in use', async () => {
      mockAxios.delete.mockRejectedValue({
        response: {
          status: 409,
          data: {
            message: 'Cannot delete activity type that is referenced by events',
          },
        },
      });

      await expect(configService.deleteActivityType('1')).rejects.toMatchObject({
        response: { status: 409 },
      });
    });
  });

  describe('getPackConfig', () => {
    it('should fetch pack configuration', async () => {
      const mockPackConfig: PackConfig = {
        id: 'config1',
        packName: 'Cub Scout Pack 123',
        packNumber: '123',
        yearStartDate: '2024-09-01T00:00:00Z',
        yearEndDate: '2025-08-31T23:59:59Z',
        activeRanks: ['LION', 'TIGER', 'WOLF', 'BEAR', 'WEBELOS', 'AOL'],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockAxios.get.mockResolvedValue({ data: mockPackConfig });

      const result = await configService.getPackConfig();

      expect(mockAxios.get).toHaveBeenCalledWith('/pack-config');
      expect(result).toEqual(mockPackConfig);
      expect(result.packName).toBe('Cub Scout Pack 123');
    });

    it('should handle missing pack configuration', async () => {
      mockAxios.get.mockRejectedValue({
        response: {
          status: 404,
          data: { message: 'Pack configuration not found' },
        },
      });

      await expect(configService.getPackConfig()).rejects.toMatchObject({
        response: { status: 404 },
      });
    });
  });

  describe('updatePackConfig', () => {
    it('should update pack configuration', async () => {
      const updateData: UpdatePackConfigData = {
        packName: 'Updated Pack Name',
        yearEndDate: '2026-08-31T23:59:59Z',
      };

      const mockResponse: PackConfig = {
        id: 'config1',
        packName: 'Updated Pack Name',
        packNumber: '123',
        yearStartDate: '2024-09-01T00:00:00Z',
        yearEndDate: '2026-08-31T23:59:59Z',
        activeRanks: ['LION', 'TIGER', 'WOLF', 'BEAR', 'WEBELOS', 'AOL'],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-12-01T00:00:00Z',
      };

      mockAxios.put.mockResolvedValue({ data: mockResponse });

      const result = await configService.updatePackConfig(updateData);

      expect(mockAxios.put).toHaveBeenCalledWith('/pack-config', updateData);
      expect(result).toEqual(mockResponse);
      expect(result.packName).toBe('Updated Pack Name');
    });

    it('should handle unauthorized access (non-admin)', async () => {
      const updateData: UpdatePackConfigData = {
        packName: 'New Name',
      };

      mockAxios.put.mockRejectedValue({
        response: {
          status: 403,
          data: { message: 'Requires Tier 3 (ADMIN)' },
        },
      });

      await expect(configService.updatePackConfig(updateData)).rejects.toMatchObject({
        response: { status: 403 },
      });
    });

    it('should handle validation errors', async () => {
      const updateData: UpdatePackConfigData = {
        yearStartDate: '2025-08-31T00:00:00Z',
        yearEndDate: '2024-09-01T00:00:00Z', // End before start
      };

      mockAxios.put.mockRejectedValue({
        response: {
          status: 400,
          data: { message: 'yearStartDate must be before yearEndDate' },
        },
      });

      await expect(configService.updatePackConfig(updateData)).rejects.toMatchObject({
        response: { status: 400 },
      });
    });
  });

  describe('getVolunteerRoles', () => {
    it('should fetch all active volunteer roles', async () => {
      const mockRoles: VolunteerRole[] = [
        {
          id: 'role1',
          name: 'Den Leader - Wolf',
          description: 'Lead Wolf den activities',
          roleType: 'DEN_LEADER',
          specialty: null,
          rankLevel: 'WOLF',
          grantsTier: 'LEADER',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'role2',
          name: 'Committee - Treasurer',
          description: 'Manage pack finances',
          roleType: 'COMMITTEE',
          specialty: 'Treasurer',
          rankLevel: null,
          grantsTier: 'LEADER',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      mockAxios.get.mockResolvedValue({ data: { roles: mockRoles } });

      const result = await configService.getVolunteerRoles();

      expect(mockAxios.get).toHaveBeenCalledWith('/pack-config/volunteer-roles');
      expect(result.roles).toEqual(mockRoles);
      expect(result.roles).toHaveLength(2);
    });

    it('should handle empty roles list', async () => {
      mockAxios.get.mockResolvedValue({ data: { roles: [] } });

      const result = await configService.getVolunteerRoles();

      expect(result.roles).toEqual([]);
    });
  });

  describe('createVolunteerRole', () => {
    it('should create a den leader role with rank level', async () => {
      const createData: CreateVolunteerRoleData = {
        name: 'Den Leader - Bear',
        description: 'Lead Bear den activities',
        roleType: 'DEN_LEADER',
        rankLevel: 'BEAR',
      };

      const mockResponse: VolunteerRole = {
        id: 'role3',
        name: 'Den Leader - Bear',
        description: 'Lead Bear den activities',
        roleType: 'DEN_LEADER',
        specialty: null,
        rankLevel: 'BEAR',
        grantsTier: 'LEADER',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockAxios.post.mockResolvedValue({ data: mockResponse });

      const result = await configService.createVolunteerRole(createData);

      expect(mockAxios.post).toHaveBeenCalledWith('/pack-config/volunteer-roles', createData);
      expect(result).toEqual(mockResponse);
      expect(result.rankLevel).toBe('BEAR');
    });

    it('should create a committee role with specialty', async () => {
      const createData: CreateVolunteerRoleData = {
        name: 'Committee - Secretary',
        roleType: 'COMMITTEE',
        specialty: 'Secretary',
      };

      const mockResponse: VolunteerRole = {
        id: 'role4',
        name: 'Committee - Secretary',
        description: null,
        roleType: 'COMMITTEE',
        specialty: 'Secretary',
        rankLevel: null,
        grantsTier: 'LEADER',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockAxios.post.mockResolvedValue({ data: mockResponse });

      const result = await configService.createVolunteerRole(createData);

      expect(result.specialty).toBe('Secretary');
    });

    it('should handle duplicate role name', async () => {
      const createData: CreateVolunteerRoleData = {
        name: 'Den Leader - Wolf',
        roleType: 'DEN_LEADER',
        rankLevel: 'WOLF',
      };

      mockAxios.post.mockRejectedValue({
        response: {
          status: 409,
          data: { message: 'Role with this name already exists' },
        },
      });

      await expect(configService.createVolunteerRole(createData)).rejects.toMatchObject({
        response: { status: 409 },
      });
    });

    it('should handle validation errors (missing rankLevel for DEN_LEADER)', async () => {
      const createData: CreateVolunteerRoleData = {
        name: 'Den Leader - Invalid',
        roleType: 'DEN_LEADER',
        // Missing rankLevel
      };

      mockAxios.post.mockRejectedValue({
        response: {
          status: 400,
          data: { message: 'DEN_LEADER role type requires rankLevel' },
        },
      });

      await expect(configService.createVolunteerRole(createData)).rejects.toMatchObject({
        response: { status: 400 },
      });
    });

    it('should handle unauthorized access (non-admin)', async () => {
      const createData: CreateVolunteerRoleData = {
        name: 'New Role',
        roleType: 'PARENT_GUARDIAN',
      };

      mockAxios.post.mockRejectedValue({
        response: {
          status: 403,
          data: { message: 'Requires Tier 3 (ADMIN)' },
        },
      });

      await expect(configService.createVolunteerRole(createData)).rejects.toMatchObject({
        response: { status: 403 },
      });
    });
  });

  describe('updateVolunteerRole', () => {
    it('should update role name and description', async () => {
      const updateData: UpdateVolunteerRoleData = {
        name: 'Updated Den Leader - Wolf',
        description: 'Updated description',
      };

      const mockResponse: VolunteerRole = {
        id: 'role1',
        name: 'Updated Den Leader - Wolf',
        description: 'Updated description',
        roleType: 'DEN_LEADER',
        specialty: null,
        rankLevel: 'WOLF',
        grantsTier: 'LEADER',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-12-01T00:00:00Z',
      };

      mockAxios.put.mockResolvedValue({ data: mockResponse });

      const result = await configService.updateVolunteerRole('role1', updateData);

      expect(mockAxios.put).toHaveBeenCalledWith('/pack-config/volunteer-roles/role1', updateData);
      expect(result).toEqual(mockResponse);
    });

    it('should handle role not found', async () => {
      const updateData: UpdateVolunteerRoleData = {
        name: 'Updated Name',
      };

      mockAxios.put.mockRejectedValue({
        response: {
          status: 404,
          data: { message: 'Volunteer role not found' },
        },
      });

      await expect(
        configService.updateVolunteerRole('invalid-id', updateData)
      ).rejects.toMatchObject({
        response: { status: 404 },
      });
    });

    it('should handle unauthorized access (non-admin)', async () => {
      const updateData: UpdateVolunteerRoleData = {
        description: 'New description',
      };

      mockAxios.put.mockRejectedValue({
        response: {
          status: 403,
          data: { message: 'Requires Tier 3 (ADMIN)' },
        },
      });

      await expect(
        configService.updateVolunteerRole('role1', updateData)
      ).rejects.toMatchObject({
        response: { status: 403 },
      });
    });
  });

  describe('deleteVolunteerRole', () => {
    it('should delete a volunteer role', async () => {
      mockAxios.delete.mockResolvedValue({});

      await configService.deleteVolunteerRole('role1');

      expect(mockAxios.delete).toHaveBeenCalledWith('/pack-config/volunteer-roles/role1');
    });

    it('should handle role not found', async () => {
      mockAxios.delete.mockRejectedValue({
        response: {
          status: 404,
          data: { message: 'Volunteer role not found' },
        },
      });

      await expect(configService.deleteVolunteerRole('invalid-id')).rejects.toMatchObject({
        response: { status: 404 },
      });
    });

    it('should handle role in use (assigned to volunteers)', async () => {
      mockAxios.delete.mockRejectedValue({
        response: {
          status: 409,
          data: {
            message: 'Cannot delete role currently assigned to volunteers',
          },
        },
      });

      await expect(configService.deleteVolunteerRole('role1')).rejects.toMatchObject({
        response: { status: 409 },
      });
    });

    it('should handle unauthorized access (non-admin)', async () => {
      mockAxios.delete.mockRejectedValue({
        response: {
          status: 403,
          data: { message: 'Requires Tier 3 (ADMIN)' },
        },
      });

      await expect(configService.deleteVolunteerRole('role1')).rejects.toMatchObject({
        response: { status: 403 },
      });
    });
  });
});
