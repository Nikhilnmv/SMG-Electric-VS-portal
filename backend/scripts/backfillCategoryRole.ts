/**
 * Backfill script to set default categoryRole for existing users
 * 
 * Usage:
 *   pnpm --filter backend tsx scripts/backfillCategoryRole.ts
 * 
 * This script sets categoryRole to INTERN for all users that don't have it set.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function backfillCategoryRole() {
  try {
    console.log('Starting categoryRole backfill...');

    // Find all users without categoryRole (shouldn't happen with new schema, but handle legacy)
    // Since categoryRole is now required with a default, we'll update any that might be null
    const users = await prisma.user.findMany({
      where: {
        // In case of any edge cases, we'll update all users to ensure consistency
      },
      select: {
        id: true,
        email: true,
        categoryRole: true,
      },
    });

    console.log(`Found ${users.length} users to process`);

    let updated = 0;
    let skipped = 0;

    for (const user of users) {
      // If categoryRole is somehow null or undefined, set it to INTERN
      if (!user.categoryRole) {
        await prisma.user.update({
          where: { id: user.id },
          data: { categoryRole: 'INTERN' },
        });
        console.log(`Updated user ${user.email} (${user.id}) - set categoryRole to INTERN`);
        updated++;
      } else {
        console.log(`Skipped user ${user.email} (${user.id}) - already has categoryRole: ${user.categoryRole}`);
        skipped++;
      }
    }

    console.log(`\nBackfill completed:`);
    console.log(`  - Updated: ${updated}`);
    console.log(`  - Skipped: ${skipped}`);
    console.log(`  - Total: ${users.length}`);

    // Report users without categoryRole (should be 0 after migration)
    const usersWithoutCategory = await prisma.user.findMany({
      where: {
        categoryRole: null as any, // Type workaround
      },
      select: {
        id: true,
        email: true,
      },
    });

    if (usersWithoutCategory.length > 0) {
      console.log(`\n⚠️  Warning: Found ${usersWithoutCategory.length} users without categoryRole:`);
      usersWithoutCategory.forEach((u) => {
        console.log(`  - ${u.email} (${u.id})`);
      });
    } else {
      console.log('\n✅ All users have categoryRole set');
    }
  } catch (error) {
    console.error('Error during backfill:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the backfill
backfillCategoryRole()
  .then(() => {
    console.log('\n✅ Backfill script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Backfill script failed:', error);
    process.exit(1);
  });

