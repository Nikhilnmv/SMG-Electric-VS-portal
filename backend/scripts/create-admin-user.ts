import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/db';

// Simple username generation (duplicated from UserService to avoid import issues)
async function generateUniqueUsername(name: string): Promise<string> {
  if (!name || name.trim().length === 0) {
    throw new Error('Name is required to generate username');
  }

  // Convert to slug: lowercase, replace spaces with hyphens, remove special chars
  let baseUsername = name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // spaces to hyphens
    .replace(/[^a-z0-9-]/g, '') // remove special chars
    .replace(/-+/g, '-') // multiple hyphens to single
    .replace(/^-|-$/g, ''); // remove leading/trailing hyphens

  // Ensure minimum length
  if (baseUsername.length < 3) {
    baseUsername = baseUsername + 'user';
  }

  // Ensure maximum length (leave room for suffix)
  if (baseUsername.length > 20) {
    baseUsername = baseUsername.substring(0, 20);
  }

  // Check if base username is available
  let username = baseUsername;
  let counter = 1;
  let exists = await prisma.user.findUnique({
    where: { username },
  });

  // If exists, try with number suffix
  while (exists) {
    const suffix = counter.toString();
    const maxBaseLength = 20 - suffix.length - 1; // -1 for hyphen
    username = `${baseUsername.substring(0, maxBaseLength)}-${suffix}`;
    exists = await prisma.user.findUnique({
      where: { username },
    });
    counter++;

    // Safety limit
    if (counter > 10000) {
      throw new Error('Unable to generate unique username after 10000 attempts');
    }
  }

  return username;
}

async function createAdminUser() {
  const args = process.argv.slice(2);
  const email = args[0] || 'admin@example.com';
  const password = args[1] || 'Admin123!';
  const name = args[2] || 'Admin User';

  console.log('🔐 Creating Admin User');
  console.log('======================');
  console.log('');
  console.log(`Email: ${email}`);
  console.log(`Name: ${name}`);
  console.log(`Password: ${password}`);
  console.log('');

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log('⚠️  User already exists');
      
      // Check if already admin
      if (existingUser.role === 'ADMIN') {
        console.log('✅ User is already an ADMIN');
        console.log('');
        console.log('📋 You can log in with:');
        if (existingUser.username) {
          console.log(`   Username: ${existingUser.username}`);
        } else {
          console.log(`   Email: ${email}`);
          console.log('   ⚠️  Note: This user does not have a username. Please update the user to add a username.');
        }
        console.log(`   Password: ${password}`);
        console.log('');
        console.log('   Navigate to: http://localhost:3000/login');
        
        // Update to admin if not already
        if (existingUser.role !== 'ADMIN') {
          await prisma.user.update({
            where: { id: existingUser.id },
            data: { role: 'ADMIN' },
          });
          console.log('✅ User role updated to ADMIN');
        }
        
        await prisma.$disconnect();
        process.exit(0);
      } else {
        // Update role to admin
        await prisma.user.update({
          where: { id: existingUser.id },
          data: { role: 'ADMIN' },
        });
        console.log('✅ User role updated to ADMIN');
      }
    } else {
      // Generate username from name
      console.log('📝 Generating username...');
      let username: string;
      try {
        username = await generateUniqueUsername(name);
        console.log(`✅ Username generated: ${username}`);
      } catch (error) {
        // Fallback to email-based username
        const emailUsername = email.split('@')[0];
        username = await generateUniqueUsername(emailUsername);
        console.log(`✅ Username generated from email: ${username}`);
      }

      // Hash password
      console.log('🔒 Hashing password...');
      const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      console.log('✅ Password hashed');

      // Create admin user
      console.log('👤 Creating admin user...');
      const user = await prisma.user.create({
        data: {
          email,
          username,
          passwordHash,
          role: 'ADMIN',
          categoryRole: 'EMPLOYEE',
          isActive: true,
          passwordMustChange: false,
          tokenVersion: 0,
        },
      });

      console.log('✅ Admin user created successfully!');
      console.log('');
      console.log('📋 User Details:');
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Username: ${user.username}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Category: ${user.categoryRole}`);
      console.log('');
    }

    // Verify the user
    const verifiedUser = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        categoryRole: true,
        isActive: true,
      },
    });

    if (verifiedUser && verifiedUser.role === 'ADMIN') {
      console.log('✅ Verification successful');
      console.log('');
      console.log('📋 Login Credentials:');
      console.log(`   Username: ${verifiedUser.username || email}`);
      console.log(`   Password: ${password}`);
      console.log('');
      console.log('🌐 Next Steps:');
      console.log('   1. Start the backend: pnpm --filter backend dev');
      console.log('   2. Start the frontend: pnpm --filter frontend dev');
      console.log('   3. Navigate to: http://localhost:3000/login');
      console.log('   4. Log in with the username and password above');
      console.log('');
      console.log('🎉 Admin user setup complete!');
    } else {
      console.log('❌ Verification failed');
    }
  } catch (error: any) {
    console.error('❌ Error creating admin user:', error.message);
    if (error.code === 'P2002') {
      console.error('   User with this email or username already exists');
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();

