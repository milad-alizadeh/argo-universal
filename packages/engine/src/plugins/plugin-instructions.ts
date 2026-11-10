import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { PluginInstruction } from '@repo/contracts/operations/control';
import {
  locatePlugins,
  type LocateDeps,
  type LocatedPlugin,
} from './located-plugins';

// Plugin instructions are prose in a file beside the manifest, so core reads them while the Plugin's code stays unloaded.
export async function pluginInstructions(
  deps: LocateDeps,
): Promise<PluginInstruction[]> {
  const enabled = (await locatePlugins(deps)).filter(
    ({ plugin }) => plugin.enabled,
  );

  const read = await Promise.all(enabled.map(instructionOf));

  return read.filter((found) => found !== undefined).toSorted(byPluginId);
}

const byPluginId = (a: PluginInstruction, b: PluginInstruction): number =>
  Number(a.pluginId > b.pluginId) - Number(a.pluginId < b.pluginId);

// A Plugin whose file cannot be read gives nothing, so it never takes the others' prose with it.
async function instructionOf({
  plugin: { manifest },
  directory,
}: LocatedPlugin): Promise<PluginInstruction | undefined> {
  const { instructions } = manifest.contributes;

  if (instructions === undefined) return undefined;

  const read = await readFile(join(directory, instructions), 'utf8').catch(
    () => '',
  );

  const text = read.trim();

  return text
    ? { pluginId: manifest.id, name: manifest.name, text }
    : undefined;
}
