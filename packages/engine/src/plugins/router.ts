import { PluginActivation, PluginList } from '@repo/contracts/plugins';
import { PluginStatus } from '@repo/contracts/plugins/runtime';
import { PluginDispatchInput, PluginViewInput } from '@repo/contracts/plugins/wire';
import { publicProcedure, router, routerFactory } from '../rpc';
import { PluginService, type PluginServiceDeps } from './service';

export const createPluginsRouter = routerFactory((deps: PluginServiceDeps) => {
  const plugins = new PluginService(deps);

  return router({
    list: publicProcedure.output(PluginList).query(() => plugins.list()),
    failures: publicProcedure.subscription(({ signal }) =>
      watchFailures(plugins, signal),
    ),
    view: publicProcedure
      .input(PluginViewInput)
      .subscription(({ input, signal }) => plugins.view(input, requireSignal(signal))),
    dispatch: publicProcedure
      .input(PluginDispatchInput)
      .mutation(({ input }) => plugins.dispatch(input)),
    // Proposed lifecycle seam until pages, Slots and actions request activation.
    activate: publicProcedure
      .input(PluginActivation)
      .output(PluginStatus)
      .mutation(({ input }) => plugins.activate(input.pluginId)),
  });
});

function requireSignal(signal: AbortSignal | undefined): AbortSignal {
  if (!signal) throw new Error('Plugin subscription signal is missing');

  return signal;
}

function watchFailures(
  plugins: PluginService,
  signal: AbortSignal | undefined,
): ReturnType<PluginService['failures']> {
  if (!signal) throw new Error('Plugin subscription signal is missing');

  return plugins.failures(signal);
}
