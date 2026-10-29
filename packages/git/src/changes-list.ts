import {
  comparisonBase,
  nameStatus,
  worktreeStatus,
  type ChangeComparison,
} from './changes-comparison';
import { git, gitDiffNoIndex } from './changes-git';
import {
  trackedFiles,
  untrackedFile,
  untrackedPaths,
  type CheckoutFile,
} from './changes-parse';

export {
  comparisonBase,
  listComparisonBranches,
  nameStatus,
  worktreeStatus,
  type ChangeComparison,
} from './changes-comparison';

export { git, gitDiffNoIndex } from './changes-git';

export type CheckoutChanges = {
  mainBranch: string | null;
  summary: { files: number; additions: number; deletions: number };
  files: CheckoutFile[];
};

const untrackedBatchSize = 8;

export async function untrackedChange(
  checkout: string,
  path: string,
): Promise<CheckoutFile> {
  const stat = await gitDiffNoIndex(checkout, [
    '--numstat',
    '-z',
    '--',
    '/dev/null',
    path,
  ]);

  return untrackedFile(path, stat);
}

// Each untracked file costs one git process, so they run in small batches.
async function untrackedChanges(
  checkout: string,
  paths: string[],
): Promise<CheckoutFile[]> {
  const files: CheckoutFile[] = [];

  for (let start = 0; start < paths.length; start += untrackedBatchSize)
    files.push(
      ...(await Promise.all(
        paths
          .slice(start, start + untrackedBatchSize)
          .map((path) => untrackedChange(checkout, path)),
      )),
    );

  return files;
}

export async function readCheckoutChanges(
  checkout: string,
  projectCheckout: string,
  comparison: ChangeComparison,
): Promise<CheckoutChanges> {
  const { main, base } = await comparisonBase(
    checkout,
    projectCheckout,
    comparison,
  );

  const responses = await readStatus(checkout, base);

  const files = await changeFiles(checkout, responses);

  return { mainBranch: main, files, summary: summarize(files) };
}

async function readStatus(
  checkout: string,
  base: string,
): Promise<[string, string, string]> {
  return Promise.all([
    git(checkout, nameStatus(base)),
    git(checkout, ['diff', '--numstat', '-z', '-M', base]),
    git(checkout, worktreeStatus),
  ]);
}

async function changeFiles(
  checkout: string,
  [status, numstat, worktree]: [string, string, string],
): Promise<CheckoutFile[]> {
  const untracked = untrackedPaths(worktree);
  const untrackedSet = new Set(untracked);

  // An index deletion can leave the same path as an untracked working file.
  const files = trackedFiles(status, numstat).filter(
    (file) => !untrackedSet.has(file.path),
  );

  files.push(...(await untrackedChanges(checkout, untracked)));

  files.sort((a, b) => a.path.localeCompare(b.path));

  return files;
}

function summarize(files: CheckoutFile[]): CheckoutChanges['summary'] {
  return {
    files: files.length,
    additions: files.reduce((sum, file) => sum + (file.additions ?? 0), 0),
    deletions: files.reduce((sum, file) => sum + (file.deletions ?? 0), 0),
  };
}
