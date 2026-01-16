/**
 * Validation Schemas
 *
 * Centralized Zod schemas for input validation.
 * Used by both server actions and API routes.
 *
 * HIPAA Compliance:
 * - § 164.312(d): Person or Entity Authentication
 * - Password requirements meet HIPAA security standards
 */

import { z } from 'zod';

/**
 * Login validation schema
 */
export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * HIPAA-compliant password requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

/**
 * Username validation:
 * - 3-30 characters
 * - Only letters, numbers, and underscores
 */
export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be at most 30 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores');

/**
 * Registration validation schema
 */
export const registerSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Patient search validation
 */
export const patientSearchSchema = z.object({
  query: z.string().min(2, 'Search query must be at least 2 characters'),
  limit: z.number().min(1).max(100).default(20),
});

export type PatientSearchInput = z.infer<typeof patientSearchSchema>;

/**
 * Patient create/update validation
 */
export const patientSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  dateOfBirth: z.date(),
  gender: z.enum(['male', 'female', 'other', 'unknown']),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  insuranceProvider: z.string().optional(),
  insurancePolicyNumber: z.string().optional(),
});

export type PatientInput = z.infer<typeof patientSchema>;

/**
 * Date range validation (for reports, etc.)
 */
export const dateRangeSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
}).refine((data) => data.endDate >= data.startDate, {
  message: 'End date must be after start date',
  path: ['endDate'],
});

export type DateRangeInput = z.infer<typeof dateRangeSchema>;

/**
 * Pagination validation
 */
export const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

/**
 * ID validation (CUID format)
 */
export const idSchema = z.string().min(1, 'ID is required');

/**
 * Medical Record Number validation
 * Format: MRN- followed by alphanumeric characters and hyphens
 * Case-insensitive (accepts MRN-, mrn-, Mrn-)
 */
export const mrnSchema = z.string().regex(
  /^MRN-[A-Z0-9-]+$/i,
  'Invalid Medical Record Number format'
);

/**
 * Validate and return typed result or errors
 */
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string[]> } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    errors: result.error.flatten().fieldErrors as Record<string, string[]>,
  };
}
