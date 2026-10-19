import type {
  PluginAssetRef,
  PluginAssetSource,
} from '@repo/contracts/plugins/assets';
import type { ActivatedPlugin, PluginAccess } from '../access/plugin-access';
import type { AssetContent } from '../assets/content';
import { readAssetFile } from '../assets/file';
import type { PluginAssets } from '../assets/plugin-assets';
import { firstHop, type PluginNetwork } from './plugin-fetch';
import type { PluginResources } from './plugin-resources';

type AssetCall = {
  pluginId: string;
  access: PluginAccess;
  network: PluginNetwork;
  resources: PluginResources;
  assets: PluginAssets;
  activated: () => ActivatedPlugin | undefined;
};

export async function resolvePluginAsset(
  source: PluginAssetSource,
  context: AssetCall,
): Promise<PluginAssetRef> {
  const plugin = requirePlugin(context);

  const content = await readAssetContent(source, {
    ...context,
    codeFolder: plugin.codeFolder,
  });

  if (plugin !== context.activated()) throw new Error('Plugin is stopped');

  return context.assets.save(context.pluginId, content);
}

function requirePlugin(context: AssetCall): ActivatedPlugin {
  const plugin = context.activated();

  if (!plugin) throw new Error('Plugin is stopped');

  return plugin;
}

function readAssetContent(
  source: PluginAssetSource,
  context: AssetCall & { codeFolder: string },
): Promise<AssetContent> {
  if ('asset' in source) return readAssetFile(context.codeFolder, source.asset);

  return context.resources.asset(firstHop(source), context);
}
