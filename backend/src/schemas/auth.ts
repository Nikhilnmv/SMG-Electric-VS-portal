import { z } from 'zod';
import { CategoryRole } from '@vs-platform/types';

const VALID_CATEGORY_ROLES: CategoryRole[] = ['DEALER', 'EMPLOYEE', 'TECHNICIAN', 'STAKEHOLDER', 'INTERN', 'VENDOR'];

/**
 * Validation schema for user registration
 */
export const registerSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .min(1, 'Email is required')
    .max(255, 'Email is too long'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password is too long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name is too long')
    .optional(),
  categoryRole: z
    .enum(VALID_CATEGORY_ROLES as [CategoryRole, ...CategoryRole[]], {
      errorMap: () => ({ message: `Category role must be one of: ${VALID_CATEGORY_ROLES.join(', ')}` }),
    })
    .optional()
    .default('INTERN'),
});

/**
 * Validation schema for user login (username + password)
 */
export const loginSchema = z.object({
  username: z
    .string()
    .min(1, 'Username is required')
    .max(100, 'Username is too long'),
  password: z
    .string()
    .min(1, 'Password is required'),
});

/**
 * Validation schema for refresh token
 */
export const refreshTokenSchema = z.object({
  token: z
    .string()
    .min(1, 'Token is required'),
});

/**
 * Validation schema for password change
 */
export const changePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password is too long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

/**
 * Validation schema for profile update
 */
export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name is too long')
    .optional(),
  email: z
    .string()
    .email('Invalid email format')
    .optional(),
});

/**
 * Validation schema for forgot password
 */
export const forgotPasswordSchema = z.object({
  username: z
    .string()
    .min(1, 'Username is required')
    .max(100, 'Username is too long'),
});

/**
 * Validation schema for reset password
 */
export const resetPasswordSchema = z.object({
  username: z
    .string()
    .min(1, 'Username is required')
    .max(100, 'Username is too long'),
  token: z
    .string()
    .min(1, 'Reset token is required')
    .length(64, 'Invalid reset token format'), // 32 bytes hex = 64 chars
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password is too long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

