import { comparisonBase, type ChangesSelection } from './comparison';
import {
  defaultFilesLimit,
  pageItems,
  pageWindow,
  type ChangesPage,
} from './paging';
import { trackedFiles, untrackedPaths, type CheckoutFile } from './parse';
import { readNameStatus, readNumstat, readWorktree } from './status';
import { untrackedChanges } from './untracked';

type Summary = { files: number; additions: number; deletions: number };

type CheckoutChanges = {
  mainBranch: string | null;
  summary: Summary;
  files: CheckoutFile[];
};

// One page of the changed files, with the totals of the whole comparison.
export type ChangedFiles = CheckoutChanges & { nextCursor: number | null };

type StatusReads = { status: string; numstat: string; worktree: string };

async function readStatus(
  checkout: string,
  base: string,
): Promise<StatusReads> {
  const [status, numstat, worktree] = await Promise.all([
    readNameStatus(checkout, base),
    readNumstat(checkout, base),
    readWorktree(checkout),
  ]);

  return { status, numstat, worktree };
}

async function changeFiles(
  checkout: string,
  { status, numstat, worktree }: StatusReads,
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

function summarize(files: CheckoutFile[]): Summary {
  return {
    files: files.length,
    additions: files.reduce((sum, file) => sum + (file.additions ?? 0), 0),
    deletions: files.reduce((sum, file) => sum + (file.deletions ?? 0), 0),
  };
}

async function readChanges(
  selection: ChangesSelection,
): Promise<CheckoutChanges> {
  const { main, base } = await comparisonBase(selection);

  const files = await changeFiles(
    selection.checkout,
    await readStatus(selection.checkout, base),
  );

  return { mainBranch: main, files, summary: summarize(files) };
}

export async function readChangedFiles(
  selection: ChangesSelection,
  page: ChangesPage = {},
): Promise<ChangedFiles> {
  const changes = await readChanges(selection);

  const paged = pageItems(changes.files, pageWindow(page, defaultFilesLimit));

  return { ...changes, files: paged.items, nextCursor: paged.nextCursor };
}

// The comparison's totals, without its files.
export async function readChangesSummary(
  selection: ChangesSelection,
): Promise<Summary> {
  return (await readChanges(selection)).summary;
}
