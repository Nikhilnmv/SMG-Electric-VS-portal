/**
 * Script to manually apply the category role migration
 * This is a fallback if Prisma migrate doesn't work
 * 
 * Usage:
 *   pnpm --filter backend tsx scripts/apply-migration-manually.ts
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/vs_platform?schema=public';

async function applyMigration() {
  const pool = new Pool({ connectionString });
  
  try {
    console.log('Connecting to database...');
    await pool.query('SELECT 1');
    console.log('✅ Connected\n');

    // Read migration SQL
    const migrationPath = path.join(__dirname, '../prisma/migrations/20251209120000_add_category_role_and_token_version/migration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    console.log('Applying migration...\n');
    console.log('SQL to execute:');
    console.log('---');
    console.log(migrationSQL);
    console.log('---\n');

    try {
      // Execute each statement separately (no transaction for DDL)
      // 1. Create enum (if not exists)
      console.log('Creating CategoryRole enum...');
      try {
        await pool.query(`CREATE TYPE "CategoryRole" AS ENUM ('DEALER', 'EMPLOYEE', 'TECHNICIAN', 'STAKEHOLDER', 'INTERN', 'VENDOR')`);
        console.log('✅ Enum created');
      } catch (e: any) {
        if (e.message.includes('already exists')) {
          console.log('⚠️  CategoryRole enum already exists');
        } else {
          throw e;
        }
      }

      // 2. Add columns to users table
      console.log('Adding columns to users table...');
      try {
        await pool.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "categoryRole" "CategoryRole" NOT NULL DEFAULT 'INTERN'`);
        console.log('✅ Added categoryRole to users');
      } catch (e: any) {
        if (e.message.includes('already exists') || e.message.includes('duplicate')) {
          console.log('⚠️  categoryRole already exists in users table');
        } else {
          throw e;
        }
      }
      
      try {
        await pool.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "tokenVersion" INTEGER NOT NULL DEFAULT 0`);
        console.log('✅ Added tokenVersion to users');
      } catch (e: any) {
        if (e.message.includes('already exists') || e.message.includes('duplicate')) {
          console.log('⚠️  tokenVersion already exists in users table');
        } else {
          throw e;
        }
      }

      // 3. Add column to videos table
      console.log('Adding column to videos table...');
      try {
        await pool.query(`ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "categoryRole" "CategoryRole" NOT NULL DEFAULT 'INTERN'`);
        console.log('✅ Added categoryRole to videos');
      } catch (e: any) {
        if (e.message.includes('already exists') || e.message.includes('duplicate')) {
          console.log('⚠️  categoryRole already exists in videos table');
        } else {
          throw e;
        }
      }

      // 4. Update existing videos (set categoryRole from user if null)
      console.log('Updating existing videos...');
      try {
        const updateResult = await pool.query(`
          UPDATE "videos" v
          SET "categoryRole" = COALESCE(v."categoryRole", u."categoryRole", 'INTERN')
          FROM "users" u
          WHERE v."userId" = u."id"
        `);
        console.log(`✅ Updated ${updateResult.rowCount} videos`);
      } catch (e: any) {
        console.log('⚠️  Could not update videos (may already be set):', e.message);
      }

      console.log('\n✅ Migration applied successfully!');
      
      // Verify
      console.log('\nVerifying migration...');
      const enumCheck = await pool.query(`SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CategoryRole');`);
      const userCheck = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'categoryRole';`);
      const videoCheck = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'categoryRole';`);
      
      console.log(`CategoryRole enum: ${enumCheck.rows[0].exists ? '✅' : '❌'}`);
      console.log(`users.categoryRole: ${userCheck.rows.length > 0 ? '✅' : '❌'}`);
      console.log(`videos.categoryRole: ${videoCheck.rows.length > 0 ? '✅' : '❌'}`);
      
    } catch (error: any) {
      await pool.query('ROLLBACK');
      throw error;
    }

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    
    if (error.message.includes('already exists')) {
      console.log('\n⚠️  Some parts of the migration may already be applied.');
      console.log('This is usually safe to ignore if the columns already exist.');
    } else {
      console.log('\nTroubleshooting:');
      console.log('1. Check if the enum/columns already exist');
      console.log('2. Verify database permissions');
      console.log('3. Check for conflicting migrations');
    }
    throw error;
  } finally {
    await pool.end();
  }
}

applyMigration()
  .then(() => {
    console.log('\n✅ Migration script completed');
    console.log('\nNext steps:');
    console.log('1. Regenerate Prisma client: pnpm prisma generate');
    console.log('2. Restart your backend server');
    console.log('3. Test registration and user management');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration script failed');
    process.exit(1);
  });

