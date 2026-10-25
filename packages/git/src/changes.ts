import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  trackedFiles,
  untrackedFile,
  untrackedPaths,
  type CheckoutFile,
} from './changes-parse';

export type { CheckoutFile } from './changes-parse';

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

  for (const path of untracked)
    files.push(await untrackedChange(checkout, path));
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

export async function readCheckoutDiff(
  checkout: string,
  projectCheckout: string,
  comparison: ChangeComparison,
  path: string,
): Promise<{ file: CheckoutFile; patch: string } | null> {
  const changes = await readCheckoutChanges(
    checkout,
    projectCheckout,
    comparison,
  );

  const file = changes.files.find((item) => item.path === path);

  if (!file) return null;
  const base = await baseCommit(checkout, comparison, changes.mainBranch);

  const patch =
    file.operation === 'add' &&
    (await git(checkout, ['ls-files', '--error-unmatch', '--', path]).then(
      () => false,
      () => true,
    ))
      ? await gitDiffNoIndex(checkout, ['--', '/dev/null', path])
      : await git(checkout, [
          'diff',
          '-M',
          base,
          '--',
          file.oldPath ?? path,
          path,
        ]);

  return { file, patch };
}
