'use server';

import { redirect } from 'next/navigation';
import { hash, compare } from 'bcryptjs';
import { db } from '@xoai/db';
import { z } from 'zod';
import {
  rateLimiters,
  getClientIdentifier,
} from '@/lib/rate-limit';
import { headers } from 'next/headers';

/**
 * Server Actions for Authentication
 *
 * Progressive Enhancement:
 * - Forms work without JavaScript (native form submission)
 * - JavaScript enhances with loading states and inline errors
 *
 * HIPAA Compliance:
 * - § 164.312(d): Person or Entity Authentication
 * - § 164.312(b): Audit Controls
 */

// Validation schemas
const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: passwordSchema,
  confirmPassword: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type AuthState = {
  error?: string;
  errors?: Record<string, string[]>;
  success?: boolean;
  message?: string;
};

/**
 * Login Server Action
 *
 * Handles authentication with:
 * - Rate limiting
 * - Account lockout
 * - Audit logging
 * - Secure password comparison
 */
export async function loginAction(
  prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const headersList = await headers();
  const clientIp = getClientIdentifier(headersList);

  // Rate limiting
  const rateLimitResult = rateLimiters.login(clientIp);
  if (!rateLimitResult.success) {
    await db.auditLog.create({
      data: {
        action: 'LOGIN_BLOCKED',
        resourceType: 'User',
        resourceId: 'unknown',
        userId: null,
        details: { clientIp, reason: 'Rate limited' },
      },
    });
    return {
      error: `Too many login attempts. Please try again in ${Math.ceil((rateLimitResult.retryAfter || 60) / 60)} minutes.`,
    };
  }

  // Validate input
  const validationResult = loginSchema.safeParse({
    username: formData.get('username'),
    password: formData.get('password'),
  });

  if (!validationResult.success) {
    return {
      errors: validationResult.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { username, password } = validationResult.data;
  const normalizedUsername = username.toLowerCase().trim();

  try {
    // Find user
    const user = await db.user.findFirst({
      where: { username: normalizedUsername },
    });

    if (!user) {
      await db.auditLog.create({
        data: {
          action: 'LOGIN_FAILED',
          resourceType: 'User',
          resourceId: 'unknown',
          userId: null,
          details: { username: normalizedUsername, reason: 'User not found' },
        },
      });
      return { error: 'Invalid username or password' };
    }

    // Check account lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await db.auditLog.create({
        data: {
          action: 'LOGIN_BLOCKED',
          resourceType: 'User',
          resourceId: user.id,
          userId: user.id,
          details: { reason: 'Account locked', lockedUntil: user.lockedUntil },
        },
      });
      return { error: 'Account is temporarily locked. Please try again later.' };
    }

    // Check if active
    if (!user.isActive) {
      await db.auditLog.create({
        data: {
          action: 'LOGIN_BLOCKED',
          resourceType: 'User',
          resourceId: user.id,
          userId: user.id,
          details: { reason: 'Account deactivated' },
        },
      });
      return { error: 'Account has been deactivated. Please contact support.' };
    }

    // Verify password
    const isValid = await compare(password, user.password);

    if (!isValid) {
      const failedAttempts = user.failedLoginAttempts + 1;
      const maxAttempts = 5;
      const lockoutDuration = 15 * 60 * 1000;

      await db.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: failedAttempts,
          lockedUntil: failedAttempts >= maxAttempts
            ? new Date(Date.now() + lockoutDuration)
            : null,
        },
      });

      await db.auditLog.create({
        data: {
          action: 'LOGIN_FAILED',
          resourceType: 'User',
          resourceId: user.id,
          userId: user.id,
          details: {
            reason: 'Invalid password',
            failedAttempts,
            locked: failedAttempts >= maxAttempts,
          },
        },
      });

      if (failedAttempts >= maxAttempts) {
        return { error: 'Too many failed attempts. Account has been locked for 15 minutes.' };
      }

      return { error: 'Invalid username or password' };
    }

    // Successful login - reset attempts and update last login
    await db.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    await db.auditLog.create({
      data: {
        action: 'LOGIN_SUCCESS',
        resourceType: 'User',
        resourceId: user.id,
        userId: user.id,
        details: { username: user.username },
      },
    });

    // Note: For server actions, we validate credentials but actual session
    // creation still needs to go through NextAuth's signIn
    // Return success so client can call signIn
    return { success: true, message: 'Credentials validated' };

  } catch (error) {
    console.error('Login error:', error);
    return { error: 'An error occurred. Please try again.' };
  }
}

/**
 * Register Server Action
 *
 * Creates new user accounts with:
 * - Rate limiting (3/hour)
 * - HIPAA-compliant password requirements
 * - Username enumeration prevention
 * - Comprehensive audit logging
 */
export async function registerAction(
  prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const headersList = await headers();
  const clientIp = getClientIdentifier(headersList);

  // Rate limiting
  const rateLimitResult = rateLimiters.register(clientIp);
  if (!rateLimitResult.success) {
    await db.auditLog.create({
      data: {
        action: 'REGISTER_RATE_LIMITED',
        resourceType: 'User',
        resourceId: 'unknown',
        userId: null,
        details: {
          clientIp,
          blocked: rateLimitResult.blocked,
          retryAfter: rateLimitResult.retryAfter,
        },
      },
    });
    return {
      error: 'Too many registration attempts. Please try again later.',
    };
  }

  // Validate input
  const validationResult = registerSchema.safeParse({
    username: formData.get('username'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
    firstName: formData.get('firstName') || undefined,
    lastName: formData.get('lastName') || undefined,
    email: formData.get('email') || undefined,
  });

  if (!validationResult.success) {
    return {
      errors: validationResult.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { username, password, firstName, lastName, email } = validationResult.data;
  const normalizedUsername = username.toLowerCase().trim();

  try {
    // Check for existing user
    const existingUser = await db.user.findFirst({
      where: { username: normalizedUsername },
    });

    if (existingUser) {
      await db.auditLog.create({
        data: {
          action: 'REGISTER_FAILED',
          resourceType: 'User',
          resourceId: 'unknown',
          userId: null,
          details: { reason: 'Username already registered', username: normalizedUsername },
        },
      });
      // Generic error to prevent enumeration
      return { error: 'Registration failed. Please try a different username or contact support.' };
    }

    // Hash password
    const hashedPassword = await hash(password, 12);

    // Create user
    const user = await db.user.create({
      data: {
        username: normalizedUsername,
        password: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
        name: firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || null,
        email: email || null,
        role: 'USER',
        isActive: true,
      },
      select: {
        id: true,
        username: true,
      },
    });

    await db.auditLog.create({
      data: {
        action: 'REGISTER_SUCCESS',
        resourceType: 'User',
        resourceId: user.id,
        userId: user.id,
        details: { username: user.username },
      },
    });

    // Redirect to login on success
    redirect('/login?registered=true');

  } catch (error) {
    // Handle redirect (it throws)
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      throw error;
    }

    console.error('Registration error:', error);

    await db.auditLog.create({
      data: {
        action: 'REGISTER_ERROR',
        resourceType: 'User',
        resourceId: 'unknown',
        userId: null,
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      },
    });

    return { error: 'An error occurred during registration. Please try again.' };
  }
}
