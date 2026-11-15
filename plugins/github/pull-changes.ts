import type { Argo } from '@argo/plugin-kit';
import { changeOf, type ChangeItem, type Refresh } from './pull-change';
import type { CheckInfo } from './pull-checks';
import type { PullInfo } from './pull-info';
import { failureMessage, known, type Known } from './pull-known';
import { mergeOf, offerOf, type AutoMergeInfo, type AutomationReads, type MergeSettings } from './pull-automation';
import type { PullReads } from './pull-reads';
import type { PullLink, PullStore } from './pull-store';

export type ChangesSource = {
  store: PullStore;
  reads: PullReads & AutomationReads;
  readState: Argo['queries']['readState'];
};

// One association with what is known of its pull request and that commit's Checks.
export type LinkRead = {
  link: PullLink;
  pull: Known<PullInfo>;
  // Unknown until the pull request has said which commit is its head.
  checks?: Known<CheckInfo[]>;
  // Read only for an Open pull request, which is the only one that can auto-merge.
  autoMerge?: Known<AutoMergeInfo>;
  settings?: Known<MergeSettings>;
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

const readAutoMerge = (
  { readState, reads }: ChangesSource,
  link: PullLink,
): Promise<Known<AutoMergeInfo>> =>
  known(() =>
    readState(reads.autoMerge(targetOf(link)), { projectId: link.projectId }),
  );

const readSettings = (
  { readState, reads }: ChangesSource,
  { projectId, repository }: PullLink,
): Promise<Known<MergeSettings>> =>
  known(() =>
    readState(reads.mergeSettings({ projectId, repository }), { projectId }),
  );

async function automationReads(
  source: ChangesSource,
  link: PullLink,
  pull: PullInfo,
): Promise<Pick<LinkRead, 'autoMerge' | 'settings'>> {
  if (pull.stage !== 'open') return {};

  const [autoMerge, settings] = await Promise.all([
    readAutoMerge(source, link),
    readSettings(source, link),
  ]);

  return { autoMerge, settings };
}

export async function readLink(
  source: ChangesSource,
  link: PullLink,
): Promise<LinkRead> {
  const pull = await readPull(source, link);

  if (!pull.data) return { link, pull };

  const [checks, automation] = await Promise.all([
    readChecks(source, link, pull.data.head),
    automationReads(source, link, pull.data),
  ]);

  return { link, pull, checks, ...automation };
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

// What the Change offers to automate; GitHub's own answers, so one it could not give is never drawn as off.
const automationOf = ({
  pull,
  autoMerge,
  settings,
}: LinkRead): Pick<Refresh, 'automation'> =>
  pull.data
    ? {
        automation: offerOf(
          mergeOf(pull.data, {
            autoMerge: autoMerge?.data,
            settings: settings?.data,
          }),
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
