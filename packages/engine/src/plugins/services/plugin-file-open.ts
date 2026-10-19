import type { Stats } from 'node:fs';
import { constants } from 'node:fs';
import { lstat, open, unlink, type FileHandle } from 'node:fs/promises';
import { CapabilityRefusal } from '../access/capability-refusal';

// Never follow a final symlink, and never block on a FIFO.
export const openFlags = constants.O_NOFOLLOW | constants.O_NONBLOCK;

const writeFlags = openFlags | constants.O_WRONLY;

// An open file, and whether this call created it, so a refusal knows whether it is this call's to remove.
export type OpenFile = { handle: FileHandle; created: boolean };

export const sameNode = (left: Stats, right: Stats): boolean =>
  left.ino === right.ino && left.dev === right.dev;

const openChecked = (path: string, flags: number): Promise<FileHandle> =>
  open(path, flags).catch((error: NodeJS.ErrnoException): never => {
    throw error.code === 'ELOOP'
      ? new CapabilityRefusal(`${path} became a symlink`)
      : error;
  });

export const openExisting = async (
  path: string,
  flags: number,
): Promise<OpenFile> => ({
  handle: await openChecked(path, flags),
  created: false,
});

// Creates the file only if it is missing; an existing file is opened as it is.
export const openForWrite = (path: string): Promise<OpenFile> =>
  openChecked(path, writeFlags | constants.O_CREAT | constants.O_EXCL).then(
    (handle) => ({ handle, created: true }),
    (error: NodeJS.ErrnoException) => {
      if (error.code !== 'EEXIST') throw error;

      return openExisting(path, writeFlags);
    },
  );

// Removes a file this call created and the check refused, only while its name still names that file.
export async function removeCreated(
  path: string,
  handle: FileHandle,
): Promise<void> {
  const [info, now] = await Promise.all([handle.stat(), nodeAt(path)]);

  if (now && sameNode(now, info)) await unlink(path);
}

const nodeAt = (path: string): Promise<Stats | null> =>
  lstat(path).catch(() => null);
