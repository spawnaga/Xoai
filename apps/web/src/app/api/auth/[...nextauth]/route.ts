import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { db } from '@xoai/db';

// HIPAA-compliant authentication configuration
const handler = NextAuth({
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'Username & Password',
      credentials: {
        username: { label: 'Username', type: 'text', placeholder: 'username' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error('Username and password are required');
        }

        // Case-insensitive username lookup (like Asclepius)
        // MySQL is case-insensitive by default with utf8mb4 collation
        const username = credentials.username.toLowerCase().trim();

        // Find user by username (MySQL is case-insensitive by default)
        const user = await db.user.findFirst({
          where: {
            username: username,
          },
        });

        if (!user) {
          // Log failed attempt for security audit
          await db.auditLog.create({
            data: {
              action: 'LOGIN_FAILED',
              resourceType: 'User',
              resourceId: 'unknown',
              userId: null,
              details: { username, reason: 'User not found' },
            },
          });
          throw new Error('Invalid username or password');
        }

        // Check if account is locked (HIPAA: Account lockout after failed attempts)
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
          throw new Error('Account is temporarily locked. Please try again later.');
        }

        // Check if account is active
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
          throw new Error('Account has been deactivated. Please contact support.');
        }

        // Verify password
        const isValid = await compare(credentials.password, user.password);

        if (!isValid) {
          // Increment failed login attempts
          const failedAttempts = user.failedLoginAttempts + 1;
          const maxAttempts = 5;
          const lockoutDuration = 15 * 60 * 1000; // 15 minutes

          await db.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: failedAttempts,
              // Lock account after max attempts (HIPAA requirement)
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
            throw new Error('Too many failed attempts. Account has been locked for 15 minutes.');
          }

          throw new Error('Invalid username or password');
        }

        // Successful login - reset failed attempts and update last login
        await db.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: 0,
            lockedUntil: null,
            lastLoginAt: new Date(),
          },
        });

        // Log successful login for HIPAA audit trail
        await db.auditLog.create({
          data: {
            action: 'LOGIN_SUCCESS',
            resourceType: 'User',
            resourceId: user.id,
            userId: user.id,
            details: { username: user.username },
          },
        });

        return {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          role: user.role,
          isSuperuser: user.isSuperuser,
          isDoctor: user.isDoctor,
          isPharmacist: user.isPharmacist,
        };
      },
    }),
  ],

  // HIPAA-compliant session configuration
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours (like Asclepius)
    updateAge: 5 * 60, // Refresh session every 5 minutes
  },

  // JWT configuration
  jwt: {
    maxAge: 24 * 60 * 60, // 24 hours
  },

  // Custom pages
  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login',
  },

  // Callbacks
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = (user as { username?: string }).username;
        token.email = user.email;
        token.name = user.name;
        token.role = (user as { role?: string }).role;
        token.isSuperuser = (user as { isSuperuser?: boolean }).isSuperuser;
        token.isDoctor = (user as { isDoctor?: boolean }).isDoctor;
        token.isPharmacist = (user as { isPharmacist?: boolean }).isPharmacist;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { username?: string }).username = token.username as string;
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { isSuperuser?: boolean }).isSuperuser = token.isSuperuser as boolean;
        (session.user as { isDoctor?: boolean }).isDoctor = token.isDoctor as boolean;
        (session.user as { isPharmacist?: boolean }).isPharmacist = token.isPharmacist as boolean;
      }
      return session;
    },
  },

  // Events for additional audit logging
  events: {
    async signOut({ token }) {
      if (token?.id) {
        await db.auditLog.create({
          data: {
            action: 'LOGOUT',
            resourceType: 'User',
            resourceId: token.id as string,
            userId: token.id as string,
            details: { username: token.username },
          },
        });
      }
    },
  },

  // Security options
  debug: process.env.NODE_ENV === 'development',
});

export { handler as GET, handler as POST };
