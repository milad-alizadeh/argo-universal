import type { Argo } from '@argo/plugin-kit';
import type { AutoMergeInfo, MergeSettings } from './pull-automation';
import type { AutomationReads } from './pull-automation-reads';
import type { CheckInfo } from './pull-checks';
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
