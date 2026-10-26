import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  trackedFiles,
  untrackedFile,
  untrackedPaths,
  type CheckoutFile,
} from './changes-parse';

export type { CheckoutFile } from './changes-parse';

export { pagePatch, type PatchPage } from './patch-page';

const execute = promisify(execFile);

const gitOutputLimit = 33_554_432;

const headsPrefix = 'refs/heads/';

const remotesPrefix = 'refs/remotes/';

export type ChangeComparison =
  | { type: 'main' }
  | { type: 'uncommitted' }
  | { type: 'branch'; branch: string };

export type CheckoutChanges = {
  mainBranch: string | null;
  summary: { files: number; additions: number; deletions: number };
  files: CheckoutFile[];
};

async function git(checkout: string, args: string[]): Promise<string> {
  const { stdout } = await execute('git', ['-C', checkout, ...args], {
    maxBuffer: gitOutputLimit,
  });

  return stdout;
}

async function gitDiffNoIndex(
  checkout: string,
  args: string[],
): Promise<string> {
  try {
    return await git(checkout, ['diff', '--no-index', ...args]);
  } catch (error) {
    if (
      error instanceof Error &&
      'code' in error &&
      error.code === 1 &&
      'stdout' in error
    )
      return String(error.stdout);
    throw error;
  }
}

async function mainBranch(projectCheckout: string): Promise<string | null> {
  return (
    (await git(projectCheckout, ['branch', '--show-current'])).trim() || null
  );
}

async function baseCommit(
  checkout: string,
  comparison: ChangeComparison,
  main: string | null,
): Promise<string> {
  if (comparison.type === 'uncommitted') return 'HEAD';
  const branch = comparison.type === 'main' ? main : comparison.branch;

  if (!branch) throw new Error('The main Checkout has no branch');
  const ref = branch.startsWith('refs/') ? branch : `${headsPrefix}${branch}`;

  const local = (
    await git(checkout, [
      'for-each-ref',
      '--format=%(refname)',
      headsPrefix,
      remotesPrefix,
    ])
  ).split('\n');

  if (!local.includes(ref)) throw new Error(`No branch ${branch}`);

  return (await git(checkout, ['merge-base', ref, 'HEAD'])).trim();
}

export async function listComparisonBranches(
  checkout: string,
): Promise<{ name: string; ref: string }[]> {
  const lines = (
    await git(checkout, [
      'for-each-ref',
      '--format=%(refname)%09%(symref)',
      headsPrefix,
      remotesPrefix,
    ])
  ).split('\n');

  return lines
    .flatMap((line) => {
      if (!line) return [];
      const [ref, symref] = line.split('\t');

      if (!ref || symref) return [];

      const prefix = ref.startsWith(headsPrefix) ? headsPrefix : remotesPrefix;

      return [{ ref, name: ref.slice(prefix.length) }];
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

async function untrackedChange(
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

export async function readCheckoutChanges(
  checkout: string,
  projectCheckout: string,
  comparison: ChangeComparison,
): Promise<CheckoutChanges> {
  const main = await mainBranch(projectCheckout);
  const base = await baseCommit(checkout, comparison, main);

  const [status, numstat, worktreeStatus] = await Promise.all([
    git(checkout, ['diff', '--name-status', '-z', '-M', base]),
    git(checkout, ['diff', '--numstat', '-z', '-M', base]),
    git(checkout, ['status', '--porcelain=v1', '-z', '--untracked-files=all']),
  ]);

  const untracked = untrackedPaths(worktreeStatus);
  const untrackedSet = new Set(untracked);

  // An index deletion can leave the same path as an untracked working file.
  const files = trackedFiles(status, numstat).filter(
    (file) => !untrackedSet.has(file.path),
  );

  files.push(
    ...(await Promise.all(
      untracked.map((path) => untrackedChange(checkout, path)),
    )),
  );
  files.sort((a, b) => a.path.localeCompare(b.path));

  return {
    mainBranch: main,
    files,
    summary: {
      files: files.length,
      additions: files.reduce((sum, file) => sum + (file.additions ?? 0), 0),
      deletions: files.reduce((sum, file) => sum + (file.deletions ?? 0), 0),
    },
  };
}

type CheckoutDiff = { file: CheckoutFile; patch: string };

// A pathspec is read literally, and a path that leaves the Checkout names no changed file.
const literal = '--literal-pathspecs';

const leavesCheckout = (path: string): boolean =>
  path.startsWith('/') || path.split('/').includes('..');

async function isUntracked(checkout: string, path: string): Promise<boolean> {
  const status = await git(checkout, [
    literal,
    'status',
    '--porcelain=v1',
    '-z',
    '--untracked-files=all',
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

// Renames are found across the whole comparison; the counts and the patch are read for this file's paths alone.
async function trackedDiff(
  checkout: string,
  base: string,
  path: string,
): Promise<CheckoutDiff | null> {
  const status = await git(checkout, [
    'diff',
    '--name-status',
    '-z',
    '-M',
    base,
  ]);

  const entry = trackedFiles(status, '').find((item) => item.path === path);

  if (!entry) return null;

  const paths = ['--', ...new Set([entry.oldPath ?? path, path])];

  const [numstat, patch] = await Promise.all([
    git(checkout, [literal, 'diff', '--numstat', '-z', '-M', base, ...paths]),
    git(checkout, [literal, 'diff', '-M', base, ...paths]),
  ]);

  const file = trackedFiles(status, numstat).find((item) => item.path === path);

  return file ? { file, patch } : null;
}

// One file's patch, without reading the rest of the comparison's files.
export async function readCheckoutDiff(
  checkout: string,
  projectCheckout: string,
  comparison: ChangeComparison,
  path: string,
): Promise<CheckoutDiff | null> {
  if (leavesCheckout(path)) return null;

  const main = await mainBranch(projectCheckout);
  const base = await baseCommit(checkout, comparison, main);

  if (await isUntracked(checkout, path)) return untrackedDiff(checkout, path);

  return trackedDiff(checkout, base, path);
}
