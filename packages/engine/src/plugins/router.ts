import { PluginActivation, PluginList } from '@repo/contracts/plugins';
import { PluginStatus } from '@repo/contracts/plugins/runtime';
import { mergeRouters, publicProcedure, router, routerFactory } from '../rpc';
import { PluginService, type PluginServiceDeps } from './service';
import { createPluginViewRouter, requireSignal } from './view-router';

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

export const createPluginsRouter = routerFactory((deps: PluginServiceDeps) => {
  const plugins = new PluginService(deps);

  return mergeRouters(
    createLifecycleRouter(plugins),
    createPluginViewRouter(plugins),
  );
});
