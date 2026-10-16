import { createHash } from 'node:crypto';
import { readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import type { ACPAgent, BinaryTarget } from '@repo/contracts';
import { isBinaryReserved } from './binary-reservations';

const hashLength = 16;

const hash = (value: string): string =>
  createHash('sha256').update(value).digest('hex').slice(0, hashLength);

export const versionFolder = (
  entry: ACPAgent,
  target: BinaryTarget,
): string => {
  const checksum = target.sha256
    ? `\0sha256:${target.sha256.toLowerCase()}`
    : '';

  return `v_${entry.version.replaceAll(/[^a-zA-Z0-9._-]/g, '-')}_${hash(entry.version)}_${hash(target.archive + checksum)}`;
};

export const pruneVersions = async (input: {
  base: string;
  directory: string;
  isDirectoryInUse: (directory: string) => boolean;
}): Promise<void> => {
  const entries = await readdir(input.base, { withFileTypes: true });

  for (const entry of entries.filter(
    (file) => file.isDirectory() && file.name.startsWith('v_'),
  ))
    await pruneVersion(input, join(input.base, entry.name));
};

const pruneVersion = async (
  input: {
    directory: string;
    isDirectoryInUse: (directory: string) => boolean;
  },
  directory: string,
): Promise<void> => {
  if (directory === input.directory) return;

  if (protectedVersion(directory, input.isDirectoryInUse)) return;
  await rm(directory, { recursive: true, force: true });
};

const protectedVersion = (
  directory: string,
  inUse: (directory: string) => boolean,
): boolean => isBinaryReserved(directory) || inUse(directory);
