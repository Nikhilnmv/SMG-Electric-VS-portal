import { z } from 'zod';
import { UserRole, CategoryRole } from '@vs-platform/types';

const VALID_USER_ROLES: UserRole[] = ['ADMIN', 'EDITOR', 'USER'];
const VALID_CATEGORY_ROLES: CategoryRole[] = ['DEALER', 'EMPLOYEE', 'TECHNICIAN', 'STAKEHOLDER', 'INTERN', 'VENDOR'];

/**
 * Validation schema for updating user role
 */
export const updateUserRoleSchema = z.object({
  role: z
    .enum(VALID_USER_ROLES as [UserRole, ...UserRole[]], {
      errorMap: () => ({ message: `Role must be one of: ${VALID_USER_ROLES.join(', ')}` }),
    }),
});

/**
 * Validation schema for updating user category
 */
export const updateUserCategorySchema = z.object({
  categoryRole: z
    .enum(VALID_CATEGORY_ROLES as [CategoryRole, ...CategoryRole[]], {
      errorMap: () => ({ message: `Category role must be one of: ${VALID_CATEGORY_ROLES.join(', ')}` }),
    }),
});

/**
 * Validation schema for creating a category (if needed)
 */
export const createCategorySchema = z.object({
  name: z
    .string()
    .min(1, 'Category name is required')
    .max(100, 'Category name is too long'),
  description: z
    .string()
    .max(500, 'Description is too long')
    .optional(),
});

/**
 * Validation schema for creating/updating a role
 */
export const createRoleSchema = z.object({
  name: z
    .string()
    .min(1, 'Role name is required')
    .max(100, 'Role name is too long'),
  permissions: z
    .array(z.string())
    .min(1, 'At least one permission is required')
    .optional(),
});

/**
 * Validation schema for video approval/rejection
 */
export const approveVideoSchema = z.object({
  notes: z
    .string()
    .max(1000, 'Notes are too long')
    .optional(),
});

export const rejectVideoSchema = z.object({
  reason: z
    .string()
    .min(1, 'Rejection reason is required')
    .max(1000, 'Reason is too long'),
  notes: z
    .string()
    .max(1000, 'Notes are too long')
    .optional(),
});

/**
 * Validation schema for admin creating a new user
 */
export const createUserSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .min(1, 'Email is required')
    .max(255, 'Email is too long'),
  password: z
    .string()
    .optional()
    .refine(
      (val) => {
        // If password is provided and not empty, validate it
        if (val && val.trim() !== '') {
          return (
            val.length >= 8 &&
            val.length <= 100 &&
            /[A-Z]/.test(val) &&
            /[a-z]/.test(val) &&
            /[0-9]/.test(val)
          );
        }
        // Empty or undefined is valid (will be auto-generated)
        return true;
      },
      {
        message: 'Password must be at least 8 characters, contain uppercase, lowercase, and a number',
      }
    ),
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name is too long')
    .optional(),
  categoryRole: z
    .enum(VALID_CATEGORY_ROLES as [CategoryRole, ...CategoryRole[]], {
      errorMap: () => ({ message: `Category role must be one of: ${VALID_CATEGORY_ROLES.join(', ')}` }),
    })
    .default('INTERN'),
  role: z
    .enum(VALID_USER_ROLES as [UserRole, ...UserRole[]], {
      errorMap: () => ({ message: `Role must be one of: ${VALID_USER_ROLES.join(', ')}` }),
    })
    .default('USER'),
  generateUsername: z
    .boolean()
    .default(true),
  generateTempPassword: z
    .boolean()
    .default(true),
  sendCredentialsEmail: z
    .boolean()
    .default(false),
});

