import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import prisma from '../utils/prisma';
import { AuthService } from './auth.service';

/**
 * AdminService handles administrative operations like user management
 */
@Injectable()
export class AdminService {
  constructor(private readonly authService: AuthService) {}

  /**
   * Get all volunteers (admin only)
   */
  async getAllVolunteers() {
    const volunteers = await prisma.volunteer.findMany({
      where: {
        deletedAt: null
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        authTier: true,
        mustChangePassword: true,
        createdAt: true,
        updatedAt: true,
        volunteerRoles: {
          where: {
            removedAt: null
          },
          include: {
            role: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    return volunteers;
  }

  /**
   * Reset a volunteer's password - generates a temporary password
   * that must be changed on first login
   */
  async resetVolunteerPassword(volunteerId: string, adminId: string) {
    // Verify volunteer exists
    const volunteer = await prisma.volunteer.findFirst({
      where: {
        id: volunteerId,
        deletedAt: null
      }
    });

    if (!volunteer) {
      throw new Error('Volunteer not found');
    }

    // Prevent admins from resetting their own password this way
    if (volunteerId === adminId) {
      throw new Error('Admins cannot reset their own password. Use the "Forgot Password" flow instead.');
    }

    // Generate temporary password (12 characters, readable)
    const tempPassword = this.generateTemporaryPassword();

    // Hash the temporary password
    const passwordHash = await this.authService.hashPassword(tempPassword);

    // Update volunteer with new password and set mustChangePassword flag
    await prisma.volunteer.update({
      where: { id: volunteerId },
      data: {
        passwordHash,
        mustChangePassword: true
      }
    });

    // Log the action in audit log
    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'PASSWORD_RESET_BY_ADMIN',
        entityType: 'Volunteer',
        entityId: volunteerId,
        changes: JSON.stringify({
          targetEmail: volunteer.email,
          resetAt: new Date().toISOString(),
          action: 'password_reset'
        })
      }
    });

    return {
      email: volunteer.email,
      name: volunteer.name,
      temporaryPassword: tempPassword
    };
  }

  /**
   * Generate a readable temporary password
   * Format: word-word-####
   * Example: blue-tiger-4729
   */
  private generateTemporaryPassword(): string {
    const words = [
      'alpha', 'bravo', 'charlie', 'delta', 'echo',
      'fox', 'golf', 'hotel', 'india', 'juliet',
      'kilo', 'lima', 'mike', 'november', 'oscar',
      'papa', 'quebec', 'romeo', 'sierra', 'tango',
      'blue', 'red', 'green', 'yellow', 'orange',
      'tiger', 'wolf', 'bear', 'lion', 'eagle',
      'mountain', 'river', 'forest', 'ocean', 'sky'
    ];

    const word1 = words[crypto.randomInt(0, words.length)];
    const word2 = words[crypto.randomInt(0, words.length)];
    const numbers = crypto.randomInt(1000, 9999);

    return `${word1}-${word2}-${numbers}`;
  }
}
