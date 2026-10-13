import { readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { releaseInstallationProcessGroups } from '../processes/reconcile-processes';

const missingFolder = (cause: unknown): boolean =>
  cause instanceof Error && 'code' in cause && cause.code === 'ENOENT';

const readFolders = async (path: string): Promise<string[]> => {
  try {
    return (await readdir(path, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch (error) {
    if (missingFolder(error)) return [];
    throw error;
  }
};

const cleanScope = async (folder: string): Promise<void> => {
  for (const entry of await readFolders(folder))
    if (entry.startsWith('.install-'))
      await rm(join(folder, entry), { recursive: true, force: true });
};

export const reconcileInterruptedInstallations = async (
  home: string,
): Promise<void> => {
  await releaseInstallationProcessGroups(home);
  const root = join(home, 'agents');

  for (const scope of await readFolders(root))
    await cleanScope(join(root, scope));
};
