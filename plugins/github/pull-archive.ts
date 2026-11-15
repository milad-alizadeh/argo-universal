import type { Argo } from '@argo/plugin-kit';
import type { AutomationState } from './pull-automation';
import type { PullInfo } from './pull-info';
import type { Known } from './pull-known';
import { readPull, type ChangesSource } from './pull-link-reads';
import type { PullLink } from './pull-store';
import { takeTurns } from './pull-turns';

// Auto-archive as the Change offers it: any attached pull request can use it.
export const archiveOf = (on?: true): AutomationState => ({
  on: on === true,
  available: true,
});

type Reads = Pick<ChangesSource, 'reads' | 'readState' | 'store'>;

type Acting = Pick<Argo, 'sessions' | 'changed'>;

// A read that failed, or is only last known, says nothing of the pull request now, so it is never over.
const isOver = ({ data, failure }: Known<PullInfo>): boolean =>
  !failure && data !== undefined && data.stage !== 'open';

const sameLink = (one: PullLink, other: PullLink): boolean =>
  one.repository === other.repository && one.number === other.number;

// Every other pull request attached to the Session must be Merged or Closed; one not known to be is waited for.
async function othersOver(source: Reads, link: PullLink): Promise<boolean> {
  const others = (await source.store.forSessions([link.sessionId])).filter(
    (other) => !sameLink(other, link),
  );

  const reads = await Promise.all(
    others.map((other) => readPull(source, other)),
  );

  return reads.every(isOver);
}

async function settled(source: Reads, link: PullLink): Promise<boolean> {
  return isOver(await readPull(source, link)) && othersOver(source, link);
}

// A refused archive, as core does for a Turn that runs or a Checkout with uncommitted files, waits for a later Watch.
async function archived(
  argo: Acting,
  { sessionId }: PullLink,
): Promise<boolean> {
  try {
    await argo.sessions.archive(sessionId);
  } catch {
    return false;
  }

  return true;
}

// Once the Session is archived Auto-archive is spent, so unarchiving it is not undone by the next Watch.
async function archiveOne(
  argo: Acting,
  source: Reads,
  link: PullLink,
): Promise<boolean> {
  if (!(await settled(source, link)) || !(await archived(argo, link)))
    return false;

  await source.store.archive.disable(link);

  return true;
}

/*
 * The Watch's Auto-archive step for one Project: a Session is archived once the pull request with Auto-archive on is
 * Merged or Closed and no other attached pull request is Open.
 */
export async function autoArchive(
  argo: Acting,
  source: Reads,
  projectId: string,
): Promise<void> {
  await takeTurns(
    argo,
    await source.store.archive.enabledIn(projectId),
    (link) => archiveOne(argo, source, link),
  );
}
