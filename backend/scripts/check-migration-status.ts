/**
 * Script to check if database migration is needed
 * 
 * Usage:
 *   pnpm --filter backend tsx scripts/check-migration-status.ts
 */

import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/vs_platform?schema=public';

async function checkMigrationStatus() {
  const pool = new Pool({ connectionString });
  
  try {
    console.log('Checking database connection...');
    await pool.query('SELECT 1');
    console.log('✅ Database connection successful\n');

    // Check if CategoryRole enum exists
    console.log('Checking for CategoryRole enum...');
    const enumCheck = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'CategoryRole'
      );
    `);
    const enumExists = enumCheck.rows[0].exists;
    console.log(`CategoryRole enum: ${enumExists ? '✅ EXISTS' : '❌ MISSING'}\n`);

    // Check if users table has categoryRole column
    console.log('Checking users table columns...');
    const userColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('categoryRole', 'tokenVersion');
    `);
    const hasCategoryRole = userColumns.rows.some(r => r.column_name === 'categoryRole');
    const hasTokenVersion = userColumns.rows.some(r => r.column_name === 'tokenVersion');
    console.log(`users.categoryRole: ${hasCategoryRole ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`users.tokenVersion: ${hasTokenVersion ? '✅ EXISTS' : '❌ MISSING'}\n`);

    // Check if videos table has categoryRole column
    console.log('Checking videos table columns...');
    const videoColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'videos' 
      AND column_name = 'categoryRole';
    `);
    const videoHasCategoryRole = videoColumns.rows.some(r => r.column_name === 'categoryRole');
    console.log(`videos.categoryRole: ${videoHasCategoryRole ? '✅ EXISTS' : '❌ MISSING'}\n`);

    // Summary
    console.log('=== MIGRATION STATUS ===');
    if (enumExists && hasCategoryRole && hasTokenVersion && videoHasCategoryRole) {
      console.log('✅ All migrations are applied. Database is up to date.');
    } else {
      console.log('❌ Migration required!');
      console.log('\nTo apply migrations, run:');
      console.log('  cd backend');
      console.log('  pnpm prisma migrate dev');
      console.log('\nOr manually run the SQL from:');
      console.log('  backend/prisma/migrations/20251209120000_add_category_role_and_token_version/migration.sql');
    }

    // Try Prisma client
    console.log('\n=== TESTING PRISMA CLIENT ===');
    try {
      const { PrismaClient } = await import('@prisma/client');
      const { PrismaPg } = await import('@prisma/adapter-pg');
      const prismaAdapter = new PrismaPg(pool);
      const prisma = new PrismaClient({ adapter: prismaAdapter });
      const userCount = await prisma.user.count();
      console.log(`✅ Prisma client works. Found ${userCount} users.`);
      await prisma.$disconnect();
    } catch (prismaError: any) {
      console.log('❌ Prisma client error:', prismaError.message);
      if (prismaError.message.includes('categoryRole') || prismaError.message.includes('tokenVersion')) {
        console.log('   This confirms the migration is needed.');
      }
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Check DATABASE_URL in .env file');
    console.error('2. Ensure PostgreSQL is running');
    console.error('3. Verify database credentials');
  } finally {
    await pool.end();
  }
}

checkMigrationStatus()
  .then(() => {
    console.log('\n✅ Check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Check failed:', error);
    process.exit(1);
  });

