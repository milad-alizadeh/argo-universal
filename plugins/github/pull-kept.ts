import type { FixRecord } from './pull-fix-store';
import type { PullLink, PullStore } from './pull-store';

// What the automations keep for the pull requests of some Sessions: the Plugin's own, and never stale.
type Kept = {
  fixes: readonly FixRecord[];
  archives: readonly PullLink[];
};

// What Auto-fix keeps for a pull request, if the person ever touched it, and whether Auto-archive is on.
export type Attached = { fix?: FixRecord; archive?: true };

async function keptOf(
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

export const sameLink = (record: PullLink, link: PullLink): boolean =>
  identityOf(record) === identityOf(link);

const fixOf = (link: PullLink, fixes: readonly FixRecord[]): Attached => {
  const fix = fixes.find((record) => sameLink(record, link));

  return fix ? { fix } : {};
};

const archiveOf = (link: PullLink, archives: readonly PullLink[]): Attached =>
  archives.some((record) => sameLink(record, link)) ? { archive: true } : {};

// The read with what Auto-fix and Auto-archive keep for its pull request.
const attachKept = <Read extends { link: PullLink }>(
  read: Read,
  { fixes, archives }: Kept,
): Read & Attached => ({
  ...read,
  ...fixOf(read.link, fixes),
  ...archiveOf(read.link, archives),
});

type Shown<Read> = (links: PullLink[]) => Promise<Read[]>;

/*
 * What a Slot or an Operation answers for these Sessions' pull requests: each as the record has it, beside what the
 * automations keep. The Plugin's own data is read from its tables every time, so a choice shows at once and a slow or
 * failed GitHub read never hides it.
 */
export async function keptShown<Read extends { link: PullLink }>(
  store: Pick<PullStore, 'fix' | 'archive' | 'forSessions'>,
  sessionIds: readonly string[],
  shown: Shown<Read>,
): Promise<(Read & Attached)[]> {
  const [links, kept] = await Promise.all([
    store.forSessions(sessionIds),
    keptOf(store, sessionIds),
  ]);

  return (await shown(links)).map((read) => attachKept(read, kept));
}
