import { describe, expect, it } from 'vitest';
import { baseCandidates } from './verify-base.mts';

const lowerBranch = 'issue-1856';

const refsFrom = (
  explicit: string | undefined,
  pullRequestBase: string | undefined,
): string[] =>
  baseCandidates({ explicit, pullRequestBase }).map(({ ref }) => ref);

describe('baseCandidates', (): void => {
  it('measures from the base you passed, locally or on origin', (): void => {
    expect(refsFrom(lowerBranch, 'issue-1855')).toEqual([
      lowerBranch,
      `origin/${lowerBranch}`,
    ]);
  });

  it('measures a stacked PR from its base branch, then main', (): void => {
    expect(refsFrom(undefined, lowerBranch)).toEqual([
      `origin/${lowerBranch}`,
      lowerBranch,
      'origin/main',
      'main',
      'HEAD',
    ]);
  });

  it('measures from main without a PR, and says so', (): void => {
    const [first] = baseCandidates({
      explicit: undefined,
      pullRequestBase: undefined,
    });

    expect(first).toEqual({ ref: 'origin/main', reason: 'no open PR found' });
  });
});
