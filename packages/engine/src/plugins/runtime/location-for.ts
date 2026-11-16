import type { PluginManifest } from '@repo/contracts/plugins';
import type { PluginLocation } from './plugin-location';

export function locationFor(
  manifest: PluginManifest,
  directory: string,
): PluginLocation {
  const { contributes } = manifest;

  return {
    entry: entryFor(manifest, directory),
    name: manifest.name,
    capabilities: manifest.capabilities ?? [],
    hooks: contributes.hooks ?? [],
    navIds: contributes.nav.map(({ id }) => id),
    ...pick(contributes),
  };
}

function entryFor(
  manifest: PluginManifest,
  directory: string,
): PluginLocation['entry'] {
  return {
    pluginId: manifest.id,
    directory,
    main: manifest.main,
    ...passPaths(manifest.contributes),
    accountPaths: manifest.contributes.accounts?.map(({ page }) => page),
  };
}

// What runs on its own clock or is run by an Agent: the Background pass, the Watch and the Operations.
const pick = ({
  background,
  watch,
  operations,
}: PluginManifest['contributes']): Pick<
  PluginLocation,
  'background' | 'watch' | 'operations'
> => ({ background, watch, operations });

// The Loader page a Background pass runs and the function a Watch runs, as the worker validates them.
const passPaths = ({
  background,
  watch,
}: PluginManifest['contributes']): Pick<
  PluginLocation['entry'],
  'backgroundPath' | 'watchPath'
> => ({
  backgroundPath: background?.path,
  watchPath: watch?.path,
});
