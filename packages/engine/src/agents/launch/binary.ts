import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, rename, rm, chmod } from 'node:fs/promises';
import { basename, join } from 'node:path';
import type { BinaryTarget } from '@repo/contracts';
import { resolveRegistryServerPlatform } from '../registry/platform';
import { pruneVersions, versionFolder } from './binary-cache';
import { reserveBinary, serializeBinary } from './binary-reservations';
import { githubDigest } from './github-digest';
import { extractBinaryFiles } from './materialization/archive';
import {
  checkInstallationFile,
  installationPath,
} from './materialization/files';
import { executableMode } from './materialization/limits';
import { resolveNode } from './node';
import type {
  CommandInput,
  EntryInput as LaunchInput,
  RegistryCommand,
} from './types';

type BinaryInput = LaunchInput & {
  target: BinaryTarget;
  directory: string;
};

const validateCommand = (cmd: string): void => {
  if (cmd === 'node') return;

  if (!validRelativeCommand(cmd))
    throw new Error('Registry command must be ./relative without .., or node');
};

const binaryInput = (input: LaunchInput): BinaryInput => {
  const target =
    input.entry.distribution.binary?.[resolveRegistryServerPlatform()];

  if (!target) throw new Error('Registry binary target is missing');
  validateCommand(target.cmd);

  const directory = join(
    baseDirectory(input),
    versionFolder(input.entry, target),
  );

  return { ...input, target, directory };
};

export const binaryCommand = async (
  input: LaunchInput,
): Promise<RegistryCommand> => {
  const binary = binaryInput(input);
  const release = reserveBinary(binary.directory, input.signal);

  try {
    return await serializeBinary(baseDirectory(input), async () => ({
      ...(await prepareBinary(binary)),
      release,
    }));
  } catch (error) {
    release();
    throw error;
  }
};

const prepareBinary = async (
  binary: BinaryInput,
): Promise<Omit<RegistryCommand, 'release'>> => {
  binary.signal.throwIfAborted();
  await materialize(binary);
  const executable = await commandExecutable(binary);
  await pruneVersions({
    base: baseDirectory(binary),
    directory: binary.directory,
    isDirectoryInUse: binary.isDirectoryInUse,
  });
  binary.signal.throwIfAborted();

  return resolvedBinary(binary, executable);
};

const commandExecutable = async (input: BinaryInput): Promise<string> =>
  input.target.cmd === 'node'
    ? (await resolveNode(input)).node
    : checkInstallationFile(input.directory, input.target.cmd);

const materialize = async (input: BinaryInput): Promise<void> => {
  if (existsSync(input.directory)) return;
  const base = baseDirectory(input);
  await mkdir(base, { recursive: true });
  const staging = await mkdtemp(join(base, '.staging-'));

  try {
    await extract(input, staging);
    await rename(staging, input.directory);
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    throw error;
  }
};

const extractionRecipe = async (
  input: BinaryInput,
): Promise<Parameters<typeof extractBinaryFiles>[0]['recipe']> => {
  rejectArchiveFormat(input.target.archive);

  const sha256 =
    input.target.sha256 ??
    (await githubDigest({
      url: input.target.archive,
      ports: input.ports,
      signal: input.signal,
    }));

  const cmd = rawCommand(input.target);

  return { ...input.target, cmd, sha256 };
};

const rawCommand = (target: BinaryTarget): string =>
  target.cmd === 'node'
    ? basename(new URL(target.archive).pathname).replace(/\.gz$/, '')
    : target.cmd;

const extract = async (input: BinaryInput, staging: string): Promise<void> => {
  const recipe = await extractionRecipe(input);
  const bytes = await input.ports.download(input.target.archive, input.signal);
  await extractBinaryFiles({
    directory: staging,
    bytes,
    signal: input.signal,
    ports: input.ports,
    recipe,
  });

  if (input.target.cmd !== 'node') {
    await chmod(installationPath(staging, recipe.cmd), executableMode);
    await checkInstallationFile(staging, recipe.cmd);
  }
};

const unsupportedArchive =
  /\.(dmg|pkg|deb|rpm|msi|appimage|tar|tar.xz|txz|bz2|xz|7z)$/i;

const rejectArchiveFormat = (archive: string): void => {
  const path = new URL(archive).pathname;

  if (/\.(tar.bz2|tbz2)$/i.test(path)) return;

  if (unsupportedArchive.test(path))
    throw new Error('Unsupported Agent archive format');
};

const validRelativeCommand = (cmd: string): boolean =>
  cmd.startsWith('./') && !cmd.includes('..');

const baseDirectory = (input: CommandInput): string =>
  join(input.home, 'agents', 'registry', input.id);

const resolvedBinary = (
  input: BinaryInput,
  executable: string,
): Omit<RegistryCommand, 'release'> => ({
  executable,
  args: input.target.args ?? [],
  env: { ...input.shellEnv, ...input.target.env },
  directory: input.directory,
  version: input.entry.version,
});
