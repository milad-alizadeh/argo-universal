import { realpath } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';

const isWithin = (root: string, target: string): boolean => {
  const path = relative(root, target);

  return !path.startsWith('..') && !isAbsolute(path);
};

const realOrNone = (path: string): Promise<string | null> =>
  realpath(path).catch(() => null);

// Where a write lands: through the file itself when it is a link, else through its folder.
const landsWithin = async (
  realRoot: string,
  target: string,
): Promise<boolean> => {
  const lands =
    (await realOrNone(target)) ?? (await realOrNone(dirname(target)));

  return lands === null || isWithin(realRoot, lands);
};

// A test fixture writes, chmods or removes only inside the temporary root it created, never through a link out of it, such as the one to the real `node`.
export const guardInsideRoot = async (
  root: string,
  target: string,
): Promise<string> => {
  const inside =
    isWithin(resolve(root), resolve(target)) &&
    (await landsWithin(await realpath(root), target));

  if (!inside)
    throw new Error(`Refusing to touch ${target}: it is outside ${root}`);

  return target;
};
