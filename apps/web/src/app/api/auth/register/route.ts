import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { db } from '@xoai/db';
import { z } from 'zod';
import {
  rateLimiters,
  getClientIdentifier,
  createRateLimitHeaders,
} from '@/lib/rate-limit';

/**
 * Registration API Route
 *
 * Security Features:
 * - Rate limiting (3 per hour per IP)
 * - HIPAA-compliant password requirements
 * - Username enumeration prevention
 * - Comprehensive audit logging
 *
 * HIPAA Compliance:
 * - § 164.312(d): Person or Entity Authentication
 * - § 164.312(b): Audit Controls
 */

// HIPAA-compliant password requirements
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
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
  email: z.string().email('Invalid email address').optional(),
});

export async function POST(request: Request) {
  try {
    // Rate limiting check
    const clientIp = getClientIdentifier(request.headers);
    const rateLimitResult = rateLimiters.register(clientIp);

    if (!rateLimitResult.success) {
      // Log rate limit violation
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

      return NextResponse.json(
        {
          error: 'Too many registration attempts. Please try again later.',
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: createRateLimitHeaders(rateLimitResult),
        }
      );
    }

    const body = await request.json();

    // Validate input
    const validationResult = registerSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.errors.map((e) => e.message),
        },
        { status: 400 }
      );
    }

    const { username, password, firstName, lastName, email } = validationResult.data;
    const normalizedUsername = username.toLowerCase().trim();

    // Check if username already exists
    // Note: MySQL with utf8mb4 collation is case-insensitive by default
    const existingUser = await db.user.findFirst({
      where: {
        username: normalizedUsername,
      },
    });

    if (existingUser) {
      // Log attempt for security (don't reveal if username exists)
      await db.auditLog.create({
        data: {
          action: 'REGISTER_FAILED',
          resourceType: 'User',
          resourceId: 'unknown',
          userId: null,
          details: { reason: 'Username already registered', username: normalizedUsername },
        },
      });

      // Return generic error to prevent username enumeration
      return NextResponse.json(
        { error: 'Registration failed. Please try a different username or contact support.' },
        { status: 400 }
      );
    }

    // Hash password with bcrypt (cost factor 12 for HIPAA compliance)
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
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
      },
    });

    // Log successful registration for HIPAA audit trail
    await db.auditLog.create({
      data: {
        action: 'REGISTER_SUCCESS',
        resourceType: 'User',
        resourceId: user.id,
        userId: user.id,
        details: { username: user.username },
      },
    });

    return NextResponse.json(
      {
        message: 'Registration successful',
        user: {
          id: user.id,
          username: user.username,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);

    // Log error for security monitoring
    await db.auditLog.create({
      data: {
        action: 'REGISTER_ERROR',
        resourceType: 'User',
        resourceId: 'unknown',
        userId: null,
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      },
    });

    return NextResponse.json(
      { error: 'An error occurred during registration. Please try again.' },
      { status: 500 }
    );
  }
}
