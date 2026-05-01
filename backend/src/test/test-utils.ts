/**
 * Test utilities for database setup, teardown, and test data factories
 */

import { PrismaClient, Volunteer, VolunteerRole, Event, ActivityType } from '@prisma/client';
import { hash } from 'bcrypt';
import * as crypto from 'crypto';
import prisma from '../utils/prisma';

// Set test environment variables BEFORE anything else
process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:./test.db';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';
process.env.NODE_ENV = 'test';

// Re-export the singleton prisma instance for tests to use
export { prisma };

/**
 * Clean up all test data from database
 */
export async function cleanupDatabase() {
  // Delete in order to respect foreign key constraints
  await prisma.passwordReset.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.taskCompletion.deleteMany();
  await prisma.adminTask.deleteMany();
  await prisma.signup.deleteMany();
  await prisma.activitySlot.deleteMany();
  await prisma.event.deleteMany();
  await prisma.pointEvent.deleteMany();
  await prisma.badgeTierHistory.deleteMany();
  await prisma.volunteerToRole.deleteMany();
  await prisma.childRank.deleteMany();
  await prisma.volunteer.deleteMany();
  await prisma.volunteerRole.deleteMany();
  await prisma.activityType.deleteMany();
  await prisma.badgeTier.deleteMany();
  await prisma.packConfig.deleteMany();
}

/**
 * Seed database with essential configuration data
 */
export async function seedTestDatabase() {
  // Create pack config
  await prisma.packConfig.create({
    data: {
      packName: 'Test Pack',
      packNumber: '123',
      yearStartDate: new Date('2025-09-01'),
      yearEndDate: new Date('2026-05-31'),
      activeRanks: ['LION', 'TIGER', 'WOLF', 'BEAR', 'WEBELOS', 'AOL'],
    },
  });

  // Create badge tiers
  const tiers = [
    { tierName: 'Bobcat', minPoints: 0, maxPoints: 19, displayOrder: 0, badgeColor: '#F4A460', iconPath: '/badges/bobcat.png' },
    { tierName: 'Tiger', minPoints: 20, maxPoints: 39, displayOrder: 1, badgeColor: '#FFA500', iconPath: '/badges/tiger.png' },
    { tierName: 'Wolf', minPoints: 40, maxPoints: 59, displayOrder: 2, badgeColor: '#8B4513', iconPath: '/badges/wolf.png' },
    { tierName: 'Bear', minPoints: 60, maxPoints: 79, displayOrder: 3, badgeColor: '#654321', iconPath: '/badges/bear.png' },
    { tierName: 'Webelos', minPoints: 80, maxPoints: 99, displayOrder: 4, badgeColor: '#4169E1', iconPath: '/badges/webelos.png' },
    { tierName: 'Arrow of Light', minPoints: 100, maxPoints: null, displayOrder: 5, badgeColor: '#FFD700', iconPath: '/badges/aol.png' },
  ];
  
  for (const tier of tiers) {
    await prisma.badgeTier.create({ data: tier });
  }

  // Create volunteer roles
  const roles = [
    { 
      name: 'Parent/Guardian Volunteer', 
      roleType: 'PARENT_GUARDIAN',
      grantsTier: 'PARENT',
    },
    { 
      name: 'Den Leader - Wolf', 
      roleType: 'DEN_LEADER',
      grantsTier: 'LEADER',
      rankLevel: 'WOLF',
    },
    { 
      name: 'Assistant Den Leader - Bear', 
      roleType: 'ASSISTANT_DEN_LEADER' as const,
      grantsTier: 'LEADER' as const,
      rankLevel: 'BEAR' as const,
    },
    { 
      name: 'Committee Member - Treasurer', 
      roleType: 'COMMITTEE' as const,
      grantsTier: 'LEADER' as const,
      specialty: 'treasurer',
    },
  ];
  
  for (const role of roles) {
    await prisma.volunteerRole.create({ data: role as any });
  }

  // Create activity types
  const activities = [
    { name: 'Event Setup', category: 'LOW' as const, pointValue: 3, description: 'Help set up for pack events' },
    { name: 'Event Volunteer', category: 'MEDIUM' as const, pointValue: 5, description: 'Volunteer at pack events' },
    { name: 'Den Meeting Leader', category: 'HIGH' as const, pointValue: 10, description: 'Lead a den meeting' },
    { name: 'Pack Committee Meeting', category: 'MEDIUM' as const, pointValue: 5, description: 'Attend pack committee meeting' },
  ];
  
  for (const activity of activities) {
    await prisma.activityType.create({ data: activity as any });
  }
}

/**
 * Factory: Create test volunteer
 */
export async function createTestVolunteer(data: Partial<Volunteer> = {}): Promise<Volunteer> {
  const defaultPassword = await hash('password123', 12);
  
  const name = data.name || 'Test User';
  
  return prisma.volunteer.create({
    data: {
      email: data.email || `test${crypto.randomBytes(4).toString('hex')}@example.com`,
      passwordHash: data.passwordHash || defaultPassword,
      name: name,
      phone: data.phone || '5550100',
      authTier: data.authTier || 'PARENT',
      leaderboardOptIn: data.leaderboardOptIn ?? true,
      mustChangePassword: data.mustChangePassword || false,
    },
  });
}

/**
 * Factory: Create test volunteer with role
 */
export async function createTestVolunteerWithRole(
  authTier: 'PARENT' | 'LEADER' | 'ADMIN' = 'PARENT',
  roleName?: string
): Promise<Volunteer> {
  const volunteer = await createTestVolunteer({ authTier });
  
  if (roleName) {
    const role = await prisma.volunteerRole.findFirst({
      where: { name: roleName },
    });
    
    if (role) {
      await prisma.volunteerToRole.create({
        data: {
          volunteerId: volunteer.id,
          roleId: role.id,
        },
      });
    }
  }
  
  return volunteer;
}

/**
 * Factory: Create test event
 */
export async function createTestEvent(creatorId: string, data: Partial<Event> = {}): Promise<Event> {
  // Ensure we have an activity type
  let activityType = await prisma.activityType.findFirst();
  
  if (!activityType) {
    activityType = await createTestActivityType();
  }
  
  const event = await prisma.event.create({
    data: {
      title: data.title || 'Test Event',
      description: data.description || 'A test event',
      eventDate: data.eventDate || new Date('2026-06-01'),
      rankLevel: data.rankLevel || 'WOLF',
      isRecurring: data.isRecurring || false,
      recurringEndDate: data.recurringEndDate,
      isComplete: data.isComplete || false,
      createdById: creatorId,
    },
  });

  // Create one activity slot
  await prisma.activitySlot.create({
    data: {
      eventId: event.id,
      activityTypeId: activityType.id,
      capacity: 5,
    },
  });

  return event;
}

/**
 * Factory: Create test activity type
 */
export async function createTestActivityType(data: Partial<ActivityType> = {}): Promise<ActivityType> {
  return prisma.activityType.create({
    data: {
      name: data.name || `Test Activity ${crypto.randomBytes(4).toString('hex')}`,
      category: data.category || 'MEDIUM',
      pointValue: data.pointValue || 5,
      description: data.description || 'Test activity description',
    },
  });
}

/**
 * Factory: Create password reset token
 * Returns the unhashed token (for use in tests), but stores hashed version
 */
export async function createPasswordResetToken(email: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  // Hash token with SHA-256 (same as PasswordResetService)
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  
  await prisma.passwordReset.create({
    data: {
      email,
      token: hashedToken,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60), // 1 hour
    },
  });
  
  return token;
}

/**
 * Setup function to run before all tests
 */
export async function setupTests() {
  await cleanupDatabase();
  await seedTestDatabase();
}

/**
 * Teardown function to run after all tests
 */
export async function teardownTests() {
  await cleanupDatabase();
  await prisma.$disconnect();
}
