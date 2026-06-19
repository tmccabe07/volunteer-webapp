import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RoleScope } from '@prisma/client';
import prisma from '../../utils/prisma';
import { AssignScopedRoleDto } from '../../models/roles/assign-scoped-role.dto';

@Injectable()
export class RoleService {
  async assignScopedRole(data: AssignScopedRoleDto) {
    const volunteer = await prisma.volunteer.findFirst({
      where: { id: data.volunteerId, deletedAt: null },
      select: { id: true, name: true },
    });
    if (!volunteer) {
      throw new NotFoundException('Volunteer not found');
    }

    const role = await prisma.volunteerRole.findFirst({
      where: { id: data.roleId, deletedAt: null },
      select: { id: true, name: true, scopeType: true, rankLevel: true },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.scopeType !== data.scopeType) {
      throw new BadRequestException(
        `Role scopeType mismatch: role is ${role.scopeType} but request was ${data.scopeType}`,
      );
    }

    let denId: string | null = null;
    let denNumber: number | null = null;

    if (data.scopeType === RoleScope.DEN) {
      const den = await prisma.den.findFirst({
        where: {
          denNumber: data.denNumber,
          isActive: true,
          deletedAt: null,
        },
        select: { id: true, denNumber: true },
      });
      if (!den) {
        throw new BadRequestException('denNumber must reference an active den');
      }
      denId = den.id;
      denNumber = den.denNumber;
    }

    if (data.scopeType === RoleScope.RANK && role.rankLevel !== data.rankLevel) {
      throw new BadRequestException('rankLevel must match role rankLevel');
    }

    const existing = await prisma.volunteerToRole.findFirst({
      where: {
        volunteerId: data.volunteerId,
        roleId: data.roleId,
        denNumber,
        removedAt: null,
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('Role already assigned for this scope');
    }

    const assignment = await prisma.volunteerToRole.create({
      data: {
        volunteerId: data.volunteerId,
        roleId: data.roleId,
        denId,
        denNumber,
      },
      include: {
        volunteer: { select: { id: true, name: true } },
        role: { select: { id: true, name: true, scopeType: true, rankLevel: true } },
      },
    });

    return {
      id: assignment.id,
      volunteerId: assignment.volunteer.id,
      volunteerName: assignment.volunteer.name,
      roleId: assignment.role.id,
      roleName: assignment.role.name,
      scopeType: assignment.role.scopeType,
      rankLevel: assignment.role.rankLevel,
      denId: assignment.denId,
      denNumber: assignment.denNumber,
      assignedAt: assignment.assignedAt.toISOString(),
    };
  }

  async listAssignments(volunteerId?: string) {
    const assignments = await prisma.volunteerToRole.findMany({
      where: {
        removedAt: null,
        ...(volunteerId ? { volunteerId } : {}),
      },
      include: {
        volunteer: { select: { id: true, name: true } },
        role: { select: { id: true, name: true, scopeType: true, rankLevel: true } },
      },
      orderBy: [{ assignedAt: 'desc' }],
    });

    return assignments.map((assignment) => ({
      id: assignment.id,
      volunteerId: assignment.volunteer.id,
      volunteerName: assignment.volunteer.name,
      roleId: assignment.role.id,
      roleName: assignment.role.name,
      scopeType: assignment.role.scopeType,
      rankLevel: assignment.role.rankLevel,
      denId: assignment.denId,
      denNumber: assignment.denNumber,
      assignedAt: assignment.assignedAt.toISOString(),
    }));
  }

  async removeAssignment(assignmentId: string) {
    const assignment = await prisma.volunteerToRole.findUnique({
      where: { id: assignmentId },
      select: { id: true, removedAt: true },
    });
    if (!assignment || assignment.removedAt) {
      throw new NotFoundException('Role assignment not found');
    }

    await prisma.volunteerToRole.update({
      where: { id: assignmentId },
      data: { removedAt: new Date() },
    });
  }
}
