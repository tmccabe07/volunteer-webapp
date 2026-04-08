import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import prisma from '../utils/prisma';

/**
 * PasswordResetService handles password reset token generation and validation
 * per research.md Decision 3.3 - Cryptographically secure token generation
 */
@Injectable()
export class PasswordResetService {
  private readonly TOKEN_EXPIRY_HOURS = 1;

  /**
   * Generate cryptographically secure random token (32 bytes)
   * Returns unhashed token for email and hashed token for storage
   */
  private generateToken(): { token: string; hashedToken: string } {
    // Generate 32 bytes of random data
    const tokenBuffer = crypto.randomBytes(32);
    const token = tokenBuffer.toString('hex'); // 64 character hex string

    // Hash token with SHA-256 before storing
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    return { token, hashedToken };
  }

  /**
   * Create password reset request for email
   * Returns token to send in email (never returns hashed version)
   */
  async createResetRequest(email: string): Promise<string | null> {
    // Find volunteer by email
    const volunteer = await prisma.volunteer.findFirst({
      where: {
        email,
        deletedAt: null
      }
    });

    // Always return success to prevent email enumeration
    // But only create token if volunteer exists
    if (!volunteer) {
      return null;
    }

    // Generate token
    const { token, hashedToken } = this.generateToken();

    // Calculate expiry time (1 hour from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.TOKEN_EXPIRY_HOURS);

    // Invalidate any existing reset tokens for this email
    await prisma.passwordReset.updateMany({
      where: {
        email: volunteer.email,
        used: false,
        expiresAt: {
          gt: new Date()
        }
      },
      data: {
        used: true
      }
    });

    // Create new reset token record
    await prisma.passwordReset.create({
      data: {
        email: volunteer.email,
        token: hashedToken,
        expiresAt,
        used: false
      }
    });

    // Return unhashed token for email
    return token;
  }

  /**
   * Validate reset token and reset password
   * @returns volunteerId if successful, null if token invalid/expired
   */
  async resetPassword(token: string, newPasswordHash: string): Promise<boolean> {
    // Hash the provided token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find valid reset token
    const resetRecord = await prisma.passwordReset.findFirst({
      where: {
        token: hashedToken,
        used: false,
        expiresAt: {
          gt: new Date()
        }
      }
    });

    if (!resetRecord) {
      return false;
    }

    // Find volunteer by email
    const volunteer = await prisma.volunteer.findFirst({
      where: { email: resetRecord.email, deletedAt: null }
    });

    if (!volunteer) {
      return false;
    }

    // Update password and mark token as used in a transaction
    await prisma.$transaction(async (tx) => {
      // Update password
      await tx.volunteer.update({
        where: { id: volunteer.id },
        data: {
          passwordHash: newPasswordHash,
          updatedAt: new Date()
        }
      });

      // Mark token as used
      await tx.passwordReset.update({
        where: { id: resetRecord.id },
        data: {
          used: true
        }
      });

      // Invalidate all other tokens for this email
      await tx.passwordReset.updateMany({
        where: {
          email: resetRecord.email,
          id: { not: resetRecord.id },
          used: false
        },
        data: {
          used: true
        }
      });
    });

    return true;
  }

  /**
   * Clean up expired tokens (for scheduled cleanup job)
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await prisma.passwordReset.deleteMany({
      where: {
        OR: [
          {
            expiresAt: {
              lt: new Date()
            }
          },
          {
            used: true,
            createdAt: {
              // Delete used tokens older than 30 days
              lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            }
          }
        ]
      }
    });

    return result.count;
  }
}
