import type { OperationId } from '@repo/contracts/operations';
import { pluginGuide } from '@repo/contracts/operations/plugin-guide';
import type { PluginList, PluginSettings } from '@repo/contracts/plugins';
import type { PluginStatus } from '@repo/contracts/plugins/runtime';
import type { PluginService } from '../plugins';
import type { OperationImplementations } from './operations';

// `plugin.new` writes into a Session's Checkout, so Sessions answer it.
type PluginImplementations = Pick<
  OperationImplementations,
  Exclude<Extract<OperationId, `plugin.${string}`>, 'plugin.new'>
>;

type PluginCompletion = { ok: true };

// The guide answers from Contracts' own text, so the blueprint and the kit's reference come from where their schemas are.
const readOperations = (
  plugins: PluginService,
): Pick<PluginImplementations, 'plugin.list' | 'plugin.guide'> => ({
  'plugin.list': (): Promise<PluginList> => plugins.list(),
  'plugin.guide': async () => pluginGuide(),
});

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
    ...readOperations(plugins),
    'plugin.activate': ({ pluginId }): Promise<PluginStatus> =>
      plugins.activate(pluginId),
  };
}

async function complete(change: Promise<void>): Promise<PluginCompletion> {
  await change;

  return { ok: true };
}
