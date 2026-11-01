import { NavigationStreamEvent } from '@repo/contracts/navigation';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import {
  publicProcedure,
  router,
  routerFactory,
  zAsyncIterable,
  type RpcConnection,
} from '../rpc';
import type { AppNavigation } from './app-navigation';

export interface AppNavigationDeps {
  appNavigation: AppNavigation;
}

function requireConnection(
  connection: RpcConnection | undefined,
): RpcConnection {
  if (!connection || connection.signal.aborted)
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Opening Screens requires a live App Connection',
    });

  return connection;
}

// App plumbing (ADR-0044): which Server this is, and the stream of destinations a desktop App is asked to open.
export const createAppNavigationRouter = routerFactory(
  (deps: AppNavigationDeps) =>
    router({
      server: publicProcedure
        .output(z.strictObject({ serverId: z.string().min(1) }))
        .query(() => ({ serverId: deps.appNavigation.serverId })),
      requests: publicProcedure
        .output(zAsyncIterable({ yield: NavigationStreamEvent }))
        .subscription(async function* ({ ctx, signal }) {
          const connection = requireConnection(ctx.connection);
          yield* deps.appNavigation.requests(
            connection,
            signal ?? connection.signal,
          );
        }),
    }),
);
