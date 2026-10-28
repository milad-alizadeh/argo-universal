import type { OperationId } from '@repo/contracts/operations';
import type { PluginList, PluginSettings } from '@repo/contracts/plugins';
import type { PluginStatus } from '@repo/contracts/plugins/runtime';
import type { PluginService } from '../plugins';
import type { OperationImplementations } from './operations';

type PluginImplementations = Pick<
  OperationImplementations,
  Extract<OperationId, `plugin.${string}`>
>;

type PluginCompletion = { ok: true };

export function createPluginOperations(
  plugins: PluginService,
): PluginImplementations {
  return {
    'plugin.setEnabled': ({ pluginId, enabled }): Promise<PluginCompletion> =>
      complete(plugins.setEnabled(pluginId, enabled)),
    'plugin.getSettings': ({ pluginId }): Promise<PluginSettings> =>
      plugins.settings(pluginId),
    'plugin.setSetting': (change): Promise<PluginCompletion> =>
      complete(plugins.setSetting(change)),
    'plugin.list': (): Promise<PluginList> => plugins.list(),
    'plugin.activate': ({ pluginId }): Promise<PluginStatus> =>
      plugins.activate(pluginId),
  };
}

async function complete(change: Promise<void>): Promise<PluginCompletion> {
  await change;

  return { ok: true };
}
