import {
  comparisonBase,
  type ChangesSelection,
  type Comparison,
} from './comparison';
import { joinedReads } from './joined-reads';
import { trackedFiles, untrackedPaths, type CheckoutFile } from './parse';
import { readNameStatus, readNumstat, readWorktree } from './status';

const joinUntracked = joinedReads<ReadonlySet<string>>();

const joinTracked = joinedReads<TrackedChanges>();

// The Checkout's untracked files; these answer before any base is resolved.
export const readUntrackedPaths = (
  checkout: string,
): Promise<ReadonlySet<string>> =>
  joinUntracked(
    checkout,
    async () => new Set(untrackedPaths(await readWorktree(checkout))),
  );

// The comparison's tracked files by path, with the commit they were compared from; renames are paired across all of them.
export type TrackedChanges = {
  base: string;
  files: ReadonlyMap<string, CheckoutFile>;
};

async function readTrackedChanges(
  selection: ChangesSelection,
): Promise<TrackedChanges> {
  const { base } = await comparisonBase(selection);

  const [status, numstat] = await Promise.all([
    readNameStatus(selection.checkout, base),
    readNumstat(selection.checkout, base),
  ]);

  const files = trackedFiles(status, numstat);

  return { base, files: new Map(files.map((file) => [file.path, file])) };
}

const comparisonName = (comparison: Comparison = 'main'): string =>
  typeof comparison === 'string' ? comparison : `branch:${comparison.branch}`;

// No path or ref holds a NUL, so two selections cannot share a key.
const selectionKey = (selection: ChangesSelection): string =>
  [
    selection.checkout,
    selection.projectCheckout,
    comparisonName(selection.comparison),
  ].join('\0');

export const readTrackedComparison = (
  selection: ChangesSelection,
): Promise<TrackedChanges> =>
  joinTracked(selectionKey(selection), () => readTrackedChanges(selection));
