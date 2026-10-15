import { mkdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import type { ACPAgent } from '@repo/contracts';
import { checkInstallationFile } from '../install/materialization/files';
import { requireExactPackageVersion } from '../install/materialization/package-version';
import { readNpmExecutable } from '../install/materialization/packages';
import type { InstallPorts, InstallToolInput } from '../install/ports';
import { resolveNode, type NodeRuntime } from './node';
import { singleFlight } from './single-flight';
import type { CommandInput, RegistryCommand } from './types';

type NpmInput = CommandInput & { ports: InstallPorts; entry: ACPAgent };

type NpmPackage = { name: string; specification: string };

type Installation = {
  input: NpmInput;
  directory: string;
  runtime: NodeRuntime;
  specification: string;
};

const npmPackage = (input: NpmInput): NpmPackage => {
  const pkg = distribution(input).package;

  if (!pkg) throw new Error('Registry npm distribution is missing');
  const name = pkg.replace(/@[^@/]+$/, '');

  return { name, specification: boundedSpecification(name, pkg) };
};

export const npmCommand = async (input: NpmInput): Promise<RegistryCommand> => {
  const directory = join(input.home, 'agents', 'registry', 'npx', input.id);
  const runtime = await resolveNode(input);
  const pkg = npmPackage(input);
  await singleFlight(directory, () =>
    install({ input, directory, runtime, specification: pkg.specification }),
  );
  const file = await readNpmExecutable(directory, pkg.name);

  const executable = await checkInstallationFile(
    directory,
    relative(directory, file),
    false,
  );

  return command({ input, runtime, directory, executable });
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
  args: ['install', specification, '--save-exact'],
  cwd: directory,
  env: runtime.env,
  signal: input.signal,
});

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
