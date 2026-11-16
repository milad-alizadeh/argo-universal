import type { Argo } from '@argo/plugin-kit';
import { archiveOf } from './pull-archive';
import {
  mergeOf,
  offerOf,
  type AutoMergeInfo,
  type MergeSettings,
  type Reads,
} from './pull-automation';
import type { AutomationReads } from './pull-automation-reads';
import { changeOf, type ChangeItem, type Refresh } from './pull-change';
import type { CheckInfo } from './pull-checks';
import { fixOf } from './pull-fix';
import type { PullInfo } from './pull-info';
import type { Attached } from './pull-kept';
import { failureMessage, known, type Known } from './pull-known';
import { readOpenOnly } from './pull-open-reads';
import type { PullReads } from './pull-reads';
import type { PullRecords } from './pull-records';
import type { PullKey, PullLink, PullStore } from './pull-store';

export type ChangesSource = {
  store: PullStore;
  records: PullRecords;
  reads: PullReads & AutomationReads;
  readState: Argo['queries']['readState'];
};

// One association with what is known of its pull request and that commit's Checks.
export type LinkRead<Link extends PullKey = PullLink> = {
  link: Link;
  pull: Known<PullInfo>;
  // Unknown until the pull request has said which commit is its head.
  checks?: Known<CheckInfo[]>;
  // Read only for an Open pull request, which is the only one that can auto-merge.
  autoMerge?: Known<AutoMergeInfo>;
  settings?: Known<MergeSettings>;
} & Attached;

// Two Sessions attaching the same pull request ask the same question, so they share one entry.
const targetOf = ({ projectId, repository, number }: PullKey): PullKey => ({
  projectId,
  repository,
  number,
});

const readPull = (
  { readState, reads }: ChangesSource,
  link: PullKey,
): Promise<Known<PullInfo>> =>
  known(() =>
    readState(reads.pull(targetOf(link)), { projectId: link.projectId }),
  );

const readChecks = (
  { readState, reads }: ChangesSource,
  { projectId, repository }: PullKey,
  head: string,
): Promise<Known<CheckInfo[]>> =>
  known(() =>
    readState(reads.checks({ projectId, repository, head }), { projectId }),
  );

// One pull request with what GitHub says of it now, read through the named Queries; only `sync` asks (see `pull-sync.ts`).
export async function readLink<Link extends PullKey>(
  source: ChangesSource,
  link: Link,
): Promise<LinkRead<Link>> {
  const pull = await readPull(source, link);

  if (!pull.data) return { link, pull };

  const [checks, open] = await Promise.all([
    readChecks(source, link, pull.data.head),
    readOpenOnly(source, link, pull.data),
  ]);

  return { link, pull, checks, ...open };
}

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
    ? {
        automation: offerOf(
          mergeOf(read.pull.data, readsOf(read)),
          fixOf(read.fix, read.pull.data),
          archiveOf(read.archive),
        ),
      }
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
 * the failure thrown: Argo then keeps the Plugin's contribution out and says why. One GitHub has not answered yet
 * is no failure: it shows as last read, or not yet (see `pull-sync.ts`).
 */
export function changesBySession(
  reads: readonly LinkRead[],
): Readonly<Record<string, ChangeItem[]>> {
  const shown = reads.flatMap(changeRead);

  refuseUnread(reads, shown);

  return bySession(shown);
}
