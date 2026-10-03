import type { AppRouter } from '@argo/api';
import { createTRPCContext } from '@trpc/tanstack-react-query';

// Screens take tRPC from context, so a story can swap the client (ADR 0009).
export const { TRPCProvider, useTRPC, useTRPCClient } =
  createTRPCContext<AppRouter>();
