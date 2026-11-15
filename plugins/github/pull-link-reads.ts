import type { Argo } from '@argo/plugin-kit';
import type { AutoMergeInfo, MergeSettings } from './pull-automation';
import type { AutomationReads } from './pull-automation-reads';
import type { CheckInfo } from './pull-checks';
import type { FixRecord } from './pull-fix-store';
import type { PullInfo } from './pull-info';
import { known, type Known } from './pull-known';
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
  // What Auto-fix keeps for this pull request, if the person ever touched it.
  fix?: FixRecord;
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

export const readPull = (
  { readState, reads }: ChangesSource,
  link: PullLink,
): Promise<Known<PullInfo>> =>
  known(() =>
    readState(reads.pull(targetOf(link)), { projectId: link.projectId }),
  );

export const readChecks = (
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

// One association as the fix records name it, whatever the case of its repository.
const identityOf = ({
  projectId,
  sessionId,
  repository,
  number,
}: PullLink): string =>
  JSON.stringify([projectId, sessionId, repository.toLowerCase(), number]);

const sameLink = (record: FixRecord, link: PullLink): boolean =>
  identityOf(record) === identityOf(link);

// The read with what Auto-fix keeps for its pull request, which is the Plugin's own and never stale.
export function attachFix(
  read: LinkRead,
  fixes: readonly FixRecord[],
): LinkRead {
  const fix = fixes.find((record) => sameLink(record, read.link));

  return fix ? { ...read, fix } : read;
}

// Every association of these Sessions with what is known of its pull request, read through the named Queries that Slots and Operations share. Each is read alone.
export async function readLinks(
  source: ChangesSource,
  sessionIds: readonly string[],
): Promise<LinkRead[]> {
  const [links, fixes] = await Promise.all([
    source.store.forSessions(sessionIds),
    source.store.fix.forSessions(sessionIds),
  ]);

  return Promise.all(
    links.map(async (link) => attachFix(await readLink(source, link), fixes)),
  );
}
