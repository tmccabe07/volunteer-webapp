import { VolunteerService } from './volunteer.service';
import {
  setupTests,
  teardownTests,
  createTestVolunteer,
  createTestVolunteerWithRole,
  prisma,
} from '../test/test-utils';

describe('VolunteerService', () => {
  let service: VolunteerService;

  beforeAll(async () => {
    await setupTests();
  });

  afterAll(async () => {
    await teardownTests();
  });

  beforeEach(() => {
    // VolunteerService doesn't use DI, just instantiate directly
    service = new VolunteerService();
  });

  afterEach(async () => {
    // Clean up in order to respect foreign key constraints
    await prisma.signup.deleteMany();
    await prisma.childRank.deleteMany();
    await prisma.volunteerPointBalance.deleteMany();
    await prisma.leaderboardCache.deleteMany();
    await prisma.volunteerToRole.deleteMany();
    await prisma.event.deleteMany();
    await prisma.volunteer.deleteMany();
  });

  describe('getProfile', () => {
    it('should return volunteer profile with roles and badge tier', async () => {
      const volunteer = await createTestVolunteer({
        name: 'Test User',
      });

      // Create point balance for volunteer
      await prisma.volunteerPointBalance.create({
        data: {
          volunteerId: volunteer.id,
          totalPoints: 45,
          currentYearPoints: 45,
        },
      });

      // Create leaderboard entry with badge tier
      await prisma.leaderboardCache.create({
        data: {
          volunteerId: volunteer.id,
          rank: 5,
          totalPoints: 45,
          badgeTier: 'Wolf',
        },
      });

      const profile = await service.getProfile(volunteer.id);

      expect(profile.id).toBe(volunteer.id);
      expect(profile.email).toBe(volunteer.email);
      expect(profile.name).toBe('Test User');
      expect(profile.pointBalance.totalPoints).toBe(45);
      expect(profile.pointBalance.badgeTier).toBe('Wolf');
      expect(profile).toHaveProperty('roles');
    });

    it('should throw error if volunteer not found', async () => {
      await expect(service.getProfile('non-existent-id')).rejects.toThrow(
        'Volunteer not found'
      );
    });

    it('should include role assignments with specialty and rank', async () => {
      const volunteer = await createTestVolunteerWithRole('LEADER', 'Den Leader - Wolf');

      const profile = await service.getProfile(volunteer.id);

      expect(profile.roles).toHaveLength(1);
      expect(profile.roles[0]).toHaveProperty('roleName');
      expect(profile.roles[0].roleName).toBe('Den Leader - Wolf');
    });
  });

  describe('updateProfile', () => {
    it('should update volunteer basic information', async () => {
      const volunteer = await createTestVolunteer();

      const updateDto = {
        name: 'Updated Name',
        phone: '555-9999',
        childrenRanks: ['TIGER', 'WOLF'],
        leaderboardOptIn: false,
      };

      const updated = await service.updateProfile(volunteer.id, updateDto);

      expect(updated.name).toBe('Updated Name');
      expect(updated.phone).toBe('555-9999');
      expect(updated.childrenRanks).toHaveLength(2);
      expect(updated.leaderboardOptIn).toBe(false);
    });

    it('should not update email or password', async () => {
      const volunteer = await createTestVolunteer({ email: 'original@example.com' });

      const updateDto = {
        name: 'Updated Name',
        // Email should not change even if provided
      };

      const updated = await service.updateProfile(volunteer.id, updateDto);

      expect(updated.email).toBe('original@example.com');
    });

    it('should throw error if volunteer not found', async () => {
      await expect(
        service.updateProfile('non-existent-id', { name: 'Test' })
      ).rejects.toThrow('Volunteer not found');
    });
  });

  describe('assignRole', () => {
    it('should assign a role to volunteer', async () => {
      const volunteer = await createTestVolunteer();
      const role = await prisma.volunteerRole.findFirst({
        where: { name: 'Den Leader - Wolf' },
      });

      const assignment = await service.assignRole(volunteer.id, role!.id);

      expect(assignment.roleId).toBe(role!.id);
      expect(assignment.roleName).toBe('Den Leader - Wolf');
      expect(assignment).toHaveProperty('assignedAt');
    });

    it('should upgrade volunteer to LEADER tier when assigning leader role', async () => {
      const volunteer = await createTestVolunteer({ authTier: 'PARENT' });
      const role = await prisma.volunteerRole.findFirst({
        where: { name: 'Den Leader - Wolf' },
      });

      await service.assignRole(volunteer.id, role!.id);

      const updated = await prisma.volunteer.findUnique({
        where: { id: volunteer.id },
      });

      expect(updated?.authTier).toBe('LEADER');
    });

    it('should not upgrade if already a LEADER', async () => {
      const volunteer = await createTestVolunteer({ authTier: 'LEADER' });
      const committeeRole = await prisma.volunteerRole.findFirst({
        where: { name: 'Committee Member - Treasurer' },
      });

      await service.assignRole(volunteer.id, committeeRole!.id);

      const updated = await prisma.volunteer.findUnique({
        where: { id: volunteer.id },
      });

      expect(updated?.authTier).toBe('LEADER');
    });

    it('should throw error for non-existent role', async () => {
      const volunteer = await createTestVolunteer();

      await expect(
        service.assignRole(volunteer.id, 'non-existent-role-id')
      ).rejects.toThrow('Role not found');
    });

    it('should throw error if role already assigned', async () => {
      const volunteer = await createTestVolunteer();
      const role = await prisma.volunteerRole.findFirst({
        where: { name: 'Den Leader - Wolf' },
      });

      // First assignment should succeed
      await service.assignRole(volunteer.id, role!.id);

      // Second assignment should fail
      await expect(
        service.assignRole(volunteer.id, role!.id)
      ).rejects.toThrow('Role already assigned');
    });
  });

  describe('removeRole', () => {
    it('should remove role assignment', async () => {
      const volunteer = await createTestVolunteerWithRole('LEADER', 'Den Leader - Wolf');
      const assignment = await prisma.volunteerToRole.findFirst({
        where: { volunteerId: volunteer.id },
      });

      await service.removeRole(volunteer.id, assignment!.id);

      const removed = await prisma.volunteerToRole.findUnique({
        where: { id: assignment!.id },
      });

      expect(removed?.removedAt).toBeTruthy();
    });

    it('should downgrade volunteer tier if no more leader roles', async () => {
      const volunteer = await createTestVolunteerWithRole('LEADER', 'Den Leader - Wolf');
      const assignment = await prisma.volunteerToRole.findFirst({
        where: { volunteerId: volunteer.id },
      });

      await service.removeRole(volunteer.id, assignment!.id);

      const updated = await prisma.volunteer.findUnique({
        where: { id: volunteer.id },
      });

      expect(updated?.authTier).toBe('PARENT');
    });

    it('should keep LEADER tier if volunteer has multiple leader roles', async () => {
      const volunteer = await createTestVolunteer({ authTier: 'LEADER' });
      
      // Assign two leader roles
      const denLeaderRole = await prisma.volunteerRole.findFirst({
        where: { name: 'Den Leader - Wolf' },
      });
      const committeeRole = await prisma.volunteerRole.findFirst({
        where: { name: 'Committee Member - Treasurer' },
      });

      await prisma.volunteerToRole.create({
        data: {
          volunteerId: volunteer.id,
          roleId: denLeaderRole!.id,
        },
      });

      const assignment2 = await prisma.volunteerToRole.create({
        data: {
          volunteerId: volunteer.id,
          roleId: committeeRole!.id,
        },
      });

      // Remove one of the roles
      await service.removeRole(volunteer.id, assignment2.id);

      const updated = await prisma.volunteer.findUnique({
        where: { id: volunteer.id },
      });

      expect(updated?.authTier).toBe('LEADER'); // Still has Den Leader role
    });

    it('should throw error if assignment not found', async () => {
      const volunteer = await createTestVolunteer();

      await expect(
        service.removeRole(volunteer.id, 'non-existent-id')
      ).rejects.toThrow('Role assignment not found');
    });
  });

  describe('listVolunteers', () => {
    it('should return paginated list of volunteers', async () => {
      await createTestVolunteer({ name: 'Alice Anderson' });
      await createTestVolunteer({ name: 'Bob Brown' });
      await createTestVolunteer({ name: 'Charlie Chen' });

      const result = await service.listVolunteers({ page: 1, limit: 2 });

      expect(result.volunteers).toHaveLength(2);
      expect(result.pagination.total).toBe(3);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.totalPages).toBe(2);
    });

    it('should filter by search term', async () => {
      await createTestVolunteer({ name: 'Alice Anderson' });
      await createTestVolunteer({ name: 'Bob Brown' });
      await createTestVolunteer({ name: 'Charlie Chen' });

      // Note: Search is case-sensitive in SQLite test environment
      const result = await service.listVolunteers({ page: 1, limit: 10, search: 'Alice' });

      expect(result.volunteers).toHaveLength(1);
      expect(result.volunteers[0].name).toContain('Alice');
    });

    it('should filter by auth tier', async () => {
      await createTestVolunteer({ authTier: 'PARENT' });
      await createTestVolunteer({ authTier: 'LEADER' });
      await createTestVolunteer({ authTier: 'ADMIN' });

      const result = await service.listVolunteers({ page: 1, limit: 10, tier: 'LEADER' });

      expect(result.volunteers).toHaveLength(1);
      expect(result.volunteers[0].authTier).toBe('LEADER');
    });

    it('should return volunteers with their roles', async () => {
      await createTestVolunteerWithRole('LEADER', 'Den Leader - Wolf');

      const result = await service.listVolunteers({ page: 1, limit: 10 });

      expect(result.volunteers[0]).toHaveProperty('roles');
      expect(result.volunteers[0].roles.length).toBeGreaterThan(0);
    });
  });

  describe('getVolunteerById', () => {
    it('should return volunteer with full details', async () => {
      const volunteer = await createTestVolunteer();

      // Create point balance
      await prisma.volunteerPointBalance.create({
        data: {
          volunteerId: volunteer.id,
          totalPoints: 30,
          currentYearPoints: 30,
        },
      });

      const result = await service.getVolunteerById(volunteer.id);

      expect(result.id).toBe(volunteer.id);
      expect(result.pointBalance.totalPoints).toBe(30);
      expect(result).toHaveProperty('roles');
      expect(result).toHaveProperty('pointHistory');
    });

    it('should throw error if volunteer not found', async () => {
      await expect(service.getVolunteerById('non-existent-id')).rejects.toThrow(
        'Volunteer not found'
      );
    });
  });

  describe('deleteVolunteer', () => {
    it('should soft delete volunteer', async () => {
      const volunteer = await createTestVolunteer();

      await service.deleteVolunteer(volunteer.id);

      const deleted = await prisma.volunteer.findUnique({
        where: { id: volunteer.id },
      });

      expect(deleted?.deletedAt).toBeTruthy();
    });

    it('should withdraw future signups when deleting volunteer', async () => {
      const volunteer = await createTestVolunteer();
      const leader = await createTestVolunteerWithRole('LEADER', 'Den Leader - Wolf');
      const event = await prisma.event.create({
        data: {
          title: 'Future Event',
          description: 'Test',
          eventDate: new Date('2026-12-31'),
          rankLevel: 'WOLF',
          createdById: leader.id,
        },
      });

      const activityType = await prisma.activityType.findFirst();
      const slot = await prisma.activitySlot.create({
        data: {
          eventId: event.id,
          activityTypeId: activityType!.id,
          capacity: 5,
        },
      });

      await prisma.signup.create({
        data: {
          volunteerId: volunteer.id,
          activitySlotId: slot.id,
        },
      });

      await service.deleteVolunteer(volunteer.id);

      const signup = await prisma.signup.findFirst({
        where: { volunteerId: volunteer.id },
      });

      expect(signup?.withdrawn).toBe(true);
      expect(signup?.withdrawnAt).toBeTruthy();
    });

    it('should throw error if volunteer not found', async () => {
      await expect(service.deleteVolunteer('non-existent-id')).rejects.toThrow(
        'Volunteer not found'
      );
    });
  });

  describe('getAvailableRoles', () => {
    it('should return all active roles', async () => {
      const roles = await service.getAvailableRoles();

      expect(roles).toBeDefined();
      expect(Array.isArray(roles)).toBe(true);
      expect(roles.length).toBeGreaterThan(0);
      expect(roles[0]).toHaveProperty('id');
      expect(roles[0]).toHaveProperty('name');
      expect(roles[0]).toHaveProperty('roleType');
      expect(roles[0]).toHaveProperty('grantsTier');
    });

    it('should exclude soft-deleted roles', async () => {
      // Get current roles count
      const beforeRoles = await service.getAvailableRoles();
      const beforeCount = beforeRoles.length;

      // Soft delete one role
      const roleToDelete = await prisma.volunteerRole.findFirst({
        where: { deletedAt: null },
      });
      await prisma.volunteerRole.update({
        where: { id: roleToDelete!.id },
        data: { deletedAt: new Date() },
      });

      // Get roles again
      const afterRoles = await service.getAvailableRoles();

      expect(afterRoles.length).toBe(beforeCount - 1);
      expect(afterRoles.find((r) => r.id === roleToDelete!.id)).toBeUndefined();

      // Restore role for other tests
      await prisma.volunteerRole.update({
        where: { id: roleToDelete!.id },
        data: { deletedAt: null },
      });
    });

    it('should order roles by roleType and name', async () => {
      const roles = await service.getAvailableRoles();

      // Verify ordering - roleType should be ascending
      for (let i = 1; i < roles.length; i++) {
        const prev = roles[i - 1];
        const curr = roles[i];

        // If same roleType, name should be ascending
        if (prev.roleType === curr.roleType) {
          expect(prev.name.localeCompare(curr.name)).toBeLessThanOrEqual(0);
        }
      }
    });

    it('should include specialty and rankLevel fields when present', async () => {
      const roles = await service.getAvailableRoles();

      // Find a committee role with specialty
      const committeeRole = roles.find(
        (r) => r.roleType === 'COMMITTEE' && r.specialty
      );
      expect(committeeRole).toBeDefined();
      expect(committeeRole?.specialty).toBeTruthy();

      // Find a den leader role with rankLevel
      const denLeaderRole = roles.find(
        (r) => r.roleType === 'DEN_LEADER' && r.rankLevel
      );
      expect(denLeaderRole).toBeDefined();
      expect(denLeaderRole?.rankLevel).toBeTruthy();
    });

    it('should include description field', async () => {
      const roles = await service.getAvailableRoles();

      // All roles should have a description
      roles.forEach((role) => {
        expect(role).toHaveProperty('description');
      });
    });
  });
});
