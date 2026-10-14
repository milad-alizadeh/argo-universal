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
import { homebrewFormula, outsideOwner } from './owner';
import { installedPackageVersion, npmPackageName } from './package-version';
import { findFirstOnPath } from './path-lookup';
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

  return real.startsWith(folder + sep) ? 'argo' : outsideOwner(real);
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

// `npmPackage` names the package whose command an npx entry is found by.
type Searched = {
  target: LaunchTarget;
  names: readonly string[];
  npmPackage?: string;
};

const binarySearch = (entry: ACPAgent): Searched | undefined => {
  const binary = pathTarget(entry);

  return binary && { target: binary.target, names: [binary.name] };
};

// What PATH is searched for: a binary entrypoint name, else any of an npx entry's command names.
const searchedTarget = (source: RegistrySource): Searched | undefined =>
  binarySearch(source.entry) ?? npxTarget(source);

const npxTarget = ({
  entry,
  commandNames,
}: RegistrySource): Searched | undefined => {
  const npx = entry.distribution.npx;

  return npx && commandNames
    ? { target: npx, names: commandNames, npmPackage: npmPackageName(entry) }
    : undefined;
};

const pathInstallation = async (
  home: string,
  source: RegistrySource,
): Promise<Installation | undefined> => {
  const searched = searchedTarget(source);

  if (!searched) return undefined;
  const file = await findFirstOnPath(searched.names);

  return file ? foundOnPath(home, source.entry, { searched, file }) : undefined;
};

// An npm command's version is its package's, a Homebrew formula's is its Cellar folder's; any other binary's is known only once it answers ACP initialize.
const pathVersion = async (
  { npmPackage }: Searched,
  file: string,
): Promise<Pick<Installation, 'version'>> => {
  const version =
    (await packageVersion(file, npmPackage)) ?? (await formulaVersion(file));

  return version ? { version } : {};
};

const packageVersion = async (
  file: string,
  npmPackage?: string,
): Promise<string | undefined> =>
  npmPackage ? installedPackageVersion(file, npmPackage) : undefined;

const formulaVersion = async (file: string): Promise<string | undefined> =>
  homebrewFormula(await realOrSame(file))?.version;

const foundOnPath = async (
  home: string,
  entry: ACPAgent,
  { searched, file }: { searched: Searched; file: string },
): Promise<Installation> => ({
  definition: targetDefinition(entry, searched.target, file),
  owner: await ownerOf(home, file),
  ...(await pathVersion(searched, file)),
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
