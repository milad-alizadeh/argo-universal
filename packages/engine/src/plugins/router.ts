import { PluginList } from '@repo/contracts';
import { publicProcedure, router, routerFactory } from '../rpc';
import { discoverPlugins, type PluginsDeps } from './loader';

export const createPluginsRouter = routerFactory((deps: PluginsDeps) =>
  router({
    list: publicProcedure.output(PluginList).query(() => discoverPlugins(deps)),
  }),
);
