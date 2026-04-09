import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from '@/lib/axios';
import configService, {
  type ActivityType,
  type CreateActivityTypeData,
  type UpdateActivityTypeData,
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
});
