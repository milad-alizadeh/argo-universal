import type {
  PluginAssetRef,
  PluginAssetSource,
} from '@repo/contracts/plugins/assets';
import type { AssetContent } from './asset-content';
import { readAssetFile } from './asset-file';
import type { PluginAssets } from './assets';
import type { ActivatedPlugin } from './plugin-access';
import type { MachineContext } from './plugin-calls';
import { firstHop } from './plugin-fetch';

type AssetCall = Pick<
  MachineContext,
  'pluginId' | 'access' | 'network' | 'resources'
> & {
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
