import type { Argo } from '@argo/plugin-kit';
import type { ArchiveStore } from './pull-archive-store';
import type { AutomationState } from './pull-automation';
import type { Fresh } from './pull-automations';
import { freshReads } from './pull-fresh';
import type { PullInfo } from './pull-info';
import { sameLink } from './pull-kept';
import type { Known } from './pull-known';
import { sessionStays } from './pull-stays';
import type { PullLink } from './pull-store';
import { takeTurns } from './pull-turns';

// Auto-archive as the Change offers it: any attached pull request can use it.
export const archiveOf = (on: boolean): AutomationState => ({
  on,
  available: true,
});

// What Auto-archive's Watch turn works with: the Sessions it archives, and the pull requests it is on for.
export type Archiving = {
  sessions: Pick<Argo['sessions'], 'archive' | 'get'>;
  archive: ArchiveStore;
};

// A read that failed, or is only last known, says nothing of the pull request now, so it is never over.
const isOver = ({ data, failure }: Known<PullInfo>): boolean =>
  !failure && data !== undefined && data.stage !== 'open';

// Every pull request attached to the Session must be Merged or Closed; one not known to be is waited for.
async function settled(fresh: Fresh, link: PullLink): Promise<boolean> {
  const reads = await freshReads(fresh, link.sessionId);

  return (
    reads.some((read) => sameLink(read.link, link)) &&
    reads.every(({ pull }) => isOver(pull))
  );
}

// A refused archive, as core does for a Turn that runs or a Checkout with uncommitted files, waits for a later Watch.
async function archived(
  { sessions }: Archiving,
  { sessionId }: PullLink,
): Promise<boolean> {
  try {
    await sessions.archive(sessionId);
  } catch {
    return false;
  }

  return true;
}

const stays = (
  { sessions, archive }: Archiving,
  link: PullLink,
): Promise<boolean> =>
  sessionStays(sessions, link, () => archive.disable(link));

// Once the Session is archived Auto-archive is spent, so unarchiving it is not undone by the next Watch.
async function archiveOne(
  archiving: Archiving,
  fresh: Fresh,
  link: PullLink,
): Promise<boolean> {
  if (!(await stays(archiving, link))) return false;

  if (!(await settled(fresh, link)) || !(await archived(archiving, link)))
    return false;

  await archiving.archive.disable(link);

  return true;
}

/*
 * The Watch's Auto-archive step for one Project: a Session is archived once the pull request with Auto-archive on is
 * Merged or Closed and no other attached pull request is Open.
 */
export async function autoArchive(
  archiving: Archiving,
  fresh: Fresh,
  projectId: string,
): Promise<void> {
  await takeTurns(fresh, await archiving.archive.enabledIn(projectId), (link) =>
    archiveOne(archiving, fresh, link),
  );
}
