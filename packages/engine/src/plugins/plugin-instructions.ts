import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { PluginInstruction } from '@repo/contracts/operations/control';
import type { PluginList } from '@repo/contracts/plugins';
import { discoverPlugins } from './discovery/loader';
import { applyEnabled, type LocateDeps } from './located-plugins';

type Entry = { plugin: PluginList['plugins'][number]; directory: string };

// Plugin instructions are prose in a file beside the manifest, so core reads them while the Plugin's code stays unloaded.
export async function pluginInstructions(
  deps: LocateDeps,
): Promise<PluginInstruction[]> {
  const entries = await enabledEntries(deps);
  const read = await Promise.all(entries.map(instructionOf));

  return read.filter((found) => found !== undefined).toSorted(byPluginId);
}

async function enabledEntries(deps: LocateDeps): Promise<Entry[]> {
  const locations = new Map<string, string>();
  const list = await discoverPlugins(deps, locations);
  applyEnabled(list, deps.pluginSettings);

  return list.plugins.flatMap((plugin) => {
    const directory = locations.get(plugin.manifest.id);

    return plugin.enabled && directory ? [{ plugin, directory }] : [];
  });
}

const byPluginId = (a: PluginInstruction, b: PluginInstruction): number =>
  Number(a.pluginId > b.pluginId) - Number(a.pluginId < b.pluginId);

async function instructionOf({
  plugin: { manifest },
  directory,
}: Entry): Promise<PluginInstruction | undefined> {
  const { instructions } = manifest.contributes;

  if (instructions === undefined) return undefined;

  const text = (await readFile(join(directory, instructions), 'utf8')).trim();

  return text
    ? { pluginId: manifest.id, name: manifest.name, text }
    : undefined;
}
