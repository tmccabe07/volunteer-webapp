import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import * as bcrypt from 'bcrypt';

// Prisma 7 requires an adapter for SQLite
const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL || 'file:./dev.db'
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // 1. Create Pack Configuration
  const packConfig = await prisma.packConfig.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      packName: 'Pack 123',
      packNumber: '123',
      yearStartDate: new Date('2025-09-01'),
      yearEndDate: new Date('2026-08-31'),
      activeRanks: ['LION', 'TIGER', 'WOLF', 'BEAR', 'WEBELOS', 'AOL']
    }
  });
  console.log('✓ Pack configuration created');

  // 2. Create Badge Tiers
  const badgeTiers = [
    { tierName: 'Bronze', minPoints: 0, maxPoints: 49, displayOrder: 1, badgeColor: '#FFD700' },
    { tierName: 'Silver', minPoints: 50, maxPoints: 79, displayOrder: 2, badgeColor: '#C0C0C0' },
    { tierName: 'Gold', minPoints: 80, maxPoints: 99, displayOrder: 3, badgeColor: '#FFD700' },
    { tierName: 'Platinum', minPoints: 100, maxPoints: 129, displayOrder: 4, badgeColor: '#E5E4E2' },
    { tierName: 'Diamond', minPoints: 130, maxPoints: 169, displayOrder: 5, badgeColor: '#B9F2FF' },
    { tierName: 'Titanium', minPoints: 170, maxPoints: null, displayOrder: 6, badgeColor: '#FF4500' }
  ];

  for (const tier of badgeTiers) {
    await prisma.badgeTier.upsert({
      where: { tierName: tier.tierName },
      update: {},
      create: tier
    });
  }
  console.log('✓ Badge tiers created');

  // 3. Create Default Activity Types
  const activityTypes = [
    { name: 'Event Setup', pointValue: 2, category: 'LOW', description: 'Help set up before an event' },
    { name: 'Event Cleanup', pointValue: 2, category: 'LOW', description: 'Help clean up after an event' },
    { name: 'Committee Meeting', pointValue: 2, category: 'LOW', description: 'Attend committee meeting' },
    { name: 'Event Volunteer', pointValue: 5, category: 'MEDIUM', description: 'Volunteer during an event' },
    { name: 'Den Meeting Lead', pointValue: 8, category: 'MEDIUM', description: 'Lead a den meeting' },
    { name: 'Pack Meeting Help', pointValue: 10, category: 'HIGH', description: 'Assist with pack meeting activities' },
    { name: 'Camping Trip', pointValue: 15, category: 'HIGH', description: 'Volunteer for overnight camping trip' },
    { name: 'Special Event Organizer', pointValue: 25, category: 'SPECIAL', description: 'Organize a major pack event' },
    { name: 'Exceptional Contribution', pointValue: 20, category: 'SPECIAL', description: 'Exceptional volunteer contribution' }
  ];

  for (const activity of activityTypes) {
    await prisma.activityType.upsert({
      where: { name: activity.name },
      update: {},
      create: activity as any
    });
  }
  console.log('✓ Activity types created');

  // 4. Create Default Volunteer Roles
  const volunteerRoles = [
    { name: 'Parent/Guardian', roleType: 'PARENT_GUARDIAN', grantsTier: 'PARENT', description: 'Default parent volunteer role' },
    { name: 'Committee Chair', roleType: 'COMMITTEE', specialty: 'chair', grantsTier: 'LEADER', description: 'Committee chairperson' },
    { name: 'Committee Member - Treasurer', roleType: 'COMMITTEE', specialty: 'treasurer', grantsTier: 'LEADER', description: 'Pack treasurer' },
    { name: 'Committee Member - Secretary', roleType: 'COMMITTEE', specialty: 'secretary', grantsTier: 'LEADER', description: 'Pack secretary' },
    { name: 'Committee Member - Fundraising', roleType: 'COMMITTEE', specialty: 'fundraising', grantsTier: 'LEADER', description: 'Fundraising coordinator' },
    { name: 'Committee Member - Outdoor', roleType: 'COMMITTEE', specialty: 'outdoor', grantsTier: 'LEADER', description: 'Outdoor activities coordinator' },
    { name: 'Committee Member - Recruiting', roleType: 'COMMITTEE', specialty: 'recruiting', grantsTier: 'LEADER', description: 'Recruitment coordinator' },
    { name: 'Lion Den Leader', roleType: 'DEN_LEADER', rankLevel: 'LION', grantsTier: 'LEADER', description: 'Lion den leader' },
    { name: 'Tiger Den Leader', roleType: 'DEN_LEADER', rankLevel: 'TIGER', grantsTier: 'LEADER', description: 'Tiger den leader' },
    { name: 'Wolf Den Leader', roleType: 'DEN_LEADER', rankLevel: 'WOLF', grantsTier: 'LEADER', description: 'Wolf den leader' },
    { name: 'Bear Den Leader', roleType: 'DEN_LEADER', rankLevel: 'BEAR', grantsTier: 'LEADER', description: 'Bear den leader' },
    { name: 'Webelos Den Leader', roleType: 'DEN_LEADER', rankLevel: 'WEBELOS', grantsTier: 'LEADER', description: 'Webelos den leader' },
    { name: 'Assistant Den Leader', roleType: 'ASSISTANT_DEN_LEADER', grantsTier: 'LEADER', description: 'Assistant den leader' },
    { name: 'Assistant Cubmaster', roleType: 'ASSISTANT_CUB_MASTER', grantsTier: 'LEADER', description: 'Assistant cubmaster' },
    { name: 'Lion Guide', roleType: 'LION_GUIDE', grantsTier: 'PARENT', description: 'Lion guide (parent partner)' }
  ];

  for (const role of volunteerRoles) {
    await prisma.volunteerRole.upsert({
      where: { name: role.name },
      update: {},
      create: role as any
    });
  }
  console.log('✓ Volunteer roles created');

  // 5. Create Test Admin User
  const adminPasswordHash = await bcrypt.hash('Admin123!', 12);
  const admin = await prisma.volunteer.upsert({
    where: { email: 'admin@pack123.org' },
    update: {},
    create: {
      email: 'admin@pack123.org',
      name: 'Site Admin',
      passwordHash: adminPasswordHash,
      authTier: 'ADMIN',
      leaderboardOptIn: true
    }
  });

  await prisma.volunteerPointBalance.upsert({
    where: { volunteerId: admin.id },
    update: {},
    create: {
      volunteerId: admin.id,
      totalPoints: 0,
      currentYearPoints: 0
    }
  });
  console.log('✓ Admin user created (admin@pack123.org / Admin123!)');

  // 6. Create Test Parent Volunteer
  const parentPasswordHash = await bcrypt.hash('Parent123!', 12);
  const parent = await prisma.volunteer.upsert({
    where: { email: 'parent@example.com' },
    update: {},
    create: {
      email: 'parent@example.com',
      name: 'Test Parent',
      passwordHash: parentPasswordHash,
      authTier: 'PARENT',
      leaderboardOptIn: true
    }
  });

  await prisma.volunteerPointBalance.upsert({
    where: { volunteerId: parent.id },
    update: {},
    create: {
      volunteerId: parent.id,
      totalPoints: 0,
      currentYearPoints: 0
    }
  });

  // Add child rank for test parent
  await prisma.childRank.upsert({
    where: {
      volunteerId_rankLevel: {
        volunteerId: parent.id,
        rankLevel: 'WOLF'
      }
    },
    update: {},
    create: {
      volunteerId: parent.id,
      rankLevel: 'WOLF'
    }
  });

  // Assign Parent/Guardian role to test parent
  const parentGuardianRole = await prisma.volunteerRole.findFirst({
    where: { roleType: 'PARENT_GUARDIAN' }
  });
  
  if (parentGuardianRole) {
    await prisma.volunteerToRole.upsert({
      where: {
        volunteerId_roleId: {
          volunteerId: parent.id,
          roleId: parentGuardianRole.id
        }
      },
      update: {},
      create: {
        volunteerId: parent.id,
        roleId: parentGuardianRole.id
      }
    });
  }
  console.log('✓ Test parent volunteer created (parent@example.com / Parent123!)');

  console.log('\n✅ Seeding complete!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
