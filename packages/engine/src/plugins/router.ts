import {
  PluginActivation,
  PluginEnablement,
  PluginList,
  PluginSettingChange,
  PluginSettings,
} from '@repo/contracts/plugins';
import { PluginStatus } from '@repo/contracts/plugins/runtime';
import { mergeRouters, publicProcedure, router, routerFactory } from '../rpc';
import { PluginService, type PluginServiceDeps } from './service';
import { createPluginViewRouter, requireSignal } from './views/router';

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

export const createPluginsRouter = routerFactory((deps: PluginServiceDeps) => {
  const plugins = new PluginService(deps);

  return mergeRouters(
    createLifecycleRouter(plugins),
    createSettingsRouter(plugins),
    createPluginViewRouter(plugins),
  );
});
