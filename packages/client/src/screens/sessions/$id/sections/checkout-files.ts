import type { ChangesViewProps } from '#features/changes';
import type { SessionPullRequest } from '#features/sessions';

type CompareWith = ChangesViewProps['onComparisonChange'];

/*
 * A Change the Plugin marks as the Checkout's own line of work opens the Checkout's Changes against main, in the Changes
 * tab. Any other pull request's files stay on GitHub: the Inspector holds no pull request (ADR-0052).
 */
const checkoutFilesOf = (
  change: SessionPullRequest,
  compareWith: CompareWith | undefined,
  open: () => void,
): Pick<SessionPullRequest, 'onOpenFiles'> =>
  change.onCheckout && compareWith
    ? {
        onOpenFiles: () => {
          compareWith({ kind: 'main' });
          open();
        },
      }
    : {};

export const withCheckoutFiles = (
  pullRequests: readonly SessionPullRequest[],
  compareWith: CompareWith | undefined,
  open: () => void,
): SessionPullRequest[] =>
  pullRequests.map((change) => ({
    ...change,
    ...checkoutFilesOf(change, compareWith, open),
  }));
