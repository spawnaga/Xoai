import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { getServerSession } from 'next-auth';
import { appRouter, createContext, type Session } from '@xoai/api';

const handler = async (req: Request) => {
  // Get the NextAuth session
  const nextAuthSession = await getServerSession();

  // Transform NextAuth session to tRPC session format
  let session: Session | null = null;
  if (nextAuthSession?.user) {
    const user = nextAuthSession.user as Record<string, unknown>;
    session = {
      user: {
        id: (user.id as string) || '',
        username: user.username as string | undefined,
        email: nextAuthSession.user.email,
        name: nextAuthSession.user.name,
        role: (user.role as string) || 'USER',
        isSuperuser: user.isSuperuser as boolean | undefined,
        isDoctor: user.isDoctor as boolean | undefined,
        isPharmacist: user.isPharmacist as boolean | undefined,
        isPharmacyTechnician: user.isPharmacyTechnician as boolean | undefined,
      },
      expires: nextAuthSession.expires,
    };
  }

  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => createContext(session),
  });
};

export { handler as GET, handler as POST };
