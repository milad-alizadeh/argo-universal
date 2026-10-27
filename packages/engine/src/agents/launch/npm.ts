import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, rename, rm } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import type { ACPAgent } from '@repo/contracts';
import { checkInstallationFile } from './materialization/files';
import { requireExactPackageVersion } from './materialization/package-version';
import { npmInstallArgs, readNpmExecutable } from './materialization/packages';
import { resolveNode, type NodeRuntime } from './node';
import type { InstallToolInput } from './ports';
import { singleFlight } from './single-flight';
import type { EntryInput as NpmInput, RegistryCommand } from './types';
import {
  pruneVersions,
  reserveVersion,
  versionFolder,
} from './version-folders';

type NpmPackage = { name: string; specification: string };

type Installation = {
  input: NpmInput;
  directory: string;
  runtime: NodeRuntime;
  specification: string;
};

const npmPackage = (input: NpmInput): NpmPackage => {
  const pkg = distribution(input).package;
  const name = pkg.replace(/@[^@/]+$/, '');

  return { name, specification: boundedSpecification(name, pkg) };
};

// Each Registry version installs once into its own folder; older folders go once no connection uses them.
export const npmCommand = async (input: NpmInput): Promise<RegistryCommand> => {
  const base = join(input.home, 'agents', 'registry', 'npx', input.id);
  const source = distribution(input).package;
  const directory = join(base, versionFolder(input.entry.version, source));
  const release = reserveVersion(directory, input.signal);

  try {
    const resolved = await installVersion(input, directory);
    await pruneVersions({ ...input, base, directory });

    return { ...command(resolved), release };
  } catch (error) {
    release();
    throw error;
  }
};

const installVersion = async (
  input: NpmInput,
  directory: string,
): Promise<ResolvedNpm> => {
  const runtime = await resolveNode(input);
  const pkg = npmPackage(input);
  await installOnce({
    input,
    directory,
    runtime,
    specification: pkg.specification,
  });
  const executable = await installedExecutable(directory, pkg.name);

  return { input, runtime, directory, executable };
};

const installedExecutable = async (
  directory: string,
  name: string,
): Promise<string> => {
  const file = await readNpmExecutable(directory, name);

  return checkInstallationFile(directory, relative(directory, file), false);
};

type ResolvedNpm = {
  input: NpmInput;
  runtime: NodeRuntime;
  directory: string;
  executable: string;
};

const command = ({
  input,
  runtime,
  directory,
  executable,
}: ResolvedNpm): Omit<RegistryCommand, 'release'> => ({
  executable: runtime.node,
  args: [executable, ...distributionArgs(input)],
  env: { ...runtime.env, ...distribution(input).env },
  directory,
  version: input.entry.version,
});

const toolInput = ({
  input,
  directory,
  runtime,
  specification,
}: Installation): InstallToolInput => ({
  executable: runtime.npm,
  args: npmInstallArgs(directory, specification),
  cwd: directory,
  env: runtime.env,
  signal: input.signal,
});

const installOnce = (installation: Installation): Promise<void> =>
  singleFlight(installation.directory, installation.input.signal, (signal) =>
    install({ ...installation, input: { ...installation.input, signal } }),
  );

// A version folder exists only once npm finished in it, so later connections launch it without installing again.
const install = async (installation: Installation): Promise<void> => {
  if (existsSync(installation.directory)) return;
  const base = dirname(installation.directory);
  await mkdir(base, { recursive: true });
  const staging = await mkdtemp(join(base, '.staging-'));

  try {
    await installation.input.ports.runTool(
      toolInput({ ...installation, directory: staging }),
    );
    await rename(staging, installation.directory);
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    throw error;
  }
};

const distribution = (
  input: NpmInput,
): NonNullable<ACPAgent['distribution']['npx']> => {
  const value = input.entry.distribution.npx;

  if (!value) throw new Error('Registry npm distribution is missing');

  return value;
};

const distributionArgs = (input: NpmInput): string[] =>
  distribution(input).args ?? [];

const boundedSpecification = (name: string, pkg: string): string => {
  try {
    const version = requireExactPackageVersion(pkg.slice(name.length + 1));

    return `${name}@0.0.0 - ${version}`;
  } catch {
    return pkg;
  }
};
