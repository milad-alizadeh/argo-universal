import type { ChangesSelection } from './comparison';
import {
  readTrackedComparison,
  readUntrackedPaths,
  type TrackedChanges,
} from './comparison-reads';
import { defaultPatchLimit, pageWindow, type ChangesPage } from './paging';
import type { CheckoutFile } from './parse';
import { pagePatch } from './patch-page';
import { readPatch } from './status';
import { untrackedDiff } from './untracked';

type WholeDiff = { file: CheckoutFile; patch: string };

// One page of a changed file's unified diff, counted in diff lines; each page repeats the file's header lines.
export type FileDiff = WholeDiff & { nextCursor: number | null };

// A path that leaves the Checkout names no changed file.
const leavesCheckout = (path: string): boolean =>
  path.startsWith('/') || path.split('/').includes('..');

async function readTrackedDiff(
  selection: ChangesSelection,
  path: string,
  tracked: Promise<TrackedChanges>,
): Promise<WholeDiff | null> {
  const { base, files } = await tracked;
  const file = files.get(path);

  if (!file) return null;
  const paths = [...new Set([file.oldPath ?? file.path, file.path])];

  return { file, patch: await readPatch(selection.checkout, base, paths) };
}

// The untracked files and the tracked comparison are read side by side; an untracked path ignores the comparison, even one that failed.
async function readWholeDiff(
  selection: ChangesSelection & { path: string },
): Promise<WholeDiff | null> {
  const { checkout, path } = selection;

  if (leavesCheckout(path)) return null;
  const tracked = readTrackedComparison(selection);

  tracked.catch(() => {});

  if ((await readUntrackedPaths(checkout)).has(path))
    return untrackedDiff(checkout, path);

  return readTrackedDiff(selection, path, tracked);
}

// One file's patch, or null when the path is not a changed file. The comparison is read beside the untracked files, so a tracked path waits on the slower of the two, not both; a tracked one shares the comparison's names and counts with the files asked for alongside it, and reads only its patch alone.
export async function readFileDiff(
  selection: ChangesSelection & { path: string },
  page: ChangesPage = {},
): Promise<FileDiff | null> {
  const diff = await readWholeDiff(selection);

  if (!diff) return null;
  const window = pageWindow(page, defaultPatchLimit);
  const paged = pagePatch(diff.patch, window.cursor, window.limit);

  return { file: diff.file, patch: paged.patch, nextCursor: paged.nextCursor };
}
