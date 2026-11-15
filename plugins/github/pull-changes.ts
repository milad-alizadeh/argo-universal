import { mergeOf, offerOf, type Reads } from './pull-automation';
import { changeOf, type ChangeItem, type Refresh } from './pull-change';
import { failureMessage, type Known } from './pull-known';
import type { LinkRead } from './pull-link-reads';

const failureOfRead = ({ pull, checks }: LinkRead): Known<unknown> =>
  pull.failure ? pull : (checks ?? {});

const checksOf = ({ checks }: LinkRead): Pick<Refresh, 'checks'> =>
  checks?.data ? { checks: checks.data } : {};

const staleOf = (read: LinkRead): Pick<Refresh, 'stale'> => {
  const { failure } = failureOfRead(read);

  return failure ? { stale: failure.reason } : {};
};

const readsOf = ({ autoMerge, settings }: LinkRead): Reads => ({
  autoMerge: autoMerge?.data,
  settings: settings?.data,
});

// What the Change offers to automate; GitHub's own answers, so one it could not give is never drawn as off.
const automationOf = (read: LinkRead): Pick<Refresh, 'automation'> =>
  read.pull.data
    ? { automation: offerOf(mergeOf(read.pull.data, readsOf(read))) }
    : {};

// Stale when either read failed: the Change is what was last known, with why it could not be refreshed.
export const refreshOf = (read: LinkRead): Refresh => ({
  ...checksOf(read),
  ...staleOf(read),
  ...automationOf(read),
});

type ChangeRead = { sessionId: string; change: ChangeItem };

const changeRead = (read: LinkRead): ChangeRead[] =>
  read.pull.data
    ? [
        {
          sessionId: read.link.sessionId,
          change: changeOf(read.pull.data, refreshOf(read)),
        },
      ]
    : [];

const bySession = (
  shown: readonly ChangeRead[],
): Record<string, ChangeItem[]> =>
  Object.fromEntries(
    Object.entries(Object.groupBy(shown, ({ sessionId }) => sessionId)).map(
      ([sessionId, group]) => [
        sessionId,
        (group ?? []).map(({ change }) => change),
      ],
    ),
  );

// Nothing could be read at all: that is a failure, never an answer of no Changes. A read still awaited is no failure.
function refuseUnread(
  reads: readonly LinkRead[],
  shown: readonly ChangeRead[],
): void {
  const unread = reads.find(({ pull }) => !pull.data && pull.failure);

  if (shown.length === 0 && unread)
    throw new Error(failureMessage(unread.pull));
}

/*
 * Each pull request is answered alone: one that could not be read, and was never read before, is left out while the
 * others show, and one read before keeps its last known data marked stale. Only when nothing could be read at all is
 * the failure thrown: Argo then keeps the Plugin's contribution out and says why. One GitHub is slow to answer is
 * no failure: it shows as last read, or not yet (see `pull-row-reads.ts`).
 */
export function changesBySession(
  reads: readonly LinkRead[],
): Readonly<Record<string, ChangeItem[]>> {
  const shown = reads.flatMap(changeRead);

  refuseUnread(reads, shown);

  return bySession(shown);
}
