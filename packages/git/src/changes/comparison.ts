import type { SessionChangesInput, SessionComparison } from '@repo/contracts';
import { git } from '../git';

const headsPrefix = 'refs/heads/';

const remotesPrefix = 'refs/remotes/';

// Which Checkout to read, and what to compare it against; the main comparison when none is given.
export type ChangesSelection = Pick<SessionChangesInput, 'comparison'> & {
  checkout: string;
  projectCheckout: string;
};

async function mainBranch(projectCheckout: string): Promise<string | null> {
  return (
    (await git(projectCheckout, ['branch', '--show-current'])).trim() || null
  );
}

async function baseCommit(
  checkout: string,
  comparison: SessionComparison,
  main: string | null,
): Promise<string> {
  if (comparison === 'uncommitted') return 'HEAD';
  const branch = comparisonBranchName(comparison, main);
  const ref = branch.startsWith('refs/') ? branch : `${headsPrefix}${branch}`;

  await requireBranch(checkout, ref, branch);

  return (await git(checkout, ['merge-base', ref, 'HEAD'])).trim();
}

function comparisonBranchName(
  comparison: Exclude<SessionComparison, 'uncommitted'>,
  main: string | null,
): string {
  const branch = comparison === 'main' ? main : comparison.branch;

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

// The commit the Checkout is compared from, and the branch the Project's main Checkout is on.
export async function comparisonBase(
  selection: ChangesSelection,
): Promise<{ main: string | null; base: string }> {
  const main = await mainBranch(selection.projectCheckout);

  const base = await baseCommit(
    selection.checkout,
    selection.comparison ?? 'main',
    main,
  );

  return { main, base };
}

// The branches a Checkout can be compared against: local and remote-tracking, by name and full ref.
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
