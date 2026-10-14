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

// The first executable file with this name on PATH, read when called so an install in a terminal counts.
export const findOnPath = async (name: string): Promise<string | undefined> => {
  const directories = (process.env.PATH ?? '')
    .split(delimiter)
    .filter((directory) => isAbsolute(directory));
  for (const directory of directories) {
    const file = join(directory, name);
    if (await isExecutableFile(file)) return file;
  }
  return undefined;
};
