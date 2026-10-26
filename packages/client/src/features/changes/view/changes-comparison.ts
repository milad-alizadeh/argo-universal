/*
 * What the Changes Inspector compares the Checkout with (owner, 2026-10-19). Untracked files count in each:
 * - main: the main checkout's branch at the fork point, `git diff $(git merge-base <main> HEAD)`;
 * - uncommitted: `git diff HEAD`;
 * - branch: another branch at the fork point, `git diff $(git merge-base <branch> HEAD)`.
 */
export type ChangesComparison =
  | { kind: 'main' }
  | { kind: 'uncommitted' }
  | { kind: 'branch'; branch: string };

export const uncommittedLabel = 'Uncommitted Changes';

export const compareAgainstLabel = 'Compare Against';

// Shown until the Server has said which branch the main checkout has checked out.
const unknownMainBranch = '…';

const mainBranchName = (mainBranch: string | undefined): string =>
  mainBranch ?? unknownMainBranch;

// "main" names the branch the main checkout has checked out, whatever it is called.
export const allChangesLabel = (mainBranch: string | undefined): string =>
  `All Changes (vs ${mainBranchName(mainBranch)})`;

export function comparisonLabel(
  comparison: ChangesComparison,
  mainBranch: string | undefined,
): string {
  if (comparison.kind === 'main') return allChangesLabel(mainBranch);

  if (comparison.kind === 'uncommitted') return uncommittedLabel;

  return `${compareAgainstLabel} ${comparison.branch}`;
}

// The empty state names the comparison in force.
export function noChangesDescription(
  comparison: ChangesComparison,
  mainBranch: string | undefined,
): string {
  if (comparison.kind === 'uncommitted') return 'No uncommitted changes.';

  const base =
    comparison.kind === 'branch'
      ? comparison.branch
      : mainBranchName(mainBranch);

  return `Nothing has changed since this branched from ${base}.`;
}
