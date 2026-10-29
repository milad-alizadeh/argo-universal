import {
  comparisonBase,
  git,
  gitDiffNoIndex,
  nameStatus,
  untrackedChange,
  worktreeStatus,
  type ChangeComparison,
} from './changes-list';
import {
  trackedFiles,
  untrackedPaths,
  type CheckoutFile,
} from './changes-parse';

type CheckoutDiff = { file: CheckoutFile; patch: string };

// A path is a name, never a glob or a pathspec magic.
const literalPathspecs = '--literal-pathspecs';

// A path that leaves the Checkout names no changed file.
const leavesCheckout = (path: string): boolean =>
  path.startsWith('/') || path.split('/').includes('..');

async function isUntracked(checkout: string, path: string): Promise<boolean> {
  const status = await git(checkout, [
    literalPathspecs,
    ...worktreeStatus,
    '--',
    path,
  ]);

  return untrackedPaths(status).includes(path);
}

async function untrackedDiff(
  checkout: string,
  path: string,
): Promise<CheckoutDiff> {
  const [file, patch] = await Promise.all([
    untrackedChange(checkout, path),
    gitDiffNoIndex(checkout, ['--', '/dev/null', path]),
  ]);

  return { file, patch };
}

// The names are enough to find the file; its counts are read for its own paths afterwards.
const noNumstat = '';

// Renames are found across the whole comparison; the counts and the patch are read for this file's paths alone.
async function trackedDiff(
  checkout: string,
  base: string,
  path: string,
): Promise<CheckoutDiff | null> {
  const status = await git(checkout, nameStatus(base));

  const entry = trackedFiles(status, noNumstat).find(
    (item) => item.path === path,
  );

  if (!entry) return null;

  return readTrackedPatch(checkout, base, { entry, status, path });
}

async function readTrackedPatch(
  checkout: string,
  base: string,
  input: { entry: CheckoutFile; status: string; path: string },
): Promise<CheckoutDiff | null> {
  const [numstat, patch] = await trackedPatch(checkout, base, [
    input.entry,
    input.path,
  ]);

  const file = trackedFiles(input.status, numstat).find(
    (item) => item.path === input.path,
  );

  return file ? { file, patch } : null;
}

async function trackedPatch(
  checkout: string,
  base: string,
  [entry, path]: [CheckoutFile, string],
): Promise<[string, string]> {
  const paths = ['--', ...new Set([entry.oldPath ?? path, path])];

  return Promise.all([
    gitNumstat(checkout, base, paths),
    git(checkout, [literalPathspecs, 'diff', '-M', base, ...paths]),
  ]);
}

// One file's patch, without reading the rest of the comparison's files.
export async function readCheckoutDiff(
  checkout: string,
  projectCheckout: string,
  selection: { comparison: ChangeComparison; path: string },
): Promise<CheckoutDiff | null> {
  const { comparison, path } = selection;

  if (leavesCheckout(path)) return null;

  const { base } = await comparisonBase(checkout, projectCheckout, comparison);

  if (await isUntracked(checkout, path)) return untrackedDiff(checkout, path);

  return trackedDiff(checkout, base, path);
}

function gitNumstat(
  checkout: string,
  base: string,
  paths: string[],
): Promise<string> {
  return git(checkout, [
    literalPathspecs,
    'diff',
    '--numstat',
    '-z',
    '-M',
    base,
    ...paths,
  ]);
}
