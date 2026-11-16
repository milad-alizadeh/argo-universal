import type { Argo } from '@argo/plugin-kit';
import { archiveOf, autoArchive } from './pull-archive';
import { createArchiveStore, type ArchiveStore } from './pull-archive-store';
import type { Automation, Offers } from './pull-automations';
import { sameLink } from './pull-kept';
import type { PullLink } from './pull-store';

const lowered = (link: PullLink): PullLink => ({
  ...link,
  repository: link.repository.toLowerCase(),
});

// How Auto-archive is offered on each of these Sessions' pull requests: on where it has a record.
async function offersOf(
  archive: ArchiveStore,
  sessionIds: readonly string[],
): Promise<Offers> {
  const links = await archive.forSessions(sessionIds);

  return (link) => archiveOf(links.some((kept) => sameLink(kept, link)));
}

/*
 * Auto-archive (ADR-0055): the Session is archived once the pull request is Merged or Closed and no other attached one
 * is Open. It is a record per pull request, kept until it is turned off, spent or detached, and it asks GitHub nothing
 * to be set.
 */
export function createAutoArchive(
  argo: Pick<Argo, 'storage' | 'sessions'>,
): Automation {
  const archive = createArchiveStore(argo);

  return {
    offers: (sessionIds) => offersOf(archive, sessionIds),
    set: (link, on) =>
      on ? archive.enable(lowered(link)) : archive.disable(lowered(link)),
    watch: (projectId, fresh) =>
      autoArchive({ sessions: argo.sessions, archive }, fresh, projectId),
    forget: (link) => archive.disable(link),
  };
}
