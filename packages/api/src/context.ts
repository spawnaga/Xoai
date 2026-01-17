// tRPC Context
// Provides database and session access to all procedures

import { db, type PrismaClient } from '@xoai/db';

export interface Context {
  db: PrismaClient;
  session: Session | null;
}

export interface SessionUser {
  id: string;
  username?: string;
  email?: string | null;
  name?: string | null;
  role: string;
  isSuperuser?: boolean;
  isDoctor?: boolean;
  isPharmacist?: boolean;
  isPharmacyTechnician?: boolean;
}

export interface Session {
  user: SessionUser;
  expires: string;
}

/**
 * Create context with optional session
 * Session should be passed from the API route handler
 */
export function createContext(session?: Session | null): Context {
  return {
    db,
    session: session ?? null,
  };
}
