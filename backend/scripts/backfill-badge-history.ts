/**
 * Backfill Badge Tier History
 * 
 * One-time script to create badge tier history entries for existing volunteers
 * who already have points and badge tiers but no history records.
 * 
 * Run with: npx ts-node scripts/backfill-badge-history.ts
 */

import prisma from '../src/utils/prisma';
import { BadgeTierService } from '../src/services/badge-tier.service';

async function backfillBadgeHistory() {
  console.log('Starting badge tier history backfill...\n');

  const badgeTierService = new BadgeTierService();

  // Get all volunteers with point balances
  const volunteers = await prisma.volunteerPointBalance.findMany({
    where: {
      totalPoints: {
        gt: 0, // Only volunteers with points
      },
    },
    include: {
      volunteer: {
        select: {
          id: true,
          name: true,
          leaderboardOptIn: true,
        },
      },
    },
  });

  console.log(`Found ${volunteers.length} volunteers with points\n`);

  let backfilledCount = 0;
  let skippedCount = 0;

  for (const volunteer of volunteers) {
    const { volunteerId, totalPoints } = volunteer;
    const name = volunteer.volunteer.name;

    // Check if volunteer already has badge tier history
    const existingHistory = await prisma.badgeTierHistory.findFirst({
      where: { volunteerId },
    });

    if (existingHistory) {
      console.log(`⏭️  Skipping ${name} - already has history`);
      skippedCount++;
      continue;
    }

    // Get current badge tier from leaderboard cache
    const leaderboardEntry = await prisma.leaderboardCache.findUnique({
      where: { volunteerId },
    });

    const currentTier = leaderboardEntry?.badgeTier;

    if (!currentTier) {
      console.log(`⏭️  Skipping ${name} - no current tier (${totalPoints} points)`);
      skippedCount++;
      continue;
    }

    // Create initial badge tier history entry
    console.log(`✅ Creating history for ${name}: ${currentTier} tier (${totalPoints} points)`);
    
    await prisma.badgeTierHistory.create({
      data: {
        volunteerId,
        oldTier: null, // First achievement
        newTier: currentTier,
        pointsAtChange: totalPoints,
      },
    });

    backfilledCount++;
  }

  console.log('\n📊 Backfill Summary:');
  console.log(`   ✅ Created history: ${backfilledCount}`);
  console.log(`   ⏭️  Skipped: ${skippedCount}`);
  console.log(`   📝 Total processed: ${volunteers.length}`);
}

// Run the backfill
backfillBadgeHistory()
  .then(() => {
    console.log('\n✨ Backfill complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Backfill failed:', error);
    process.exit(1);
  });
