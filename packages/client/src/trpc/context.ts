import type { AppRouter } from '@repo/engine/router';
import { createTRPCContext } from '@trpc/tanstack-react-query';

// Screens take tRPC from context, so a story can swap the client (ADR 0009).
export const { TRPCProvider, useTRPC, useTRPCClient } =
  createTRPCContext<AppRouter>();

export type { ClientError } from './create-trpc-client';
