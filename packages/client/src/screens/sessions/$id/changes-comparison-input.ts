import type { SessionBranchesOutput, SessionComparison } from '@repo/contracts';
import type { ChangesComparison } from '#features/changes';

const branchRef = (name: string, data: SessionBranchesOutput): string =>
  data.branches.find((branch) => branch.name === name)?.ref ?? name;

export function comparisonInput(
  comparison: ChangesComparison,
  data: SessionBranchesOutput = { branches: [] },
): SessionComparison {
  if (comparison.kind !== 'branch') return comparison.kind;

  return { branch: branchRef(comparison.branch, data) };
}
