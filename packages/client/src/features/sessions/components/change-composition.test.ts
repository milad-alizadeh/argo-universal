import { describe, expect, it } from 'vitest';
import { checkoutTotals } from './change-composition';
import type { SessionPullRequest } from './session-pull-request';

const local = { files: 7, additions: 70, deletions: 7 };

const pullRequest = (
  number: number,
  more: Partial<SessionPullRequest> = {},
): SessionPullRequest => ({
  stage: 'open',
  number,
  title: 'Add the thing',
  mergeable: true,
  summary: { files: 3, additions: 10, deletions: 2 },
  ...more,
});

describe('checkoutTotals', () => {
  it("does not add the Checkout's totals to the pull request that is its own line of work", () => {
    expect(
      checkoutTotals([pullRequest(12, { onCheckout: true })], local),
    ).toBeUndefined();
  });

  it("does not show the Checkout's totals when only another pull request is marked", () => {
    expect(
      checkoutTotals(
        [pullRequest(11), pullRequest(12, { onCheckout: true })],
        local,
      ),
    ).toBeUndefined();
  });

  it("shows the Checkout's own totals, apart, when no pull request is its line of work, and never as a pull request's", () => {
    const changes = [pullRequest(11)];

    expect(checkoutTotals(changes, local)).toEqual(local);
    expect(changes[0]?.summary).toEqual({
      files: 3,
      additions: 10,
      deletions: 2,
    });
  });

  it('shows nothing for a Checkout with no changed files, or one not read yet', () => {
    expect(
      checkoutTotals([pullRequest(11)], { ...local, files: 0 }),
    ).toBeUndefined();
    expect(checkoutTotals([pullRequest(11)])).toBeUndefined();
  });

  it('does not match a pull request by its title', () => {
    expect(checkoutTotals([pullRequest(11, { title: 'Work' })], local)).toEqual(
      local,
    );
  });
});
