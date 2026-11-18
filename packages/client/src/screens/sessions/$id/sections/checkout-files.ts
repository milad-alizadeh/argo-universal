import type { ChangesViewProps } from '#features/changes';
import type { SessionPullRequest } from '#features/sessions';

type Comparing = Pick<ChangesViewProps, 'onComparisonChange'>;

/*
 * A Change the Plugin marks as the Checkout's own line of work opens its files as the Checkout's Changes against main,
 * in the Changes tab. Any other pull request's files stay on GitHub: the Inspector holds no pull request (ADR-0052).
 */
const openerOf = (
  change: SessionPullRequest,
  changes: Comparing | undefined,
  open: () => void,
): Pick<SessionPullRequest, 'onOpenFiles'> =>
  change.onCheckout && changes
    ? {
        onOpenFiles: () => {
          changes.onComparisonChange({ kind: 'main' });
          open();
        },
      }
    : {};

export const withCheckoutFiles = (
  pullRequests: readonly SessionPullRequest[],
  changes: Comparing | undefined,
  open: () => void,
): SessionPullRequest[] =>
  pullRequests.map((change) => ({
    ...change,
    ...openerOf(change, changes, open),
  }));
