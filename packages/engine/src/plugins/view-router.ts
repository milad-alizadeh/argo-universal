import {
  PluginDispatchInput,
  PluginSlotInput,
  PluginViewInput,
} from '@repo/contracts/plugins/wire';
import { TRPCError } from '@trpc/server';
import {
  publicProcedure,
  router,
  routerFactory,
  type RpcConnection,
} from '../rpc';
import type { PluginService } from './service';

export function requireSignal(signal: AbortSignal | undefined): AbortSignal {
  if (!signal) throw new Error('Plugin subscription signal is missing');

  return signal;
}

function requireConnection(
  connection: RpcConnection | undefined,
): RpcConnection {
  if (!connection || connection.signal.aborted)
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Plugin views require a live App Connection',
    });

  return connection;
}

function connectionOf(
  connection: RpcConnection | undefined,
  signal?: AbortSignal,
): RpcConnection {
  const live = requireConnection(connection);

  return {
    ...live,
    signal: signal ? AbortSignal.any([live.signal, signal]) : live.signal,
  };
}

const viewsRouter = routerFactory((plugins: PluginService) =>
  router({
    view: publicProcedure
      .input(PluginViewInput)
      .subscription(({ input, ctx, signal }) =>
        plugins.view(input, connectionOf(ctx.connection, signal)),
      ),
    slot: publicProcedure
      .input(PluginSlotInput)
      .subscription(({ input, ctx, signal }) =>
        plugins.slot(input, connectionOf(ctx.connection, signal)),
      ),
  }),
);

const dispatchRouter = routerFactory((plugins: PluginService) =>
  router({
    dispatch: publicProcedure
      .input(PluginDispatchInput)
      .mutation(async ({ input, ctx }) => {
        await plugins.dispatch(requireConnection(ctx.connection), input);

        return { ok: true as const };
      }),
  }),
);

import { mergeRouters } from '../rpc';

export const createPluginViewRouter = routerFactory((plugins: PluginService) =>
  mergeRouters(viewsRouter(plugins), dispatchRouter(plugins)),
);
