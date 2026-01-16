import type { AuthConfig, SessionConfig } from './types';

// HIPAA-compliant session configuration
// Sessions expire after 15 minutes of inactivity (HIPAA requirement)
export const hipaaSessionConfig: SessionConfig = {
  strategy: 'jwt',
  maxAge: 15 * 60, // 15 minutes - HIPAA compliant timeout
  updateAge: 5 * 60, // Update session every 5 minutes
};

// Extended session for remembered devices (still secure)
export const extendedSessionConfig: SessionConfig = {
  strategy: 'jwt',
  maxAge: 8 * 60 * 60, // 8 hours max
  updateAge: 15 * 60,
};

export const defaultAuthConfig: AuthConfig = {
  providers: [],
  session: hipaaSessionConfig,
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
  },
};

/**
 * Create NextAuth configuration
 */
export function createAuthConfig(options?: Partial<AuthConfig>): AuthConfig {
  return {
    ...defaultAuthConfig,
    ...options,
    session: {
      ...defaultAuthConfig.session,
      ...options?.session,
    },
  };
}

/**
 * NextAuth.js options generator
 */
export function getNextAuthOptions(config: AuthConfig) {
  return {
    providers: config.providers.map((p) => {
      if (p.type === 'credentials') {
        return {
          id: p.id,
          name: p.name,
          type: 'credentials' as const,
          credentials: {
            email: { label: 'Email', type: 'email' },
            password: { label: 'Password', type: 'password' },
          },
          authorize: async (credentials: Record<string, string> | undefined) => {
            // Implement with database lookup
            if (!credentials?.email || !credentials?.password) {
              return null;
            }
            // Return user from database
            return null;
          },
        };
      }
      return {
        id: p.id,
        name: p.name,
        type: 'oauth' as const,
      };
    }),
    session: {
      strategy: config.session.strategy,
      maxAge: config.session.maxAge,
      updateAge: config.session.updateAge,
    },
    pages: config.pages,
    callbacks: {
      async jwt({ token, user }: { token: Record<string, unknown>; user?: Record<string, unknown> }) {
        if (user) {
          token.role = user.role;
          token.id = user.id;
        }
        return token;
      },
      async session({ session, token }: { session: Record<string, unknown>; token: Record<string, unknown> }) {
        if (session.user) {
          (session.user as Record<string, unknown>).role = token.role;
          (session.user as Record<string, unknown>).id = token.id;
        }
        return session;
      },
    },
  };
}
