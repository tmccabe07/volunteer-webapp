/**
 * Volunteer Role Service Tests
 * 
 * Tests for VolunteerRoleService business logic
 */

import { NotFoundException, ConflictException } from '@nestjs/common';
import { VolunteerRoleService } from './volunteer-role.service';
import {
  setupTests,
  teardownTests,
  createTestVolunteer,
  prisma,
} from '../test/test-utils';

describe('VolunteerRoleService', () => {
  let service: VolunteerRoleService;
  let testVolunteer: any;

  beforeAll(async () => {
    await setupTests();
  });

  afterAll(async () => {
    await teardownTests();
  });

  beforeEach(async () => {
    service = new VolunteerRoleService();
    testVolunteer = await createTestVolunteer({ authTier: 'ADMIN' });
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.auditLog.deleteMany();
    await prisma.volunteerToRole.deleteMany();
    await prisma.volunteerRole.deleteMany({
      where: {
        name: {
          contains: 'Test',
        },
      },
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllVolunteerRoles', () => {
    it('should return all active volunteer roles', async () => {
      const result = await service.getAllVolunteerRoles();

      // Should return the seeded roles from test-utils
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(result.every(role => role.deletedAt === null)).toBe(true);
      
      // Verify they're sorted by name
      const names = result.map(r => r.name);
      const sortedNames = [...names].sort();
      expect(names).toEqual(sortedNames);
    });

    it('should not return deleted roles', async () => {
      // Create a role and then soft delete it
      const role = await prisma.volunteerRole.create({
        data: {
          name: 'Test Deleted Role',
          roleType: 'PARENT_GUARDIAN',
          grantsTier: 'PARENT',
          deletedAt: new Date(),
        },
      });

      const result = await service.getAllVolunteerRoles();

      expect(result.find(r => r.id === role.id)).toBeUndefined();
    });
  });

  describe('createVolunteerRole', () => {
    const createData = {
      name: 'Test Den Leader - Bear',
      description: 'Lead Bear den activities',
      roleType: 'DEN_LEADER' as const,
      rankLevel: 'BEAR' as const,
    };

    it('should create a new volunteer role', async () => {
      const result = await service.createVolunteerRole(createData, testVolunteer.id);

      expect(result).toBeDefined();
      expect(result.name).toBe(createData.name);
      expect(result.description).toBe(createData.description);
      expect(result.roleType).toBe(createData.roleType);
      expect(result.rankLevel).toBe(createData.rankLevel);
      expect(result.deletedAt).toBeNull();
    });

    it('should throw ConflictException if role name already exists', async () => {
      // Create the role first
      await service.createVolunteerRole(createData, testVolunteer.id);

      // Try to create again with same name
      await expect(service.createVolunteerRole(createData, testVolunteer.id)).rejects.toThrow(
        ConflictException
      );
    });

    it('should auto-assign LEADER tier for DEN_LEADER role type', async () => {
      const result = await service.createVolunteerRole(createData, testVolunteer.id);

      expect(result.grantsTier).toBe('LEADER');
    });

    it('should auto-assign PARENT tier for PARENT_GUARDIAN role type', async () => {
      const parentRoleData = {
        name: 'Test Parent Volunteer',
        roleType: 'PARENT_GUARDIAN' as const,
      };

      const result = await service.createVolunteerRole(parentRoleData, testVolunteer.id);

      expect(result.grantsTier).toBe('PARENT');
    });

    it('should create audit log entry', async () => {
      const result = await service.createVolunteerRole(createData, testVolunteer.id);

      // Verify audit log was created
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          userId: testVolunteer.id,
          action: 'CREATE_VOLUNTEER_ROLE',
          entityType: 'VolunteerRole',
          entityId: result.id,
        },
      });

      expect(auditLog).toBeDefined();
      expect(auditLog?.userId).toBe(testVolunteer.id);
      expect(auditLog?.action).toBe('CREATE_VOLUNTEER_ROLE');
      expect(auditLog?.entityType).toBe('VolunteerRole');
    });
  });

  describe('updateVolunteerRole', () => {
    let testRole: any;

    beforeEach(async () => {
      // Create a test role to update
      testRole = await prisma.volunteerRole.create({
        data: {
          name: 'Test Original Role Name',
          description: 'Original description',
          roleType: 'DEN_LEADER',
          grantsTier: 'LEADER',
          rankLevel: 'WOLF',
        },
      });
    });

    const updateData = {
      name: 'Test Updated Role Name',
      description: 'Updated description',
    };

    it('should update volunteer role name and description', async () => {
      const result = await service.updateVolunteerRole(testRole.id, updateData, testVolunteer.id);

      expect(result).toBeDefined();
      expect(result.name).toBe(updateData.name);
      expect(result.description).toBe(updateData.description);
      expect(result.roleType).toBe(testRole.roleType); // Unchanged
      expect(result.grantsTier).toBe(testRole.grantsTier); // Unchanged
    });

    it('should update role type and related fields', async () => {
      const result = await service.updateVolunteerRole(
        testRole.id, 
        { 
          roleType: 'COMMITTEE',
          specialty: 'Treasurer'
        }, 
        testVolunteer.id
      );

      expect(result.roleType).toBe('COMMITTEE');
      expect(result.specialty).toBe('Treasurer');
      expect(result.rankLevel).toBeNull(); // Should be cleared when changing from DEN_LEADER
    });

    it('should update grantsTier', async () => {
      const result = await service.updateVolunteerRole(
        testRole.id, 
        { grantsTier: 'ADMIN' }, 
        testVolunteer.id
      );

      expect(result.grantsTier).toBe('ADMIN');
    });

    it('should include assignment count in response', async () => {
      const result = await service.updateVolunteerRole(testRole.id, updateData, testVolunteer.id);

      expect(result.assignmentCount).toBeDefined();
      expect(typeof result.assignmentCount).toBe('number');
    });

    it('should throw NotFoundException when role does not exist', async () => {
      await expect(service.updateVolunteerRole('non-existent-id', updateData, testVolunteer.id)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ConflictException when new name conflicts with existing role', async () => {
      // Create another role with a different name
      await prisma.volunteerRole.create({
        data: {
          name: 'Test Conflicting Role',
          roleType: 'PARENT_GUARDIAN',
          grantsTier: 'PARENT',
        },
      });

      // Try to update first role to use the conflicting name
      await expect(
        service.updateVolunteerRole(
          testRole.id,
          { name: 'Test Conflicting Role' },
          testVolunteer.id
        )
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('deleteVolunteerRole', () => {
    let testRole: any;

    beforeEach(async () => {
      // Create a test role to delete
      testRole = await prisma.volunteerRole.create({
        data: {
          name: 'Test Role to Delete',
          roleType: 'PARENT_GUARDIAN',
          grantsTier: 'PARENT',
        },
      });
    });

    it('should soft delete a volunteer role', async () => {
      await service.deleteVolunteerRole(testRole.id, testVolunteer.id);

      // Verify role was soft deleted
      const deletedRole = await prisma.volunteerRole.findUnique({
        where: { id: testRole.id },
      });

      expect(deletedRole).toBeDefined();
      expect(deletedRole?.deletedAt).toBeDefined();
      expect(deletedRole?.deletedAt).not.toBeNull();
    });

    it('should throw NotFoundException when role does not exist', async () => {
      await expect(service.deleteVolunteerRole('non-existent-id', testVolunteer.id)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ConflictException when role is assigned to volunteers', async () => {
      // Create a volunteer and assign the role
      const volunteer = await createTestVolunteer({ authTier: 'PARENT' });
      await prisma.volunteerToRole.create({
        data: {
          volunteerId: volunteer.id,
          roleId: testRole.id,
        },
      });

      await expect(service.deleteVolunteerRole(testRole.id, testVolunteer.id)).rejects.toThrow(
        ConflictException
      );
    });

    it('should allow deletion when role only has removed assignments', async () => {
      // Create a volunteer and assign the role
      const volunteer = await createTestVolunteer({ authTier: 'PARENT' });
      await prisma.volunteerToRole.create({
        data: {
          volunteerId: volunteer.id,
          roleId: testRole.id,
          removedAt: new Date(), // Role assignment was removed
        },
      });

      // Should not throw - role can be deleted since assignment is inactive
      await expect(service.deleteVolunteerRole(testRole.id, testVolunteer.id)).resolves.not.toThrow();

      // Verify role was soft deleted
      const deletedRole = await prisma.volunteerRole.findUnique({
        where: { id: testRole.id },
      });

      expect(deletedRole?.deletedAt).toBeDefined();
      expect(deletedRole?.deletedAt).not.toBeNull();
    });
  });
});
