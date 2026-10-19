import {
  PluginActivation,
  PluginEnablement,
  PluginList,
  PluginSettingChange,
  PluginSettings,
} from '@repo/contracts/plugins';
import {
  ReplaceableInput,
  RenderFailureInput,
} from '@repo/contracts/plugins/replaceable';
import { PluginStatus } from '@repo/contracts/plugins/runtime';
import {
  PluginDispatchInput,
  PluginSlotInput,
  PluginViewInput,
} from '@repo/contracts/plugins/wire';
import { TRPCError } from '@trpc/server';
import {
  mergeRouters,
  publicProcedure,
  router,
  routerFactory,
  type RpcConnection,
} from '../rpc';
import type { RpcContext } from '../rpc/connection';
import { PluginService, type PluginServiceDeps } from './service';

function requireSignal(signal: AbortSignal | undefined): AbortSignal {
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

// A view lives while both the App Connection and its subscription are open.
function connectionOf({
  ctx,
  signal,
}: {
  ctx: RpcContext;
  signal?: AbortSignal;
}): RpcConnection {
  const live = requireConnection(ctx.connection);

  return {
    ...live,
    signal: signal ? AbortSignal.any([live.signal, signal]) : live.signal,
  };
}

const createLifecycleRouter = routerFactory((plugins: PluginService) =>
  router({
    list: publicProcedure.output(PluginList).query(() => plugins.list()),
    failures: publicProcedure.subscription(({ signal }) =>
      plugins.failures(requireSignal(signal)),
    ),
    // Proposed lifecycle seam until pages, Slots and actions request activation.
    activate: publicProcedure
      .input(PluginActivation)
      .output(PluginStatus)
      .mutation(({ input }) => plugins.activate(input.pluginId)),
  }),
);

// Turning a Plugin on or off, and its `contributes.settings` values.
const createSettingsRouter = routerFactory((plugins: PluginService) =>
  router({
    setEnabled: publicProcedure
      .input(PluginEnablement)
      .mutation(({ input }) =>
        plugins.setEnabled(input.pluginId, input.enabled),
      ),
    settings: publicProcedure
      .input(PluginActivation)
      .output(PluginSettings)
      .query(({ input }) => plugins.settings(input.pluginId)),
    setSetting: publicProcedure
      .input(PluginSettingChange)
      .mutation(({ input }) => plugins.setSetting(input)),
  }),
);

// Pages, Slots and Replaceable Slots stream to one live App Connection.
const createViewsRouter = routerFactory((plugins: PluginService) =>
  router({
    view: publicProcedure
      .input(PluginViewInput)
      .subscription((call) => plugins.view(call.input, connectionOf(call))),
    slot: publicProcedure
      .input(PluginSlotInput)
      .subscription((call) => plugins.slot(call.input, connectionOf(call))),
    render: publicProcedure
      .input(ReplaceableInput)
      .subscription((call) => plugins.render(call.input, connectionOf(call))),
  }),
);

// What an App sends back about a view it draws.
const createViewEventsRouter = routerFactory((plugins: PluginService) =>
  router({
    dispatch: publicProcedure
      .input(PluginDispatchInput)
      .mutation(async ({ input, ctx }) => {
        await plugins.dispatch(requireConnection(ctx.connection), input);

        return { ok: true as const };
      }),
    renderFailed: publicProcedure
      .input(RenderFailureInput)
      .mutation(({ input, ctx }) => {
        plugins.renderFailed(requireConnection(ctx.connection), input);

        return { ok: true as const };
      }),
  }),
);

export const createPluginsRouter = routerFactory((deps: PluginServiceDeps) => {
  const plugins = new PluginService(deps);

  return mergeRouters(
    createLifecycleRouter(plugins),
    createSettingsRouter(plugins),
    createViewsRouter(plugins),
    createViewEventsRouter(plugins),
  );
});
