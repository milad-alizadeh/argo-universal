import { createHash } from 'node:crypto';
import { readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

const hashLength = 16;

const hash = (value: string): string =>
  createHash('sha256').update(value).digest('hex').slice(0, hashLength);

// One folder per Registry version and download source, so a new version never rewrites files a running Agent uses.
export const versionFolder = (version: string, source: string): string =>
  `v_${version.replaceAll(/[^a-zA-Z0-9._-]/g, '-')}_${hash(version)}_${hash(source)}`;

const reservations = new Map<string, number>();

const decrement = (directory: string): void => {
  const remaining = (reservations.get(directory) ?? 1) - 1;

  if (remaining > 0) reservations.set(directory, remaining);
  else reservations.delete(directory);
};

const releaseOnAbort = (
  directory: string,
  signal: AbortSignal,
): (() => void) => {
  let released = false;

  const release = (): void => {
    if (released) return;
    released = true;
    signal.removeEventListener('abort', release);
    decrement(directory);
  };

  signal.addEventListener('abort', release, { once: true });

  return release;
};

export const reserveVersion = (
  directory: string,
  signal: AbortSignal,
): (() => void) => {
  signal.throwIfAborted();
  reservations.set(directory, (reservations.get(directory) ?? 0) + 1);

  return releaseOnAbort(directory, signal);
};

type Pruning = {
  directory: string;
  isDirectoryInUse: (directory: string) => boolean;
};

export const pruneVersions = async (
  input: Pruning & { base: string },
): Promise<void> => {
  const entries = await readdir(input.base, { withFileTypes: true });

  for (const entry of entries.filter(
    (file) => file.isDirectory() && file.name.startsWith('v_'),
  ))
    await pruneVersion(input, join(input.base, entry.name));
};

const pruneVersion = async (
  input: Pruning,
  directory: string,
): Promise<void> => {
  if (directory === input.directory) return;

  if (reservations.has(directory) || input.isDirectoryInUse(directory)) return;
  await rm(directory, { recursive: true, force: true });
};
