import { realpath } from 'node:fs/promises';
import { basename, join, sep } from 'node:path';
import type {
  ACPAgent,
  CustomAgentDefinition,
  InstallationOwner,
} from '@repo/contracts';
import {
  checkSelectedFiles,
  selectedLaunchDefinition,
  type InstallSelection,
} from '../install/selection/selection';
import { resolveRegistryServerPlatform } from '../records';
import { findOnPath } from './path-lookup';
import type { RegistrySource } from './registry-source';
export { readRegistrySource, type RegistrySource } from './registry-source';

// What the Resolver found for one Agent: the launch a Session would use, who owns it, and its version when known.
export type Installation = {
  definition: CustomAgentDefinition;
  owner: InstallationOwner;
  version?: string;
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

type BinaryTarget = NonNullable<ACPAgent['distribution']['binary']>[string];
// This platform's target, when its entrypoint has a name PATH can be searched by.
const pathTarget = (
  entry: ACPAgent,
): { target: BinaryTarget; name: string } | undefined => {
  const target = platformTarget(entry);
  const name = entrypointName(entry);
  return target && name ? { target, name } : undefined;
};
const platformTarget = (entry: ACPAgent): BinaryTarget | undefined =>
  entry.distribution.binary?.[resolveRegistryServerPlatform()];
const targetDefinition = (
  entry: ACPAgent,
  target: LaunchTarget,
  executable: string,
): CustomAgentDefinition => ({
  name: entry.name,
  executable,
  args: target.args ?? [],
  env: Object.entries(target.env ?? {}).map(([name, value]) => ({
    name,
    value,
  })),
});

type LaunchTarget = Pick<BinaryTarget, 'args' | 'env'>;
// What PATH is searched for: a binary entrypoint name, else an npx entry's command name.
const searchedTarget = (
  source: RegistrySource,
): { target: LaunchTarget; name: string } | undefined => {
  const binary = pathTarget(source.entry);
  return binary ?? npxTarget(source);
};
const npxTarget = ({
  entry,
  commandName,
}: RegistrySource): { target: LaunchTarget; name: string } | undefined => {
  const npx = entry.distribution.npx;
  return npx && commandName ? { target: npx, name: commandName } : undefined;
};
const pathInstallation = async (
  home: string,
  source: RegistrySource,
): Promise<Installation | undefined> => {
  const searched = searchedTarget(source);
  if (!searched) return undefined;
  const file = await findOnPath(searched.name);
  return file
    ? foundOnPath(home, source.entry, { target: searched.target, file })
    : undefined;
};
const foundOnPath = async (
  home: string,
  entry: ACPAgent,
  { target, file }: { target: LaunchTarget; file: string },
): Promise<Installation> => ({
  definition: targetDefinition(entry, target, file),
  owner: await ownerOf(home, file),
});

// Argo's own folder wins over PATH; nothing found is undefined.
export const resolveRegistryInstallation = async (
  home: string,
  agentId: string,
  source: RegistrySource,
): Promise<Installation | undefined> =>
  (source.selection &&
    (await argoInstallation(home, agentId, source.selection))) ||
  pathInstallation(home, source);
