import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { PluginInstruction } from '@repo/contracts/operations/control';
import { discoverPlugins } from './discovery/loader';
import { applyEnabled, type LocateDeps } from './located-plugins';

// Plugin instructions are prose in a file beside the manifest, so core reads them while the Plugin's code stays unloaded.
export async function pluginInstructions(
  deps: LocateDeps,
): Promise<PluginInstruction[]> {
  const locations = new Map<string, string>();
  const list = await discoverPlugins(deps, locations);
  applyEnabled(list, deps.pluginSettings);

  const read = list.plugins
    .filter(({ enabled }) => enabled)
    .map(({ manifest }) => ({ manifest, directory: locations.get(manifest.id) }))
    .map(({ manifest, directory }) =>
      instructionOf(manifest, directory),
    );

  const found = await Promise.all(read);

  return found
    .filter((entry) => entry !== undefined)
    .toSorted((a, b) => Number(a.pluginId > b.pluginId) - Number(a.pluginId < b.pluginId));
}

async function instructionOf(
  manifest: { id: string; name: string; contributes: { instructions?: string } },
  directory: string | undefined,
): Promise<PluginInstruction | undefined> {
  const file = manifest.contributes.instructions;

  if (file === undefined || directory === undefined) return undefined;

  const text = (await readFile(join(directory, file), 'utf8')).trim();

  return text && { pluginId: manifest.id, name: manifest.name, text };
}
