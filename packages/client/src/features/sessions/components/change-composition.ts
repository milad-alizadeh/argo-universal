import type { ChangesSummary } from '@repo/contracts';
import type { SessionPullRequest } from './session-pull-request';

/*
 * The Checkout's own totals, for the Workbench card to show beside the pull requests the Plugins supplied. The Plugin
 * marks the pull request that is the Checkout's own line of work (its head is the Checkout's repository and branch,
 * ADR-0052), and that one already carries its own totals, so the Checkout's are never added to it, nor shown as another
 * pull request's. They show only when work sits in the Checkout that no pull request has, and as the Checkout's, apart.
 */
export function checkoutTotals(
  changes: readonly SessionPullRequest[],
  summary?: ChangesSummary,
): ChangesSummary | undefined {
  return changes.some(({ onCheckout }) => onCheckout)
    ? undefined
    : withFiles(summary);
}

const withFiles = (summary?: ChangesSummary): ChangesSummary | undefined =>
  summary?.files ? summary : undefined;
