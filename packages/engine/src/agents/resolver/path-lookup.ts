import { constants } from 'node:fs';
import { access, stat } from 'node:fs/promises';
import { delimiter, isAbsolute, join } from 'node:path';

const isExecutableFile = async (file: string): Promise<boolean> => {
  try {
    if (!(await stat(file)).isFile()) return false;
    await access(file, constants.X_OK);
    return true;
  } catch {
    return false;
  }
};

// PATH is read when called, so an install in a terminal counts.
const pathDirectories = (): string[] =>
  (process.env.PATH ?? '')
    .split(delimiter)
    .filter((directory) => isAbsolute(directory));

// The first executable file with this name on PATH.
export const findOnPath = async (name: string): Promise<string | undefined> => {
  for (const directory of pathDirectories()) {
    const file = join(directory, name);
    if (await isExecutableFile(file)) return file;
  }
  return undefined;
};

// The first executable file named by any of these names, in name order.
export const findFirstOnPath = async (
  names: readonly string[],
): Promise<string | undefined> => {
  for (const name of names) {
    const file = await findOnPath(name);
    if (file) return file;
  }
  return undefined;
};
