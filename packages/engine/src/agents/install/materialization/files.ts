import { constants } from 'node:fs';
import { access, realpath, stat } from 'node:fs/promises';
import { isAbsolute, relative, resolve, win32 } from 'node:path';
import { isInstallerRecordName } from '../processes/process-record';

const requireUnreservedPath = (path: string): void => {
  const first = path.split(/[\\/]/).find((part) => part !== '' && part !== '.');
  if (isInstallerRecordName(first))
    throw new Error(
      'Archive or launch file uses a reserved installer ownership path',
    );
};

const isUnsafePath = (path: string): boolean =>
  isAbsolute(path) || win32.isAbsolute(path);
export const installationPath = (directory: string, path: string): string => {
  requireUnreservedPath(path);
  if (isUnsafePath(path) || path.split(/[\\/]/).includes('..'))
    throw new Error('Launch file escapes the managed installation');
  return resolve(directory, path);
};
export const checkInstallationFile = async (
  directory: string,
  path: string,
): Promise<string> => {
  const file = await realpath(installationPath(directory, path));
  const within = relative(await realpath(directory), file);
  installationPath(directory, within);
  if (!(await stat(file)).isFile())
    throw new Error('Agent launch file is not a regular file');
  await access(
    file,
    process.platform === 'win32' ? constants.F_OK : constants.X_OK,
  );
  return file;
};
