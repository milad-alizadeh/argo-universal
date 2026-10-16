import type { Dirent } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PluginList } from '@repo/contracts';
import { z } from 'zod';
import { readManifest } from './manifest';

export interface PluginsDeps {
  home?: string;
  version: string;
  firstPartyPluginsDirectory?: string;
}

type Discovery = { firstParty: boolean; version: string; result: PluginList };

// Discovery reads data only. Even a valid main is never imported until the Plugin host exists.
export async function discoverPlugins(deps: PluginsDeps): Promise<PluginList> {
  const result: PluginList = { plugins: [], errors: [] };

  const shipped =
    deps.firstPartyPluginsDirectory ??
    fileURLToPath(new URL('../../../../plugins', import.meta.url));

  await scan(shipped, { firstParty: true, version: deps.version, result });

  if (deps.home)
    await scan(join(deps.home, 'plugins'), {
      firstParty: false,
      version: deps.version,
      result,
    });

  return result;
}

// Breadth-first puts Plugins directly in the root before nested example collections; each directory has a stable order.
async function scan(directory: string, discovery: Discovery): Promise<void> {
  const pending = [directory];

  for (const folder of pending) {
    const entries = await readDirectory(folder, discovery.result);

    if (entries.some((entry) => entry.name === 'plugin.json'))
      await admit(folder, discovery);
    else pending.push(...pluginFolders(folder, entries));
  }
}

const pluginFolders = (directory: string, entries: Dirent[]): string[] =>
  entries
    .values()
    .filter((entry) => entry.isDirectory())
    .filter(
      (entry) => !entry.name.startsWith('.') && entry.name !== 'node_modules',
    )
    .map((entry) => join(directory, entry.name))
    .toArray()
    .sort();

async function readDirectory(
  directory: string,
  result: PluginList,
): Promise<Dirent[]> {
  try {
    return await readdir(directory, { withFileTypes: true });
  } catch (error) {
    const parsed = z
      .instanceof(Error)
      .catch(new Error(String(error)))
      .parse(error);

    if (!missingDirectory(parsed)) reportError(directory, parsed, result);

    return [];
  }
}

const missingDirectory = (error: Error): boolean =>
  'code' in error && error.code === 'ENOENT';

async function admit(directory: string, discovery: Discovery): Promise<void> {
  try {
    const manifest = await readManifest(directory, discovery.version);

    addManifest(manifest, discovery);
  } catch (error) {
    reportError(
      directory,
      z
        .instanceof(Error)
        .catch(new Error(String(error)))
        .parse(error),
      discovery.result,
    );
  }
}

function reportError(
  directory: string,
  error: Error,
  result: PluginList,
): void {
  result.errors.push({
    directory,
    message: error.message,
  });
}

function addManifest(
  manifest: PluginList['plugins'][number]['manifest'],
  { firstParty, result }: Discovery,
): void {
  if (result.plugins.some((plugin) => plugin.manifest.id === manifest.id))
    throw new Error(`Duplicate Plugin id: ${manifest.id}`);
  result.plugins.push({ manifest, firstParty, enabled: true });
}
