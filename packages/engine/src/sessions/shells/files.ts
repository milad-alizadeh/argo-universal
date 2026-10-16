import { createHash } from 'node:crypto';
import { appendFile, mkdir, rm, writeFile, open } from 'node:fs/promises';
import { join } from 'node:path';

export const shellOutputPath = (
  home: string,
  sessionId: string,
  shellId: string,
): string =>
  join(
    home,
    'shells',
    createHash('sha256')
      .update(JSON.stringify([sessionId, shellId]))
      .digest('hex'),
  );

export const createShellOutput = async (path: string): Promise<void> => {
  await mkdir(join(path, '..'), { recursive: true });
  await writeFile(path, '');
};

export const appendShellOutput = (path: string, text: string): Promise<void> =>
  appendFile(path, text);

export const removeShellOutput = (path: string): Promise<void> =>
  rm(path, { force: true });

export const ensureRecoveredOutput = async (path: string): Promise<void> => {
  await mkdir(join(path, '..'), { recursive: true });
  const file = await open(path, 'a');
  await file.close();
};

export const clearShellOutputs = async (home: string): Promise<void> => {
  const folder = join(home, 'shells');
  await rm(folder, { recursive: true, force: true });
  await mkdir(folder, { recursive: true });
};
