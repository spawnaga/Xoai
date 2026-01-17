import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@xoai/api';

/**
 * tRPC React hooks client
 * @see https://trpc.io/docs/client/react
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const trpc: ReturnType<typeof createTRPCReact<AppRouter>> = createTRPCReact<AppRouter>();
export const api: typeof trpc = trpc;
