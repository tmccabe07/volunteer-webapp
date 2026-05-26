import { PrismaClient, RankLevel, AdventureType } from '@prisma/client';
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
        volunteerId_roleId_denNumber: {
          volunteerId: parent.id,
          roleId: parentGuardianRole.id,
          denNumber: -1
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

  // 7. Create Rank Catalog
  const ranks = [
    { rankLevel: RankLevel.LION, displayName: 'Lion', displayOrder: 1, requiredAdventureCount: 5, electiveAdventureCount: 0, description: 'Kindergarten Cub Scouts' },
    { rankLevel: RankLevel.TIGER, displayName: 'Tiger', displayOrder: 2, requiredAdventureCount: 6, electiveAdventureCount: 1, description: '1st Grade Cub Scouts' },
    { rankLevel: RankLevel.WOLF, displayName: 'Wolf', displayOrder: 3, requiredAdventureCount: 6, electiveAdventureCount: 1, description: '2nd Grade Cub Scouts' },
    { rankLevel: RankLevel.BEAR, displayName: 'Bear', displayOrder: 4, requiredAdventureCount: 6, electiveAdventureCount: 1, description: '3rd Grade Cub Scouts' },
    { rankLevel: RankLevel.WEBELOS, displayName: 'Webelos', displayOrder: 5, requiredAdventureCount: 4, electiveAdventureCount: 2, description: '4th Grade Cub Scouts' },
    { rankLevel: RankLevel.AOL, displayName: 'Arrow of Light', displayOrder: 6, requiredAdventureCount: 4, electiveAdventureCount: 2, description: '5th Grade Cub Scouts' }
  ];

  const createdRanks: Record<string, any> = {};
  for (const rank of ranks) {
    const created = await prisma.rank.upsert({
      where: { rankLevel: rank.rankLevel },
      update: {},
      create: rank
    });
    createdRanks[rank.rankLevel] = created;
  }
  console.log('✓ Rank catalog created');

  // 8. Create Adventure Catalog (Sample adventures for each rank)
  const adventures = [
    // Lion Adventures
    { rankLevel: RankLevel.LION, name: 'Lion\'s Honor', classification: AdventureType.REQUIRED, displayOrder: 1, description: 'Explore what it means to be trustworthy' },
    { rankLevel: RankLevel.LION, name: 'Fun on the Run', classification: AdventureType.REQUIRED, displayOrder: 2, description: 'Learn about being active and healthy' },
    { rankLevel: RankLevel.LION, name: 'Animal Kingdom', classification: AdventureType.REQUIRED, displayOrder: 3, description: 'Discover animals and their habitats' },
    
    // Tiger Adventures
    { rankLevel: RankLevel.TIGER, name: 'Tigers in the Wild', classification: AdventureType.REQUIRED, displayOrder: 1, description: 'Explore the outdoors' },
    { rankLevel: RankLevel.TIGER, name: 'My Tiger Jungle', classification: AdventureType.REQUIRED, displayOrder: 2, description: 'Discover your home and community' },
    { rankLevel: RankLevel.TIGER, name: 'Tiger Tales', classification: AdventureType.ELECTIVE, displayOrder: 3, description: 'Share stories and learn communication' },
    
    // Wolf Adventures
    { rankLevel: RankLevel.WOLF, name: 'Call of the Wild', classification: AdventureType.REQUIRED, displayOrder: 1, description: 'Learn outdoor skills' },
    { rankLevel: RankLevel.WOLF, name: 'Paws on the Path', classification: AdventureType.REQUIRED, displayOrder: 2, description: 'Hiking and outdoor exploration' },
    { rankLevel: RankLevel.WOLF, name: 'Finding Your Way', classification: AdventureType.ELECTIVE, displayOrder: 3, description: 'Navigation and map reading' },
    
    // Bear Adventures
    { rankLevel: RankLevel.BEAR, name: 'Bear Claws', classification: AdventureType.REQUIRED, displayOrder: 1, description: 'Learning self-care and responsibility' },
    { rankLevel: RankLevel.BEAR, name: 'Fur, Feathers, and Ferns', classification: AdventureType.REQUIRED, displayOrder: 2, description: 'Nature and wildlife study' },
    { rankLevel: RankLevel.BEAR, name: 'Baloo the Builder', classification: AdventureType.ELECTIVE, displayOrder: 3, description: 'Building and construction projects' },
    
    // Webelos Adventures
    { rankLevel: RankLevel.WEBELOS, name: 'Cast Iron Chef', classification: AdventureType.REQUIRED, displayOrder: 1, description: 'Cooking and camp meal preparation' },
    { rankLevel: RankLevel.WEBELOS, name: 'First Responder', classification: AdventureType.REQUIRED, displayOrder: 2, description: 'First aid and emergency preparedness' },
    { rankLevel: RankLevel.WEBELOS, name: 'Castaway', classification: AdventureType.ELECTIVE, displayOrder: 3, description: 'Outdoor survival skills' },
    
    // Arrow of Light Adventures
    { rankLevel: RankLevel.AOL, name: 'Building a Better World', classification: AdventureType.REQUIRED, displayOrder: 1, description: 'Service and citizenship' },
    { rankLevel: RankLevel.AOL, name: 'Duty to God in Action', classification: AdventureType.REQUIRED, displayOrder: 2, description: 'Faith and values' },
    { rankLevel: RankLevel.AOL, name: 'Scouting Adventure', classification: AdventureType.ELECTIVE, displayOrder: 3, description: 'Preparing for Scouts BSA' }
  ];

  const createdAdventures: Record<string, any> = {};
  for (const adventure of adventures) {
    const rank = createdRanks[adventure.rankLevel];
    const created = await prisma.adventure.upsert({
      where: {
        rankId_name_catalogYear: {
          rankId: rank.id,
          name: adventure.name,
          catalogYear: '2024'
        }
      },
      update: {},
      create: {
        rankId: rank.id,
        name: adventure.name,
        classification: adventure.classification,
        displayOrder: adventure.displayOrder,
        description: adventure.description,
        catalogYear: '2024',
        isActive: true
      }
    });
    createdAdventures[`${adventure.rankLevel}-${adventure.name}`] = created;
  }
  console.log('✓ Adventure catalog created');

  // 9. Create Requirement Catalog (Sample requirements for each adventure)
  const requirements = [
    // Lion's Honor
    { adventureKey: 'LION-Lion\'s Honor', displayOrder: 1, text: 'Know the Scout Oath, Scout Law, Scout motto, and Scout salute' },
    { adventureKey: 'LION-Lion\'s Honor', displayOrder: 2, text: 'Show the Cub Scout sign. Tell what it means' },
    { adventureKey: 'LION-Lion\'s Honor', displayOrder: 3, text: 'Repeat the Scout Law. Explain what it means to be trustworthy' },
    
    // Fun on the Run
    { adventureKey: 'LION-Fun on the Run', displayOrder: 1, text: 'Learn and demonstrate three warm-up exercises' },
    { adventureKey: 'LION-Fun on the Run', displayOrder: 2, text: 'Have Lions make a food puzzle. Play a game and learn about good snacks' },
    
    // Tigers in the Wild
    { adventureKey: 'TIGER-Tigers in the Wild', displayOrder: 1, text: 'Attend a pack or family campout' },
    { adventureKey: 'TIGER-Tigers in the Wild', displayOrder: 2, text: 'Demonstrate how to set up a tent' },
    { adventureKey: 'TIGER-Tigers in the Wild', displayOrder: 3, text: 'Make a list of what you should take on a campout' },
    
    // Call of the Wild
    { adventureKey: 'WOLF-Call of the Wild', displayOrder: 1, text: 'Show you know how to be safe and comfortable while camping' },
    { adventureKey: 'WOLF-Call of the Wild', displayOrder: 2, text: 'Show how to tie an overhand knot and square knot' },
    { adventureKey: 'WOLF-Call of the Wild', displayOrder: 3, text: 'Attend a pack or family campout. Participate in a campfire program' },
    
    // Bear Claws
    { adventureKey: 'BEAR-Bear Claws', displayOrder: 1, text: 'Learn about germs. Conduct an investigation' },
    { adventureKey: 'BEAR-Bear Claws', displayOrder: 2, text: 'Learn about personal safety around others. Practice stranger danger' },
    { adventureKey: 'BEAR-Bear Claws', displayOrder: 3, text: 'Talk about bullying. Discuss how to be a good friend' },
    
    // Cast Iron Chef
    { adventureKey: 'WEBELOS-Cast Iron Chef', displayOrder: 1, text: 'Plan a menu for a balanced meal for your den or family' },
    { adventureKey: 'WEBELOS-Cast Iron Chef', displayOrder: 2, text: 'Using a camp stove, cook a hot meal for your den or family' },
    { adventureKey: 'WEBELOS-Cast Iron Chef', displayOrder: 3, text: 'Demonstrate camp kitchen setup and cleanup procedures' },
    
    // Building a Better World
    { adventureKey: 'AOL-Building a Better World', displayOrder: 1, text: 'Explain the history of the United States flag. Show how to properly display the flag' },
    { adventureKey: 'AOL-Building a Better World', displayOrder: 2, text: 'Learn about a person who has made a difference in your community' },
    { adventureKey: 'AOL-Building a Better World', displayOrder: 3, text: 'Complete a service project benefiting your community' }
  ];

  for (const req of requirements) {
    const adventure = createdAdventures[req.adventureKey];
    if (adventure) {
      await prisma.requirement.upsert({
        where: {
          adventureId_displayOrder: {
            adventureId: adventure.id,
            displayOrder: req.displayOrder
          }
        },
        update: {},
        create: {
          adventureId: adventure.id,
          displayOrder: req.displayOrder,
          requirementText: req.text
        }
      });
    }
  }
  console.log('✓ Requirement catalog created');

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
