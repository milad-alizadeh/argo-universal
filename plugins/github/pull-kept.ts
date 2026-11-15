import type { FixRecord } from './pull-fix-store';
import type { PullLink, PullStore } from './pull-store';

// What the automations keep for the pull requests of some Sessions: the Plugin's own, and never stale.
export type Kept = {
  fixes: readonly FixRecord[];
  archives: readonly PullLink[];
};

// What Auto-fix keeps for a pull request, if the person ever touched it, and whether Auto-archive is on.
export type Attached = { fix?: FixRecord; archive?: true };

export async function keptOf(
  { fix, archive }: Pick<PullStore, 'fix' | 'archive'>,
  sessionIds: readonly string[],
): Promise<Kept> {
  const [fixes, archives] = await Promise.all([
    fix.forSessions(sessionIds),
    archive.forSessions(sessionIds),
  ]);

  return { fixes, archives };
}

// One association as the records name it, whatever the case of its repository.
const identityOf = ({
  projectId,
  sessionId,
  repository,
  number,
}: PullLink): string =>
  JSON.stringify([projectId, sessionId, repository.toLowerCase(), number]);

const sameLink = (record: PullLink, link: PullLink): boolean =>
  identityOf(record) === identityOf(link);

const fixOf = (link: PullLink, fixes: readonly FixRecord[]): Attached => {
  const fix = fixes.find((record) => sameLink(record, link));

  return fix ? { fix } : {};
};

const archiveOf = (link: PullLink, archives: readonly PullLink[]): Attached =>
  archives.some((record) => sameLink(record, link)) ? { archive: true } : {};

// The read with what Auto-fix and Auto-archive keep for its pull request.
export const attachKept = <Read extends { link: PullLink }>(
  read: Read,
  { fixes, archives }: Kept,
): Read & Attached => ({
  ...read,
  ...fixOf(read.link, fixes),
  ...archiveOf(read.link, archives),
});
