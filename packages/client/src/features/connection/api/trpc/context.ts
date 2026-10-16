import type { AppRouter } from '@repo/engine/router';
import type { UseMutationResult } from '@tanstack/react-query';
import {
  createTRPCContext,
  type DecorateMutationProcedure,
  type inferInput,
  type inferOutput,
  type ResolverDef,
} from '@trpc/tanstack-react-query';
import type { ClientError } from './create-trpc-client';

// Screens take tRPC from context, so a story can swap the client (ADR 0009).
export const { TRPCProvider, useTRPC, useTRPCClient } =
  createTRPCContext<AppRouter>();

export type { ClientError } from './create-trpc-client';

export type TRPC = ReturnType<typeof useTRPC>;

// A mutation hook's result for one Server procedure, such as `ServerMutation<TRPC['session']['prompt']>`.
export type ServerMutation<
  Procedure extends DecorateMutationProcedure<ResolverDef>,
> = UseMutationResult<
  inferOutput<Procedure>,
  ClientError,
  inferInput<Procedure>
>;
