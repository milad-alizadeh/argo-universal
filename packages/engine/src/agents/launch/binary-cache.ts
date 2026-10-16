import { createHash } from 'node:crypto';
import { readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import type { BinaryTarget } from '@repo/contracts';
import { isVersionReserved } from './binary-reservations';

const hashLength = 16;

const hash = (value: string): string =>
  createHash('sha256').update(value).digest('hex').slice(0, hashLength);

// One folder per Registry version and download source, so a new version never rewrites files a running Agent uses.
export const versionFolder = (version: string, source: string): string =>
  `v_${version.replaceAll(/[^a-zA-Z0-9._-]/g, '-')}_${hash(version)}_${hash(source)}`;

export const binarySource = (target: BinaryTarget): string =>
  target.archive +
  (target.sha256 ? `\0sha256:${target.sha256.toLowerCase()}` : '');

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
): boolean => isVersionReserved(directory) || inUse(directory);
