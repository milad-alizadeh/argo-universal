import { PluginActivation, PluginList } from '@repo/contracts/plugins';
import { PluginStatus } from '@repo/contracts/plugins/runtime';
import { publicProcedure, router, routerFactory } from '../rpc';
import { PluginService, type PluginServiceDeps } from './service';

export const createPluginsRouter = routerFactory((deps: PluginServiceDeps) => {
  const plugins = new PluginService(deps);

  return router({
    list: publicProcedure.output(PluginList).query(() => plugins.list()),
    // Proposed lifecycle seam until pages, Slots and actions request activation.
    activate: publicProcedure
      .input(PluginActivation)
      .output(PluginStatus)
      .mutation(({ input }) => plugins.activate(input.pluginId)),
  });
});
