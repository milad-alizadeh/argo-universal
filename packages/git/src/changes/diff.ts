import { sessionDiffPageLines } from '@repo/contracts';
import { comparisonBase, type ChangesSelection } from './comparison';
import { pageWindow, type ChangesPage } from './paging';
import {
  trackedFiles,
  untrackedPaths,
  withCounts,
  type CheckoutFile,
} from './parse';
import { pagePatch } from './patch-page';
import { readNameStatus, readNumstat, readPatch, readWorktree } from './status';
import { untrackedDiff } from './untracked';

type WholeDiff = { file: CheckoutFile; patch: string };

// One page of a changed file's unified diff, counted in diff lines; each page repeats the file's header lines.
export type FileDiff = WholeDiff & { nextCursor: number | null };

// A path that leaves the Checkout names no changed file.
const leavesCheckout = (path: string): boolean =>
  path.startsWith('/') || path.split('/').includes('..');

async function isUntracked(checkout: string, path: string): Promise<boolean> {
  return untrackedPaths(await readWorktree(checkout, [path])).includes(path);
}

// Renames are found across the whole comparison; the counts and the patch are read for this file's paths alone.
async function trackedDiff(
  checkout: string,
  base: string,
  path: string,
): Promise<WholeDiff | null> {
  const entry = trackedFiles(await readNameStatus(checkout, base)).find(
    (item) => item.path === path,
  );

  return entry ? readTrackedPatch(checkout, base, entry) : null;
}

async function readTrackedPatch(
  checkout: string,
  base: string,
  entry: CheckoutFile,
): Promise<WholeDiff> {
  const paths = [...new Set([entry.oldPath ?? entry.path, entry.path])];

  const [numstat, patch] = await Promise.all([
    readNumstat(checkout, base, paths),
    readPatch(checkout, base, paths),
  ]);

  return { file: withCounts(entry, numstat), patch };
}

async function readWholeDiff(
  selection: ChangesSelection & { path: string },
): Promise<WholeDiff | null> {
  const { checkout, path } = selection;

  if (leavesCheckout(path)) return null;
  const { base } = await comparisonBase(selection);

  if (await isUntracked(checkout, path)) return untrackedDiff(checkout, path);

  return trackedDiff(checkout, base, path);
}

// One file's patch, or null when the path is not a changed file; the rest of the comparison's files are not read.
export async function readFileDiff(
  selection: ChangesSelection & { path: string },
  page: ChangesPage = {},
): Promise<FileDiff | null> {
  const diff = await readWholeDiff(selection);

  if (!diff) return null;
  const window = pageWindow(page, sessionDiffPageLines);
  const paged = pagePatch(diff.patch, window.cursor, window.limit);

  return { file: diff.file, patch: paged.patch, nextCursor: paged.nextCursor };
}
