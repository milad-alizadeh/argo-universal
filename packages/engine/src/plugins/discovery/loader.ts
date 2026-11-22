import type { Dirent } from 'node:fs';
import { lstat, readdir, realpath, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { PluginList } from '@repo/contracts/plugins';
import { productName } from '@repo/contracts/product-identity';
import { z } from 'zod';
import { type Admitted, listed } from './listed-plugin';
import { readManifest } from './manifest';
import { readIconMarkup } from './manifest-icon';

export interface PluginsDeps {
  // The Server's runtime directory, `ARGO_HOME` or `~/.argo` (`resolveRuntimeDirectory`); user Plugins sit in its `plugins/`.
  home?: string;
  version: string;
  // The Server resolves where its shipped Plugins sit, so the loader never assumes a workspace layout; without one there are none.
  firstPartyPluginsDirectory?: string;
  acceptLinkedDevPlugins?: boolean;
}

type Discovery = {
  firstParty: boolean;
  acceptLinkedDevPlugins: boolean;
  version: string;
  result: PluginList;
  locations: Map<string, string>;
};

// A Plugin sits directly in a root or in one collection folder below it, such as `<home>/plugins/acme/sign-in`.
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
      acceptLinkedDevPlugins: deps.acceptLinkedDevPlugins === true,
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
      await admit(folder, depth, discovery);
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

// A direct symlink is the explicit admission for development (ADR-0030).
async function devLink(
  directory: string,
  depth: number,
  { acceptLinkedDevPlugins }: Discovery,
): Promise<string | null> {
  if (!acceptLinkedDevPlugins || depth !== 1) return null;

  if (!(await lstat(directory)).isSymbolicLink()) return null;

  if (!(await lstat(dirname(directory))).isDirectory()) return null;

  return realpath(directory);
}

async function admit(
  directory: string,
  depth: number,
  discovery: Discovery,
): Promise<void> {
  try {
    const source = discovery.firstParty
      ? directory
      : await devLink(directory, depth, discovery);

    const manifest = await readManifest(source ?? directory, discovery.version);

    // A Plugin that will not load has its untrusted icon file left unread.
    const iconMarkup = source
      ? await readIconMarkup(source, manifest.icon)
      : undefined;

    addManifest({ manifest, iconMarkup }, discovery, source !== null);

    if (source) discovery.locations.set(manifest.id, source);
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
  admitted: Admitted,
  { firstParty, result }: Discovery,
  loadable: boolean,
): void {
  const { id } = admitted.manifest;

  if (result.plugins.some((plugin) => plugin.manifest.id === id))
    throw new Error(`Duplicate Plugin id: ${id}`);

  // Installed Plugins wait for consent and an operating-system boundary (ADR-0030).
  if (!loadable)
    throw new Error(
      `Plugin is not loaded: only Plugins shipped with ${productName} load until ${productName} asks for consent`,
    );
  result.plugins.push(listed(admitted, firstParty));
}
