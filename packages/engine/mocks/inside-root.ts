import { lstat, readlink, realpath } from 'node:fs/promises';
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
} from 'node:path';

const isWithin = (root: string, target: string): boolean => {
  const path = relative(root, target);

  return !path.startsWith('..') && !isAbsolute(path);
};

// More links than this in one chain is a loop.
const maxLinkDepth = 40;

type Entry = Awaited<ReturnType<typeof lstat>> | null;

const entryAt = (path: string): Promise<Entry> => lstat(path).catch(() => null);

// Where a write to the path lands: through every link, even a dangling one, and through the nearest folder that exists.
const landing = async (path: string, depth = 0): Promise<string> => {
  if (depth > maxLinkDepth) throw new Error(`Too many links at ${path}`);
  const entry = await entryAt(path);

  if (entry?.isSymbolicLink()) return followLink(path, depth);

  return entry ? realpath(path) : underParent(path, depth);
};

const followLink = async (path: string, depth: number): Promise<string> =>
  landing(resolve(dirname(path), await readlink(path)), depth + 1);

const underParent = async (path: string, depth: number): Promise<string> =>
  join(await landing(dirname(path), depth), basename(path));

// A test fixture writes, chmods or removes only inside the temporary root it created, never through a link out of it, such as the one to the real `node`.
export const guardInsideRoot = async (
  root: string,
  target: string,
): Promise<string> => {
  const inside =
    isWithin(resolve(root), resolve(target)) &&
    isWithin(await realpath(root), await landing(resolve(target)));

  if (!inside)
    throw new Error(`Refusing to touch ${target}: it is outside ${root}`);

  return target;
};
