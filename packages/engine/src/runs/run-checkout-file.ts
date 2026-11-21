import { constants, type Stats } from 'node:fs';
import { lstat, realpath } from 'node:fs/promises';

export const noFollow = constants.O_NOFOLLOW | constants.O_NONBLOCK;

export async function namesOpenedFile(
  path: string,
  info: Stats,
): Promise<boolean> {
  const current = await lstat(path);

  return current.dev === info.dev && current.ino === info.ino;
}

export async function stillAtPath(path: string, info: Stats): Promise<boolean> {
  return (
    info.isFile() &&
    (await realpath(path)) === path &&
    (await namesOpenedFile(path, info))
  );
}
