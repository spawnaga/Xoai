// tRPC Context
// Provides database and session access to all procedures

import { db, type PrismaClient } from '@xoai/db';

export interface Context {
  db: PrismaClient;
  session: Session | null;
}

export interface Session {
  user: {
    id: string;
    email: string;
    name?: string;
    role: string;
  };
  expires: Date;
}

export async function createContext(): Promise<Context> {
  return {
    db,
    session: null,
  };
}
