import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { AuthTier } from '@prisma/client';
import prisma from '../utils/prisma';

type AuthenticatedRecord = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  authTier: AuthTier;
  mustChangePassword?: boolean;
};

/**
 * AuthService handles authentication operations including password hashing,
 * JWT generation, and token verification per research.md Decision 3.2
 */
@Injectable()
export class AuthService {
  private readonly BCRYPT_ROUNDS = 12;
  private readonly ACCESS_TOKEN_EXPIRY = '15m';
  private readonly REFRESH_TOKEN_EXPIRY_SHORT = '7d'; // rememberMe: false
  private readonly REFRESH_TOKEN_EXPIRY_LONG = '30d'; // rememberMe: true
  private readonly JWT_SECRET: string;
  private readonly JWT_REFRESH_SECRET: string;

  private getDenChiefMirrorEmail(denChiefId: string): string {
    return `denchief+${denChiefId}@local.volunteer`;
  }

  private async getProjectedPoints(volunteerId: string): Promise<number> {
    const activeSignups = await prisma.signup.findMany({
      where: {
        volunteerId,
        withdrawn: false,
        deletedAt: null,
        activitySlot: {
          event: {
            isComplete: false,
            deletedAt: null,
            eventDate: {
              gte: new Date(),
            },
          },
        },
      },
      select: {
        activitySlot: {
          select: {
            activityType: {
              select: {
                pointValue: true,
              },
            },
          },
        },
      },
    });

    return activeSignups.reduce((sum, signup) => sum + signup.activitySlot.activityType.pointValue, 0);
  }

  private async getBadgeTierInfo(totalPoints: number) {
    const allTiers = await prisma.badgeTier.findMany({
      orderBy: {
        displayOrder: 'asc',
      },
    });

    let currentTier = null as (typeof allTiers)[number] | null;
    for (let index = allTiers.length - 1; index >= 0; index -= 1) {
      const tier = allTiers[index];
      if (totalPoints >= tier.minPoints && (tier.maxPoints === null || totalPoints <= tier.maxPoints)) {
        currentTier = tier;
        break;
      }
    }

    let nextTier = null as (typeof allTiers)[number] | null;
    if (currentTier) {
      nextTier = allTiers.find((tier) => tier.displayOrder === currentTier.displayOrder + 1) ?? null;
    } else {
      nextTier = allTiers[0] ?? null;
    }

    return {
      current: currentTier?.tierName ?? null,
      currentTierDetails: currentTier
        ? {
            tierName: currentTier.tierName,
            minPoints: currentTier.minPoints,
            maxPoints: currentTier.maxPoints,
            badgeColor: currentTier.badgeColor,
          }
        : null,
      nextTier: nextTier
        ? {
            tierName: nextTier.tierName,
            minPoints: nextTier.minPoints,
            badgeColor: nextTier.badgeColor,
          }
        : null,
      pointsToNextTier: nextTier ? nextTier.minPoints - totalPoints : null,
    };
  }

  constructor() {
    if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET)) {
      throw new Error('JWT_SECRET and JWT_REFRESH_SECRET environment variables are required in production');
    }
    this.JWT_SECRET = process.env.JWT_SECRET || 'dev-only-insecure-secret';
    this.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-only-insecure-refresh-secret';
  }

  /**
   * Hash password using bcrypt with 12 rounds (per research.md Decision 3.2)
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.BCRYPT_ROUNDS);
  }

  /**
   * Verify password against hashed password
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate JWT access token (15 minute expiry)
   */
  generateAccessToken(userId: string, email: string, authTier: AuthTier): string {
    return jwt.sign(
      {
        userId,
        email,
        authTier,
        type: 'access'
      },
      this.JWT_SECRET,
      { expiresIn: this.ACCESS_TOKEN_EXPIRY }
    );
  }

  /**
   * Generate JWT refresh token (7 or 30 day expiry based on rememberMe)
   */
  generateRefreshToken(userId: string, rememberMe: boolean = false): string {
    const expiry = rememberMe ? this.REFRESH_TOKEN_EXPIRY_LONG : this.REFRESH_TOKEN_EXPIRY_SHORT;
    return jwt.sign(
      {
        userId,
        type: 'refresh'
      },
      this.JWT_REFRESH_SECRET,
      { expiresIn: expiry }
    );
  }

  /**
   * Verify and decode access token
   * @throws Error if token is invalid or expired
   */
  verifyAccessToken(token: string): { userId: string; email: string; authTier: AuthTier } {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as any;
      
      if (decoded.type !== 'access') {
        throw new Error('Invalid token type');
      }

      return {
        userId: decoded.userId,
        email: decoded.email,
        authTier: decoded.authTier
      };
    } catch (error) {
      throw new Error('Invalid or expired access token');
    }
  }

  /**
   * Verify and decode refresh token
   * @throws Error if token is invalid or expired
   */
  verifyRefreshToken(token: string): { userId: string } {
    try {
      const decoded = jwt.verify(token, this.JWT_REFRESH_SECRET) as any;
      
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      return {
        userId: decoded.userId
      };
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Register new volunteer with hashed password
   * Returns volunteer record without password hash
   */
  async registerVolunteer(
    email: string,
    password: string,
    name: string,
    phone?: string
  ): Promise<{ volunteer: any; accessToken: string; refreshToken: string }> {
    // Check if email already exists
    const existingVolunteer = await prisma.volunteer.findUnique({
      where: { email }
    });

    if (existingVolunteer) {
      throw new Error('Email already in use');
    }

    // Hash password
    const passwordHash = await this.hashPassword(password);

    // Create volunteer with default PARENT tier
    const volunteer = await prisma.volunteer.create({
      data: {
        email,
        passwordHash,
        name,
        phone,
        authTier: AuthTier.PARENT,
        leaderboardOptIn: true,
        pointBalance: {
          create: {
            totalPoints: 0,
            currentYearPoints: 0
          }
        },
        notifications: {
          create: {
            type: 'BADGE_ACHIEVEMENT',
            message: 'Welcome to the Cub Scout Volunteer Management System!',
            isRead: false
          }
        }
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        authTier: true
      }
    });

    // Generate tokens
    const accessToken = this.generateAccessToken(volunteer.id, volunteer.email, volunteer.authTier);
    const refreshToken = this.generateRefreshToken(volunteer.id, false);

    return {
      volunteer: {
        ...volunteer,
        signupActorId: volunteer.id,
        mustChangePassword: false // New registrations don't need to change password
      },
      accessToken,
      refreshToken
    };
  }

  /**
   * Authenticate volunteer with email and password
   * Returns volunteer record and tokens if successful
   */
  async loginVolunteer(
    email: string,
    password: string,
    rememberMe: boolean = false
  ): Promise<{ volunteer: any; accessToken: string; refreshToken: string } | null> {
    // Find volunteer by email (include deleted check)
    const volunteer = await prisma.volunteer.findFirst({
      where: {
        email,
        deletedAt: null
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        authTier: true,
        passwordHash: true,
        mustChangePassword: true
      }
    });

    if (volunteer) {
      // Verify password
      const isValid = await this.verifyPassword(password, volunteer.passwordHash);
      if (isValid) {
        // Generate tokens
        const accessToken = this.generateAccessToken(volunteer.id, volunteer.email, volunteer.authTier);
        const refreshToken = this.generateRefreshToken(volunteer.id, rememberMe);

        // Remove password hash from response
        const { passwordHash, ...volunteerData } = volunteer;

        return {
          volunteer: {
            ...volunteerData,
            signupActorId: volunteer.id,
          },
          accessToken,
          refreshToken
        };
      }
    }

    const denChief = await prisma.denChief.findFirst({
      where: {
        email,
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        authTier: true,
        passwordHash: true,
      },
    });

    if (!denChief) {
      return null;
    }

    const denChiefPasswordValid = await this.verifyPassword(password, denChief.passwordHash);
    if (!denChiefPasswordValid) {
      return null;
    }

    const accessToken = this.generateAccessToken(denChief.id, denChief.email, denChief.authTier);
    const refreshToken = this.generateRefreshToken(denChief.id, rememberMe);

    const denChiefUser = await this.buildDenChiefUser(denChief);

    return {
      volunteer: denChiefUser,
      accessToken,
      refreshToken
    };
  }

  /**
   * Get volunteer info for authenticated user
   */
  async getCurrentUser(userId: string): Promise<any> {
    const volunteer = await prisma.volunteer.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        authTier: true,
        leaderboardOptIn: true,
        volunteerRoles: {
          where: {
            removedAt: null
          },
          select: {
            id: true,
            role: {
              select: {
                id: true,
                name: true,
                roleType: true,
                specialty: true,
                rankLevel: true
              }
            }
          }
        },
        childrenRanks: {
          select: {
            rankLevel: true
          }
        },
        pointBalance: {
          select: {
            totalPoints: true,
            currentYearPoints: true
          }
        }
      }
    });

    if (!volunteer) {
      const denChief = await prisma.denChief.findFirst({
        where: { id: userId, deletedAt: null, isActive: true },
        include: {
          denAssignments: {
            where: { validTo: null },
            include: {
              den: {
                select: { id: true, name: true, denNumber: true, rankLevel: true },
              },
            },
          },
        },
      });

      if (!denChief) {
        throw new Error('Volunteer not found');
      }

      return this.buildDenChiefUser(denChief);
    }

    return {
      ...volunteer,
      signupActorId: volunteer.id,
      roles: volunteer.volunteerRoles.map(vr => vr.role)
    };
  }

  private async buildDenChiefUser(denChief: any) {
    const mirrorEmail = this.getDenChiefMirrorEmail(denChief.id);
    const mirrorVolunteer = await prisma.volunteer.upsert({
      where: { email: mirrorEmail },
      update: {
        name: `${denChief.firstName} ${denChief.lastName}`,
        passwordHash: denChief.passwordHash,
        authTier: AuthTier.DEN_CHIEF,
        deletedAt: null,
      },
      create: {
        email: mirrorEmail,
        name: `${denChief.firstName} ${denChief.lastName}`,
        passwordHash: denChief.passwordHash,
        authTier: AuthTier.DEN_CHIEF,
        leaderboardOptIn: true,
      },
      include: {
        pointBalance: {
          select: {
            totalPoints: true,
            currentYearPoints: true,
          },
        },
      },
    });

    const pointBalance = mirrorVolunteer?.pointBalance || {
      totalPoints: 0,
      currentYearPoints: 0,
    };

    const badgeTier = await this.getBadgeTierInfo(pointBalance.totalPoints);
    const projectedPoints = await this.getProjectedPoints(mirrorVolunteer.id);

    return {
      id: denChief.id,
      email: denChief.email,
      name: `${denChief.firstName} ${denChief.lastName}`,
      signupActorId: mirrorVolunteer.id,
      phone: null,
      authTier: denChief.authTier,
      leaderboardOptIn: false,
      mustChangePassword: false,
      roles: [],
      childrenRanks: [],
      pointBalance,
      badgeTier,
      projectedPoints,
      denAssignments: (denChief.denAssignments || []).map((assignment: any) => ({
        id: assignment.id,
        denId: assignment.denId,
        denName: assignment.den.name,
        denNumber: assignment.den.denNumber,
        rankLevel: assignment.den.rankLevel,
        validFrom: assignment.validFrom.toISOString(),
        validTo: assignment.validTo ? assignment.validTo.toISOString() : null,
      })),
    };
  }

  /**
   * Change password for authenticated user
   * Used when user must change password after admin reset
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<boolean> {
    // Get volunteer with password hash
    const volunteer = await prisma.volunteer.findUnique({
      where: { id: userId },
      select: {
        id: true,
        passwordHash: true,
        mustChangePassword: true
      }
    });

    if (!volunteer) {
      const denChief = await prisma.denChief.findFirst({
        where: { id: userId, deletedAt: null, isActive: true },
        select: {
          id: true,
          passwordHash: true,
        }
      });

      if (!denChief) {
        throw new Error('Volunteer not found');
      }

      const isValidDenChief = await this.verifyPassword(currentPassword, denChief.passwordHash);
      if (!isValidDenChief) {
        throw new Error('Current password is incorrect');
      }

      const newPasswordHash = await this.hashPassword(newPassword);

      await prisma.denChief.update({
        where: { id: userId },
        data: {
          passwordHash: newPasswordHash,
        }
      });

      return true;
    }

    // Verify current password
    const isValid = await this.verifyPassword(currentPassword, volunteer.passwordHash);
    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await this.hashPassword(newPassword);

    // Update password and clear mustChangePassword flag
    await prisma.volunteer.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        mustChangePassword: false
      }
    });

    return true;
  }
}
