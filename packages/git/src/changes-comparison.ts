import { git } from './changes-git';

const headsPrefix = 'refs/heads/';

const remotesPrefix = 'refs/remotes/';

export type ChangeComparison =
  | { type: 'main' }
  | { type: 'uncommitted' }
  | { type: 'branch'; branch: string };

async function mainBranch(projectCheckout: string): Promise<string | null> {
  return (
    (await git(projectCheckout, ['branch', '--show-current'])).trim() || null
  );
}

// Every changed path against the base, renames paired, as `git diff --name-status -z` prints them.
export const nameStatus = (base: string): string[] => [
  'diff',
  '--name-status',
  '-z',
  '-M',
  base,
];

// The working tree's state, untracked files listed one by one.
export const worktreeStatus = [
  'status',
  '--porcelain=v1',
  '-z',
  '--untracked-files=all',
];

async function baseCommit(
  checkout: string,
  comparison: ChangeComparison,
  main: string | null,
): Promise<string> {
  if (comparison.type === 'uncommitted') return 'HEAD';
  const branch = comparisonBranchName(comparison, main);
  const ref = branch.startsWith('refs/') ? branch : `${headsPrefix}${branch}`;

  await requireBranch(checkout, ref, branch);

  return (await git(checkout, ['merge-base', ref, 'HEAD'])).trim();
}

function comparisonBranchName(
  comparison: Exclude<ChangeComparison, { type: 'uncommitted' }>,
  main: string | null,
): string {
  const branch = comparison.type === 'main' ? main : comparison.branch;

  if (!branch) throw new Error('The main Checkout has no branch');

  return branch;
}

async function requireBranch(
  checkout: string,
  ref: string,
  branch: string,
): Promise<void> {
  const local = (
    await git(checkout, [
      'for-each-ref',
      '--format=%(refname)',
      headsPrefix,
      remotesPrefix,
    ])
  ).split('\n');

  if (!local.includes(ref)) throw new Error(`No branch ${branch}`);
}

type ComparisonBase = { main: string | null; base: string };

export async function comparisonBase(
  checkout: string,
  projectCheckout: string,
  comparison: ChangeComparison,
): Promise<ComparisonBase> {
  const main = await mainBranch(projectCheckout);

  return { main, base: await baseCommit(checkout, comparison, main) };
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
    .flatMap(comparisonBranch)
    .sort((left, right) => left.name.localeCompare(right.name));
}

function comparisonBranch(line: string): { ref: string; name: string }[] {
  const [ref, symref] = line.split('\t');

  if (!ref || symref) return [];
  const prefix = refPrefix(ref);

  return [{ ref, name: ref.slice(prefix.length) }];
}

function refPrefix(ref: string): string {
  return ref.startsWith(headsPrefix) ? headsPrefix : remotesPrefix;
}
