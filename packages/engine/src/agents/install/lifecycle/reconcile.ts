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

const cleanScope = async (
  folder: string,
  prefixes: string[],
): Promise<void> => {
  for (const entry of await readFolders(folder))
    if (prefixes.some((prefix) => entry.startsWith(prefix)))
      await rm(join(folder, entry), { recursive: true, force: true });
};

export const reconcileInterruptedInstallations = async (
  home: string,
): Promise<void> => {
  await releaseInstallationProcessGroups(home);
  await cleanRegistry(join(home, 'agents', 'registry'));
};

const cleanRegistry = async (root: string): Promise<void> => {
  for (const scope of await readFolders(root))
    await cleanScope(join(root, scope), ['.staging-', '.probe-']);
};
