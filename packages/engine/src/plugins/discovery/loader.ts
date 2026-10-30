import type { Dirent } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { PluginList } from '@repo/contracts/plugins';
import { z } from 'zod';
import { notStarted } from '../protocol/runtime';
import { readManifest } from './manifest';

export interface PluginsDeps {
  // The Server's runtime directory, `ARGO_HOME` or `~/.argo` (`resolveRuntimeDirectory`); user Plugins sit in its `plugins/`.
  home?: string;
  version: string;
  // The Server resolves where its shipped Plugins sit, so the loader never assumes a workspace layout; without one there are none.
  firstPartyPluginsDirectory?: string;
}

type Discovery = {
  firstParty: boolean;
  version: string;
  result: PluginList;
  locations: Map<string, string>;
};

// A Plugin sits directly in a root or in one collection folder below it, such as `plugins/examples/github-sign-in`.
const maxDepth = 2;

/*
 * Discovery reads data only. Even a valid main is never imported until the Plugin host exists.
 * Order: the first-party root, then `<home>/plugins`; within each, Plugins directly in the root
 * come before collections, folders sort by name, and each manifest keeps its nav order. A later
 * Plugin with an id already listed is reported, so a user Plugin never replaces a first-party one.
 */
export async function discoverPlugins(
  deps: PluginsDeps,
  locations = new Map<string, string>(),
): Promise<PluginList> {
  const result: PluginList = { plugins: [], errors: [] };

  for (const { directory, firstParty } of pluginRoots(deps))
    await scan(directory, {
      firstParty,
      version: deps.version,
      result,
      locations,
    });

  return result;
}

type PluginRoot = { directory: string; firstParty: boolean };

function pluginRoots(deps: PluginsDeps): PluginRoot[] {
  const shipped = deps.firstPartyPluginsDirectory;

  return [
    ...(shipped ? [{ directory: shipped, firstParty: true }] : []),
    ...(deps.home
      ? [{ directory: join(deps.home, 'plugins'), firstParty: false }]
      : []),
  ];
}

type Pending = { folder: string; depth: number };

// Breadth-first, so Plugins directly in the root come before nested collections.
async function scan(directory: string, discovery: Discovery): Promise<void> {
  const pending: Pending[] = [{ folder: directory, depth: 0 }];

  for (const { folder, depth } of pending) {
    const entries = await readDirectory(folder, discovery.result);

    if (entries.some((entry) => entry.name === 'plugin.json'))
      await admit(folder, discovery);
    else pending.push(...(await children(folder, depth, entries)));
  }
}

async function children(
  folder: string,
  depth: number,
  entries: Dirent[],
): Promise<Pending[]> {
  if (depth >= maxDepth) return [];

  const folders = await pluginFolders(folder, entries);

  return folders.map((child) => ({ folder: child, depth: depth + 1 }));
}

async function pluginFolders(
  directory: string,
  entries: Dirent[],
): Promise<string[]> {
  const folders = await Promise.all(
    entries
      .values()
      .filter((entry) => !skipped(entry.name))
      .map((entry) => folderPath(entry, join(directory, entry.name)))
      .toArray(),
  );

  return folders.flat().sort();
}

const folderPath = async (entry: Dirent, path: string): Promise<string[]> =>
  (await isFolder(entry, path)) ? [path] : [];

const skipped = (name: string): boolean =>
  name.startsWith('.') || name === 'node_modules';

// A symlinked Plugin folder, as `ln -s` during development makes, counts as a folder.
async function isFolder(entry: Dirent, path: string): Promise<boolean> {
  if (entry.isDirectory()) return true;

  if (!entry.isSymbolicLink()) return false;

  return stat(path).then(
    (target) => target.isDirectory(),
    () => false,
  );
}

async function readDirectory(
  directory: string,
  result: PluginList,
): Promise<Dirent[]> {
  try {
    return await readdir(directory, { withFileTypes: true });
  } catch (error) {
    const parsed = ThrownError.parse(error);

    if (!missingDirectory(parsed)) reportError(directory, parsed, result);

    return [];
  }
}

// Anything thrown, as an Error whose message the list reports.
const ThrownError = z
  .instanceof(Error)
  .catch(({ input }) => new Error(String(input)));

const missingDirectory = (error: Error): boolean =>
  'code' in error && error.code === 'ENOENT';

async function admit(directory: string, discovery: Discovery): Promise<void> {
  try {
    const manifest = await readManifest(directory, discovery.version);

    addManifest(manifest, discovery);
    discovery.locations.set(manifest.id, directory);
  } catch (error) {
    reportError(directory, ThrownError.parse(error), discovery.result);
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

  // Third-party Plugins wait for consent and an operating-system boundary (ADR-0030), like Obsidian's Restricted mode.
  if (!firstParty)
    throw new Error(
      'Plugin is not loaded: only Plugins shipped with Argo load until Argo asks for consent',
    );
  result.plugins.push({ manifest, firstParty, enabled: true, ...notStarted });
}
