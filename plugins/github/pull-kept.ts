import type { AutomationOffer } from './pull-automation';
import type { Automations } from './pull-automations';
import type { PullInfo } from './pull-info';
import type { Known } from './pull-known';
import type { PullLink, PullStore } from './pull-store';

// How the Plugin's own automations are offered on a pull request that has been read; one never read offers none.
export type Attached = { kept?: Pick<AutomationOffer, 'fix' | 'archive'> };

// One association as the records name it, whatever the case of its repository.
const identityOf = ({
  projectId,
  sessionId,
  repository,
  number,
}: PullLink): string =>
  JSON.stringify([projectId, sessionId, repository.toLowerCase(), number]);

// An association as the automations keep it: GitHub names match without regard to case, so they are kept in lower case.
export const lowered = (link: PullLink): PullLink => ({
  ...link,
  repository: link.repository.toLowerCase(),
});

export const sameLink = (record: PullLink, link: PullLink): boolean =>
  identityOf(record) === identityOf(link);

type Offering = (link: PullLink, pull: PullInfo) => Attached['kept'];

async function offeringOf(
  { fix, archive }: Automations,
  sessionIds: readonly string[],
): Promise<Offering> {
  const [fixOffers, archiveOffers] = await Promise.all([
    fix.offers(sessionIds),
    archive.offers(sessionIds),
  ]);

  return (link, pull) => ({
    fix: fixOffers(link, pull),
    archive: archiveOffers(link, pull),
  });
}

type Read = { link: PullLink; pull: Known<PullInfo> };

const attachKept = <Shown extends Read>(
  read: Shown,
  offering: Offering,
): Shown & Attached =>
  read.pull.data
    ? { ...read, kept: offering(read.link, read.pull.data) }
    : read;

type ShownOf<Shown> = (links: PullLink[]) => Promise<Shown[]>;

/*
 * What a Slot or an Operation answers for these Sessions' pull requests: each as the record has it, beside how the
 * automations are offered on it. The automations' own data is read every time, so a choice shows at once and a slow or
 * failed GitHub read never hides it.
 */
export async function keptShown<Shown extends Read>(
  { store, automations }: { store: PullStore; automations: Automations },
  sessionIds: readonly string[],
  shown: ShownOf<Shown>,
): Promise<(Shown & Attached)[]> {
  const [links, offering] = await Promise.all([
    store.forSessions(sessionIds),
    offeringOf(automations, sessionIds),
  ]);

  return (await shown(links)).map((read) => attachKept(read, offering));
}
