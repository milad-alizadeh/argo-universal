import { realpath } from 'node:fs/promises';
import { basename, join, sep } from 'node:path';
import type {
  ACPAgent,
  CustomAgentDefinition,
  InstallationOwner,
} from '@repo/contracts';
import type { Database } from '@repo/db';
import { agents } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import {
  checkSelectedFiles,
  readInstallSelection,
  selectedLaunchDefinition,
  type InstallSelection,
} from '../install/selection/selection';
import { resolveRegistryServerPlatform } from '../records';
import { createRegistryReader } from '../registry/registry-reader';
import { findOnPath } from './path-lookup';

// What the Resolver found for one Agent: the launch a Session would use, who owns it, and its version when known.
export type Installation = {
  definition: CustomAgentDefinition;
  owner: InstallationOwner;
  version?: string;
};
export type RegistrySource = { entry: ACPAgent; selection?: InstallSelection };

const reader = createRegistryReader();

const catalogEntry = (
  database: Database,
  agentId: string,
): ACPAgent | undefined => {
  const row = database
    .select({ metadata: agents.registryMetadata })
    .from(agents)
    .where(eq(agents.id, agentId))
    .get();
  if (!row?.metadata) return undefined;
  try {
    return reader.parseAgent(row.metadata);
  } catch {
    return undefined;
  }
};

// The Registry entry behind an Agent: its Argo installation's saved entry first, else its catalog row.
export const readRegistrySource = (
  database: Database,
  agentId: string,
): RegistrySource | undefined => {
  const selection = readInstallSelection(database, agentId);
  if (selection) return { entry: selection.entry, selection };
  const entry = catalogEntry(database, agentId);
  return entry && { entry };
};

const realOrSame = (path: string): Promise<string> =>
  realpath(path).catch(() => path);
// Argo-managed is read from where the file really is, never stored.
const ownerOf = async (
  home: string,
  file: string,
): Promise<InstallationOwner> => {
  const [folder, real] = await Promise.all([
    realOrSame(join(home, 'agents')),
    realOrSame(file),
  ]);
  return real.startsWith(folder + sep) ? 'argo' : 'unknown';
};

const argoInstallation = async (
  home: string,
  agentId: string,
  selection: InstallSelection,
): Promise<Installation | undefined> => {
  try {
    const file = await checkSelectedFiles(home, agentId, selection);
    const definition = await selectedLaunchDefinition(home, agentId, selection);
    const version = selection.packageVersion ?? selection.entry.version;
    return { definition, owner: await ownerOf(home, file), version };
  } catch {
    return undefined;
  }
};

// One file name on every platform, so PATH can be searched by it; a platform-specific name is never guessed.
const entrypointName = (entry: ACPAgent): string | undefined => {
  const names = new Set(
    Object.values(entry.distribution.binary ?? {}).map(({ cmd }) =>
      basename(cmd).replace(/\.exe$/i, ''),
    ),
  );
  const [name] = names;
  return names.size === 1 ? name : undefined;
};

const pathInstallation = async (
  home: string,
  entry: ACPAgent,
): Promise<Installation | undefined> => {
  const target = entry.distribution.binary?.[resolveRegistryServerPlatform()];
  const name = entrypointName(entry);
  if (!target || !name) return undefined;
  const file = await findOnPath(name);
  if (!file) return undefined;
  const env = Object.entries(target.env ?? {}).map(([key, value]) => ({
    name: key,
    value,
  }));
  return {
    definition: { name: entry.name, executable: file, args: target.args ?? [], env },
    owner: await ownerOf(home, file),
  };
};

// Argo's own folder wins over PATH; nothing found is undefined.
export const resolveRegistryInstallation = async (
  home: string,
  agentId: string,
  source: RegistrySource,
): Promise<Installation | undefined> =>
  (source.selection &&
    (await argoInstallation(home, agentId, source.selection))) ||
  pathInstallation(home, source.entry);
