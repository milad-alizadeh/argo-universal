import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { snapshotSchema, type Snapshot } from './snapshot-model.mts';

// Where the drift tools keep their files: the registry is reviewed in Git, the rest is local.
const repositoryRoot = fileURLToPath(new URL('../..', import.meta.url));
export const registryPath = join(
  repositoryRoot,
  'tools/paper-drift/masters.json',
);
export const themePath = join(repositoryRoot, 'tooling/uniwind/theme.css');
export const iconSourcePaths = [
  'icon-names',
  'file-symbols',
  'status-symbols',
].map((name): string =>
  join(repositoryRoot, `packages/client/src/lib/${name}.ts`),
);
const localFolder = join(repositoryRoot, '.paper-drift');
export const snapshotPath = join(localFolder, 'snapshot.json');
export const proposedRegistryPath = join(localFolder, 'masters.proposed.json');
export const auditReportPath = join(localFolder, 'audit.md');
export const auditDataPath = join(localFolder, 'audit.json');
export const levelsPath = join(localFolder, 'levels.json');
export const syncShotsFolder = join(localFolder, 'sync');

export function writeLocal(path: string, contents: string | Uint8Array): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
}

export function readSnapshot(): Snapshot {
  try {
    return snapshotSchema.parse(JSON.parse(readFileSync(snapshotPath, 'utf8')));
  } catch (error) {
    throw new Error(
      `No usable snapshot at ${snapshotPath}; run pnpm -F @repo/tools paper:snapshot first.`,
      { cause: error },
    );
  }
}

// The last snapshot to reuse styles from, or undefined when there is none or it no longer parses.
export function readPreviousSnapshot(): Snapshot | undefined {
  if (!existsSync(snapshotPath)) return undefined;
  try {
    return readSnapshot();
  } catch {
    return undefined;
  }
}
