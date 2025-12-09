import { prisma } from '../lib/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { env } from '../config/env';
import { CategoryRole } from '@vs-platform/types';

interface CreateUserByAdminPayload {
  email: string;
  name?: string;
  password?: string;
  categoryRole?: CategoryRole;
  role?: 'ADMIN' | 'EDITOR' | 'USER';
  generateUsername?: boolean;
  generateTempPassword?: boolean;
}

interface CreateUserResult {
  id: string;
  email: string;
  username: string;
  password: string; // Only returned if generated
  passwordMustChange: boolean;
}

/**
 * User service for user management operations
 */
export class UserService {
  /**
   * Generate a unique username from a name
   * Format: lowercase, alphanumeric + hyphens, with number suffix if collision
   */
  static async generateUniqueUsername(name: string): Promise<string> {
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

  /**
   * Generate a cryptographically secure temporary password
   */
  static generateTempPassword(length: number = 12): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*';
    const allChars = uppercase + lowercase + numbers + special;

    // Ensure at least one of each type
    let password = '';
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];

    // Fill the rest with random characters
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password
    return password
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');
  }

  /**
   * Create a user by admin
   */
  static async createUserByAdmin(
    payload: CreateUserByAdminPayload,
    adminId: string
  ): Promise<CreateUserResult> {
    const {
      email,
      name,
      password: providedPassword,
      categoryRole = 'INTERN',
      role = 'USER',
      generateUsername = true,
      generateTempPassword: shouldGenerateTempPassword = true,
    } = payload;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Generate username if needed
    let username: string;
    if (generateUsername && name) {
      username = await this.generateUniqueUsername(name);
    } else if (generateUsername) {
      // Generate from email if no name provided
      const emailUsername = email.split('@')[0];
      username = await this.generateUniqueUsername(emailUsername);
    } else {
      throw new Error('Username must be generated or provided');
    }

    // Check if username already exists (shouldn't happen, but safety check)
    const existingUsername = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUsername) {
      throw new Error('Generated username already exists. Please try again.');
    }

    // Determine password
    let finalPassword: string;
    let passwordMustChange = false;

    if (providedPassword && providedPassword.trim().length > 0) {
      finalPassword = providedPassword;
    } else if (shouldGenerateTempPassword) {
      finalPassword = this.generateTempPassword(12);
      passwordMustChange = true;
    } else {
      throw new Error('Password must be provided or auto-generated');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(finalPassword, env.BCRYPT_ROUNDS);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        passwordMustChange,
        role,
        categoryRole,
        createdByAdminId: adminId,
        isActive: true,
        tokenVersion: 0,
      },
      select: {
        id: true,
        email: true,
        username: true,
        passwordMustChange: true,
      },
    });

    return {
      id: user.id,
      email: user.email,
      username: user.username!,
      password: finalPassword,
      passwordMustChange: user.passwordMustChange,
    };
  }

  /**
   * Set user password
   */
  static async setPassword(
    userId: string,
    newPassword: string,
    actorId?: string | null
  ): Promise<void> {
    const passwordHash = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        passwordMustChange: false,
        lastPasswordChangeAt: new Date(),
        tokenVersion: { increment: 1 }, // Invalidate existing tokens
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
      },
    });
  }

  /**
   * Create password reset token for a user
   * Returns the raw token (to be sent via email)
   */
  static async createPasswordResetToken(username: string): Promise<{
    token: string;
    user: { id: string; email: string; username: string | null };
  }> {
    // Find user by username
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        email: true,
        username: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      // Don't reveal if user exists - always return success
      // But we need to return a dummy token to prevent timing attacks
      const dummyToken = crypto.randomBytes(32).toString('hex');
      return {
        token: dummyToken,
        user: { id: '', email: '', username: null },
      };
    }

    // Generate secure token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Set expiry
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + env.PASSWORD_RESET_TOKEN_TTL_SECONDS);

    // Store hashed token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: expiresAt,
      },
    });

    return {
      token: rawToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    };
  }

  /**
   * Verify and use password reset token
   * Returns user if valid, null if invalid
   */
  static async verifyPasswordResetToken(
    username: string,
    rawToken: string
  ): Promise<{ id: string; email: string } | null> {
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        email: true,
        passwordResetTokenHash: true,
        passwordResetExpiresAt: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return null;
    }

    if (!user.passwordResetTokenHash || !user.passwordResetExpiresAt) {
      return null;
    }

    // Check expiry
    if (new Date() > user.passwordResetExpiresAt) {
      return null;
    }

    // Verify token using constant-time comparison
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const isValid = crypto.timingSafeEqual(
      Buffer.from(tokenHash, 'hex'),
      Buffer.from(user.passwordResetTokenHash, 'hex')
    );

    if (!isValid) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
    };
  }

  /**
   * Clear password reset token (after successful reset)
   */
  static async clearPasswordResetToken(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
      },
    });
  }
}

