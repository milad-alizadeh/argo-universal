import { mkdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import type { ACPAgent } from '@repo/contracts';
import { checkInstallationFile } from '../install/materialization/files';
import { requireExactPackageVersion } from '../install/materialization/package-version';
import {
  npmInstallArgs,
  readNpmExecutable,
} from '../install/materialization/packages';
import type { InstallToolInput } from '../install/ports';
import { resolveNode, type NodeRuntime } from './node';
import { singleFlight } from './single-flight';
import type { EntryInput as NpmInput, RegistryCommand } from './types';

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

export const npmCommand = async (input: NpmInput): Promise<RegistryCommand> => {
  const directory = join(input.home, 'agents', 'registry', 'npx', input.id);
  const runtime = await resolveNode(input);
  const pkg = npmPackage(input);
  await installOnce({
    input,
    directory,
    runtime,
    specification: pkg.specification,
  });
  const executable = await installedExecutable(directory, pkg.name);

  return command({ input, runtime, directory, executable });
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
}: ResolvedNpm): RegistryCommand => ({
  release: () => {},
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

const install = async (installation: Installation): Promise<void> => {
  await mkdir(installation.directory, { recursive: true });
  await installation.input.ports.runTool(toolInput(installation));
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
    const version = requireExactPackageVersion(
      pkg.slice(name.length + 1),
      'npx',
    );

    return `${name}@0.0.0 - ${version}`;
  } catch {
    return pkg;
  }
};
