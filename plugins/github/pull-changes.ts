import type { Argo } from '@argo/plugin-kit';
import { changeOf, type ChangeItem, type Refresh } from './pull-change';
import type { CheckInfo } from './pull-checks';
import type { PullInfo } from './pull-info';
import { failureMessage, known, type Known } from './pull-known';
import type { PullReads } from './pull-reads';
import type { PullLink, PullStore } from './pull-store';

export type ChangesSource = {
  store: PullStore;
  reads: PullReads;
  readState: Argo['queries']['readState'];
};

// One association with what is known of its pull request and that commit's Checks.
export type LinkRead = {
  link: PullLink;
  pull: Known<PullInfo>;
  // Unknown until the pull request has said which commit is its head.
  checks?: Known<CheckInfo[]>;
};

// Two Sessions attaching the same pull request ask the same question, so they share one entry.
const targetOf = ({
  projectId,
  repository,
  number,
}: PullLink): Pick<PullLink, 'projectId' | 'repository' | 'number'> => ({
  projectId,
  repository,
  number,
});

const readPull = (
  { readState, reads }: ChangesSource,
  link: PullLink,
): Promise<Known<PullInfo>> =>
  known(() =>
    readState(reads.pull(targetOf(link)), { projectId: link.projectId }),
  );

const readChecks = (
  { readState, reads }: ChangesSource,
  { projectId, repository }: PullLink,
  head: string,
): Promise<Known<CheckInfo[]>> =>
  known(() =>
    readState(reads.checks({ projectId, repository, head }), { projectId }),
  );

async function readLink(
  source: ChangesSource,
  link: PullLink,
): Promise<LinkRead> {
  const pull = await readPull(source, link);

  if (!pull.data) return { link, pull };

  return { link, pull, checks: await readChecks(source, link, pull.data.head) };
}

// Every association of these Sessions with what is known of its pull request, read through the named Queries that Slots and Operations share. Each is read alone.
export async function readLinks(
  source: ChangesSource,
  sessionIds: readonly string[],
): Promise<LinkRead[]> {
  const links = await source.store.forSessions(sessionIds);

  return Promise.all(links.map((link) => readLink(source, link)));
}

const failureOfRead = ({ pull, checks }: LinkRead): Known<unknown> =>
  pull.failure ? pull : (checks ?? {});

const checksOf = ({ checks }: LinkRead): Pick<Refresh, 'checks'> =>
  checks?.data ? { checks: checks.data } : {};

const staleOf = (read: LinkRead): Pick<Refresh, 'stale'> => {
  const { failure } = failureOfRead(read);

  return failure ? { stale: failure.reason } : {};
};

// Stale when either read failed: the Change is what was last known, with why it could not be refreshed.
export const refreshOf = (read: LinkRead): Refresh => ({
  ...checksOf(read),
  ...staleOf(read),
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

// Nothing could be read at all: that is a failure, never an answer of no Changes.
function refuseUnread(
  reads: readonly LinkRead[],
  shown: readonly ChangeRead[],
): void {
  const unread = reads.find(({ pull }) => !pull.data);

  if (shown.length === 0 && unread)
    throw new Error(failureMessage(unread.pull));
}

/*
 * Each pull request is answered alone: one that could not be read, and was never read before, is left out while the
 * others show, and one read before keeps its last known data marked stale. Only when nothing could be read at all is
 * the failure thrown: Argo then keeps the Plugin's contribution out and says why.
 */
export function changesBySession(
  reads: readonly LinkRead[],
): Readonly<Record<string, ChangeItem[]>> {
  const shown = reads.flatMap(changeRead);

  refuseUnread(reads, shown);

  return bySession(shown);
}
