import type { OperationId } from '@repo/contracts/operations';
import { pluginGuide } from '@repo/contracts/operations/plugin-guide';
import type { PluginList, PluginSettings } from '@repo/contracts/plugins';
import type { PluginStatus } from '@repo/contracts/plugins/runtime';
import type { DraftSessions, PluginsRouterDeps } from '../plugins';
import type { OperationImplementations } from './operations';

// `plugin.new` writes into a Session's Checkout, so Sessions answer it.
type PluginImplementations = Pick<
  OperationImplementations,
  Exclude<Extract<OperationId, `plugin.${string}`>, 'plugin.new'>
>;

type PluginCompletion = { ok: true };

// The guide answers from Contracts' own text, so the blueprint and the kit's reference come from where their schemas are.
const readOperations = ({
  plugins,
}: Pick<PluginsRouterDeps, 'plugins'>): Pick<
  PluginImplementations,
  'plugin.list' | 'plugin.guide'
> => ({
  'plugin.list': (): Promise<PluginList> => plugins.list(),
  'plugin.guide': async (input) => pluginGuide(input),
});

export function createPluginOperations(
  { plugins, drafts }: Pick<PluginsRouterDeps, 'plugins' | 'drafts'>,
  sessions: DraftSessions,
): PluginImplementations {
  return {
    'plugin.setEnabled': ({ pluginId, enabled }): Promise<PluginCompletion> =>
      complete(plugins.setEnabled(pluginId, enabled)),
    'plugin.getSettings': ({ pluginId }): Promise<PluginSettings> =>
      plugins.settings(pluginId),
    'plugin.setSetting': (change): Promise<PluginCompletion> =>
      complete(plugins.setSetting(change)),
    ...readOperations({ plugins }),
    'plugin.draft.show': ({
      pluginId,
      region,
      sessionId,
    }): Promise<PluginCompletion> =>
      complete(drafts.show(pluginId, region, sessionId)),
    'plugin.draft.choose': (choice) => drafts.choose(choice, sessions),
    'plugin.draft.pick': async ({ pluginId }) => ({
      choice: drafts.pick(pluginId),
    }),
    'plugin.activate': ({ pluginId }): Promise<PluginStatus> =>
      plugins.activate(pluginId),
  };
}

async function complete(change: Promise<void>): Promise<PluginCompletion> {
  await change;

  return { ok: true };
}
