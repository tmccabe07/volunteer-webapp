/**
 * Volunteer Role Service
 * 
 * Business logic for volunteer role management
 * User Story 8 - Pack and Role Configuration
 */

import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import prisma from '../utils/prisma';
import type { CreateVolunteerRoleInput, UpdateVolunteerRoleInput } from '../utils/validation/config.schema';
import type { VolunteerRole, AuthTier } from '@prisma/client';

@Injectable()
export class VolunteerRoleService {
  /**
   * Get all active volunteer roles
   * 
   * @returns List of active volunteer roles
   */
  async getAllVolunteerRoles(): Promise<VolunteerRole[]> {
    return await prisma.volunteerRole.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Create a new volunteer role
   * 
   * @param data - Role creation data
   * @param createdById - User ID creating the role
   * @returns Created volunteer role
   * @throws ConflictException if role name already exists
   * @throws BadRequestException if validation fails
   */
  async createVolunteerRole(
    data: CreateVolunteerRoleInput,
    createdById: string
  ): Promise<VolunteerRole> {
    // Check for duplicate name
    const existing = await prisma.volunteerRole.findFirst({
      where: { 
        name: data.name,
        deletedAt: null
      },
    });

    if (existing) {
      throw new ConflictException(`Role with name "${data.name}" already exists`);
    }

    // Determine grantsTier based on roleType if not explicitly provided
    let grantsTier: AuthTier = data.grantsTier || 'PARENT';
    
    if (!data.grantsTier) {
      switch (data.roleType) {
        case 'PARENT_GUARDIAN':
          grantsTier = 'PARENT';
          break;
        case 'COMMITTEE':
        case 'DEN_LEADER':
        case 'ASSISTANT_DEN_LEADER':
        case 'ASSISTANT_CUB_MASTER':
        case 'LION_GUIDE':
        case 'SCOUTER_RESERVE':
          grantsTier = 'LEADER';
          break;
        default:
          grantsTier = 'PARENT';
      }
    }

    // Create role and audit log in transaction
    return await prisma.$transaction(async (tx) => {
      const role = await tx.volunteerRole.create({
        data: {
          name: data.name,
          description: data.description || null,
          roleType: data.roleType,
          specialty: data.specialty || null,
          rankLevel: data.rankLevel || null,
          grantsTier,
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: createdById,
          action: 'CREATE_VOLUNTEER_ROLE',
          entityType: 'VolunteerRole',
          entityId: role.id,
          changes: data,
        },
      });

      return role;
    });
  }

  /**
   * Update an existing volunteer role
   * 
   * All fields can be updated including roleType, specialty, rankLevel, and grantsTier
   * Changes to grantsTier will affect authorization for all volunteers with this role
   * 
   * @param roleId - Role ID to update
   * @param data - Role update data
   * @param updatedById - User ID making the change
   * @returns Updated volunteer role with assignment count
   * @throws NotFoundException if role doesn't exist
   * @throws ConflictException if new name conflicts with existing role
   */
  async updateVolunteerRole(
    roleId: string,
    data: UpdateVolunteerRoleInput,
    updatedById: string
  ): Promise<VolunteerRole & { assignmentCount?: number }> {
    // Check if role exists
    const existing = await prisma.volunteerRole.findFirst({
      where: { 
        id: roleId,
        deletedAt: null
      },
      include: {
        _count: {
          select: { volunteers: true }
        }
      }
    });

    if (!existing) {
      throw new NotFoundException('Volunteer role not found');
    }

    // Check for name conflict if name is being changed
    if (data.name && data.name !== existing.name) {
      const duplicate = await prisma.volunteerRole.findFirst({
        where: { 
          name: data.name,
          deletedAt: null,
          id: { not: roleId }
        },
      });

      if (duplicate) {
        throw new ConflictException(`Role with name "${data.name}" already exists`);
      }
    }

    // Prepare update data, handling all fields
    const updateData: any = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.roleType !== undefined) updateData.roleType = data.roleType;
    if (data.grantsTier !== undefined) updateData.grantsTier = data.grantsTier;
    
    // Handle specialty: set to null if not a COMMITTEE role
    if (data.roleType !== undefined) {
      if (data.roleType === 'COMMITTEE') {
        updateData.specialty = data.specialty || existing.specialty;
      } else {
        updateData.specialty = null;
      }
    } else if (data.specialty !== undefined) {
      updateData.specialty = data.specialty;
    }
    
    // Handle rankLevel: set to null if not a DEN_LEADER role
    if (data.roleType !== undefined) {
      if (data.roleType === 'DEN_LEADER') {
        updateData.rankLevel = data.rankLevel || existing.rankLevel;
      } else {
        updateData.rankLevel = null;
      }
    } else if (data.rankLevel !== undefined) {
      updateData.rankLevel = data.rankLevel;
    }

    // Update role and create audit log in transaction
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.volunteerRole.update({
        where: { id: roleId },
        data: updateData,
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: updatedById,
          action: 'UPDATE_VOLUNTEER_ROLE',
          entityType: 'VolunteerRole',
          entityId: updated.id,
          changes: data,
        },
      });

      return updated;
    });

    return {
      ...result,
      assignmentCount: existing._count.volunteers
    };
  }

  /**
   * Delete a volunteer role (soft delete)
   * 
   * Prevents deletion if role is currently assigned to volunteers
   * for future events
   * 
   * @param roleId - Role ID to delete
   * @param deletedById - User ID performing deletion
   * @throws NotFoundException if role doesn't exist
   * @throws ConflictException if role is in use
   */
  async deleteVolunteerRole(
    roleId: string,
    deletedById: string
  ): Promise<void> {
    // Check if role exists
    const existing = await prisma.volunteerRole.findFirst({
      where: { 
        id: roleId,
        deletedAt: null
      },
      include: {
        volunteers: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Volunteer role not found');
    }

    // Check if role is assigned to any volunteers
    if (existing.volunteers.length > 0) {
      throw new ConflictException(
        'Cannot delete role currently assigned to volunteers. Remove role assignments first.'
      );
    }

    // Soft delete role and create audit log in transaction
    await prisma.$transaction(async (tx) => {
      await tx.volunteerRole.update({
        where: { id: roleId },
        data: { deletedAt: new Date() },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: deletedById,
          action: 'DELETE_VOLUNTEER_ROLE',
          entityType: 'VolunteerRole',
          entityId: existing.id,
        },
      });
    });
  }
}
